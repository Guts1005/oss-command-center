# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
High-velocity open-source contributors, kernel engineers, and developers who manage pull requests, reviews, and issues across multiple organizations and repositories on GitHub and GitLab.

## Product Purpose
A local-first, zero-latency telemetry workstation and triage HUD that eliminates PR review scatter. It gives developers immediate operational clarity on which pull requests require an action (reply needed, changes requested), which are awaiting maintainers, and what review SLAs look like.

## Positioning
Unlike third-party SaaS management platforms that demand broad organizational access, store credentials on remote multi-tenant clouds, and charge subscription fees, OSS Command Center runs local-first with SQLite WAL persistence, zero-knowledge client-side AES-256-GCM credential encryption, and real-time Server-Sent Events (SSE).

## Operating Context
Used during active engineering sessions, daily triage, PR sprint cycles, and open-source contribution tracking. Operates in modern browser viewports with tactile keyboard shortcuts (`j`/`k` navigation, `Enter` to inspect, `Esc` to close).

## Capabilities and Constraints
- Unified dual-platform triage across GitHub and GitLab.
- Real-time Server-Sent Events (SSE) telemetry with automatic reconnection.
- Authenticated AES-256-GCM cipher with unique 96-bit IVs per credential.
- Zero-auth Interactive Demo Sandbox featuring 7 curated open-source PRs.
- 365-day contribution heatmaps, merge velocity metrics, and maintainer response SLAs.
- Turnkey outbound notification sinks: Discord, Slack, and automated email digests.
- Multi-tenant isolation verified with 20 isolated test suites.

## Brand Commitments
- Name: OSS Command Center
- Author: Sharvin Neve (Computer Engineering student & systems contributor, NMIMS MPSTME, Mumbai).
- Voice: Direct, technical, calm, honest, zero marketing fluff, zero AI tropes.
- Color system: Deep void obsidian base, sapphire accent, glacial cyan secondary, status-mapped semantic states (emerald merged, amber action-needed, rose closed).

## Evidence on Hand
- Full production repository with 20 passing integration test suites (`tests/run_all.ts`).
- Live production deployment at https://ossbysharvin.vercel.app.
- Grounded upstream contributions to RTEMS kernel and edge streaming stacks.

## Product Principles
1. Signal Over Noise: Every badge, color, and numeral maps to an immediate engineering status.
2. Respect the Machine: Fast load times, lightweight client footprint, and strict sub-16ms render budgets.
3. Privacy by Architecture: Credentials stay encrypted at rest and never touch third-party analytical trackers.

## Accessibility & Inclusion
Full keyboard accessibility, semantic HTML, WCAG AA compliance (contrast ratio ≥4.5:1), screen-reader noscript fallback, and respects reduced motion.
