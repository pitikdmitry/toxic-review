from datetime import datetime

from pydantic import BaseModel


class ReviewRequest(BaseModel):
    pr_url: str
    cringe_level: int = 3


class ReviewCommentOut(BaseModel):
    id: int
    file_path: str
    line_number: int
    body: str
    severity: str
    category: str
    published: bool

    model_config = {"from_attributes": True}


class ReviewOut(BaseModel):
    id: int
    pr_url: str
    repo_owner: str
    repo_name: str
    pr_number: int
    pr_title: str
    pr_author: str
    summary: str
    diff_data: list
    created_at: datetime
    comments: list[ReviewCommentOut]

    model_config = {"from_attributes": True}


class ReviewListItem(BaseModel):
    id: int
    pr_url: str
    repo_owner: str
    repo_name: str
    pr_number: int
    pr_title: str
    pr_author: str
    created_at: datetime
    comment_count: int

    model_config = {"from_attributes": True}


class PublishRequest(BaseModel):
    comment_ids: list[int]


# --- Feed schemas ---


class DiffContextLine(BaseModel):
    type: str
    content: str
    old_line_number: int | None = None
    new_line_number: int | None = None


class FeedItem(BaseModel):
    id: int
    body: str
    severity: str
    category: str
    file_path: str
    line_number: int
    score: int
    upvotes: int
    downvotes: int
    user_vote: int | None = None
    created_at: datetime
    diff_context: list[DiffContextLine]
    review_id: int
    pr_title: str
    repo_owner: str
    repo_name: str
    pr_number: int
    cringe_level: int


class FeedResponse(BaseModel):
    items: list[FeedItem]
    total: int
    page: int
    page_size: int
    has_more: bool


class VoteRequest(BaseModel):
    fingerprint: str
    value: int


class VoteResponse(BaseModel):
    score: int
    upvotes: int
    downvotes: int
    user_vote: int | None = None
