# Sprint 22 Specification: Defensive Security Hardening & Zero-Trust Perimeter

## 1. Objective & Threat Scope
Address findings from the defensive security assessment to eliminate residual eavesdropping, token leakage, and unauthorized access vectors:
1. Lock down permissive Cross-Origin Resource Sharing (CORS) from `origin: true` to an explicit origin whitelist.
2. Protect session credentials from client-side script theft by removing token persistence in browser `localStorage`, enforcing pure `HttpOnly` cookies.
3. Guarantee cryptographic integrity at rest by asserting mandatory production encryption keys (`ENCRYPTION_KEY`).
4. Prevent IP spoofing in multi-tier rate limiting by gating `X-Forwarded-For` evaluation behind trusted proxy configurations.

## 2. Hardening Measures

### 2.1 Strict CORS Origin Whitelisting (`server/index.ts`)
- Replace wildcard origin reflection with explicit allowed origins:
  - Whitelist: `process.env.ALLOWED_ORIGINS` (comma-separated), or default local development origins (`http://localhost:5173`, `http://localhost:3100`, `http://127.0.0.1:5173`, `http://127.0.0.1:3100`).
  - In non-production environments, match loopback origins (`localhost` and `127.0.0.1`).
  - Non-browser requests without `Origin` headers (CLI curl, background sync workers, health probes) continue to pass.
  - External unauthorized domains are rejected by CORS.

### 2.2 Pure HttpOnly Session Security (`client/src`)
- Update `client/src/main.tsx` and `client/src/contexts/AuthContext.tsx`:
  - Eliminate `localStorage.setItem('oss_session_token')` and `localStorage.getItem('oss_session_token')`.
  - Rely exclusively on browser-managed `HttpOnly`, `SameSite=Lax`, and `Secure` cookies (`oss_session`).
  - Retain `oss_user_cached` for non-sensitive UI profile state.
  - Mitigate XSS token theft risks completely.

### 2.3 Production Master Key Assertion (`server/security/crypto.ts`)
- In `getMasterKey()`:
  - When `NODE_ENV === 'production'`, require `ENCRYPTION_KEY` or `ENCRYPTION_MASTER_KEY`.
  - Throw a fatal error on startup if running in production without an explicitly configured secret.

### 2.4 Rate Limit IP Resolution Hardening (`server/middleware/rate_limit.ts` & `server/index.ts`)
- Configure `app.set('trust proxy', ...)` in `server/index.ts` based on `TRUST_PROXY` environment setting.
- In `rate_limit.ts`: only parse `X-Forwarded-For` when `req.app.get('trust proxy')` is enabled, or when running under `NODE_ENV === 'test'` for test isolation.
- Disallow arbitrary client header spoofing on direct connections.

## 3. Verification Standards
- Maintain 100% test pass rate across all 18 test suites in `tests/run_all.ts`.
- Ensure frontend build compiles cleanly with zero TypeScript errors.
- Commit atomically with strict zero em-dash compliance.
