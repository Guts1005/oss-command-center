# Sprint 21 Task Breakdown: Rate Limiting & Enterprise Security Hardening

- [x] 1. Architecture & Middleware Foundation
  - [x] 1.1 Create `server/middleware/rate_limit.ts` with multi-tier limiters (`authLimiter`, `actionLimiter`, `webhookLimiter`, `globalApiLimiter`).
  - [x] 1.2 Implement standardized RFC rate limit headers and 429 JSON response payload.
  - [x] 1.3 Implement structured security audit logger for blocked attempts with queryable buffer.
  - [x] 1.4 Implement test mode bypass with explicit opt-in header (`x-test-rate-limit: true`).

- [x] 2. Route Integration & Perimeter Hardening
  - [x] 2.1 Mount `globalApiLimiter` in `server/index.ts` with explicit health probe immunity (`/health`, `/api/health`, `/metrics`).
  - [x] 2.2 Mount `authLimiter` on auth mutation routes in `server/routes/auth.ts`.
  - [x] 2.3 Mount `actionLimiter` on sync and contribution action routes in `server/routes/sync.ts` and `server/routes/actions.ts`.
  - [x] 2.4 Mount `webhookLimiter` on inbound webhook handlers in `server/routes/webhooks_inbound.ts`.

- [x] 3. Automated Test Suite & Verification
  - [x] 3.1 Create comprehensive test suite in `tests/security_hardening_ratelimit.test.ts`.
  - [x] 3.2 Verify Tier 1 Auth rate limiter returns 429 after exceeding quota.
  - [x] 3.3 Verify Tier 2 Action rate limiter throttles sync/action mutations.
  - [x] 3.4 Verify Tier 3 Webhook rate limiter enforces threshold on webhook routes.
  - [x] 3.5 Verify Health probe immunity (/health and /api/health never return 429 even under heavy traffic).
  - [x] 3.6 Verify Standard rate limit headers (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, `Retry-After`).
  - [x] 3.7 Verify Structured security audit logs recorded on rate limit trigger.
  - [x] 3.8 Add test suite to `tests/run_all.ts` (18 suites total).
  - [x] 3.9 Run full suite `npm test` and build check `npm run build`.

- [x] 4. Production Review & Git Hygiene
  - [x] 4.1 Verify zero regressions across all 18 test suites.
  - [x] 4.2 Audit code for zero em-dash violations.
  - [x] 4.3 Commit and push to origin main.
