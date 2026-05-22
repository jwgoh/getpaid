# Privacy

This document summarises what data GetPaid stores, where it lives, how long it is retained, and the project's GDPR posture. It is not a legal privacy policy — operators of a hosted `pro` instance must publish their own.

## What is collected

GetPaid stores the following user-supplied data in a single PostgreSQL database:

| Data                                                                                   | Source                                     | Purpose                                 |
| -------------------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------- |
| Account email + bcrypt password hash                                                   | Sign-up form (`POST /api/auth/sign-up`)    | Authentication                          |
| Sender profile (company name, display name, address, tax ID, branding)                 | Settings page (`POST /api/sender-profile`) | Render outgoing invoices                |
| Clients (name, email, default rate)                                                    | Clients page (`POST /api/clients`)         | Invoice recipient directory             |
| Invoices + line items (title, description, quantity, unit price), discount, tax, notes | `POST /api/invoices`                       | Core product data                       |
| Invoice events (created / sent / viewed / paid timestamps)                             | Automatic, on every state transition       | Audit trail visible in invoice timeline |
| Payments (amount, method, paid-at, optional note)                                      | `POST /api/invoices/:id/payments`          | Payment ledger per invoice              |
| Invoice templates                                                                      | `POST /api/templates`                      | Reusable invoice scaffolds              |
| Time-tracking connections (encrypted Toggl API token)                                  | `POST /api/time-tracking/connections`      | Toggl Track integration                 |
| Waitlist entries (email + status)                                                      | `POST /api/waitlist`                       | Pro-edition invite flow                 |

What is **not** collected:

- IP addresses, user agents, geolocation, device fingerprints — none are persisted.
- Behavioural analytics — no third-party telemetry, no cookie banner, no advertising trackers on the `community` edition.
- Server logs may transiently contain operational metadata (request paths, error stacks). They are not aggregated into a per-user behaviour profile.

## Where data lives

- **Primary database.** PostgreSQL 16. Operator's choice of host (Vercel Postgres, Neon, Supabase, Render, self-hosted).
- **Email delivery.** [Resend](https://resend.com) sends every outbound invoice email and waitlist notification. Resend processes the recipient address, sender name, invoice items, and the public viewer URL. See `docs/dpa.md` for sub-processor disclosure.
- **Time tracking (optional).** When a user connects Toggl Track, an AES-256-GCM encrypted API token is stored in the `TimeTrackingConnection` table. The plaintext token is held by Toggl, not by GetPaid. Encryption key (`ENCRYPTION_KEY` env) lives only on the server.
- **No third-party tracking** is wired into the `community` edition. `pro` operators may layer their own analytics; this is operator-controlled, not built-in.

## Retention

Default posture: **data is retained for the lifetime of the user account**.

- All user-owned rows (`User`, `Client`, `Invoice`, `Payment`, `InvoiceEvent`, `InvoiceTemplate`, `TimeTrackingConnection`) cascade-delete only when the parent `User` is deleted.
- There is no automated time-based prune. The append-only `InvoiceEvent` table grows with usage; defining a retention/prune cadence for it is a known open item.
- `WaitlistEntry` rows persist after the user signs up (denormalised email lookup). Cleanup of converted-to-user entries is a known gap.

## GDPR posture

Right-to-export and right-to-erasure are **not yet implemented as self-service endpoints**. This is a known, tracked gap; until those endpoints land, GDPR data-subject requests are fulfilled manually (see below).

Today's posture for a hosted `pro` instance:

- A user emailing the operator with an Article 20 (export) or Article 17 (erasure) request requires a manual SQL dump + manual `User` row deletion (cascade-deletes the rest).
- Schema does not yet support **anonymisation** (the GDPR-correct path when bookkeeping retention conflicts with erasure). `User.email` is `@unique` with no `anonymizedAt` column; a self-service "deactivate but keep invoices" flow needs schema work first.

This is a known gap and a tracked risk. `community` operators serving EU data subjects should disclose this in their own privacy policy.

## Sub-processors

- **Resend** (email delivery) — recipient email + invoice content. US-incorporated, multi-region (US + EU). Operator should opt into Resend's EU region for EU recipients and consult their DPA.
- **Toggl Track** (optional, per-user opt-in) — receives no GetPaid data; only the user's own Toggl token is stored, encrypted, by GetPaid.
- **Hosting providers** — Postgres host (Vercel / Neon / Supabase / etc.) and the Vercel/Docker host. Operator's choice.

## Security baseline

- HTTPS-only deployments (HSTS + CSP headers configured in `next.config.ts`).
- `bcryptjs` for password hashing.
- AES-256-GCM for at-rest token encryption (Toggl API tokens).
- No raw `process.env` access outside `src/shared/config/env.ts` (lint-enforced).

## Operator responsibilities

If you self-host the `community` edition:

- Publish your own privacy policy disclosing your jurisdiction, contact email, and sub-processors.
- Configure backups (`docs/backup.md`).
- Enable HTTPS in front of the app (Caddy, nginx, Traefik with Let's Encrypt).
- Rotate `NEXTAUTH_SECRET` and `ENCRYPTION_KEY` if a leak is suspected — note: rotating `ENCRYPTION_KEY` invalidates existing time-tracking connections (re-connect required).

If you operate a `pro` instance:

- Sign your sub-processors' DPAs (Resend, Postgres host).
- Add your own incident-response process to `docs/runbooks/incident-template.md`.
- Track GDPR data subject requests until self-service export/erasure endpoints land.
