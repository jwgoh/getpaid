# Pro edition runbook

Operational guidance specific to the hosted `pro` instance at `getpaid.dev`. Generic on-call procedures live in `oncall.md`; this file covers what's different about the managed instance.

## Hosting topology

- **Application.** Vercel (Next.js standalone deployment, US-East primary region). Build = `pnpm build` (which runs `prisma generate && next build`).
- **Database.** PostgreSQL 16 on a managed provider (Vercel Postgres / Neon / Supabase — operator's current choice; document the active provider in private notes, not in this repo).
- **Email.** Resend, US-default region. EU-region opt-in available if customer base shifts EU.
- **Domain.** `getpaid.dev` (DNS at registrar of operator's choice).
- **Cron / workers.** Currently external (GitHub Actions or operator's own scheduler) — see `cron.md`.

## Pro-specific environment variables

In addition to the baseline variables in `deployment.md`:

| Variable                      | Required | Why pro-specific                                 |
| ----------------------------- | -------- | ------------------------------------------------ |
| `NEXT_PUBLIC_GETPAID_EDITION` | `"pro"`  | Enables waitlist gate on sign-up + admin UI      |
| `ADMIN_EMAIL`                 | Yes      | Single email permitted to hit `withAdmin` routes |

## Monitoring

The current observability surface is thin (see `.audit/1778157009/observability.md` — score D). Until OBS-001 / OBS-002 land, monitoring is manual:

### Daily

- [ ] Vercel deployment dashboard: any failed builds in the last 24h?
- [ ] Vercel runtime logs: scan for `INTERNAL_ERROR` / 500 stack traces.
- [ ] Resend dashboard: bounce rate, complaint rate, blocked addresses.
- [ ] `EmailOutbox` table: any rows >1 hour old in PENDING or FAILED state?
- [ ] `FollowUpJob` table: PENDING count + the oldest `nextAttemptAt`.

### Weekly

- [ ] Postgres host: connection count, storage usage, slow query log.
- [ ] Resend: sender reputation, domain authentication (SPF / DKIM / DMARC).
- [ ] Active user count vs week-over-week (informal — there's no metric pipeline yet).

### Monthly

- [ ] Quarterly restore drill (every third month — see `docs/backup.md`).
- [ ] Sub-processor change check (Resend / Postgres host plan changes, region adds).
- [ ] Review `.audit/<ts>/` for any newly opened findings that affect prod.

## Alerting (placeholder)

No automated alerting today. When alerting lands (OBS-002 / OBS-007), this section names:

- The error-rate threshold per route.
- The latency P95 threshold.
- The page receiver (single contributor today).
- The escalation path (none today).

## Customer support workflow

Inbound channels: email to operator, GitHub Issues, direct message on social. There is no in-app support widget or ticket system.

### Triaging an inbound report

1. Reproduce in an incognito window if possible.
2. If the report is environment-specific (e.g. only happens for the reporter's account), check Vercel logs filtered to their email + a 1-hour window around the reported time.
3. Check the affected DB rows directly via Prisma Studio (run locally with `DATABASE_URL=$PROD_DATABASE_URL pnpm db:studio`).
4. If the issue is data-shaped (e.g. "my invoice total is wrong"), inspect:
   - `Invoice` row (`subtotal`, `discountValue`, `taxRate`, `total`).
   - `InvoiceItem` rows for that invoice.
   - `Payment` rows for that invoice.
   - The math in `src/shared/lib/calculations.ts` is the source of truth.

### Common requests

- **"Delete my account."** No self-service path today (DATA-003 / CROSS-DATA-003). Manual `User` row deletion cascades to all owned data. Ack within 24h, complete within 30 days per GDPR Article 17.
- **"Export my data."** No self-service path today. Manual `pg_dump --table` for the user's owned tables, then JSON-encode for the user. Same SLA.
- **"I forgot my password."** No password-reset flow today (Security gap, not currently filed). Manual fallback: regenerate `passwordHash` to a known value, send to user via secure channel, force them to change on first login (no UI for this either — interim fix).
- **"My invoice email never arrived."** Check `EmailOutbox` + Resend dashboard per `oncall.md`.
- **"How do I do X in the UI?"** Add to a future FAQ (none exists today).

## Pro-specific known limitations

These are documented gaps a `pro` operator should be aware of and ready to explain to customers:

- **No tests.** ADR 0003. Regressions surface via user reports.
- **No self-service GDPR endpoints.** DATA-003. Manual fulfilment within 30 days.
- **No password-reset flow.** Manual operator workflow until built.
- **No SLO / status page.** Best-effort uptime; no formal commitment until the instance leaves beta.
- **Single admin.** `ADMIN_EMAIL` accepts exactly one email. Multi-admin support requires schema work.
- **Edition is compile-time.** Switching `community` ↔ `pro` requires a rebuild + redeploy (ADR 0004).

## Pro-specific deployment notes

- The PR review process is informal (single contributor) but the `deployment.md` checklist applies in full — backup, manual `pnpm db:migrate:deploy`, smoke-test.
- Vercel auto-deploys on merge to `master`. There's no manual gate beyond the operator clicking the Vercel "Promote to Production" if they staged a preview.
- DNS TTL on `getpaid.dev` should be ≤300s during planned maintenance windows so a rollback is immediate.

## Pro-specific incident classification

Use `incident-template.md` and additionally tag incidents:

- **P1.** Customer-facing data loss / unauthorised access / extended outage (>1h). Public communication required.
- **P2.** Single user blocked (e.g. can't send invoices) for >2h. Direct communication with the affected user.
- **P3.** Cosmetic / non-blocking bug. No SLA; backlog.

## Open work (pro-specific)

- **Status page** at `status.getpaid.dev` (or hosted via UptimeRobot / Better Stack) — not deployed.
- **Sentry / Glitchtip** for error tracking — OBS-002.
- **PagerDuty / Opsgenie / Slack webhook** for alert routing — OBS-007.
- **In-app support form** — not currently filed.
- **Multi-admin support** — schema change required; not currently filed.
