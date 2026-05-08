# ADR 0004: Editions — `community` vs `pro` via compile-time feature flags

- **Status:** Accepted
- **Date:** 2026-02-04 (codified retroactively 2026-05-08)

## Context

GetPaid ships in two operating models from a single codebase:

- **`community`** — open-registration, MIT-licensed, self-hosted. The OSS face of the product. Anyone can clone the repo and run `docker compose up`.
- **`pro`** — invite-only managed instance hosted at `getpaid.dev`. Sign-up is gated by a waitlist + admin approval flow.

Constraints:

- Single codebase (no fork, no separate `pro` branch).
- No runtime tenant switching — the operator picks one edition at deploy time.
- The flag must be visible at build time so dead-code elimination / `optimizePackageImports` can drop unused branches.
- Self-hosters must not be able to accidentally enable `pro`-only features that depend on infrastructure they don't run (e.g. waitlist admin).
- Adding flags should be cheap (single field + single value per edition).

## Decision

Implement editions as **compile-time feature flags driven by the `NEXT_PUBLIC_GETPAID_EDITION` env variable**.

Mechanism:

1. The env variable `NEXT_PUBLIC_GETPAID_EDITION` is validated by `src/shared/config/env.ts` (defaults to `community`, accepts `community | pro`).
2. `src/shared/config/features.ts` defines:
   - The `FeatureFlags` interface (compile-time-typed list of flags).
   - `EDITION_FEATURES: Record<Edition, FeatureFlags>` — the per-edition flag matrix.
   - The `features` const: `EDITION_FEATURES[edition]`, frozen as `Readonly<FeatureFlags>`.
3. Code reads `features.publicRegistration` / `features.waitlistAdmin` directly. `Next.js` + `optimizePackageImports` evaluates these as constants at build time, so the unused branch is dead-code-eliminated per build.

Current flag matrix (verbatim from `src/shared/config/features.ts`):

| Flag                 | `community` (default) | `pro`   |
| -------------------- | --------------------- | ------- |
| `publicRegistration` | `true`                | `false` |
| `waitlistAdmin`      | `false`               | `true`  |

- `publicRegistration: true` → `POST /api/auth/sign-up` accepts any email.
- `publicRegistration: false` → `POST /api/auth/sign-up` checks the email is approved on the waitlist; returns `403 REGISTRATION_DISABLED` otherwise.
- `waitlistAdmin: true` → `withAdmin` routes (`/api/waitlist/list`, `/api/waitlist/approve`, `DELETE /api/waitlist/:id`) are reachable, gated additionally by `ADMIN_EMAIL` env.

Adding a new flag is a 3-step PR:

1. Add the field to `FeatureFlags` interface.
2. Set the value for both editions in `EDITION_FEATURES`.
3. Use `features.yourFlag` in code.

## Alternatives considered

- **Runtime feature flag service (LaunchDarkly / Unleash / GrowthBook).** Rejected — adds a runtime dependency and operational surface; gradual-rollout / per-user targeting is not a need at current scale. Re-evaluate if `pro` grows past a single-tenant model.
- **Two separate apps (`getpaid-community` + `getpaid-pro` repos).** Rejected — duplicated code path is the worst possible drift surface for a money-handling product. Every fix would need to land in two places.
- **Build-time constant via `NODE_ENV` or custom build flag.** Rejected — `NEXT_PUBLIC_*` is the canonical Next.js mechanism for build-baked-in client-readable env, and lint already forbids reading `process.env` outside `src/shared/config/env.ts`.
- **Database-driven feature flags.** Rejected — pulls every page into a server-fetch dependency for what is currently a single-bit decision per deployment.

## Consequences

**Positive:**

- Single codebase, two deployment targets — verified by `community` and `pro` running the same `pnpm build` output with different env.
- Dead-code elimination keeps `community` deployers from shipping unused waitlist-admin client code.
- Adding a flag is mechanical (3-line PR) and lint-validated by `FeatureFlags`.
- `pro`-only routes (`withAdmin`-gated) silently 403 in `community` builds — no leak.

**Negative / costs:**

- Compile-time means no per-user gradual rollout. A `pro` operator cannot, e.g., enable a feature for 10% of users without a code change.
- `NEXT_PUBLIC_*` env is exposed to the client bundle. The current flag set carries no secrets — but adding a flag with sensitive logic must stay server-side.
- Switching an existing deployment from `community` to `pro` (or back) requires a rebuild + re-deploy. Acceptable; matches the "one edition per instance" constraint.

**Operational implications:**

- Self-hosters set `NEXT_PUBLIC_GETPAID_EDITION=community` (or omit it; that's the default).
- `pro` operators set `NEXT_PUBLIC_GETPAID_EDITION=pro` + `ADMIN_EMAIL=<admin>` and get the waitlist-admin UI at `/app/waitlist`.
- The waitlist admin runbook lives at `docs/runbooks/waitlist.md`.
- See `docs/runbooks/pro-edition.md` for `pro`-specific operational guidance.
