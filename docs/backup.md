# Backup

This document describes the backup posture for GetPaid operators. The user's only durable persistent state is the PostgreSQL database — no other persistent storage is used (PDFs are generated on the fly, emails route through Resend, no file uploads).

## Managed Postgres (recommended for `pro`)

For the hosted `pro` instance at `getpaid.dev`, the backup story relies on the managed-Postgres provider's defaults:

| Provider        | Default backup window                           | PITR available   |
| --------------- | ----------------------------------------------- | ---------------- |
| Neon            | Daily snapshots, 7 days on free, longer on paid | Yes (paid plans) |
| Supabase        | Daily snapshots, 7 days on free, longer on paid | Yes (paid plans) |
| Vercel Postgres | Daily snapshots                                 | Yes (paid plans) |
| Render          | Daily snapshots, 7 days on free                 | Yes (paid plans) |

Operator checklist:

1. Verify the active provider's backup retention covers the operator's RPO target (Recovery Point Objective). Default 24h is acceptable for an MVP; tighten if regulators or paying customers require it.
2. Enable point-in-time-recovery (PITR) if the provider offers it. Worth the cost for any deployment with revenue-bearing user data.
3. Document the provider + retention window inline in operator notes (the secret-friendly version goes in a private runbook, not in this repo).
4. **Test the restore.** Perform a quarterly drill: dump prod → restore to a `getpaid-staging` DB → run `pnpm typecheck && pnpm build` against it. Log the date of the last successful drill.

Pre-deploy backup discipline (codified in `docs/runbooks/deployment.md`): always `pg_dump $PROD_DATABASE_URL > backup-$(date +%s).sql` before applying a migration via `pnpm db:migrate:deploy`.

## Self-hosted Docker (`community`)

The default `docker-compose.yml` provisions a Postgres 16 container with a named Docker volume (`pgdata`). This survives container restarts but does **not** survive host loss. Self-hosters must configure their own backup strategy.

Minimum recommended posture — daily `pg_dump` to local disk:

```bash
# /etc/cron.d/getpaid-backup (host crontab)
# Runs daily at 03:00 UTC; keeps last 7 days
0 3 * * * docker exec -t getpaid-db-1 pg_dump -U getpaid getpaid \
  | gzip > /var/backups/getpaid/getpaid-$(date +\%Y\%m\%d).sql.gz \
  && find /var/backups/getpaid -name "getpaid-*.sql.gz" -mtime +7 -delete
```

Better posture — sync the daily dump off-host:

```bash
# Append to the cron line above:
&& aws s3 cp /var/backups/getpaid/getpaid-$(date +\%Y\%m\%d).sql.gz \
  s3://your-bucket/getpaid/
```

Restore from a `pg_dump` snapshot:

```bash
# Stop the app to prevent writes during restore
docker compose stop app

# Restore (drops + recreates the database)
gunzip -c getpaid-20260508.sql.gz | docker exec -i getpaid-db-1 psql -U getpaid -d postgres -c "DROP DATABASE getpaid;"
gunzip -c getpaid-20260508.sql.gz | docker exec -i getpaid-db-1 psql -U getpaid -d postgres -c "CREATE DATABASE getpaid;"
gunzip -c getpaid-20260508.sql.gz | docker exec -i getpaid-db-1 psql -U getpaid -d getpaid

docker compose start app
```

The container `CMD` runs `prisma migrate deploy` on boot. If the restored snapshot pre-dates the latest migrations, pending migrations apply automatically.

## Encryption-key rotation

`ENCRYPTION_KEY` (used for AES-256-GCM encryption of Toggl API tokens) has no automated rotation today. Rotation procedure:

1. Generate the new key: `openssl rand -base64 32`.
2. Schedule a maintenance window — rotation invalidates existing time-tracking connections.
3. Stop the app, flush the affected `TimeTrackingConnection` rows, deploy the new key, restart.
4. Affected users re-connect their Toggl integrations on next visit.

Adding a key-versioning column to `TimeTrackingConnection` (`encryptionKeyVersion`) and supporting dual-key decryption during a rolling rotation window is tracked as a future improvement (no audit ID assigned yet — pre-feature posture).

## Out of scope

- **File / object storage** — none in use today. PDFs are generated transiently per request.
- **Vector / search index backups** — none in use today.
- **Email outbox replay** — `EmailOutbox` rows are part of the Postgres database; covered by the same backup posture. The transactional outbox pattern (see `CLAUDE.md`) ensures emails are not lost during a snapshot restore (PENDING rows are retried by `pnpm outbox:run`).

## Open work

- **Automatic prune for unbounded tables.** `InvoiceEvent` grows without retention. Tracked as DATA-001 in `.audit/1778157009/data-lifecycle.md`.
- **Quarterly restore drill.** Currently informal; tracked as a discipline item in `docs/runbooks/deployment.md`.
- **DR runbook for total host loss** (self-hosted). Out of scope for this doc; covered by `docs/runbooks/incident-template.md` once the operator fills it in.
