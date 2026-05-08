# GetPaid

**[getpaid.dev](https://getpaid.dev)**

Simple, self-hosted invoice management for freelancers. No bloat, no hidden fees, no vendor lock-in.

## Features

- **Invoices** — create, edit, and send professional invoices with line items, taxes, and discounts
- **Recurring** — set up recurring invoices that generate and send automatically
- **View Tracking** — know exactly when your client opens an invoice
- **Follow-ups** — automated payment reminders so you never chase clients manually
- **PDF Export** — generate clean PDF invoices for download and print
- **Dashboard** — revenue, outstanding amounts, and payment trends at a glance
- **Templates** — reusable invoice templates for repeat work
- **Client Management** — client directory with contact details and invoice history
- **Light & Dark themes** — full theme support out of the box

## Quick Start (Docker)

```bash
git clone https://github.com/maksim-pokhiliy/getpaid.git
cd getpaid
```

Generate a secret and start:

```bash
# Generate NEXTAUTH_SECRET
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)" > .env

# Start the app
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000) and create an account.

## Development Setup

### Prerequisites

- Node.js 22+
- pnpm 10+
- PostgreSQL 16+

### Install

```bash
git clone https://github.com/maksim-pokhiliy/getpaid.git
cd getpaid
pnpm install
```

### Configure

```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL connection string and a generated secret:

```bash
openssl rand -base64 32  # use this for NEXTAUTH_SECRET
```

### Database

```bash
pnpm db:migrate    # create + apply a new migration during development
pnpm db:seed       # optional: load demo data
```

`prisma migrate dev` (under `db:migrate`) is for local schema iteration only — it applies pending migrations and prompts to create new ones from your schema edits.

For production database changes see [Production migrations](#production-migrations) below.

### Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | Auth session secret (`openssl rand -base64 32`) |
| `APP_URL` | No | App base URL (default: `http://localhost:3000`) |
| `RESEND_API_KEY` | No | [Resend](https://resend.com) API key for sending emails |
| `EMAIL_FROM` | No | Sender email address (default: `invoices@example.com`) |

## Tech Stack

- **Framework** — Next.js 16 (App Router, standalone output)
- **UI** — MUI 7 (Material UI)
- **Language** — TypeScript (strict mode)
- **Database** — PostgreSQL 16 + Prisma ORM
- **Auth** — NextAuth (Auth.js)
- **Validation** — Zod 4
- **Data Fetching** — React Query
- **Forms** — React Hook Form
- **Email** — Resend
- **Charts** — Recharts
- **Deployment** — Docker (multi-stage build)

## Architecture

The project follows [Feature-Sliced Design](https://feature-sliced.design/) (FSD):

```
src/
├── app/           # Next.js routing only (pages, layouts, API routes)
├── features/      # Domain slices (invoices, clients, settings, ...)
│   └── {name}/
│       ├── api/         # API client functions
│       ├── hooks/       # React Query hooks
│       ├── components/  # UI components
│       ├── schemas/     # Zod validation schemas
│       └── constants/
├── shared/        # Cross-feature code
│   ├── config/    # App config, env validation, constants
│   ├── ui/        # Reusable UI components
│   ├── lib/       # Utilities (formatting, PDF export, calculations)
│   ├── hooks/     # Shared hooks
│   └── layout/    # Layout components
├── server/        # Server-side services (sole Prisma consumer)
│   ├── invoices/  # Invoice CRUD, sending, payments
│   ├── email/     # Transactional email
│   ├── auth/      # Auth config
│   └── db/        # Prisma client
└── providers/     # React context providers, theme
```

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm format` | Format code with Prettier |
| `pnpm db:migrate` | Create and apply migrations during development (`prisma migrate dev`) |
| `pnpm db:migrate:deploy` | Apply pending migrations to a database (`prisma migrate deploy`) — used in CI / prod |
| `pnpm db:seed` | Seed demo data |
| `pnpm db:studio` | Open Prisma Studio |

## Production migrations

Production schema changes go through Prisma migration files committed to git, not `prisma db push`.

### Workflow

1. Edit `prisma/schema.prisma` locally.
2. Generate a migration: `pnpm db:migrate -- --name <change-summary>`. Review the generated SQL under `prisma/migrations/<ts>_<change>/migration.sql`.
3. Commit the migration file alongside the code change.
4. Apply to production **before merging** the PR:

   ```bash
   # Backup first
   pg_dump $PROD_DATABASE_URL > backup-$(date +%s).sql

   # Apply pending migrations
   DATABASE_URL=$PROD_DATABASE_URL pnpm db:migrate:deploy
   ```

5. Merge the PR. Vercel rebuilds; the application boots against the already-migrated schema.

### One-time bootstrap (already done if you cloned after May 2026)

If migrating an existing database that pre-dates the migration history, mark the baseline migration applied so Prisma's tracker matches reality without re-running its SQL:

```bash
DATABASE_URL=$PROD_DATABASE_URL pnpm prisma migrate resolve --applied 20260508060000_baseline
```

### Self-hosted Docker

The Docker image runs `prisma migrate deploy` on every container start (see `Dockerfile` `CMD`). Deploys are safe to roll forward without manual intervention.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines and project conventions.

## License

[MIT](./LICENSE)
