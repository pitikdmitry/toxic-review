---
name: db-queries
description: Rules for writing efficient async SQLAlchemy queries in this project. Invoke when adding or modifying database queries, endpoints that read/write data, or optimizing slow queries.
---

# Efficient Database Queries

Apply these rules when writing or modifying any SQLAlchemy query in the backend.

## Session Behavior

- Sessions use `expire_on_commit=False` — scalar attributes stay accessible after commit without refresh
- `await db.refresh(obj, ["relationship"])` is only needed to reload relationships or server-generated values (triggers, defaults) after commit
- Session cleanup (rollback on exception) is handled by the `get_db` context manager — no manual rollback needed
- Always use `Depends(get_db)` — never create sessions manually
- An `AsyncSession` is NOT safe across concurrent `asyncio` tasks — each task needs its own session

## Query Patterns

- Always use `select()` style, never legacy `session.query()`
- Single row: `.scalar_one_or_none()` — use `.first()` only when you genuinely want top-1 from multiple rows
- By primary key: `await db.get(Model, id)` — but only when you don't need `.options()` (it can't chain eager loads)
- When you need PK + relationships: use `select(Model).where(Model.id == id).options(selectinload(...))`
- Multiple rows: `.scalars().all()`
- Count: `select(func.count()).select_from(...)` — never load rows just to `len()` them
- Multi-column select: `select(ModelA, ModelB.col1, ModelB.col2).join(...)` returns rows where `row[0]` is ORM object, `row[1..n]` are scalars — see `feed.py` get_feed

## Relationship Loading

- `selectinload()` for one-to-many (e.g., `Review.comments`) — one extra query, no row duplication
- `joinedload()` for many-to-one (e.g., `ReviewComment.review`) — single JOIN, no extra query
- Never access a relationship without an explicit load strategy — lazy loading raises in async
- Never use `lazy="dynamic"` — incompatible with async. Use `lazy="write_only"` for large collections
- Never call `db.expire(obj)` — expired attributes can't lazy-load in async. Use `db.refresh()` instead

## Filtering & Pagination

- Always paginate list endpoints with `offset`/`limit` — never return unbounded results
- Apply filters via `.where()`, not Python-side filtering after loading
- Use `.in_()` for batch lookups (e.g., fetching votes for a page of comments)
- Joins: always explicit `.join(Model, condition)` — don't rely on implicit relationship joins

## Writes

- `db.add()` + `db.flush()` when you need the generated ID before commit (parent → children pattern)
- Batch inserts: loop `db.add()` then single `commit()` — or `db.add_all([...])`
- For update-then-read (like voting), modify ORM object attributes directly, then `commit()` + `refresh()`
- For racing unique constraints (e.g., duplicate votes), use `begin_nested()` (SAVEPOINT) to catch `IntegrityError` without aborting the transaction
- Every `ForeignKey` column must have `index=True`

## Subqueries

- `.subquery()` for use in joins/filters — reference columns via `.c.column_name`
- `.scalar_subquery()` for use in `.where(col.in_(...))` — returns a single-column result (see `feed.py` best_ids_subq)
- Window functions (`func.row_number().over(partition_by=..., order_by=...)`) for dedup/ranking
- `case()` for conditional expressions in ORDER BY
- Build computed expressions as SQLAlchemy objects — no raw SQL strings
