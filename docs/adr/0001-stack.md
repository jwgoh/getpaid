# ADR 0001: Core stack — Next.js 16 + Prisma 7 + NextAuth v5 + MUI 7

- **Status:** Accepted
- **Date:** 2026-02-04 (codified retroactively 2026-05-08)

## Context

GetPaid is a self-hosted invoice management product targeting freelancers. The product needs to ship as both:

- A managed `pro` instance hosted on Vercel at `getpaid.dev` (invite-only).
- A self-hosted `community` Docker image users can run themselves.

Constraints driving the stack pick:

- Single contributor; minimise operational surface area.
- Server-rendered pages for SEO on the landing page and shareable public invoice viewer (`/i/[publicId]`).
- Money-handling product — type safety from DB to UI is non-negotiable.
- Both deployment targets need to run from one codebase without per-target build flags.
- Prefer mainstream choices with long-term maintenance over best-in-class niche tooling.

## Decision

Adopt the following as a one-way-door bundle:

| Layer         | Choice                                                                | Notes                                                                                     |
| ------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Framework     | Next.js 16 (App Router, Turbopack, `output: standalone`)              | RSC + route handlers + Vercel-native deploy + standalone Docker output                    |
| UI            | MUI 7 + Emotion                                                       | Mature component library, accessible defaults, theme tokens                               |
| ORM / DB      | Prisma 7 + PostgreSQL 16                                              | Type-safe queries; Prisma 7 dropped the engine binary, simplifying serverless cold starts |
| Auth          | NextAuth (Auth.js) v5, Credentials provider, JWT strategy, `bcryptjs` | Self-host friendly (no third-party auth dependency in `community`)                        |
| Validation    | Zod 4                                                                 | Shared schema between client + server + DB write paths                                    |
| Data fetching | TanStack React Query 5                                                | Cache + optimistic updates + retry policy                                                 |
| Forms         | React Hook Form + `@hookform/resolvers`                               | Lighter than Formik; integrates cleanly with Zod                                          |
| Email         | Resend                                                                | Single transactional provider; opt-in (env-gated)                                         |
| ID generation | nanoid (10 chars for `publicId`)                                      | Public URLs use `publicId`, never internal `id`                                           |
| Path alias    | `@app/* → ./src/*`                                                    | Single alias across the repo                                                              |
| Module style  | ES modules (`"type": "module"`)                                       | Matches Node 22 + Next 16 expectations                                                    |

Architecture pattern: **Feature-Sliced Design (FSD)**, lint-enforced. See `CLAUDE.md` for the boundary rules.

## Alternatives considered

- **Remix / SvelteKit / Astro instead of Next.js.** Rejected — Vercel is the lowest-friction managed host for the `pro` edition, and Next.js's RSC + standalone output are a better fit for a Docker-self-host story than alternatives' SSR-only or hybrid models.
- **MySQL or SQLite instead of Postgres.** Rejected — Postgres is the dominant managed-DB target (Neon, Supabase, Vercel Postgres, Render, Railway), and JSON columns + check constraints + concurrent indexes are useful as the schema grows.
- **Drizzle ORM instead of Prisma.** Considered. Drizzle is lighter and SQL-first, but Prisma's mature migrations, single-source-of-truth schema, and ecosystem (Auth.js adapter, seed tooling) won. Re-evaluate if Prisma 7's serverless cold-start budget becomes a problem.
- **Clerk / WorkOS / Auth0 instead of NextAuth.** Rejected for `community` (self-hosters cannot rely on third-party auth without a runtime account). Acceptable if the `pro` edition outgrows Credentials, but switching means re-modeling User and Session — recorded as a one-way door now to make the cost explicit.
- **Tailwind + shadcn instead of MUI.** Rejected — MUI's accessibility defaults, date pickers, and data table primitives shorten time-to-MVP; the cost is a heavier client bundle.

## Consequences

**Positive:**

- Type safety end-to-end (Zod ↔ Prisma ↔ React Query).
- Both deploy targets (Vercel and Docker) work from the same `package.json` without conditional builds.
- Lint-enforced FSD boundaries keep large refactors local.
- Prisma 7 binary-less client cuts cold-start latency on Vercel functions.

**Negative / costs to acknowledge:**

- MUI 7 ships ~200kb of JS to the client. Mitigated by `optimizePackageImports` in `next.config.ts`.
- NextAuth v5 is still in beta (`5.0.0-beta.30` at time of writing); stability risk on minor upgrades.
- Switching away from this stack is a multi-week refactor. Treated as a one-way door — re-open this ADR if reversal is considered.

**Operational implications:**

- Vercel-managed deploy: see `docs/runbooks/deployment.md`.
- Docker self-host: see `Dockerfile` + `docker-compose.yml`. Image runs `prisma migrate deploy && node server.js` on boot.
- Schema management policy: see ADR 0002.
- Editions: see ADR 0004.
