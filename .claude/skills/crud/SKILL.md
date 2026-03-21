---
name: crud
description: Scaffold a CRUD resource with model, schemas, router, and tests. Invoke when the user asks to add a new database entity, resource, or endpoint group (e.g. "add tags", "create a bookmarks table", "I need CRUD for X").
argument-hint: <resource-name>
---

# CRUD Scaffolding for `$ARGUMENTS`

Propose a set of fields (names, types, relationships, constraints) for the resource based on its name and the existing codebase context. Present the proposal to the user for approval before writing any code.

Derive names from `$ARGUMENTS` (singular, e.g. "tag"): PascalCase for class, plural snake_case for table/router/test file.

Read these files for patterns before generating code:
- `backend/app/models.py` — model conventions
- `backend/app/schemas.py` — schema conventions
- `backend/app/routers/reviews.py` — router conventions
- `backend/tests/test_reviews.py` — test conventions

## Steps

1. **Model** → append to `backend/app/models.py`
2. **Schemas** → append to `backend/app/schemas.py`
3. **Router** → create `backend/app/routers/<table>.py` with POST, GET list (paginated), GET by id, PUT, DELETE
4. **Register** → add import + `app.include_router()` in `backend/app/main.py`
5. **Tests** → create `backend/tests/test_<table>.py` — 8 tests: create, list, get, get-404, update, update-404, delete, delete-404
6. **Verify** → `cd backend && python -m pytest tests/test_<table>.py -v` — all must pass

## Soft Delete

All models must use soft delete instead of hard delete:
- Add `deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, default=None, index=True)` to every model
- DELETE endpoint sets `deleted_at = datetime.utcnow()` instead of `db.delete()`
- All queries must filter `where(Model.deleted_at.is_(None))` — list, get-by-id, and any relationship joins
- Response schemas should NOT expose `deleted_at`
- Tests: after DELETE, verify the row still exists in DB with `deleted_at` set (not physically removed), and verify GET returns 404

## Non-obvious conventions (will break if missed)

- `default=datetime.utcnow` — no parens, it's a function reference
- `cascade="all, delete-orphan"` on parent relationship — required for delete to work
- `ForeignKey("table.id", ondelete="CASCADE")` with `index=True` on every FK column
- `model_config = {"from_attributes": True}` on response/list schemas only, not on create
- `scalar_one_or_none()` for single lookups, `scalars().all()` for lists
- `selectinload()` for any relationship accessed in the response
- List endpoints must use `offset`/`limit` pagination, never unbounded
- Tests: patch at **import path** (`app.routers.<table>.func`), not definition path
- Tests: use existing `conftest.py` fixtures (`client`, `setup_db`) — no extra setup
- Computed fields (like `comment_count`) go in the list endpoint builder, not the model
