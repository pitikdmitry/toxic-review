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
