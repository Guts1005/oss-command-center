# OSS Command Center

> Unified Mission Control for Open-Source Contributors and Maintainers.

[![TypeScript](https://img.shields.io/badge/TypeScript-97.4%25-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Test Suite](https://img.shields.io/badge/Tests-18%2F18%20Suites%20Passing-success?style=flat-square&logo=vitest&logoColor=white)](./tests/run_all.ts)
[![Security Architecture](https://img.shields.io/badge/Security-AES--256--GCM%20%7C%20Rate--Limited-blueviolet?style=flat-square&logo=shield)](./server/security/crypto.ts)
[![Architecture](https://img.shields.io/badge/Architecture-Local--First%20%7C%20SQLite%20WAL-informational?style=flat-square&logo=sqlite&logoColor=white)](./server/db.ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](./LICENSE)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Available-orange?style=flat-square)](https://oss-command-center.onrender.com/?demo=1)

---

## Overview

**OSS Command Center** is a high-density operational cockpit for software engineers, maintainers, and open-source teams. It bridges fragmented notifications and pull request tracking across GitHub and GitLab into a single prioritized, local-first queue.

Instead of opening dozens of browser tabs to check whether reviews landed or CI finished, OSS Command Center programmatically evaluates conversation timelines, review approvals, and commit graphs to derive deterministic action states.

```
                           [ Upstream Platforms ]
                     GitHub API / GitLab Cloud / Self-Hosted
                                │             │
                    Inbound Webhooks     Periodic Sync
                                │             │
                                ▼             ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │                  Perimeter Defense & Ingestion                   │
   │  • Helmet Security Headers (CSP, No-Sniff, Frame Deny)           │
   │  • 4-Tier Rate Limiting (Auth, Actions, Webhooks, Global API)    │
   │  • HMAC-SHA256 Constant-Time Signature Verification             │
   └────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │                   Core Multi-Tenant Engine                       │
   │  • Algorithmic Action Derivation (OWE REPLY / CHANGES REQ)       │
   │  • Direct In-App PR Actions (Comment, Review Request, Sync)      │
   │  • Autonomous Background Sync Worker (10m Cadence)               │
   │  • Multi-Channel Notifications (Discord Embeds / Slack Blocks)   │
   │  • Multi-Provider Email Digest Engine (Weekly Reports)           │
   └────────────────────────────────┬─────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
   ┌─────────────────────────────────┐   ┌─────────────────────────────┐
   │      Persistence Layer          │   │      Client Surface         │
   │  • SQLite WAL with Foreign Keys │   │  • React 18 + Tailwind CSS  │
   │  • AES-256-GCM Token Encryption │   │  • Server-Sent Events (SSE) │
   │  • Scrypt Salted Password Hash  │   │  • Pure HttpOnly Cookies    │
   │  • Atomic Credential Purges     │   │  • Interactive Demo Mode    │
   └─────────────────────────────────┘   └─────────────────────────────┘
```

---

## Core Differentiators

### 1. Algorithmic Action Derivation
Native platform inboxes display raw chronological timelines (bot comments, workflow logs, issue tags). OSS Command Center analyses the event graph to determine who owes action:
- `OWE REPLY` (Amber badge): An upstream maintainer or reviewer posted the latest substantive question or feedback.
- `CHANGES REQ` (Red badge): An official review recorded requested modifications.
- `AWAITING MAINTAINER` (Blue badge): You pushed commits or answered questions; the ball is in the maintainer's court.

### 2. Cross-Platform Unified Aggregation
Real-world open source is divided across ecosystems. Systems infrastructure (GNOME, RTEMS, Linux foundation subprojects) runs on GitLab, while application libraries live on GitHub. OSS Command Center ingests and reconciles items across GitHub Cloud, GitLab.com, and self-hosted GitLab instances into a uniform data model.

### 3. Direct In-App PR Actions
Take immediate action on upstream pull requests without leaving the command deck:
- Post comments and review responses directly to GitHub and GitLab PRs.
- Re-request reviews from designated maintainers.
- Trigger instant single-contribution synchronization passes.

### 4. Real-Time Inbound Webhooks & Live SSE Bus
Integrates native webhook listeners (`/api/webhooks/github` and `/api/webhooks/gitlab`) backed by Server-Sent Events (SSE). When maintainers comment or merge upstream, the dashboard updates immediately without manual polling.

### 5. Multi-Channel Notifications & Autonomous Cron Engine
- **Discord & Slack Dispatch**: Real-time push notifications using native Discord Rich Embeds and Slack Block Kit formatting.
- **Autonomous Sync Worker**: Background worker cycles every 10 minutes to ingest upstream updates, audit contributor turnarounds, and trigger scheduled digests.

### 6. Scheduled Email Digest Engine
Multi-provider email recap engine supporting custom SMTP, Amazon SES, SendGrid, Resend, and local mock transports. Aggregates weekly velocity, turnaround times, merged PRs, and awaiting replies into clean HTML and plain-text summaries.

### 7. Interactive Public Sandbox & Demo Mode
Experience the complete operational workflow without entering credentials. Append `?demo=1` to the URL or toggle Sandbox Mode to explore curated telemetry across React, Linux Kernel, Inkscape, Next.js, and Kubernetes with simulated mutations.

---

## Security and Cryptographic Architecture

OSS Command Center is engineered with enterprise defense-in-depth principles:

### Cryptographic Storage at Rest
- **AES-256-GCM Token Encryption**: Personal access tokens (GitHub PATs and GitLab access keys) are encrypted using AES-256-GCM with fresh 12-byte initialization vectors (`crypto.randomBytes(12)`) and 16-byte authentication tags. Tokens are decrypted only ephemerally in memory during active API calls and are never returned to the browser.
- **Password Hashing**: Passwords are hashed using Node's native `scrypt` key derivation function with 16-byte random salts and verified via constant-time comparisons (`crypto.timingSafeEqual`).
- **Production Master Key Enforcement**: Startup guards enforce that `ENCRYPTION_KEY` is explicitly configured in production environments, refusing to boot on default development fallbacks.

### Webhook Verification & Tamper Resistance
- **HMAC-SHA256 Signatures**: Incoming GitHub webhooks validate `X-Hub-Signature-256` against unparsed raw body buffers (`req.rawBody`).
- **Constant-Time Digest Checks**: Digest verification uses `crypto.timingSafeEqual` over fixed-length binary buffers to eliminate timing side-channel attacks.

### Multi-Tier Rate Limiting
Configured via [`server/middleware/rate_limit.ts`](./server/middleware/rate_limit.ts):
- **Tier 1 (Auth)**: 15 requests per 15 minutes on `/api/auth/login` and `/api/auth/register` to block credential stuffing.
- **Tier 2 (Actions & Sync)**: 30 requests per minute on `/api/sync` and `/api/contributions/:id/actions/*` to guard upstream token quotas.
- **Tier 3 (Webhooks)**: 600 requests per 15 minutes on `/api/webhooks/*` to absorb burst traffic while stopping flood attempts.
- **Tier 4 (Global Perimeter)**: 1200 requests per 15 minutes across all `/api/*` endpoints.
- **Health Probe Immunity**: `/health`, `/api/health`, and `/metrics` bypass rate counters unconditionally to prevent container orchestrator dropouts.
- **Standard RFC Headers**: Emits `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, and `Retry-After`.

### Session & Perimeter Hardening
- **Pure HttpOnly Cookies**: Session tokens are held exclusively in browser-managed `HttpOnly`, `SameSite=Lax`, and `Secure` cookies (`oss_session`). Tokens are never stored in client `localStorage`, eliminating token theft via malicious browser scripts.
- **Strict CORS Whitelisting**: Rejects open origin reflection, enforcing explicit origin whitelists in production.
- **Helmet Security Headers**: Content Security Policy with `object-src 'none'`, strict frame denial (`X-Frame-Options: DENY`), `nosniff`, and header fingerprint stripping (`X-Powered-By` hidden).
- **SQL Injection Prevention**: 100% of database interactions use parameterized prepared statements (`db.prepare(...)`).

---

## Keyboard Command Reference

| Shortcut | Action | Context |
| :--- | :--- | :--- |
| `j` or `Down Arrow` | Move focus down the contribution feed | Main feed |
| `k` or `Up Arrow` | Move focus up the contribution feed | Main feed |
| `Enter` | Open slide-over detail drawer for selected item | Main feed |
| `Ctrl + K` or `Cmd + K` | Open global command palette search | Global |
| `Esc` | Close active drawer, modal, or command palette | Global |
| `?` | Toggle quick guide and status badge legend | Global |

---

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons, Lenis Smooth Scroll |
| **Backend** | Express 4, Node.js, TypeScript, Server-Sent Events (SSE), Nodemailer |
| **Database** | SQLite 3 (`better-sqlite3`) with WAL journal mode and foreign key cascading |
| **Security** | AES-256-GCM, Scrypt, Helmet, Express Rate Limit, Zod validation |
| **Build & Tooling**| Vite 6, tsx, PostCSS, Autoprefixer |

---

## Getting Started

### Prerequisites
- Node.js 20.x or higher
- npm 10.x or higher

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Guts1005/oss-command-center.git
cd oss-command-center
npm install
```

### 2. Configure Environment

Copy the template configuration file:

```bash
cp .env.example .env
```

Review and configure your environment variables:

```ini
# Server Port (default: 3100)
PORT=3100
NODE_ENV=development

# Cryptographic Master Key (Mandatory in production)
ENCRYPTION_KEY=generate_a_random_32_byte_secret_hex_or_string

# Application Base URL & CORS Whitelist
APP_URL=http://localhost:3100
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3100

# Reverse Proxy Trust (Set to true when behind Nginx, Caddy, or AWS ALB)
TRUST_PROXY=false

# Optional OAuth 2.0 Credentials
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITLAB_CLIENT_ID=
GITLAB_CLIENT_SECRET=

# Optional Inbound Webhook Secrets
GITHUB_WEBHOOK_SECRET=
GITLAB_WEBHOOK_SECRET=

# Optional Email Digest SMTP Transport
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=secret_password
SMTP_FROM=no-reply@example.com
```

### 3. Run Development Server

Runs the Express API backend (with hot reload via `tsx watch`) and Vite frontend concurrently:

```bash
npm run dev
```

The application will be accessible at `http://localhost:5173` (client dev server) and `http://localhost:3100` (API server).

### 4. Build for Production

Compile TypeScript and build the optimized Vite bundle:

```bash
npm run build
npm start
```

---

## Automated Verification Suite

The project enforces an automated test suite executed in isolated environments with SQLite database fixtures:

```bash
npm test
```

### Test Coverage (18 / 18 Passing Suites)

```text
✔ tests/routing.test.ts                     - Client SPA routing and view transitions
✔ tests/theme.test.ts                       - Theme switching and obsidian color tokens
✔ tests/analytics.test.ts                   - Pipeline turnaround and velocity heatmaps
✔ tests/repositories.test.ts               - Repository metrics and ecosystem breakdown
✔ tests/webhooks.test.ts                    - Outbound notifications and HMAC dispatch
✔ tests/crypto.test.ts                      - AES-256-GCM encryption and scrypt password hashing
✔ tests/db.test.ts                          - SQLite schema, foreign keys, and WAL journal
✔ tests/api_integration.test.ts            - Core REST API endpoints and query filtering
✔ tests/multi_tenant.test.ts                - Cross-tenant boundaries and credential purging
✔ tests/settings_export.test.ts             - User settings persistence and JSON data export
✔ tests/inbound_webhooks.test.ts            - GitHub/GitLab webhooks and SSE event stream
✔ tests/pr_actions.test.ts                  - Direct comments, review requests, and sync
✔ tests/production_hardening.test.ts        - Helmet CSP headers, gzip filters, /health probe
✔ tests/notifications_and_cron.test.ts      - Slack Block Kit, Discord embeds, background cron
✔ tests/oauth.test.ts                       - GitHub and GitLab OAuth 2.0 social login
✔ tests/email_digest.test.ts                - Weekly email digest engine and preview rendering
✔ tests/demo_sandbox.test.ts                - Public sandbox dataset and simulated actions
✔ tests/security_hardening_ratelimit.test.ts - Multi-tier rate limiting, headers, and audit logs
```

---

## Production Deployment

### Docker Deployment

```bash
docker build -t oss-command-center:latest .
docker run -d \
  -p 3100:3100 \
  -e NODE_ENV=production \
  -e ENCRYPTION_KEY=your_production_secret_key_here \
  -v oss_data:/app/data \
  --name oss-command-center \
  oss-command-center:latest
```

### Health Check Endpoints
Container orchestrators (Kubernetes, AWS ALB, Docker swarm) can monitor application health:
- `GET /health` or `GET /api/health`: Returns HTTP 200 with database connection status and process uptime. Immune to rate limiters.

---

## License

Distributed under the **MIT License**. See [`LICENSE`](./LICENSE) for terms.
