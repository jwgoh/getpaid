# Cron / scheduled-tasks runbook

One background worker is required for GetPaid to function autonomously. It is a tsx script under `scripts/`.

| Worker       | Script                                          | What it does                                                                                                                          | Frequency                    |
| ------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Email outbox | `pnpm outbox:run` (`scripts/process-outbox.ts`) | Dispatches PENDING emails (invoices, waitlist confirmations) via Resend; retries with exponential backoff up to 5 attempts | Recommend every 5–10 minutes |

There is no internal scheduler — the operator wires it up to an external trigger (Vercel cron / GitHub Actions / systemd timer / cron daemon).

## Vercel cron (recommended for managed `pro`)

The repo does not currently ship a `vercel.json` (the previous Salt Edge cron was removed when banking was deleted). To re-enable scheduled tasks, create `vercel.json` at the project root with a cron entry pointing at a route that invokes the worker. The current shape of the worker is a **CLI script**, not an HTTP route — so wiring it to Vercel cron requires either:

1. **Adding an HTTP wrapper.** Open work — see OBS-010 for the proposed design (`POST /api/cron/outbox`, gated by an `x-cron-secret` header). Until that lands, Vercel cron cannot drive it directly.
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

## Verifying the schedule is running

There is no application-level "did the cron run today?" alert (open work — see OBS-010). To verify manually:

1. Check the GitHub Actions / systemd timer logs for the last successful run.
2. Confirm `EmailOutbox.status = PENDING` rows older than 30 minutes are decreasing.

If that count climbs monotonically, the cron is not firing — see `oncall.md` "Email queue stuck".

## Open work

- **HTTP cron wrapper** (`POST /api/cron/outbox`) gated by `x-cron-secret`. Tracked as OBS-010.
- **"Cron didn't run in last 24h" alert.** Tracked as OBS-007 — depends on a structured logger (OBS-001) shipping first.
