from unittest.mock import AsyncMock, patch

import pytest

MOCK_PR_INFO = {
    "title": "Fix null pointer bug",
    "user": {"login": "testuser"},
    "head": {"sha": "abc123def"},
}
MOCK_FILES = [
    {
        "filename": "main.py",
        "status": "modified",
        "additions": 2,
        "deletions": 1,
        "patch": "@@ -1,3 +1,4 @@\n def main():\n-    print('old')\n+    print('new')\n+    return 0",
    }
]
MOCK_AI_REVIEW = {
    "summary": "This PR fixes a print statement and adds a return value.",
    "comments": [
        {
            "file_path": "main.py",
            "line_number": 3,
            "severity": "suggestion",
            "category": "style",
            "body": "Consider using logging instead of print.",
        }
    ],
}


def _patches():
    return (
        patch(
            "app.routers.reviews.fetch_pr_info",
            new_callable=AsyncMock,
            return_value=MOCK_PR_INFO,
        ),
        patch(
            "app.routers.reviews.fetch_pr_files",
            new_callable=AsyncMock,
            return_value=MOCK_FILES,
        ),
        patch(
            "app.routers.reviews.review_diff",
            new_callable=AsyncMock,
            return_value=MOCK_AI_REVIEW,
        ),
    )


@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_create_review(client):
    p1, p2, p3 = _patches()
    with p1, p2, p3:
        resp = await client.post(
            "/api/reviews",
            json={"pr_url": "https://github.com/owner/repo/pull/1"},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["pr_title"] == "Fix null pointer bug"
    assert data["repo_owner"] == "owner"
    assert data["repo_name"] == "repo"
    assert data["pr_number"] == 1
    assert len(data["comments"]) == 1
    assert data["comments"][0]["severity"] == "suggestion"
    assert data["summary"] == MOCK_AI_REVIEW["summary"]


@pytest.mark.asyncio
async def test_create_review_with_cringe_level(client):
    p1, p2, p3 = _patches()
    with p1, p2, p3 as mock_review:
        resp = await client.post(
            "/api/reviews",
            json={"pr_url": "https://github.com/owner/repo/pull/1", "cringe_level": 5},
        )
        mock_review.assert_called_once()
        _, kwargs = mock_review.call_args
        assert kwargs["cringe_level"] == 5
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_list_reviews(client):
    p1, p2, p3 = _patches()
    with p1, p2, p3:
        await client.post(
            "/api/reviews",
            json={"pr_url": "https://github.com/o/r/pull/1"},
        )

    resp = await client.get("/api/reviews")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["pr_title"] == "Fix null pointer bug"
    assert data[0]["comment_count"] == 1


@pytest.mark.asyncio
async def test_get_review(client):
    p1, p2, p3 = _patches()
    with p1, p2, p3:
        create_resp = await client.post(
            "/api/reviews",
            json={"pr_url": "https://github.com/o/r/pull/1"},
        )
    review_id = create_resp.json()["id"]

    resp = await client.get(f"/api/reviews/{review_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == review_id
    assert len(resp.json()["diff_data"]) == 1


@pytest.mark.asyncio
async def test_get_review_not_found(client):
    resp = await client.get("/api/reviews/999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_invalid_pr_url(client):
    resp = await client.post("/api/reviews", json={"pr_url": "not-a-valid-url"})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_delete_review(client):
    p1, p2, p3 = _patches()
    with p1, p2, p3:
        resp = await client.post(
            "/api/reviews",
            json={"pr_url": "https://github.com/o/r/pull/1"},
        )
    review_id = resp.json()["id"]

    resp = await client.delete(f"/api/reviews/{review_id}")
    assert resp.status_code == 200

    resp = await client.get(f"/api/reviews/{review_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_publish_no_token(client):
    p1, p2, p3 = _patches()
    with p1, p2, p3:
        resp = await client.post(
            "/api/reviews",
            json={"pr_url": "https://github.com/o/r/pull/1"},
        )
    review_id = resp.json()["id"]
    comment_id = resp.json()["comments"][0]["id"]

    resp = await client.post(
        f"/api/reviews/{review_id}/publish",
        json={"comment_ids": [comment_id]},
    )
    assert resp.status_code == 500
