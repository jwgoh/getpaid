# ADR 0002: Schema management — `prisma migrate deploy` over `db push`

- **Status:** Accepted (supersedes the original `prisma db push` posture)
- **Date:** 2026-05-08

## Context

The project initially shipped with `prisma db push` as the schema-management strategy: no `prisma/migrations/` directory, the Dockerfile `CMD` ran `prisma db push && node server.js`, and `package.json` exposed `db:push` as a script. This is appropriate for throwaway dev environments — `db push` reconciles the live database to match `prisma/schema.prisma` with no migration history, no rollback path, and the freedom to silently drop columns/tables when the schema diverges.

The project now operates a managed `pro` instance at `getpaid.dev` with real users (waitlist signups, invoice data). On a real-user database:

- `db push` is unsafe — a schema diff that drops a column will silently destroy data on the next container restart.
- There is no audit trail of how the schema arrived at its current shape.
- Rolling back a bad schema change requires a backup restore, not a forward migration.

The audit (`.audit/1778157009/`) flagged this as DEC-001 (decision-level finding). This ADR records the corrected posture so the original mistake is not reinvented.

## Decision

Adopt **Prisma migration files committed to git**, applied via `prisma migrate deploy` on production deploys. Specifically:

1. **Local workflow.** Schema edits go through `pnpm db:migrate -- --name <change-summary>` (which calls `prisma migrate dev`). The generated `prisma/migrations/<ts>_<name>/migration.sql` is reviewed and committed alongside the code change.
2. **Migration discipline (manifesto 2.8 — expand-then-contract).** Destructive SQL (`DROP COLUMN`, `DROP TABLE`, `ALTER COLUMN TYPE` without backfill) is forbidden in a single migration. Multi-step releases follow the expand → backfill → contract pattern across separate PRs.
3. **Production application.** Vercel does NOT auto-apply migrations on deploy. Operators apply `DATABASE_URL=$PROD pnpm db:migrate:deploy` manually before merging the PR (after a `pg_dump` backup). See `docs/runbooks/deployment.md`.
4. **Self-host (Docker).** The container `CMD` is `prisma migrate deploy && node server.js`. Pending migrations apply automatically on container boot — this is acceptable because `migrate deploy` only applies forward migrations and never destroys schema.
5. **Baseline migration.** The first migration in the project — `prisma/migrations/20260508060000_baseline/migration.sql` — was committed in `306e4c9` (chore: adopt prisma migrate deploy with baseline migration). Existing prod databases that pre-date the migration history mark it applied via `prisma migrate resolve --applied 20260508060000_baseline`.
6. **`db:push` script removed from `package.json`.** No path back to the unsafe pattern.

## Alternatives considered

- **Stay on `db push` with `--accept-data-loss=false`.** Rejected — Prisma's safety flags are not strong enough to prevent the column-rename → column-drop trap, and they don't produce a migration history.
- **Drizzle Kit / Atlas / Sqitch as a third-party migration tool.** Rejected — Prisma already owns the schema source-of-truth; introducing a parallel tool would split the responsibility.
- **Auto-apply migrations on Vercel deploy via build hook.** Rejected — Vercel deploys are previewed first, and applying migrations from an unmerged preview branch would mutate prod schema before the code lands. The "manually apply before merging" workflow is more conservative.

## Consequences

**Positive:**

- Schema changes are now auditable (git history of `prisma/migrations/`).
- Forward-only migrations remove the silent-drop class of failure.
- Self-host deployers get migrations applied for free on container boot.
- Migrations are reviewable in PRs before they touch any database.

**Negative / costs:**

- Manual step in the production deploy flow (operators must remember to run `pnpm db:migrate:deploy`).
- No automatic rollback — reverting a migration requires writing a forward migration that undoes it (or restoring from backup).
- No staging environment (yet) for dry-running migrations against representative data — see DATA-009.

**Operational implications:**

- Production deploy procedure: `docs/runbooks/deployment.md`.
- Backup posture: `docs/backup.md`.
- Pre-deploy `pg_dump` is mandatory for any migration that adds NOT NULL constraints, drops columns/tables, or changes column types.
