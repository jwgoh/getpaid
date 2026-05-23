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
3. Record the active provider, retention window, and PITR status in a private operator runbook (not in this repo — it leaks the provider choice and reveals attack surface). `pro` operators MUST keep this record current; reference it from your incident-response notes.
4. **Test the restore.** Perform the quarterly drill described in the [Restore drill](#restore-drill) section below and append a dated entry to the [Drill log](#drill-log).

Pre-deploy backup discipline (codified in `docs/runbooks/deployment.md`): always `pg_dump $PROD_DATABASE_URL > backup-$(date +%s).sql` before applying a migration via `pnpm db:migrate:deploy`. Encrypt the resulting dump at rest — the file contains every user's bcrypt password hash and every invoice's PII. Two patterns:

- **S3 with SSE-KMS** (recommended for `pro`):

  ```bash
  pg_dump $PROD_DATABASE_URL > backup-$(date +%s).sql
  aws s3 cp backup-$(date +%s).sql s3://your-bucket/getpaid/ \
    --sse aws:kms --sse-kms-key-id <kms-key-arn>
  rm backup-$(date +%s).sql   # delete the unencrypted local copy
  ```

- **Local-only host** — encrypt before writing to disk:

  ```bash
  # age (recommended; modern, simple)
  pg_dump $PROD_DATABASE_URL | age -r <recipient-pubkey> > backup-$(date +%s).sql.age

  # gpg alternative
  pg_dump $PROD_DATABASE_URL | gpg --encrypt --recipient <gpg-key-id> > backup-$(date +%s).sql.gpg
  ```

Never store an unencrypted `pg_dump` longer than the time it takes to upload / encrypt it.

## Restore drill

A backup you have never restored is a hypothesis, not a backup. Run the drill every quarter and log the date below.

Procedure:

1. Pick the most recent production backup (managed-provider snapshot or `pg_dump` from the off-host store). Decrypt to a local file if it is encrypted.
2. Provision a throwaway `getpaid-drill` database (a fresh managed DB, a local Docker `postgres:16-alpine`, or any sandbox you can destroy at the end).
3. Restore the backup:

   ```bash
   psql $DRILL_DATABASE_URL < backup-<ts>.sql
   # or for a custom-format dump:
   pg_restore -d $DRILL_DATABASE_URL backup-<ts>.dump
   ```

4. Point the app at the restored DB and run the build + a focused integrity check:

   ```bash
   DATABASE_URL=$DRILL_DATABASE_URL pnpm typecheck
   DATABASE_URL=$DRILL_DATABASE_URL pnpm build
   DATABASE_URL=$DRILL_DATABASE_URL pnpm prisma migrate status   # confirms migration history matches
   ```

5. Spot-check a handful of rows (`SELECT count(*) FROM "Invoice"`, `SELECT count(*) FROM "User"`, last invoice `createdAt`) — confirms the snapshot is not silently truncated.
6. Tear down the drill database.
7. Append a dated entry to the [Drill log](#drill-log) below — date, operator, source backup (filename / snapshot ID), and any anomalies observed.

If any step fails, treat it as a `CRITICAL` incident: backups are useless if you cannot restore them. Fix the root cause (snapshot integrity, missing object, schema drift) before the next scheduled drill.

### Drill log

| Date | Operator | Source backup | Notes |
| ---- | -------- | ------------- | ----- |
| _(no drills performed yet — pending the first quarterly drill)_ | | | |

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

- **Automatic prune for unbounded tables.** `InvoiceEvent` grows without retention; defining a prune/retention cadence for it is a known open item.
- **Quarterly restore drill cadence.** Procedure documented above; the [Drill log](#drill-log) tracks executions. Open item: wire the cadence into a calendar reminder / cron so it cannot drift back to "informal".
- **DR runbook for total host loss** (self-hosted). Out of scope for this doc; covered by `docs/runbooks/incident-template.md` once the operator fills it in.
