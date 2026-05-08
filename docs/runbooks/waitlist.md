# Waitlist runbook (`pro` edition)

The `pro` edition gates sign-up behind a waitlist + admin approval. This runbook documents the operator workflow.

## Overview

```
public sign-up -> POST /api/waitlist  -> WaitlistEntry { status: PENDING }
                                              |
                                              v
                                       admin reviews
                                              |
                                              v
admin approves -> POST /api/waitlist/approve -> WaitlistEntry { status: APPROVED }
                                              |
                                              v
                                  approval email sent via outbox
                                              |
                                              v
user signs up -> POST /api/auth/sign-up -> isEmailApproved() -> User created
```

Three states on `WaitlistEntry.status`: `PENDING`, `APPROVED`, `REJECTED`.

## Operator setup

The admin user must:

1. Set `ADMIN_EMAIL` env to an email address. This is the single user permitted to call `withAdmin` routes.
2. Set `NEXT_PUBLIC_GETPAID_EDITION=pro` so the sign-up endpoint enforces the waitlist gate and the admin UI is reachable.
3. Sign up for an account with that email (the admin doesn't bypass the waitlist; on first deploy of `pro`, sign yourself up first while there's no `User` row to compete with — or run a manual SQL insert to create the admin user before flipping to `pro`).

After deploy, the admin UI is at `/app/waitlist` (gated by `withAdmin` server-side; the `waitlistAdmin` feature flag also surfaces the navigation entry).

## Admin workflow

### Reviewing waitlist entries

Visit `/app/waitlist` (signed in as `ADMIN_EMAIL`). The page renders the full waitlist with status filters (Pending / Approved / Rejected / All).

Underlying API: `GET /api/waitlist/list` returns the array (newest first).

### Approving an email

Click "Approve" next to a pending entry. The UI calls `POST /api/waitlist/approve` with the email.

The approval flow:

1. Updates `WaitlistEntry.status` → `APPROVED`.
2. Creates an `EmailOutbox` row (kind: `WAITLIST_APPROVAL`) inside the same transaction.
3. After commit, dispatches the email via Resend (best-effort; if Resend fails, the outbox row stays PENDING and `pnpm outbox:run` retries).

Re-approving an already-approved entry is a no-op (idempotent at the service level).

### Deleting an entry

Click "Delete" on the row. UI calls `DELETE /api/waitlist/[id]`. Hard-delete; no undo. Useful for spam / typo / abuse cases.

## End-user experience

- **Public waitlist page (`/waitlist`)** — visible on `pro` builds. Form posts to `POST /api/waitlist`. Confirmation email goes to the user; notification email goes to `ADMIN_EMAIL`.
- **Sign-up page (`/auth/sign-up`)** — on `pro`, the form first checks `POST /api/waitlist/check` with the entered email. The result drives:
  - `approved` → password field shown; sign-up proceeds.
  - `pending` → "You're on the waitlist; we'll email you when you're approved" message.
  - `not_found` → redirect to `/waitlist` to sign up first.
- **Approval email** — sent via Resend after admin approval. Subject + content rendered from `buildWaitlistApprovalEmailPayload` in `src/server/email/`.

## Monitoring & cleanup

The waitlist table is small (single-digit to low-double-digit entries during invite-only beta). Two known gaps:

- **Approved-and-converted entries persist.** When a user signs up, the `WaitlistEntry` is not auto-deleted. Tracked as DATA-006.
- **No conversion-rate metric.** No dashboard shows "X approved, Y converted to users". Today this is a manual SQL query against `WaitlistEntry` joined with `User` by email.

## Common operator tasks

### Manually approve an email (CLI / SQL fallback)

If the admin UI is unreachable but the DB is:

```sql
UPDATE "WaitlistEntry" SET status = 'APPROVED' WHERE email = 'user@example.com';
```

The user can now sign up; no email is sent (the outbox row is created only when `POST /api/waitlist/approve` runs).

To send the approval email after a manual SQL approval, create the outbox row by hand or simply ask the user to retry sign-up — the lack of a notification is a UX wart, not a functional break.

### Bulk approve from a CSV

No tooling for this today. Iterate via `POST /api/waitlist/approve` calls, or `psql -c "UPDATE ..."` for status flips and skip the email.

### Audit "who approved who"

The audit trail is currently `WaitlistEntry.updatedAt` only — there's no `approvedByUserId`. If the operator team grows beyond one admin, this needs schema work (out of scope).

## Open work

- **`WaitlistStatus.CONVERTED`** state + auto-flip on sign-up — DATA-006.
- **Audit trail** for who approved an entry — not currently filed (single-admin model).
- **Bulk-approve UI / API** — not currently filed.
