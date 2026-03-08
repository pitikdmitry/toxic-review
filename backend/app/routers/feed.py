import re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Review, ReviewComment, Vote
from app.schemas import FeedItem, FeedResponse, VoteRequest, VoteResponse
from app.services.diff_service import extract_diff_context

router = APIRouter(prefix="/api/feed", tags=["feed"])


PERIOD_DELTAS = {
    "day": timedelta(days=1),
    "week": timedelta(weeks=1),
    "month": timedelta(days=30),
}


def _dedup_subquery(base_filter: list):
    """Build a subquery that picks the best comment per (PR, file, line).

    Priority: highest score, then highest cringe level, then newest.
    """
    rn = func.row_number().over(
        partition_by=[
            Review.repo_owner,
            Review.repo_name,
            Review.pr_number,
            ReviewComment.file_path,
            ReviewComment.line_number,
        ],
        order_by=[
            ReviewComment.score.desc(),
            Review.cringe_level.desc(),
            ReviewComment.created_at.desc(),
        ],
    ).label("rn")

    subq = (
        select(ReviewComment.id, rn)
        .join(Review, ReviewComment.review_id == Review.id)
    )
    for f in base_filter:
        subq = subq.where(f)

    return subq.subquery()


@router.get("", response_model=FeedResponse)
async def get_feed(
    sort: str = Query("hot", pattern="^(hot|top|new)$"),
    period: str = Query("all", pattern="^(day|week|month|all)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    fingerprint: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    # Base filters
    base_filter = []

    if sort == "top" and period != "all":
        delta = PERIOD_DELTAS[period]
        cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - delta
        base_filter.append(ReviewComment.created_at >= cutoff)

    # Dedup: pick best comment per (PR, file, line)
    dedup = _dedup_subquery(base_filter)
    best_ids_subq = select(dedup.c.id).where(dedup.c.rn == 1).scalar_subquery()

    # Count total (deduplicated)
    count_stmt = select(func.count()).select_from(
        select(dedup.c.id).where(dedup.c.rn == 1).subquery()
    )
    total = (await db.execute(count_stmt)).scalar() or 0

    # Build the main query — only best comments
    stmt = (
        select(
            ReviewComment,
            Review.pr_title,
            Review.repo_owner,
            Review.repo_name,
            Review.pr_number,
            Review.diff_data,
            Review.cringe_level,
        )
        .join(Review, ReviewComment.review_id == Review.id)
        .where(ReviewComment.id.in_(best_ids_subq))
    )

    # Ordering
    if sort == "new":
        stmt = stmt.order_by(ReviewComment.created_at.desc())
    elif sort == "top":
        stmt = stmt.order_by(ReviewComment.score.desc(), ReviewComment.created_at.desc())
    else:
        # Hot: Reddit-style algorithm with linear score penalty
        epoch_ref = datetime(2024, 1, 1)
        epoch_seconds = func.extract("epoch", ReviewComment.created_at - epoch_ref)
        sign_score = case(
            (ReviewComment.score > 0, 1),
            (ReviewComment.score < 0, -1),
            else_=0,
        )
        abs_score = func.abs(ReviewComment.score)
        max_score = case((abs_score > 1, abs_score), else_=1)
        # ln(1)=0 means scores of -1,0,+1 get no vote component.
        # Add a linear term so each vote ≈ 6 hours of recency.
        log_component = sign_score * func.ln(max_score)
        linear_component = ReviewComment.score * 0.5
        hot_score = log_component + linear_component + epoch_seconds / 45000.0
        stmt = stmt.order_by(hot_score.desc())

    # Pagination
    offset = (page - 1) * page_size
    stmt = stmt.offset(offset).limit(page_size)

    rows = (await db.execute(stmt)).all()

    # If fingerprint provided, batch-fetch user votes
    user_votes: dict[int, int] = {}
    if fingerprint and rows:
        comment_ids = [row[0].id for row in rows]
        vote_stmt = select(Vote.comment_id, Vote.value).where(
            Vote.comment_id.in_(comment_ids),
            Vote.fingerprint == fingerprint,
        )
        vote_rows = (await db.execute(vote_stmt)).all()
        user_votes = {vid: val for vid, val in vote_rows}

    # Build feed items with diff context
    diff_cache: dict[int, list[dict]] = {}
    items: list[FeedItem] = []

    for row in rows:
        comment: ReviewComment = row[0]
        pr_title = row[1]
        repo_owner = row[2]
        repo_name = row[3]
        pr_number = row[4]
        diff_data = row[5]
        cringe_level = row[6]

        if comment.review_id not in diff_cache:
            diff_cache[comment.review_id] = diff_data or []

        diff_context = extract_diff_context(
            diff_cache[comment.review_id],
            comment.file_path,
            comment.line_number,
        )

        items.append(
            FeedItem(
                id=comment.id,
                body=comment.body,
                severity=comment.severity,
                category=comment.category,
                file_path=comment.file_path,
                line_number=comment.line_number,
                score=comment.score,
                upvotes=comment.upvotes,
                downvotes=comment.downvotes,
                user_vote=user_votes.get(comment.id),
                created_at=comment.created_at,
                diff_context=[
                    {
                        "type": line["type"],
                        "content": line["content"],
                        "old_line_number": line.get("old_line_number"),
                        "new_line_number": line.get("new_line_number"),
                    }
                    for line in diff_context
                ],
                review_id=comment.review_id,
                pr_title=pr_title or "",
                repo_owner=repo_owner,
                repo_name=repo_name,
                pr_number=pr_number,
                cringe_level=cringe_level,
            )
        )

    return FeedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(offset + page_size) < total,
    )


@router.post("/{comment_id}/vote", response_model=VoteResponse)
async def vote_comment(
    comment_id: int,
    vote_req: VoteRequest,
    db: AsyncSession = Depends(get_db),
):
    # Validate fingerprint
    if not re.match(r"^[0-9a-f]{64}$", vote_req.fingerprint):
        raise HTTPException(status_code=400, detail="Invalid fingerprint")

    if vote_req.value not in (1, -1):
        raise HTTPException(status_code=400, detail="Value must be +1 or -1")

    # Verify comment exists
    comment = await db.get(ReviewComment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Look up existing vote
    existing_stmt = select(Vote).where(
        Vote.comment_id == comment_id,
        Vote.fingerprint == vote_req.fingerprint,
    )
    existing = (await db.execute(existing_stmt)).scalar_one_or_none()

    if existing:
        if existing.value == vote_req.value:
            # Same vote = un-vote (toggle off)
            if existing.value == 1:
                comment.upvotes -= 1
            else:
                comment.downvotes -= 1
            comment.score -= existing.value
            await db.delete(existing)
            user_vote = None
        else:
            # Different value = flip vote
            old_value = existing.value
            existing.value = vote_req.value
            if old_value == 1:
                comment.upvotes -= 1
                comment.downvotes += 1
            else:
                comment.downvotes -= 1
                comment.upvotes += 1
            comment.score += vote_req.value - old_value
            user_vote = vote_req.value
    else:
        # New vote
        new_vote = Vote(
            comment_id=comment_id,
            fingerprint=vote_req.fingerprint,
            value=vote_req.value,
        )
        db.add(new_vote)
        if vote_req.value == 1:
            comment.upvotes += 1
        else:
            comment.downvotes += 1
        comment.score += vote_req.value
        user_vote = vote_req.value

    await db.commit()
    await db.refresh(comment)

    return VoteResponse(
        score=comment.score,
        upvotes=comment.upvotes,
        downvotes=comment.downvotes,
        user_vote=user_vote,
    )
