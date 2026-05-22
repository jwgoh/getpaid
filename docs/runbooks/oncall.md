# On-call runbook

Where to look first, what to check, common failure modes. Scoped to the current observability posture: no error-tracking service (Sentry/Glitchtip) and no aggregated metrics are wired up — both are known open work.

## Paging triggers

There is no automated pager today. Triggers are operator-discovered:

- Customer email / Twitter / GitHub issue reports a 500 or stuck flow.
- Vercel email alert (default: deploy failure).
- Manual check that surfaces a stuck queue (`EmailOutbox PENDING` count climbing).

When pager / alerting infrastructure lands, this section names the page-receiver and the routing rules.

## Where to look first

In rough order of "answers most failures fastest":

### 1. Vercel runtime logs (production)

- Vercel Dashboard → Project → Logs.
- Filter by time window matching the user-reported issue.
- Search by route path (`/api/invoices/`) or error message.
- Caveat: there are no request IDs in logs today, so requests cannot be correlated by a stable identifier. To trace a specific user's request you grep by their email address — which itself leaks into logs via Resend error messages, a known PII-in-logs gap.

### 2. EmailOutbox table

- `pnpm db:studio` (locally, against `DATABASE_URL=$PROD_DATABASE_URL`).
- Open `EmailOutbox` table.
- Filter `status = PENDING` to find stuck emails.
- Inspect `lastError` column on FAILED rows.
- See "Resend / email" failure mode below for next steps.

### 3. Resend dashboard

- <https://resend.com/emails>.
- Search by recipient email.
- Confirms whether the email actually left Resend.
- Bounces / complaints / blocked addresses surface here.

### 4. Postgres slow queries

- For a "the dashboard is slow" report: connect to the prod DB and run:

  ```sql
  EXPLAIN ANALYZE SELECT ... FROM "Invoice" WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 50;
  ```

- The schema's hot indexes are listed in `prisma/schema.prisma`. Missing-index regressions surface as sequential scans in EXPLAIN output.

## Common failure modes

### Resend / email send is failing

Symptoms: customer reports "I sent an invoice but the client never received it", `EmailOutbox` rows piling up in `PENDING` or `FAILED`, `lastError` populated.

Triage:

1. Check Resend dashboard status page (<https://status.resend.com>).
2. Check `EmailOutbox.lastError` — if it's a domain reputation issue (`5xx Mailbox unavailable`), confirm `EMAIL_FROM` is a verified sender in Resend.
3. If Resend is up and the domain is verified, the outbox processor (`pnpm outbox:run`) retries automatically with exponential backoff (5 min × 2^attempts up to 5 attempts). Manual re-trigger:

   ```bash
   DATABASE_URL=$PROD_DATABASE_URL RESEND_API_KEY=$PROD_RESEND_API_KEY pnpm outbox:run
   ```

4. If a single message is permanently failing (recipient blocks all email), set `status = FAILED` manually and reach out to the user.

See `cron.md` for the outbox cron schedule.

### Sign-up / sign-in blocked

Symptoms: users can't sign up; sign-up returns `403 REGISTRATION_DISABLED`.

Triage:

1. Confirm the deploy edition: `NEXT_PUBLIC_GETPAID_EDITION` should be `pro` for getpaid.dev. If it's `community`, anyone can sign up — that's the wrong setting.
2. For `pro`: every sign-up requires the email to be `APPROVED` on the waitlist. See `waitlist.md` for the approval workflow.

Sign-in failures (no error, just login loops):

1. `AUTH_TRUST_HOST=true` must be set when behind a proxy (Vercel always; Docker behind Caddy/nginx). Without it NextAuth refuses to honour forwarded headers.
2. `NEXTAUTH_SECRET` rotated since the user's last login? They need to log in again — old JWTs are invalidated.

### Database connection pool exhausted

Symptoms: 500s on every route, Vercel logs show `connection refused` or `too many connections`, Postgres `pg_stat_activity` lists many idle connections.

Triage:

1. The Prisma adapter is pinned to `max=1` connection per Vercel function instance (`src/server/db/index.ts`). Cold-start spikes can still exhaust the upstream `max_connections`.
2. Switch `DATABASE_URL` to a pooled connection string (Neon `-pooler`, Supabase port 6543, pgBouncer in transaction-pool mode). Most prod DB providers offer this as a separate connection string.
3. If pooled already, scale `max_connections` upward at the DB host or kill idle connections:

   ```sql
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND state_change < now() - interval '10 minutes';
   ```

### Invoice "stuck" in DRAFT after send

Symptoms: User clicked "Send", got success, but the invoice still shows DRAFT status.

Triage:

1. Check `EmailOutbox` for the corresponding row (`relatedType = INVOICE`, `relatedId = <invoiceId>`). If `status = PENDING`, the Resend dispatch failed — the DB transaction succeeded but the outbox dispatch is retrying.
2. The actual `Invoice.status` flip to SENT is inside the transaction. If the invoice still shows DRAFT, the transaction was rolled back — check Vercel logs for the underlying error.
3. Manual re-trigger after fixing the root cause: `pnpm outbox:run`.

### Manual payment recorded twice

Symptoms: User reports "I clicked record-payment once but I see two payment rows."

Triage:

1. Confirm the React Query mutation generated a fresh `Idempotency-Key` per submit (`generateIdempotencyKey()` in `src/shared/api/idempotency-key.ts`).
2. Look for two rows in `IdempotencyKey` table for endpoint `POST /api/invoices/:id/payments`. If there are two distinct keys, the user's UI generated two — investigate the React Query state machine.
3. Reverse one of the duplicates via `DELETE /api/invoices/:id/payments?paymentId=<id>` — that's also the manual path for the user.

## What to do after triage

- Document the root cause inline in `docs/runbooks/incident-template.md` (per-incident copy).
- If the failure is recurring, file an issue capturing the underlying gap so it gets fixed in the next iteration.
- If a code or env change was required, follow `deployment.md` to roll out the fix (with backup + smoke test).

## Pro-edition specifics

For monitoring + alerting + customer-support workflow on the hosted `pro` instance, see `pro-edition.md`.
