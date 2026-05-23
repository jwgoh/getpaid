# Cron / scheduled-tasks runbook

Two background workers are required for GetPaid to function autonomously. Both are tsx scripts under `scripts/`.

| Worker         | Script                                            | What it does                                                                                                                          | Frequency                                              |
| -------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Email outbox   | `pnpm outbox:run` (`scripts/process-outbox.ts`)   | Dispatches PENDING emails (invoices, waitlist confirmations) via Resend; retries with exponential backoff up to 5 attempts | Recommend every 5–10 minutes                           |
| Expired prune  | `pnpm prune:expired` (`scripts/prune-expired.ts`) | Deletes expired `IdempotencyKey` rows, sent/failed `EmailOutbox` rows past retention, and orphan `WaitlistEntry` rows                  | Recommend once daily (NOT yet cron-scheduled — manual) |

There is no internal scheduler — the operator wires it up to an external trigger (Vercel cron / GitHub Actions / systemd timer / cron daemon).

## Vercel cron (recommended for managed `pro`)

The repo does not currently ship a `vercel.json` (the previous Salt Edge cron was removed when banking was deleted). To re-enable scheduled tasks, create `vercel.json` at the project root with a cron entry pointing at a route that invokes the worker. The current shape of the worker is a **CLI script**, not an HTTP route — so wiring it to Vercel cron requires either:

1. **Adding an HTTP wrapper.** Open work — the proposed design is a `POST /api/cron/outbox` route gated by an `x-cron-secret` header. Until that lands, Vercel cron cannot drive it directly.
2. **External scheduler that invokes the script.** A GitHub Actions workflow on `schedule:` triggers can SSH into a runner with the env set and execute `pnpm outbox:run` — works for managed Postgres because the connection string is the only state needed.

### Minimal GitHub Actions example (until HTTP cron wrappers land)

```yaml
# .github/workflows/cron-outbox.yml
name: outbox-run
on:
  schedule:
    - cron: "*/5 * * * *"
  workflow_dispatch: {}
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 10.28.2 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm outbox:run
        env:
          DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
          RESEND_API_KEY: ${{ secrets.RESEND_API_KEY }}
          EMAIL_FROM: ${{ secrets.EMAIL_FROM }}
```

## Self-hosted Docker — systemd timer

Inside the Docker host, a systemd timer is the simplest scheduler:

```ini
# /etc/systemd/system/getpaid-outbox.service
[Unit]
Description=GetPaid email outbox processor
After=docker.service

[Service]
Type=oneshot
ExecStart=/usr/bin/docker exec getpaid-app-1 pnpm outbox:run
```

```ini
# /etc/systemd/system/getpaid-outbox.timer
[Unit]
Description=Run GetPaid outbox every 5 minutes

[Timer]
OnBootSec=1min
OnUnitActiveSec=5min
Unit=getpaid-outbox.service

[Install]
WantedBy=timers.target
```

```bash
systemctl enable --now getpaid-outbox.timer
```

## Manual run (CLI)

For debugging or backfill, run the worker from a shell with the prod env loaded:

```bash
# Email outbox — drains PENDING rows
DATABASE_URL=$PROD_DATABASE_URL \
  RESEND_API_KEY=$PROD_RESEND_API_KEY \
  EMAIL_FROM=$PROD_EMAIL_FROM \
  pnpm outbox:run
```

Output: the script logs `attempted=N sent=N failed=N pending=N`. On failure, exit code 1 + a `Fatal error:` line.

## Pruning expired rows

`pnpm prune:expired` (`scripts/prune-expired.ts`) closes the unbounded-growth gap (`DATA-001` / `DATA-002` / `PERF-004` / `CROSS-003`) for three tables that no code path deletes from: `IdempotencyKey` (24h TTL), `EmailOutbox` (30d retention for `SENT`, 90d for `FAILED`), `WaitlistEntry` (90d retention for rows whose email already matches a `User`).

**Status:** the script is **NOT yet cron-scheduled** — it is operator-invoked at the MVP stage. REL-001 (committed cron-in-repo) will wire it onto a daily schedule next to `outbox:run`. Until then, run it manually.

### Command

```bash
DATABASE_URL=$PROD_DATABASE_URL pnpm prune:expired           # live
DATABASE_URL=$PROD_DATABASE_URL pnpm prune:expired --dry-run # preview counts
```

### Recommended cadence

Once daily. The `IdempotencyKey` TTL is 24h, so a daily run keeps the table tight without churning the worker. This is far lower cardinality than `outbox:run` (every 5–10 minutes) — separate scripts, separate cadences.

### Dry-run-first protocol

Always run `--dry-run` first on prod before the FIRST live invocation (and again after any change to a retention constant). The dry-run uses identical predicates to the live path, except the waitlist arm short-circuits the `User`-join and returns an upper bound. Verify the banner shows the expected DB host (the `prune.run.banner` line carries `host`) before proceeding to the live run. If any single table previews >100k rows, take a `pg_dump` backup first (same hygiene as `deployment.md` migrations).

### Retention windows

Constants live in source — adjusting any value is a code change + redeploy, not an env tweak (intentional: a typo in a shell cannot wipe a table).

| Table                        | Retention                  | Constant                                      |
| ---------------------------- | -------------------------- | --------------------------------------------- |
| `IdempotencyKey`             | immediate on `expiresAt`   | (no constant; the per-row TTL is the policy)  |
| `EmailOutbox` (status SENT)  | 30 days from `createdAt`   | `EMAIL_OUTBOX.RETENTION_SENT_DAYS = 30`       |
| `EmailOutbox` (status FAILED)| 90 days from `createdAt`   | `EMAIL_OUTBOX.RETENTION_FAILED_DAYS = 90`     |
| `WaitlistEntry` (orphans)    | 90 days from `createdAt`   | `WAITLIST.ORPHAN_RETENTION_DAYS = 90`         |

Files: `src/shared/config/email-outbox.ts`, `src/shared/config/waitlist.ts`. The orchestrator refuses to run if any retention is set below 1 day (`RetentionMisconfiguredError`).

### Output

Three plain-text banner lines + one `prune.run.banner` JSON line (with the DB host so the operator can sanity-check the target), then one `prune.<table>.complete` JSON line per table (`idempotencyKeys`, `emailOutboxSent`, `emailOutboxFailed`, `waitlistEntries`), then a final `prune.run.summary`. Each per-table line carries `ok`, `deleted`, `durationMs`, and `dryRun`. In dry-run mode the `deleted` field carries the would-delete count — `dryRun: true` disambiguates.

### Large-delete warning

When any sub-prune removes more than `PRUNE.LARGE_DELETE_THRESHOLD = 50_000` rows (or the dry-run would), the script emits an additional `prune.warning.large_delete` JSON line with `table` and `deleted` fields. This is **post-hoc alerting, not a guard** — the rows are already gone by the time you see the warning. Investigate: typically indicates the prune has been skipped for a long time, retention was recently shortened, or a runaway producer is filling a table. Pre-run dry-run is the actual safeguard.

### Failure semantics

Per-table isolation: if `pruneSentOutbox` throws, `pruneConvertedWaitlistEntries` still runs. Each failed table's `prune.<table>.complete` line shows `ok: false` with the bare `Error.message`. Exit code is `0` only if every table succeeded; non-zero (`1`) if any table threw. Re-running the script after a partial failure is safe — every prune is idempotent (re-issuing the same predicate against post-delete state matches zero rows).

### Clock-skew protection

The orchestrator computes `now` via Postgres `SELECT NOW()`, not `new Date()` on the operator's machine. A skewed laptop clock cannot over- or under-prune. (Source: `src/server/prune/index.ts` `resolveNow`.)

## Verifying the schedule is running

There is no application-level "did the cron run today?" alert (open work — see "Open work" below). To verify manually:

1. Check the GitHub Actions / systemd timer logs for the last successful run.
2. Confirm `EmailOutbox.status = PENDING` rows older than 30 minutes are decreasing.

If that count climbs monotonically, the cron is not firing — see `oncall.md` "Email queue stuck".

## Open work

- **HTTP cron wrapper** (`POST /api/cron/outbox`) gated by `x-cron-secret` — not yet built.
- **"Cron didn't run in last 24h" alert.** Not yet built — depends on a structured logger shipping first.
