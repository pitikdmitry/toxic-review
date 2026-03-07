from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Review, ReviewComment
from app.schemas import PublishRequest, ReviewListItem, ReviewOut, ReviewRequest
from app.services.github_service import (
    fetch_pr_files,
    fetch_pr_info,
    get_pr_head_sha,
    parse_pr_url,
    publish_comments_to_github,
)
from app.services.openai_service import review_diff

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


@router.post("", response_model=ReviewOut)
async def create_review(req: ReviewRequest, db: AsyncSession = Depends(get_db)):
    try:
        owner, repo, pr_number = parse_pr_url(req.pr_url)
        pr_info = await fetch_pr_info(owner, repo, pr_number)
        files = await fetch_pr_files(owner, repo, pr_number)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch PR data: {e}")

    try:
        ai_review = await review_diff(files, cringe_level=req.cringe_level)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI review failed: {e}")

    review = Review(
        pr_url=req.pr_url,
        repo_owner=owner,
        repo_name=repo,
        pr_number=pr_number,
        pr_title=pr_info.get("title", ""),
        pr_author=pr_info.get("user", {}).get("login", ""),
        summary=ai_review.get("summary", ""),
        diff_data=files,
    )
    db.add(review)
    await db.flush()

    for c in ai_review.get("comments", []):
        db.add(
            ReviewComment(
                review_id=review.id,
                file_path=c["file_path"],
                line_number=c["line_number"],
                body=c["body"],
                severity=c.get("severity", "info"),
                category=c.get("category", "general"),
            )
        )

    await db.commit()
    await db.refresh(review, ["comments"])
    return review


@router.get("", response_model=list[ReviewListItem])
async def list_reviews(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Review)
        .options(selectinload(Review.comments))
        .order_by(Review.created_at.desc())
    )
    reviews = result.scalars().all()
    return [
        ReviewListItem(
            id=r.id,
            pr_url=r.pr_url,
            repo_owner=r.repo_owner,
            repo_name=r.repo_name,
            pr_number=r.pr_number,
            pr_title=r.pr_title,
            pr_author=r.pr_author,
            created_at=r.created_at,
            comment_count=len(r.comments),
        )
        for r in reviews
    ]


@router.get("/{review_id}", response_model=ReviewOut)
async def get_review(review_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Review)
        .options(selectinload(Review.comments))
        .where(Review.id == review_id)
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review


@router.post("/{review_id}/publish")
async def publish_comments(
    review_id: int, req: PublishRequest, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Review)
        .options(selectinload(Review.comments))
        .where(Review.id == review_id)
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    to_publish = [
        c for c in review.comments if c.id in req.comment_ids and not c.published
    ]
    if not to_publish:
        raise HTTPException(status_code=400, detail="No unpublished comments selected")

    try:
        head_sha = await get_pr_head_sha(
            review.repo_owner, review.repo_name, review.pr_number
        )
        await publish_comments_to_github(
            review.repo_owner,
            review.repo_name,
            review.pr_number,
            [
                {
                    "file_path": c.file_path,
                    "line_number": c.line_number,
                    "body": c.body,
                    "severity": c.severity,
                }
                for c in to_publish
            ],
            head_sha,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to publish: {e}")

    for c in to_publish:
        c.published = True
    await db.commit()

    return {"published": len(to_publish)}


@router.delete("/{review_id}")
async def delete_review(review_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    await db.delete(review)
    await db.commit()
    return {"deleted": True}
