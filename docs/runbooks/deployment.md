# Deployment runbook

Step-by-step procedures for deploying GetPaid to Vercel (managed `pro` instance) and to Docker (self-host `community` edition). Covers schema migrations, environment variables, smoke tests, and rollback.

## Vercel — managed `pro` instance

### Pre-deploy checklist

- [ ] Local `pnpm typecheck && pnpm lint && pnpm format:check` clean.
- [ ] Schema changes in `prisma/schema.prisma` have a corresponding migration committed under `prisma/migrations/<ts>_<name>/migration.sql`.
- [ ] PR description lists user-visible changes + any operational steps (env var change, migration applied, etc.).
- [ ] Manual smoke-test plan attached to the PR (login, create invoice, send invoice, record payment).

### Step 1 — backup production DB

Always before applying a migration. Skip only for code-only PRs with no `prisma/migrations/` diff.

```bash
pg_dump $PROD_DATABASE_URL > backups/getpaid-$(date +%s).sql
```

Store backups outside the repo (e.g. an S3 bucket the operator owns). Do not commit `backups/`.

### Step 2 — apply pending migrations to prod

Vercel does NOT auto-apply migrations. Apply them manually before merging the PR so the new code lands against a migrated schema.

```bash
DATABASE_URL=$PROD_DATABASE_URL pnpm db:migrate:deploy
```

Confirm the output lists every pending migration as `applied`. If a migration fails midway, see the rollback section.

### Step 3 — merge the PR

Vercel auto-deploys on merge to `master`. The build runs `prisma generate && next build`.

### Step 4 — environment variables

Verify in Vercel Project Settings → Environment Variables that the following are set for **Production**:

| Variable                      | Required            | Notes                                                                            |
| ----------------------------- | ------------------- | -------------------------------------------------------------------------------- |
| `DATABASE_URL`                | Yes                 | Pooled connection string (Neon `-pooler` host, Supabase port 6543, or pgBouncer) |
| `NEXTAUTH_SECRET`             | Yes                 | ≥32 chars, generated via `openssl rand -base64 32`. Never reuse a dev secret     |
| `NEXTAUTH_URL`                | Yes                 | The public origin (`https://getpaid.dev`)                                        |
| `APP_URL`                     | Yes                 | Same as `NEXTAUTH_URL` for the managed instance                                  |
| `RESEND_API_KEY`              | Yes (for email)     | Email send + waitlist all gated on this                                          |
| `EMAIL_FROM`                  | Yes                 | The verified sender address in Resend                                            |
| `ADMIN_EMAIL`                 | Yes (`pro` edition) | Single email matching the user who can hit waitlist-admin routes                 |
| `ENCRYPTION_KEY`              | Yes (time tracking) | ≥32 chars; rotating invalidates existing Toggl connections                       |
| `NEXT_PUBLIC_GETPAID_EDITION` | Yes (`pro`)         | Set to `pro`; defaults to `community`                                            |
| `AUTH_TRUST_HOST`             | Yes                 | `"true"` — Vercel runs behind a proxy                                            |

Changes to env vars require a redeploy to take effect.

### Step 5 — post-deploy smoke test

Run through the manual smoke-test checklist (no automated tests yet — see ADR 0003):

1. Log in as a known test user.
2. Create a new invoice with at least one line item.
3. Send the invoice (verify Resend dashboard shows the send).
4. Open the public viewer URL in an incognito window — verify the view-tracking event lands in the timeline.
5. Record a partial payment, then record the remainder; status should flip PARTIALLY_PAID → PAID.
6. Delete the test invoice and the test client to leave prod clean.

If any step fails, escalate to rollback.

## Rollback

### Code rollback

Vercel preserves previous deploys. Revert via the Vercel dashboard:

1. Vercel Project → Deployments → find the last good deploy → "Promote to Production".
2. Or `git revert <bad-commit>` + push; Vercel auto-redeploys against the prior code.

### Migration rollback

Prisma does not generate down migrations. Two options when a migration is bad:

1. **Forward-revert migration.** Write a new migration that undoes the schema change, commit it, apply via `pnpm db:migrate:deploy`. Preferred for small additive issues (drop the column you just added).
2. **Restore from backup.** Stop traffic (or accept brief data loss), `psql $PROD_DATABASE_URL < backups/getpaid-<ts>.sql`, then mark the bad migration as rolled back: `pnpm prisma migrate resolve --rolled-back <migration_name>`.

For destructive changes (column dropped, table dropped) the only path is the backup restore — the backup taken in Step 1 of the deploy checklist is what saves you.

After any restore, re-run Step 5 (smoke test) before opening the gates again.

## Docker self-host (`community` edition)

The `community` posture is simpler — operators control their own host.

### First boot

```bash
git clone https://github.com/maksim-pokhiliy/getpaid.git
cd getpaid

{
  echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)"
  echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)"
} > .env

docker compose up -d
```

The container `CMD` runs `prisma migrate deploy && node server.js` on every start. First boot creates the schema by applying every migration in `prisma/migrations/`. Subsequent boots are no-ops if the schema is up to date.

### Required env (Docker compose)

- `POSTGRES_PASSWORD` — required; compose hard-fails without it.
- `NEXTAUTH_SECRET` — required.
- `AUTH_TRUST_HOST=true` — preset in `docker-compose.yml`.

### Optional env

Uncomment in `.env` to enable:

- `RESEND_API_KEY` + `EMAIL_FROM` — to send invoice emails. Without it, send routes return 500 / fail silently in the outbox.
- `ADMIN_EMAIL` — for the `pro` edition waitlist admin (only relevant if you set `NEXT_PUBLIC_GETPAID_EDITION=pro`).
- `ENCRYPTION_KEY` — for the Toggl Track integration. Without it, time-tracking endpoints throw on first save.

### Updates

```bash
git pull
docker compose down
docker compose build app
docker compose up -d
```

The container re-applies any new migrations on boot. Take a `pg_dump` backup before pulling a release with schema changes.

### Self-host rollback

```bash
git checkout <previous-tag-or-commit>
docker compose down
docker compose build app
docker compose up -d

# If schema needs to roll back, restore from your latest pg_dump:
docker exec -i getpaid-db-1 psql -U getpaid -d getpaid < backups/last-good.sql
```

See `docs/backup.md` for backup configuration patterns.

## Cron / worker scheduling

After deploy, ensure the background workers are scheduled. See `docs/runbooks/cron.md`.

## Open work

- **Automated smoke-test post-deploy.** Today the smoke test is manual — see ADR 0003 (test strategy) for the back-fill plan.
- **Staging environment.** None today. Migrations are dry-run only via `prisma migrate diff` against `$PROD_DATABASE_URL`. A representative staging DB for dry-running migrations is a known open item.
