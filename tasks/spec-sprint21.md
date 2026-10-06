# Sprint 21 Specification: Enterprise Rate Limiting & Security Hardening (Production Defense)

## 1. Problem Statement & Motivation
In production environments, the OSS Command Center exposes multiple trust boundaries:
1. Authentication endpoints (`/api/auth/login`, `/api/auth/register`, `/api/auth/reset-password`) are vulnerable to automated credential stuffing, brute force attacks, and spam account creation.
2. Mutation and background sync endpoints (`/api/sync`, `/api/contributions/:id/actions/*`) trigger outbound network calls and GitHub/GitLab token consumption. Rapid hammering can exhaust provider API quotas or trigger rate limits on third-party developer tokens.
3. Inbound webhook listeners (`/api/webhooks/*`) receive external events from GitHub and GitLab. High-volume unauthenticated payloads or flood attempts can overwhelm the server and event loops.
4. Infrastructure monitoring and container orchestrators (Docker, Kubernetes, AWS ECS/ALB) require predictable, zero-downtime health probes (`/health`, `/api/health`). These must be strictly immune to rate limiting to avoid false container restarts.

## 2. Core Architecture & Multi-Tier Throttling

### Tier 1: Authentication Defense (`authLimiter`)
- Window: 15 minutes.
- Limit: 15 requests per IP address.
- Target endpoints: `/api/auth/login`, `/api/auth/register`, `/api/auth/reset-password`.
- Mitigation: Prevents credential stuffing and unauthorized account flood.

### Tier 2: Action & Synchronization Protection (`actionLimiter`)
- Window: 1 minute (60 seconds).
- Limit: 30 requests per IP address / authenticated user.
- Target endpoints: `/api/sync`, `/api/contributions/:id/actions/*`.
- Mitigation: Prevents upstream GitHub/GitLab API token quota exhaustion and rapid action spam.

### Tier 3: Inbound Webhook Throttling (`webhookLimiter`)
- Window: 15 minutes.
- Limit: 600 requests per IP address.
- Target endpoints: `/api/webhooks/*`.
- Mitigation: Protects against webhook flood attacks while allowing standard batch webhook events.

### Tier 4: Global API Rate Limiter (`globalApiLimiter`)
- Window: 15 minutes.
- Limit: 1200 requests per IP address.
- Target endpoints: `/api/*`.
- Mitigation: Global perimeter defense against automated scrapers and denial-of-service traffic.

### Tier 5: Health & Monitoring Probe Immunity
- Target endpoints: `/health`, `/api/health`, `/metrics`.
- Rule: Explicitly bypasses all rate limiters without evaluating IP counters.
- Assurance: Zero false-positive 429 status codes for infrastructure probes.

## 3. Standardized Security Headers & Payloads
- Standard rate limit response headers (RFC 6585 and IETF Draft):
  - `RateLimit-Limit`: Maximum requests permitted in current window.
  - `RateLimit-Remaining`: Remaining request allowance in current window.
  - `RateLimit-Reset`: Seconds remaining until window reset.
  - `Retry-After`: Seconds to wait before retrying when blocked.
- Standard error response payload on HTTP 429:
  ```json
  {
    "error": {
      "code": "RATE_LIMIT_EXCEEDED",
      "message": "Too many requests. Please wait before retrying.",
      "tier": "auth | actions | webhooks | api",
      "retryAfterSeconds": 900
    }
  }
  ```

## 4. Structured Security Audit Logging
- When any rate limit is triggered, a structured security log is generated:
  - Timestamp (ISO 8601).
  - Event type: `RATE_LIMIT_BLOCKED`.
  - Client IP address.
  - Target route and HTTP method.
  - User Agent string.
  - Assigned throttling tier.
  - Retry-After window duration.
- Exportable audit log buffer for observability and test inspection.

## 5. Testability & Regression Guardrails
- Test bypass mechanism: During test runs (`NODE_ENV === 'test'`), rate limiting is bypassed by default so that existing 17 test suites execute without throttling.
- Targeted verification: Setting header `x-test-rate-limit: true` enables active throttling for deterministic test validation in `tests/security_hardening_ratelimit.test.ts`.
- Zero regressions across all 18 test suites.
