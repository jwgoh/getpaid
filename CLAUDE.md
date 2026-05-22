# CLAUDE.md - Development Guidelines for GetPaid

This file provides guidance for Claude Code when working on the GetPaid project.

## Project Overview

GetPaid is an invoice management MVP built with Next.js, MUI, Prisma, and NextAuth.

## Architecture Rules (DO NOT BREAK)

### Feature-Sliced Design (FSD)

This project follows Feature-Sliced Design architecture strictly.

```
src/
├── app/              # ONLY Next.js routing (page.tsx, layout.tsx, route.ts)
├── features/         # Domain-specific vertical slices
│   └── {feature}/
│       ├── api/      # API client functions
│       ├── hooks/    # React Query hooks
│       ├── components/
│       ├── schemas/  # Zod schemas
│       └── constants/
├── shared/           # Shared across features
│   ├── api/          # Base API client
│   ├── config/       # App configuration, constants
│   ├── hooks/        # Shared hooks
│   ├── lib/          # Utilities (format, export)
│   ├── ui/           # UI components (buttons, dialogs, etc.)
│   └── layout/       # Layout components
├── providers/        # React context providers
└── server/           # Server-side services (Prisma access)
```

### STRICT Rules

1. **`src/app/` is for routing only**
   - Allowed files: `page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, `error.tsx`, `not-found.tsx`
   - NO utilities, NO business logic, NO domain components
   - **One exception:** colocated `*-client.tsx` files are allowed when a Server Component must split out an interactive client wrapper (e.g. `app/(main)/waitlist/page-client.tsx`). The wrapper must be a thin shell that delegates to a real component in `src/features/` or `src/shared/ui/`. No business logic in the wrapper.

2. **All file names MUST be in kebab-case**
   - `invoice-dialogs.tsx` NOT `InvoiceDialogs.tsx`
   - `use-invoice.ts` NOT `useInvoice.ts`
   - Exception: Next.js reserved files (page.tsx, layout.tsx, route.ts)

3. **Layer boundaries are sacred**
   - Features NEVER import from other features directly
   - Shared NEVER imports from features
   - UI components NEVER import Prisma
   - Only `src/server/` can access Prisma

4. **No magic strings or numbers**
   - All constants in `shared/config/` or feature `constants/`
   - Use enums or const objects for repeated values

5. **No code comments except JSDoc**
   - Code should be self-documenting
   - Use meaningful names instead of comments
   - Exception: JSDoc for public APIs

6. **MUI consistency**
   - Use MUI components everywhere
   - No custom CSS unless absolutely necessary
   - Use `sx` prop for styling
   - Use theme values (spacing, colors, typography)

7. **No duplication**
   - DRY principle strictly enforced
   - Extract shared logic to `shared/`
   - Extract shared UI to `shared/ui/`

### API Layer (`/src/app/api/*`)

- Route handlers only
- Call server services for business logic
- Validate inputs with Zod schemas
- Wrap handlers in `withAuth` / `withAdmin` (see [Canonical Route Patterns](#canonical-route-patterns) below) — never call `requireUser()` directly in a route
- Return standardized error format: `{ error: { code, message } }`

### Canonical Route Patterns

Every route in `src/app/api/*` is composed from the helpers in `src/server/api/route-helpers.ts`. Use them — do not reinvent auth, body parsing, or error shapes per route.

**Authenticated route:**

```typescript
import { parseBody, withAuth } from "@app/server/api/route-helpers";

import { createInvoiceSchema } from "@app/shared/schemas";
import { createInvoice } from "@app/server/invoices";

export const POST = withAuth(async (user, request) => {
  const { data, error } = await parseBody(request, createInvoiceSchema);
  if (error) return error;

  const invoice = await createInvoice(user.id, data);
  return NextResponse.json({ data: invoice });
});
```

**Admin-only route** (gated by `ADMIN_EMAIL` env, used for waitlist-admin endpoints):

```typescript
import { withAdmin } from "@app/server/api/route-helpers";

export const POST = withAdmin(async (user, request, context) => {
  return NextResponse.json({ data: { ok: true } });
});
```

**Idempotent write** (compose with `withAuth`):

```typescript
import { withIdempotency } from "@app/server/api/idempotency";
import { withAuth } from "@app/server/api/route-helpers";

export const POST = withAuth(
  withIdempotency(handler, { endpoint: "POST /api/invoices/:id/payments" })
);
```

**Helper inventory** (`src/server/api/route-helpers.ts`):

- `withAuth(handler, errorHandlers?)` — verifies session, surfaces `UNAUTHORIZED` (401) on failure, dispatches custom `errorHandlers` (e.g. domain-error → 400) before falling back to `INTERNAL_ERROR` (500).
- `withAdmin(handler, errorHandlers?)` — `withAuth` plus `env.ADMIN_EMAIL` check; non-admins get `FORBIDDEN` (403).
- `parseBody(request, schema)` — returns `{ data, error: null }` on success or `{ data: never, error: NextResponse }` (400 `VALIDATION_ERROR`) on Zod failure. Always early-return `error`.
- `errorResponse(code, message, status, details?)` — manual error responses when none of the helpers fit.
- `unauthorizedResponse()`, `forbiddenResponse()`, `notFoundResponse(entity)`, `validationErrorResponse(zodError)`, `internalErrorResponse()` — shorthand for the common shapes.

**Standard error response shape** (set by `errorResponse`, never deviate):

```json
{ "error": { "code": "BAD_REQUEST", "message": "Payment exceeds invoice total" } }
```

### Service Layer (`/src/server/*`)

- Business logic lives here
- Direct Prisma access allowed
- Services are organized by domain

### Authentication

- Always use NextAuth (Auth.js)
- Protected API routes wrap handlers with `withAuth` / `withAdmin` (see [Canonical Route Patterns](#canonical-route-patterns)). Server Components / RSC can call `requireUser()` directly.
- Session user includes `id` and `email`
- JWT strategy with database user lookup

### Public vs Internal IDs

- Public pages use `publicId` (nanoid)
- NEVER expose internal `id` to public URLs
- Internal routes can use `id`

## Common Commands

```bash
pnpm dev               # Start dev server
pnpm build             # Production build
pnpm lint              # Run ESLint
pnpm typecheck         # TypeScript checking
pnpm format            # Format with Prettier
pnpm test              # Run unit tests (vitest)
pnpm test:watch        # Run unit tests in watch mode
pnpm db:migrate        # prisma migrate dev — local schema iteration
pnpm db:migrate:deploy # prisma migrate deploy — apply migrations to a target DB (CI / prod)
pnpm db:studio         # Open Prisma Studio
```

## Database migrations

Schema changes are tracked via Prisma migration files under `prisma/migrations/` and committed to git. Production never runs `prisma db push` — `db push` is for throwaway dev work only.

**Local workflow:**

1. Edit `prisma/schema.prisma`.
2. `pnpm db:migrate -- --name <change-summary>` generates `prisma/migrations/<ts>_<change>/migration.sql`.
3. Review the SQL — must be lossless (no `DROP COLUMN`, no `DROP TABLE`, no `ALTER COLUMN TYPE` without a backfill plan). If destructive, follow expand-then-contract.
4. Commit migration files alongside the code change.

**Production (Vercel) deploy:**

- Vercel does NOT run migrations on deploy.
- **Additive / backward-compatible migration** (new table or column — the common case): apply the migration BEFORE merging — `DATABASE_URL=$PROD pnpm db:migrate:deploy` (after a `pg_dump` backup) — then merge → Vercel rebuilds → the new code sees the migrated schema.
- **Destructive migration** (`DROP TABLE` / `DROP COLUMN` / `DROP TYPE`): reverse the order. Merge first → wait for Vercel to redeploy the code that no longer references the dropped objects → only THEN apply the migration (`pg_dump` backup first). Applying a destructive drop while the old code is still live breaks it — the old code queries objects that no longer exist.

**Self-host (Docker):**

- Container `CMD` runs `prisma migrate deploy` on every start. Pending migrations apply automatically when the container boots.

## File Naming Convention

```
# Components
shared/ui/confirm-dialog.tsx
features/invoices/components/invoice-row.tsx

# Hooks
shared/hooks/use-autosave.ts
features/invoices/hooks/use-invoice.ts

# Schemas
shared/schemas/invoice.ts

# API
features/invoices/api/index.ts

# Constants
shared/config/constants.ts
features/invoices/constants/status.ts
```

## Adding New Features

1. Create feature directory in `/src/features/{feature}/`
2. Define Zod schema in `schemas/`
3. Create API client in `api/`
4. Create React Query hooks in `hooks/`
5. Build components in `components/`
6. Create server service in `/src/server/{feature}/`
7. Add API route in `/src/app/api/{feature}/route.ts`
8. Add page in `/src/app/{path}/page.tsx`

## Editions & Feature Flags

Controlled by `NEXT_PUBLIC_GETPAID_EDITION` env variable. Editions and their names are defined in `EDITIONS` constant (`shared/config/config.ts`). Feature flags are derived from the edition in `shared/config/features.ts`.

| Feature              | `community` (default) | `pro` |
| -------------------- | --------------------- | ----- |
| `publicRegistration` | true                  | false |
| `waitlistAdmin`      | false                 | true  |

- `community` — self-hosted, open registration
- `pro` — managed hosted instance, invite-only

To add a new feature flag:

1. Add field to `FeatureFlags` interface in `shared/config/features.ts`
2. Set values for each edition in `EDITION_FEATURES`
3. Use `features.yourFlag` in code

## Invoice Status Flow

```
DRAFT -> SENT (on send)
SENT -> VIEWED (on first view)
VIEWED/SENT -> OVERDUE (computed if dueDate < now)
Any -> PAID (manual payment recording)
Any -> PARTIALLY_PAID (partial payment recorded)
```

## Error Handling

API responses follow this format:

```typescript
// Success
{ data: {...} }

// Error
{
  error: {
    code: "ERROR_CODE",
    message: "Human readable message"
  }
}
```

Common error codes:

- `VALIDATION_ERROR` - Invalid input (Zod parse failed)
- `BAD_REQUEST` - Well-formed input but business rule rejected (e.g. payment over invoice total)
- `UNAUTHORIZED` - Not authenticated (session missing or expired)
- `FORBIDDEN` - Authenticated but not allowed (e.g. non-admin hitting `withAdmin` route)
- `NOT_FOUND` - Resource not found or not owned by the caller
- `EMAIL_EXISTS` - Sign-up attempted with an email that already has an account
- `REGISTRATION_DISABLED` - Sign-up blocked by edition (`pro` rejects public registration)
- `IDEMPOTENCY_KEY_REQUIRED` / `IDEMPOTENCY_KEY_INVALID` / `IDEMPOTENCY_KEY_REUSED` - Idempotency-Key header issues (see Idempotency below)
- `INTERNAL_ERROR` - Unexpected server error

## Idempotency

State-changing endpoints with money / data-creation impact require an `Idempotency-Key` header to prevent double-writes (browser refresh, retries, double-click).

Pattern:

```typescript
import { withIdempotency } from "@app/server/api/idempotency";
import { withAuth } from "@app/server/api/route-helpers";

export const POST = withAuth(
  withIdempotency(handler, { endpoint: "POST /api/invoices/:id/payments" })
);
```

Server enforcement (today):

- `POST /api/invoices` (create invoice)
- `POST /api/invoices/:id/payments` (record payment)

Behavior:

- Missing header on enforced routes -> `400 IDEMPOTENCY_KEY_REQUIRED`.
- Same key + same body within 24h -> cached `(status, body)` returned.
- Same key + different body within 24h -> `422 IDEMPOTENCY_KEY_REUSED`.
- Key validation: 8-128 printable ASCII chars, else `400 IDEMPOTENCY_KEY_INVALID`.

Frontend convention: React Query mutations call `generateIdempotencyKey()` from `@app/shared/api/idempotency-key` per submit (one fresh UUID per user action). Pass it through the API client; the API client puts it into `Idempotency-Key` via `idempotencyHeader()`.

When adding a new write endpoint that creates resources, charges money, or sends external messages: wrap with `withIdempotency` and have the caller supply a fresh key.

## Email Outbox

Outbound email is sent via the transactional outbox pattern: a state-change writes the DB row(s) AND an `EmailOutbox` row in the same `prisma.$transaction`; the actual Resend call happens AFTER the transaction commits. This guarantees a partial failure can never leave the system thinking an email was sent when it wasn't (or vice versa).

Pattern:

```typescript
const outboxId = await prisma.$transaction(async (tx) => {
  await updateInvoiceStatus(invoice.id, INVOICE_STATUS.SENT, { sentAt }, tx);
  await logInvoiceEvent(invoice.id, INVOICE_EVENT.SENT, {}, tx);

  const placeholderKey = `pending-${invoice.id}-${sentAt.getTime()}`;
  const row = await createEmailOutbox(tx, {
    userId,
    kind: EMAIL_OUTBOX_KIND.INVOICE,
    relatedType: EMAIL_OUTBOX_RELATED_TYPE.INVOICE,
    relatedId: invoice.id,
    payload,
    idempotencyKey: placeholderKey,
  });

  await tx.emailOutbox.update({
    where: { id: row.id },
    data: {
      idempotencyKey: buildOutboxIdempotencyKey(EMAIL_OUTBOX_KIND.INVOICE, invoice.id, row.id),
    },
  });

  return row.id;
});

await dispatchOutbox(outboxId);
```

Key rules:

- The DB writes that change user-visible state and the `createEmailOutbox` call MUST be in the same `prisma.$transaction`. Email payload is captured (rendered HTML/text) inside the transaction so a template change between send and retry can't desync.
- The Resend call lives in `dispatchOutbox(rowId)` and happens AFTER the transaction commits. Best-effort: if Resend fails, the outbox row stays `PENDING` and `scripts/process-outbox.ts` (cron entry, `pnpm outbox:run`) retries with exponential backoff (5min × 2^attempts up to 5 attempts, then `FAILED`).
- `dispatchOutbox` calls `sendEmail()` from `@app/server/email` with `idempotencyKey` set to the row's stable key (`${kind}-${relatedId}-${outboxRowId}`). Resend's per-call idempotency dedupes the actual API call across retries.
- Two flows currently use the outbox: `sendInvoice` and the waitlist routes (sign-up + admin approval).

When adding a new email-send: build a `ResendEmailPayload` via a `buildXxxEmailPayload` helper in `@app/server/email`, then write the state change + `createEmailOutbox` in one transaction, then `dispatchOutbox` outside.

## Code Quality Checklist

Before committing, verify:

- [ ] No components in `src/app/` (only routing files)
- [ ] All files in kebab-case
- [ ] No magic strings/numbers
- [ ] No code comments (only JSDoc if needed)
- [ ] No cross-feature imports
- [ ] No Prisma imports outside `src/server/`
- [ ] No duplicate code
- [ ] MUI components used consistently
- [ ] TypeScript strict mode passes
- [ ] ESLint passes
