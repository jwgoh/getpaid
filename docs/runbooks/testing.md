# Integration test runbook

Two test tiers ship with the repo. `pnpm test` runs the unit tier only (no DB). This runbook covers the integration tier — real Postgres, real `prisma.$transaction`, real CHECK / `@@unique` constraints.

## First-time setup

1. Add `DATABASE_URL_TEST` to your `.env`. The default that matches the bundled compose file is:

   ```
   DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5434/getpaid_test"
   ```

2. Boot the test Postgres container and apply pending migrations:

   ```bash
   pnpm test:integration:up
   ```

   Under the hood: `docker compose -f docker-compose.test.yml up -d --wait && DATABASE_URL=$DATABASE_URL_TEST pnpm prisma migrate deploy`. The compose service uses `tmpfs` storage on host port `5434`, so it cannot collide with the dev `db` service on `5433`.

## Running tests

| Command                                                                                  | What it does                                         |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `pnpm test:integration`                                                                  | Full integration suite (serial, ~30–60s warm)        |
| `pnpm vitest run src/server/invoices/payments.integration.test.ts --project=integration` | Single file                                          |
| `pnpm vitest run --project=integration -t "QA-001"`                                      | Tests whose `describe` / `it` name matches a pattern |

Integration tests run in a single forked worker (`pool: "forks"`, `fileParallelism: false` in `vitest.config.ts`) so the per-test TRUNCATE in `src/test/setup-integration.ts` is safe — two suites do not race against the same Postgres simultaneously.

## Cleanup

```bash
pnpm test:integration:down
```

Stops and removes the container. Because storage is `tmpfs`, all data is wiped — every `up` starts from a freshly migrated schema. This is by design: the suite must not depend on residual state.

## When the suite refuses to run

| Error                                                                                  | Fix                                                                                                                                                                    |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL_TEST is required for integration tests`                                  | Copy the entry from `.env.example` into your `.env`.                                                                                                                   |
| `DATABASE_URL_TEST database name "<name>" does not contain "test"`                     | By design — the harness refuses to TRUNCATE any DB whose name does not contain the substring `test`. Rename the test DB or point `DATABASE_URL_TEST` at one that does. |
| `Refusing to run integration tests against database "<actual>". Expected "<expected>"` | `DATABASE_URL_TEST` parses to one DB, Postgres' `current_database()` reports a different one — the two URLs in your shell disagree. Reconcile.                         |
| `Latest migration "<name>" is not applied to the test database`                        | Run `pnpm test:integration:up` to apply pending migrations.                                                                                                            |
| `Integration test DB not ready. Run pnpm test:integration:up first.`                   | The `_prisma_migrations` table is missing — the container is up but migrations have not been applied. Run `pnpm test:integration:up`.                                  |

## Safety: why the harness refuses to wipe non-test DBs

`src/test/setup-integration.ts` runs the following pre-flight before any TRUNCATE:

1. `DATABASE_URL_TEST` MUST be set — no default, no fallback. A misconfigured `DATABASE_URL` (e.g. a shell that has prod exported) cannot leak in.
2. The DB name parsed from `DATABASE_URL_TEST` must contain the substring `"test"` (case-insensitive). The substring rule is enforced before connecting, so a typo in the URL fails immediately.
3. After connecting, `SELECT current_database()` must equal the parsed name. Two URLs that disagree (e.g. `DATABASE_URL_TEST` points at `getpaid_test` but Postgres reports `getpaid_dev` because of a pgbouncer rewrite) fail with `HarnessError`.

Together these three layers mean the harness refuses to operate on prod even if `DATABASE_URL_TEST` is wrong, missing, or pointed at the wrong host.

## CI

`.github/workflows/integration.yml` runs the suite on every PR that touches server / test / schema paths. The exact path filter:

```yaml
- "src/server/**"
- "src/shared/api/**"
- "src/shared/config/**"
- "src/shared/lib/**"
- "src/shared/schemas/**"
- "src/test/**"
- "prisma/**"
- "vitest.config.ts"
- "package.json"
- "pnpm-lock.yaml"
- "docker-compose.test.yml"
- ".github/workflows/integration.yml"
```

The job uses GitHub Actions `services.postgres` (`postgres:16-alpine` on `localhost:5432`), runs `pnpm prisma migrate deploy`, then `pnpm test:integration` with `DATABASE_URL_TEST` set to the service URL.
