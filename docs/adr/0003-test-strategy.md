# ADR 0003: Test strategy — Vitest + Playwright (deferred until post-MVP)

- **Status:** Accepted (debt explicitly acknowledged)
- **Date:** 2026-05-08

## Context

The project shipped its v0.1.0 MVP without any automated tests:

- No `*.test.*` / `*.spec.*` files anywhere in `src/`.
- No `vitest.config.*`, no `playwright.config.*`, no test runner configured.
- No CI gating — type-check + lint + format-check pre-commit hooks are the only mechanical guard.

This was a deliberate (but unrecorded) trade-off during the initial Feb 2026 build sprint: ship the MVP, validate the product with real waitlist signups, then back-fill tests once the schema and feature surface stabilised. The audit (`.audit/1778157009/`) flagged this as DEC-002 / CROSS-003 (decision-level + cross-block finding) — "no tests implemented yet". Without an ADR, the next contributor risks either:

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

**Note:** No tests are currently implemented. See `CROSS-003` in `.audit/1778157009/report.md` for the open finding. This ADR records the chosen tools and the pyramid target; the actual test back-fill is a separate effort.

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

- **Zero regression coverage right now.** Every refactor lands on hand-checking + lint. The audit found no test-flakiness because there are no tests; the absence is the entire risk.
- **CI gap.** No CI workflow exists (`.github/workflows/` only has Claude-related workflows, no `test.yml`). When tests land, CI must land with them.
- **Schema-evolution risk.** Without integration tests against a Prisma test DB, schema migrations cannot be verified end-to-end pre-deploy. Mitigated for now by manual smoke testing + the `prisma migrate diff` dry-run discipline (DATA-009).

**Operational implications:**

- Until tests exist, the type-check + lint + format-check pre-commit gate is the only mechanical guard.
- Manual smoke-test checklist (login, create invoice, send invoice, view PDF, record payment) lives in `docs/runbooks/deployment.md`.
- When the test back-fill starts, prioritise the integration tier (60→30 split) and the money-flow E2E first.

## Open work

Tracked as **CROSS-003** in `.audit/1778157009/report.md`. Re-evaluate this ADR when:

1. The first integration test lands (revise the consequences section), or
2. A regression in production traces back to untested logic (escalate the back-fill priority).
