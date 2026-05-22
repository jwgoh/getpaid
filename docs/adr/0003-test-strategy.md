# ADR 0003: Test strategy — Vitest + Playwright

- **Status:** Accepted (partially implemented — see Update 2026-05-22)
- **Date:** 2026-05-08

## Context

The project shipped its v0.1.0 MVP without any automated tests:

- No `*.test.*` / `*.spec.*` files anywhere in `src/`.
- No `vitest.config.*`, no `playwright.config.*`, no test runner configured.
- No CI gating — type-check + lint + format-check pre-commit hooks are the only mechanical guard.

This was a deliberate (but unrecorded) trade-off during the initial Feb 2026 build sprint: ship the MVP, validate the product with real waitlist signups, then back-fill tests once the schema and feature surface stabilised. A project health audit flagged the test-free state as a decision-level, cross-block gap — "no tests implemented yet". Without an ADR, the next contributor risks either:

- Reinventing the same trade-off (and slipping it again), or
- Layering tests onto a stack with no test infrastructure, requiring a setup phase before any single test can land.

This ADR records the test framework choice and the rationale so the back-fill, when it happens, is mechanical.

## Decision

When tests are introduced, use the following:

| Layer              | Choice                                                                                | Why                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Unit / integration | Vitest                                                                                | Native ESM + Vite-fast + Jest-compatible API; matches the project's `"type": "module"` posture |
| Test data          | Hand-rolled factories per `CLAUDE.md` (no `@faker-js/faker` dependency unless needed) | Keep dep count down; deterministic seeds for reproducibility                                   |
| End-to-end         | Playwright                                                                            | Cross-browser (Chromium + Firefox + Webkit), trace viewer, codegen, parallel runs              |
| Mocking            | `vi.fn` / `vi.mock` from Vitest; `nock` only if HTTP fixture replay is needed         | Stay in-tool                                                                                   |
| HTTP / API tests   | Vitest + `next-test-api-route-handler` (or direct route-handler invocation)           | No separate framework                                                                          |
| Coverage           | Vitest's built-in `c8` reporter                                                       | Single tool                                                                                    |

Pyramid target (post-MVP backfill goal):

- **60% unit** — pure functions in `src/shared/lib/*` (calculations, format, export), Zod schema parse / refine paths.
- **30% integration** — server services in `src/server/*` against a test Postgres (Prisma + transaction-rollback fixtures), API route handlers via `withAuth` + `parseBody`.
- **10% E2E** — Playwright covering the money-flow critical paths only: sign-up → create invoice → send invoice → record payment → mark paid; plus the public viewer (`/i/[publicId]`).

**Note:** The Vitest framework choice is now realised — `vitest.config.ts` exists and a unit-test suite runs via `pnpm test`. The integration and E2E tiers are still outstanding. See "Update 2026-05-22" below for the current state against the pyramid target.

## Alternatives considered

- **Jest instead of Vitest.** Rejected — Jest's ESM story remains incomplete and slow; Vitest is purpose-built for the Vite/Next ecosystem.
- **Cypress instead of Playwright.** Rejected — Playwright's cross-browser support, codegen, and trace viewer are stronger, and parallel runs are cheaper to scale.
- **node:test built-in runner.** Considered. Sufficient for unit tests, but lacks the watch-mode, snapshot, and coverage ergonomics of Vitest. Re-evaluate if Vitest disk install size becomes a concern.
- **Skipping tests entirely.** Rejected long-term — money-handling logic + state-machine transitions (DRAFT → SENT → VIEWED → PAID) need regression coverage before the codebase grows past current scale.

## Consequences

**Positive (once back-filled):**

- Unit + integration coverage on `src/shared/lib/calculations.ts` (the math the user trusts) and `src/server/invoices/*` (the state machine).
- E2E confidence on the send-invoice → record-payment money flow.
- Stable migration discipline (per ADR 0002) becomes auditable end-to-end (migration applied + integration test green).

**Negative / costs to acknowledge today:**

- **Partial regression coverage.** A unit-test suite exists (pure logic in `src/shared/lib/*`, Zod schema parse/refine paths, the time-tracking token encryption). The integration and E2E tiers are not yet built, so service-layer and money-flow regressions still rely on hand-checking + lint until that backfill lands.
- **Schema-evolution risk.** Without integration tests against a Prisma test DB, schema migrations cannot be verified end-to-end pre-deploy. Mitigated for now by manual smoke testing + the `prisma migrate diff` dry-run discipline.

**Operational implications:**

- The unit suite plus the type-check + lint + format-check gate are the current mechanical guards. CI runs all of them on every push and pull request.
- Manual smoke-test checklist (login, create invoice, send invoice, view PDF, record payment) lives in `docs/runbooks/deployment.md` — it remains the stand-in until the E2E tier covers the money flow.
- The remaining back-fill should prioritise the integration tier (toward the 60→30 split) and the money-flow E2E first.

## Update 2026-05-22

The Vitest framework choice in this ADR is realised; the back-fill is in progress.

**Done:**

- `vitest.config.ts` is committed and `pnpm test` runs the suite.
- A unit suite exists and passes — covering `src/shared/lib/*` (calculations, theme mode), Zod schema parse/refine paths in `src/shared/schemas/*`, and the time-tracking token encryption in `src/server/time-tracking/*`.
- CI runs the suite. The `.github/workflows/ci.yml` `check` job runs `pnpm test` alongside type-check, lint, and format-check — the earlier "CI gap" is closed.

**Still outstanding (toward the 60/30/10 pyramid):**

- **Integration tier** — server services in `src/server/*` against a test Postgres, and API route handlers via `withAuth` + `parseBody`. Not yet started.
- **E2E tier** — Playwright is not yet installed; the money-flow critical paths (sign-up → create invoice → send → record payment → mark paid) and the public viewer (`/i/[publicId]`) are still covered only by the manual smoke-test checklist.

## Re-evaluate this ADR when

1. The first integration test lands (revise the Update section), or
2. A regression in production traces back to untested logic (escalate the back-fill priority).
