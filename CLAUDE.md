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

1. **`src/app/` is EXCLUSIVELY for routing**
   - ONLY allowed files: `page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, `error.tsx`, `not-found.tsx`
   - NO components, NO utilities, NO business logic
   - NO exceptions, NO compromises

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
- Use `requireUser()` for authenticated endpoints
- Return standardized error format: `{ error: { code, message } }`

### Service Layer (`/src/server/*`)

- Business logic lives here
- Direct Prisma access allowed
- Services are organized by domain

### Authentication

- Always use NextAuth (Auth.js)
- Protected routes must call `requireUser()`
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
- BEFORE merging the PR, manually apply: `DATABASE_URL=$PROD pnpm db:migrate:deploy` (after a `pg_dump` backup).
- Then merge → Vercel rebuilds → app sees the migrated schema.

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
features/invoices/schemas/invoice.ts

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

| Feature              | `community` (default) | `pro`  |
|----------------------|-----------------------|--------|
| `publicRegistration` | true                  | false  |

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
- `VALIDATION_ERROR` - Invalid input
- `UNAUTHORIZED` - Not authenticated
- `NOT_FOUND` - Resource not found
- `REGISTRATION_DISABLED` - Sign-up blocked by edition
- `INTERNAL_ERROR` - Server error

## Idempotency

State-changing endpoints with money / data-creation impact require an `Idempotency-Key` header to prevent double-writes (browser refresh, retries, double-click).

Pattern:

```typescript
import { withIdempotency } from "@app/shared/api/idempotency";
import { withAuth } from "@app/shared/api/route-helpers";

export const POST = withAuth(
  withIdempotency(handler, { endpoint: "POST /api/invoices/:id/payments" })
);
```

Server enforcement (today):
- `POST /api/invoices` (create invoice)
- `POST /api/invoices/:id/payments` (record payment)
- `POST /api/recurring/:id/generate` (manual recurring generate)

Behavior:
- Missing header on enforced routes -> `400 IDEMPOTENCY_KEY_REQUIRED`.
- Same key + same body within 24h -> cached `(status, body)` returned.
- Same key + different body within 24h -> `422 IDEMPOTENCY_KEY_REUSED`.
- Key validation: 8-128 printable ASCII chars, else `400 IDEMPOTENCY_KEY_INVALID`.

Frontend convention: React Query mutations call `generateIdempotencyKey()` from `@app/shared/api/idempotency-key` per submit (one fresh UUID per user action). Pass it through the API client; the API client puts it into `Idempotency-Key` via `idempotencyHeader()`.

When adding a new write endpoint that creates resources, charges money, or sends external messages: wrap with `withIdempotency` and have the caller supply a fresh key.

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
