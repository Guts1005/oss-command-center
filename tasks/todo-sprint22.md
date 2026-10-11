# Sprint 22 Task Checklist: Defensive Security Hardening

- [x] 1. Core Perimeter & Backend Hardening
  - [x] 1.1 Update `server/index.ts` with strict CORS origin whitelist and `trust proxy` configuration.
  - [x] 1.2 Update `server/security/crypto.ts` with fatal production check for missing `ENCRYPTION_KEY`.
  - [x] 1.3 Update `server/middleware/rate_limit.ts` to gate `X-Forwarded-For` behind trusted proxy validation.

- [x] 2. Client-Side Session Token Hardening
  - [x] 2.1 Remove `localStorage` session token storage in `client/src/contexts/AuthContext.tsx`.
  - [x] 2.2 Remove `localStorage` Authorization header injection in `client/src/main.tsx`.
  - [x] 2.3 Verify `withCredentials = true` persists authentication seamlessly via `HttpOnly` cookies.

- [x] 3. Verification & Validation
  - [x] 3.1 Run `npm run build` to verify frontend TypeScript compilation and Vite bundling.
  - [x] 3.2 Run `npx tsx tests/run_all.ts` to verify 18/18 test suites pass cleanly.
  - [x] 3.3 Audit all changes for strict zero em-dash compliance.
  - [x] 3.4 Commit and push to origin main.
