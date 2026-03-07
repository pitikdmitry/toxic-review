import re

import httpx

from app.config import settings


def parse_pr_url(url: str) -> tuple[str, str, int]:
    pattern = r"github\.com/([^/]+)/([^/]+)/pull/(\d+)"
    match = re.search(pattern, url)
    if not match:
        raise ValueError(f"Invalid GitHub PR URL: {url}")
    return match.group(1), match.group(2), int(match.group(3))


def _github_headers() -> dict[str, str]:
    headers = {"Accept": "application/vnd.github.v3+json"}
    if settings.github_token:
        headers["Authorization"] = f"token {settings.github_token}"
    return headers


async def fetch_pr_info(owner: str, repo: str, pr_number: int) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}",
            headers=_github_headers(),
        )
        resp.raise_for_status()
        return resp.json()


async def fetch_pr_files(owner: str, repo: str, pr_number: int) -> list[dict]:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}/files",
            headers=_github_headers(),
            params={"per_page": 100},
        )
        resp.raise_for_status()
        return [
            {
                "filename": f["filename"],
                "status": f["status"],
                "additions": f["additions"],
                "deletions": f["deletions"],
                "patch": f.get("patch", ""),
            }
            for f in resp.json()
        ]


async def get_pr_head_sha(owner: str, repo: str, pr_number: int) -> str:
    pr_info = await fetch_pr_info(owner, repo, pr_number)
    return pr_info["head"]["sha"]


async def publish_comments_to_github(
    owner: str,
    repo: str,
    pr_number: int,
    comments: list[dict],
    commit_sha: str,
) -> dict:
    if not settings.github_token:
        raise ValueError("GitHub token is required to publish comments")

    review_comments = []
    for c in comments:
        review_comments.append(
            {
                "path": c["file_path"],
                "line": c["line_number"],
                "side": "RIGHT",
                "body": f"**AI Review** ({c['severity']})\n\n{c['body']}",
            }
        )

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}/reviews",
            headers={
                **_github_headers(),
                "Authorization": f"token {settings.github_token}",
            },
            json={
                "commit_id": commit_sha,
                "body": "AI Code Review by Toxic Review",
                "event": "COMMENT",
                "comments": review_comments,
            },
        )
        resp.raise_for_status()
        return resp.json()
