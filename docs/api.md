# API Reference

Hand-written reference for GetPaid's 27 REST endpoints. The actual route handlers live under `src/app/api/**/route.ts`; request and response shapes are validated against the Zod schemas in `src/shared/schemas/`. This document is the index — when in doubt, the schema is the source of truth.

## Conventions

- **Base URL.** `${APP_URL}` (default `http://localhost:3000`). Production deployments set `APP_URL` to their public origin.
- **Auth.** Most routes are wrapped in `withAuth` (session cookie required) or `withAdmin` (`withAuth` + `ADMIN_EMAIL` env match). Public endpoints are explicitly noted.
- **Body format.** `application/json`.
- **Success shape.** Routes return the resource directly (e.g. `{ id, ... }`) or an action ack (`{ success: true }`). List endpoints return arrays.
- **Error shape.** Always `{ "error": { "code": "ERROR_CODE", "message": "Human readable message" } }` (sometimes with a `details` object). See the error code table below.
- **Idempotency.** Money-changing or resource-creating writes require an `Idempotency-Key` header (8-128 printable ASCII chars). See `CLAUDE.md` "Idempotency" section. Endpoints that enforce this are flagged inline.
- **Rate limits.** Public + auth endpoints are IP-rate-limited via an in-memory bucket (`src/shared/api/rate-limit.ts`). Limits surfaced via `RateLimit-Limit` / `RateLimit-Remaining` / `RateLimit-Reset` / `Retry-After` headers; `429 RATE_LIMITED` on overflow.

### Error codes

| Code                       | Status | Meaning                                                            |
| -------------------------- | ------ | ------------------------------------------------------------------ |
| `VALIDATION_ERROR`         | 400    | Zod parse failed; first issue's message is in `error.message`      |
| `BAD_REQUEST`              | 400    | Well-formed input rejected by a business rule                      |
| `UNAUTHORIZED`             | 401    | Session missing or expired                                         |
| `FORBIDDEN`                | 403    | Authenticated but not allowed (`withAdmin` route hit by non-admin) |
| `REGISTRATION_DISABLED`    | 403    | Public sign-up blocked (`pro` edition + email not approved)        |
| `NOT_FOUND`                | 404    | Resource not found or not owned by the caller                      |
| `EMAIL_EXISTS`             | 409    | Sign-up email already has an account                               |
| `ALREADY_SENT`             | 400    | Invoice already in SENT/VIEWED/PAID state                          |
| `INVALID_STATE`            | 400    | Resource not in a state that permits the requested action          |
| `CLIENT_HAS_DEPENDENTS`    | 409    | Client has active invoices                                         |
| `IDEMPOTENCY_KEY_REQUIRED` | 400    | `Idempotency-Key` header missing on enforced route                 |
| `IDEMPOTENCY_KEY_INVALID`  | 400    | `Idempotency-Key` malformed (length / chars)                       |
| `IDEMPOTENCY_KEY_REUSED`   | 422    | Same key + different request body within 24h                       |
| `RATE_LIMITED`             | 429    | IP rate-limit bucket exhausted                                     |
| `INTERNAL_ERROR`           | 500    | Unexpected error                                                   |

### Schema reference

Request and response shapes are defined as Zod schemas. Cite them by name; the document does not reproduce field-by-field types.

| Schema                                                                                                                                                              | Defined in                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `signUpSchema`, `signInSchema`                                                                                                                                      | `src/shared/schemas/auth.ts`           |
| `createClientSchema`, `updateClientSchema`                                                                                                                          | `src/shared/schemas/client.ts`         |
| `createInvoiceSchema`, `updateInvoiceSchema`                                                                                                                        | `src/shared/schemas/invoice.ts`        |
| `lineItemSchema`, `lineItemGroupSchema`                                                                                                                             | `src/shared/schemas/line-item.ts`      |
| `recordPaymentApiSchema`                                                                                                                                            | `src/shared/schemas/payment.ts`        |
| `createTemplateSchema`, `updateTemplateSchema`                                                                                                                      | `src/shared/schemas/template.ts`       |
| `createSenderProfileSchema` (`senderProfileSchema`)                                                                                                                 | `src/shared/schemas/sender-profile.ts` |
| `waitlistSchema`                                                                                                                                                    | `src/shared/schemas/waitlist.ts`       |
| Response shapes (`invoiceSchema`, `invoiceListItemSchema`, `clientSchema`, `paymentSchema`, `senderProfileResponseSchema`, `publicInvoiceSchema`, `apiErrorSchema`) | `src/shared/schemas/api.ts`            |

---

## Auth

### `POST /api/auth/[...nextauth]`

NextAuth v5 catch-all handler (sign-in, sign-out, session callbacks). Driven by NextAuth's standard surface; not directly invoked by the project's API client. Sign-in via the Credentials provider hits `POST /api/auth/callback/credentials` and is rate-limited (10 req / 5 min / IP, bucket `auth.sign-in`).

- **Auth:** None (public).
- **Idempotency:** N/A.
- **Source:** `src/app/api/auth/[...nextauth]/route.ts`.

### `POST /api/auth/sign-up`

Create a new user account.

- **Auth:** None (public).
- **Idempotency:** N/A.
- **Rate limit:** `RATE_LIMITS.SIGN_UP` — 5 req / 1 hour / IP.
- **Request body:** `signUpSchema` (`email`, `password` ≥ 8 chars).
- **Response:** `201 { message: "Account created successfully" }`.
- **Edition gating:** `community` edition: any email accepted. `pro` edition: email must be in `APPROVED` waitlist status, else `403 REGISTRATION_DISABLED`.
- **Errors:** `VALIDATION_ERROR`, `EMAIL_EXISTS` (409), `REGISTRATION_DISABLED` (403), `RATE_LIMITED`.
- **Source:** `src/app/api/auth/sign-up/route.ts`.

---

## User profile

### `GET /api/me`

Read the authenticated user's profile (id, email, sender profile id if set).

- **Auth:** `withAuth`.
- **Response:** User profile shape (no Zod schema — see `src/server/user/index.ts:getUserProfile`).
- **Source:** `src/app/api/me/route.ts`.

### `GET /api/sender-profile`

Read the authenticated user's sender profile (company name, branding, defaults).

- **Auth:** `withAuth`.
- **Response:** `senderProfileResponseSchema`.
- **Source:** `src/app/api/sender-profile/route.ts`.

### `POST /api/sender-profile`, `PUT /api/sender-profile`

Upsert the authenticated user's sender profile. POST returns 201, PUT returns 200; both call the same `upsertSenderProfile`. At least one of `companyName` / `displayName` is required.

- **Auth:** `withAuth`.
- **Request body:** `createSenderProfileSchema` (the `senderProfileSchema` plus the `companyName || displayName` refinement).
- **Response:** `senderProfileResponseSchema`.
- **Source:** `src/app/api/sender-profile/route.ts`.

### `GET /api/analytics`

Aggregate analytics for the authenticated user's dashboard (revenue, outstanding, status breakdown).

- **Auth:** `withAuth`.
- **Response:** Analytics shape (see `src/server/analytics/index.ts:getAnalytics`).
- **Source:** `src/app/api/analytics/route.ts`.

---

## Clients

### `GET /api/clients`

List the authenticated user's clients (default sort: createdAt desc).

- **Auth:** `withAuth`.
- **Response:** `clientListSchema`.
- **Source:** `src/app/api/clients/route.ts`.

### `POST /api/clients`

Create a new client.

- **Auth:** `withAuth`.
- **Idempotency:** Not enforced.
- **Request body:** `createClientSchema` (`name`, `email`, optional `defaultRate`).
- **Response:** `201 clientSchema`.
- **Source:** `src/app/api/clients/route.ts`.

### `GET /api/clients/[id]`, `PATCH /api/clients/[id]`, `DELETE /api/clients/[id]`

CRUD on a client by id. PATCH uses `updateClientSchema` (partial). DELETE is forbidden when the client has dependents — returns `409 CLIENT_HAS_DEPENDENTS` with `details: { invoiceCount }`.

- **Auth:** `withAuth`.
- **Idempotency:** Not enforced.
- **Errors:** `NOT_FOUND` (404), `CLIENT_HAS_DEPENDENTS` (409 on DELETE), `VALIDATION_ERROR` (PATCH).
- **Source:** `src/app/api/clients/[id]/route.ts`.

---

## Invoices

### `GET /api/invoices`

List the authenticated user's invoices (sorted by `createdAt desc`).

- **Auth:** `withAuth`.
- **Response:** `invoiceListSchema` (each item is `invoiceListItemSchema`).
- **Source:** `src/app/api/invoices/route.ts`.

### `POST /api/invoices`

Create a new invoice (DRAFT state).

- **Auth:** `withAuth`.
- **Idempotency:** **Required.** Endpoint key: `POST /api/invoices`.
- **Request body:** `createInvoiceSchema`. At least one item (ungrouped or grouped) is required.
- **Response:** `201 invoiceSchema`.
- **Source:** `src/app/api/invoices/route.ts`.

### `GET /api/invoices/[id]`, `PATCH /api/invoices/[id]`, `DELETE /api/invoices/[id]`

Read / update / delete an invoice by internal id.

- **Auth:** `withAuth`.
- **Idempotency:** Not enforced (PATCH replaces line items in a transaction; DELETE cascades).
- **PATCH body:** `updateInvoiceSchema`. Items + groups are full replacements.
- **DELETE response:** `{ success: true }` — also cascades item / event / payment rows.
- **Source:** `src/app/api/invoices/[id]/route.ts`.

### `POST /api/invoices/[id]/send`

Send an invoice via Resend (transitions DRAFT → SENT, writes `InvoiceEvent.SENT`). Uses the transactional outbox pattern — DB writes + outbox row commit together; Resend dispatch happens after commit. See `CLAUDE.md` "Email Outbox" for the contract.

- **Auth:** `withAuth`.
- **Idempotency:** Not enforced at the route layer. Outbox-level idempotency on the actual Resend call (`Idempotency-Key` per outbox row) prevents duplicate sends across retries.
- **Errors:** `NOT_FOUND` (404), `ALREADY_SENT` (400 if invoice is already SENT/VIEWED/PAID).
- **Response:** Updated `invoiceSchema`.
- **Source:** `src/app/api/invoices/[id]/send/route.ts`.

### `POST /api/invoices/[id]/duplicate`

Clone an invoice as a new DRAFT (regenerates `publicId`, copies items + groups, omits payments + events).

- **Auth:** `withAuth`.
- **Idempotency:** Not enforced.
- **Response:** `invoiceSchema` for the new invoice.
- **Source:** `src/app/api/invoices/[id]/duplicate/route.ts`.

### `POST /api/invoices/[id]/mark-paid`

Mark an invoice as PAID with method `MANUAL`. No partial — sets `paidAmount = total`, transitions to PAID, writes `InvoiceEvent.PAID_MANUAL`.

- **Auth:** `withAuth`.
- **Idempotency:** Not enforced (idempotent at the application level — the lifecycle service is a no-op if already PAID).
- **Errors:** `NOT_FOUND` (404).
- **Response:** Updated `invoiceSchema`.
- **Source:** `src/app/api/invoices/[id]/mark-paid/route.ts`.

### `GET /api/invoices/[id]/payments`

List payments on an invoice.

- **Auth:** `withAuth`.
- **Response:** Array of `paymentSchema`.
- **Errors:** `NOT_FOUND` (404 if invoice missing).
- **Source:** `src/app/api/invoices/[id]/payments/route.ts`.

### `POST /api/invoices/[id]/payments`

Record a payment against an invoice. Atomic transaction: writes `Payment`, recomputes status (PARTIALLY_PAID / PAID), writes `InvoiceEvent.PAYMENT_RECORDED`.

- **Auth:** `withAuth`.
- **Idempotency:** **Required.** Endpoint key: `POST /api/invoices/:id/payments`.
- **Request body:** `recordPaymentApiSchema` (`amount` in cents, `method`, optional `note`, optional `paidAt`).
- **Response:** Updated `invoiceSchema`.
- **Errors:** `BAD_REQUEST` (400 if invoice is DRAFT, missing, or amount exceeds outstanding balance).
- **Source:** `src/app/api/invoices/[id]/payments/route.ts`.

### `DELETE /api/invoices/[id]/payments?paymentId=<id>`

Reverse a recorded payment. Recomputes invoice status (e.g. PAID → SENT/VIEWED depending on prior state). `paymentId` is a query string param.

- **Auth:** `withAuth`.
- **Idempotency:** Not enforced.
- **Errors:** `VALIDATION_ERROR` (400 missing `paymentId`), `NOT_FOUND` (404), `BAD_REQUEST` (payment not on this invoice).
- **Response:** Updated `invoiceSchema`.
- **Source:** `src/app/api/invoices/[id]/payments/route.ts`.

### `POST /api/public/invoices/[publicId]/viewed`

Public endpoint hit by the public viewer (`/i/[publicId]`) to record a view. No-ops if the invoice owner is the one viewing (matched by session). Writes `InvoiceEvent.VIEWED` once per invoice via `markInvoiceViewed`.

- **Auth:** None (public). Identity is checked via `getUser` to skip self-views.
- **Idempotency:** Application-level idempotent (`markInvoiceViewed` early-returns if already viewed).
- **Rate limit:** `RATE_LIMITS.PUBLIC_VIEW` — 60 req / 5 min / IP.
- **Request body:** None.
- **Response:** `{ success: true }`.
- **Errors:** `NOT_FOUND` (404 if `publicId` invalid), `RATE_LIMITED`, `INTERNAL_ERROR`.
- **Source:** `src/app/api/public/invoices/[publicId]/viewed/route.ts`.

---

## Templates

### `GET /api/templates`

List invoice templates owned by the authenticated user.

- **Auth:** `withAuth`.
- **Response:** Array of `Template` (see `src/shared/schemas/template.ts`).
- **Source:** `src/app/api/templates/route.ts`.

### `POST /api/templates`

Create a new invoice template.

- **Auth:** `withAuth`.
- **Idempotency:** Not enforced.
- **Request body:** `createTemplateSchema`.
- **Response:** `201 Template`.
- **Source:** `src/app/api/templates/route.ts`.

### `GET /api/templates/[id]`, `PATCH /api/templates/[id]`, `DELETE /api/templates/[id]`

CRUD on a template by id. PATCH uses `updateTemplateSchema` (partial; full item replacement when items provided).

- **Auth:** `withAuth`.
- **Errors:** `NOT_FOUND` (404), `VALIDATION_ERROR`.
- **Source:** `src/app/api/templates/[id]/route.ts`.

---

## Time tracking

### `GET /api/time-tracking/providers`

List supported time-tracking providers (currently: Toggl Track) with their capabilities.

- **Auth:** `withAuth`.
- **Response:** Array of `{ id, name, capabilities }`.
- **Source:** `src/app/api/time-tracking/providers/route.ts`.

### `GET /api/time-tracking/connections`

List the authenticated user's connected time-tracking accounts (does not return tokens).

- **Auth:** `withAuth`.
- **Response:** Connection metadata (provider, lastUsedAt, etc.).
- **Source:** `src/app/api/time-tracking/connections/route.ts`.

### `POST /api/time-tracking/connections`

Connect a new provider. Validates the token by calling the provider, then encrypts and stores it (AES-256-GCM via `ENCRYPTION_KEY`).

- **Auth:** `withAuth`.
- **Idempotency:** Not enforced.
- **Request body:** `{ provider: string, token: string }`.
- **Response:** `201 connection metadata`.
- **Errors:** `VALIDATION_ERROR` (400 if token is rejected by the provider).
- **Source:** `src/app/api/time-tracking/connections/route.ts`.

### `DELETE /api/time-tracking/connections/[id]`

Disconnect a provider. Hard-deletes the row (token gone irrecoverably).

- **Auth:** `withAuth`.
- **Errors:** `NOT_FOUND` (404).
- **Source:** `src/app/api/time-tracking/connections/[id]/route.ts`.

### `GET /api/time-tracking/workspaces?provider=<id>`

Fetch the user's workspaces from the connected provider. `provider` query string is required.

- **Auth:** `withAuth`.
- **Errors:** `VALIDATION_ERROR` (400 if `provider` missing).
- **Source:** `src/app/api/time-tracking/workspaces/route.ts`.

### `GET /api/time-tracking/projects?provider=<id>&workspaceId=<id>`

Fetch projects within a workspace. Both query params required.

- **Auth:** `withAuth`.
- **Errors:** `VALIDATION_ERROR` (400 if either param missing).
- **Source:** `src/app/api/time-tracking/projects/route.ts`.

### `POST /api/time-tracking/time-entries`

Fetch grouped + rounded time entries from the provider for an invoice line-item import.

- **Auth:** `withAuth`.
- **Idempotency:** Not enforced (read-only).
- **Request body:** `{ provider, workspaceId, startDate (YYYY-MM-DD), endDate (YYYY-MM-DD), projectIds?, grouping, subGrouping, roundingMinutes?, billableOnly? }`.
- **Response:** Grouped time entries (provider-specific shape).
- **Source:** `src/app/api/time-tracking/time-entries/route.ts`.

---

## Waitlist (`pro` edition)

### `POST /api/waitlist`

Public endpoint to join the `pro` edition waitlist. Sends a confirmation email to the user and a notification email to the admin (both via the transactional outbox pattern).

- **Auth:** None (public).
- **Idempotency:** Not enforced (server upserts on `email`, so dup-submits are tolerated).
- **Rate limit:** `RATE_LIMITS.WAITLIST` — 5 req / 1 hour / IP.
- **Request body:** `waitlistSchema` (`email`).
- **Response:** `201 { message: "You've been added to the waitlist!" }`.
- **Errors:** `VALIDATION_ERROR`, `RATE_LIMITED`, `INTERNAL_ERROR`.
- **Source:** `src/app/api/waitlist/route.ts`.

### `POST /api/waitlist/check`

Public endpoint used by the sign-up form to check whether an email is approved (before showing the password field).

- **Auth:** None (public).
- **Rate limit:** `RATE_LIMITS.WAITLIST_CHECK` — 30 req / 1 hour / IP.
- **Request body:** `waitlistSchema`.
- **Response:** `{ status: "approved" | "pending" | "not_found" }`.
- **Source:** `src/app/api/waitlist/check/route.ts`.

### `GET /api/waitlist/list`

Admin: list every waitlist entry across all users (sorted by `createdAt desc`).

- **Auth:** `withAdmin` (requires `ADMIN_EMAIL` env match).
- **Response:** Array of waitlist entries.
- **Errors:** `FORBIDDEN` (403 for non-admin).
- **Source:** `src/app/api/waitlist/list/route.ts`.

### `POST /api/waitlist/approve`

Admin: approve a waitlist entry by email. Flips `status: APPROVED`, dispatches the approval email via the outbox.

- **Auth:** `withAdmin`.
- **Idempotency:** Not enforced (server is idempotent — re-approving a row is a no-op).
- **Request body:** `waitlistSchema`.
- **Response:** `{ message: "User approved and notified" }`.
- **Errors:** `FORBIDDEN`, `NOT_FOUND` (404), `VALIDATION_ERROR`.
- **Source:** `src/app/api/waitlist/approve/route.ts`.

### `DELETE /api/waitlist/[id]`

Admin: hard-delete a waitlist entry.

- **Auth:** `withAdmin`.
- **Response:** `{ success: true }`.
- **Errors:** `FORBIDDEN`, `NOT_FOUND` (404).
- **Source:** `src/app/api/waitlist/[id]/route.ts`.

---

## What is NOT covered here

- **The public viewer page (`/i/[publicId]`)** is server-rendered, not a JSON API. End-customers (the freelancer's clients) hit it directly in their browser.
- **NextAuth callback URLs** other than `/api/auth/callback/credentials` are part of NextAuth's standard surface (`api/auth/csrf`, `api/auth/session`, `api/auth/providers`). Documented upstream by Auth.js.
- **OpenAPI / Swagger.** Not generated; auto-OpenAPI is a deliberately deferred decision.
