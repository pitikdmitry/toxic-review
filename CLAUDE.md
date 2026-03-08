# Toxic Review

AI-powered code review app that roasts GitHub PRs with adjustable "cringe levels" (1-5). Users submit a PR URL, the app fetches the diff via GitHub API, sends it to OpenAI for a comedic-but-technically-accurate review, and displays results in a Reddit-style community feed with voting.

**Data flow**: PR URL → backend fetches diff from GitHub API → sends to OpenAI with cringe-level persona prompt → stores review + comments in DB → frontend displays in feed. Individual reviews viewable at `/reviews/[id]` with full diff; selected comments can be published back to the PR.

**Two routers**:
- `routers/reviews.py` — CRUD for reviews (create triggers GitHub→OpenAI pipeline, publish pushes comments to the PR)
- `routers/feed.py` — public feed with hot/top/new sorting, dedup, and anonymous voting

**Services layer** (`app/services/`): `github_service` (PR fetching + bulk comment publishing as a PR review), `openai_service` (diff→review via GPT-4o, cringe level controls persona and temperature), `diff_service` (parses unified diffs, extracts line context for feed cards).


## Feed

The feed (`GET /api/feed`) shows individual review comments (not full reviews) in a Reddit-style scrollable list. Each card shows the comment body, severity badge, cringe level, a collapsible diff snippet around the commented line, and vote buttons.

**Sorting**: `new` (by created_at), `top` (by score, filterable by day/week/month/all), `hot` (Reddit-style decay — `ln(|score|)*sign + 0.5*score + seconds_since_epoch/45000`; each vote ≈ 6 hours of recency). Hot sort epoch is hardcoded to `2024-01-01`.

**Dedup**: multiple reviews of the same PR may comment on the same file+line. A window function picks the "best" one per (repo, PR, file, line) — priority: highest score → highest cringe level → newest. Only the winner appears in the feed.

**Voting**: anonymous via browser fingerprint (SHA-256, 64-char hex). Same vote twice = un-vote (toggle off). Vote counts are denormalized on `ReviewComment` (upvotes/downvotes/score columns) — manually incremented in the endpoint, not computed from `Vote` table. Frontend does optimistic UI updates, then re-fetches the full feed page to get correct sort order.


## Dev Setup

```bash
# Database — start first
docker compose up -d  # PostgreSQL on :5432

# Backend (Python 3.12+)
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (Node 20+)
cd frontend
npm install
npm run dev  # port 3000, expects backend on :8000
```

Tables are auto-created by SQLAlchemy on backend startup (`init_db` in lifespan).

### Environment Variables

Create `.env` in the **repo root** (not in backend/):
- `DATABASE_URL` — defaults to `postgresql+asyncpg://postgres:postgres@localhost:5432/toxic_review`
- `OPENAI_API_KEY` — required for AI reviews
- `GITHUB_TOKEN` — optional for fetching PRs; required for publishing comments back to GitHub

## Testing

```bash
cd backend
pytest
```

Tests use SQLite in-memory via `aiosqlite` (overrides `get_db` in `tests/conftest.py`). No frontend tests exist.

When mocking external services, patch where functions are **imported** (e.g., `app.routers.reviews.fetch_pr_info`), not where they're defined (`app.services.github_service.fetch_pr_info`). See existing tests for examples.


## Code Style

**Backend (Python)**:
- Async everywhere — all DB operations, HTTP calls, and service functions are `async`
- SQLAlchemy 2.0 style: `mapped_column`, `Mapped[T]` type annotations, `select()` (not legacy `query()`)
- Routers use `Depends(get_db)` for session injection; never create sessions manually
- Pydantic v2 schemas with `model_config = {"from_attributes": True}` for ORM mapping

**Frontend (TypeScript/React)**:
- Next.js 15 App Router — all pages/components are `"use client"` (no RSC)
- State via `useState`/`useCallback` only — no state management library
- All API calls go through `lib/api.ts` `request<T>` wrapper (typed, no-store cache)
- Theming via CSS custom variables in `globals.css` (light: `:root`, dark: `.dark`), toggled by `next-themes`. Use `var(--*)` tokens, never hardcode colors
- Icons from `lucide-react`, inline SVG for small glyphs (vote arrows)
- Component callbacks use `onX` naming (e.g., `onVote`, `onSortChange`)


## Non-Obvious Patterns

- **AI comment limits**: the OpenAI prompt requests max 2 comments/file, 6/PR, but this is not enforced in code
- **PR file pagination**: GitHub API is called with `per_page=100`; very large PRs may have incomplete file lists
- **Diff context fallback**: `diff_service.extract_diff_context` matches by `new_line_number` first, falls back to `old_line_number` for deleted lines
