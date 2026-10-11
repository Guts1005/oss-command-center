# Spec: Sprint 19 (Option D: Weekly Email Summaries & Digest Engine)

## Objective
Implement an autonomous Email Digest Engine that compiles and delivers high-signal contribution digests (open PRs, urgent maintainer review actions, recent merges, and stale items) to developers on a configurable cadence (daily or weekly).
The engine will support Resend REST API, standard SMTP servers (via Nodemailer), and an interactive in-browser preview mode.

## User Stories & Acceptance Criteria
1. **Configurable Digest Cadence**:
   - Contributors can toggle email digests on/off in Settings.
   - Choose between 'daily' or 'weekly' delivery cadence.
   - Specify a custom destination email address or default to their account email.
2. **High-Signal Email Template**:
   - Clean, modern, responsive email layout compatible with Gmail, Apple Mail, and Outlook.
   - Urgent action required cards (amber for review comments, red for requested changes).
   - Summary of PRs awaiting maintainer review and items merged this week.
   - Direct clickable links to pull requests and repository contexts.
   - Full plain-text alternative included in every outgoing message.
3. **Multiple Transport Options**:
   - Cloud: Resend REST API via `RESEND_API_KEY`.
   - Self-hosted: SMTP via `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
   - Dev / Test: In-memory mock transport with delivery logging and HTML preview.
4. **Interactive In-App Testing**:
   - "PREVIEW DIGEST" endpoint and modal to view rendered email directly in the app.
   - "SEND TEST EMAIL" button with immediate latency and status feedback.
5. **Autonomous Cron Dispatch**:
   - Integrated into the existing background sync worker to evaluate cadence and dispatch due digests.

## Technical Architecture
- `server/email/digest.ts`: Data collector compiling user contributions into structured categories, stats, and HTML/text templates.
- `server/email/transporter.ts`: Multi-provider email transport layer (Resend API, Nodemailer SMTP, Mock).
- `server/routes/digest.ts`: Routes for `/api/digest/preview` and `/api/digest/test`.
- `server/db.ts`: Schema migration for `user_settings` columns: `email_digest_enabled`, `email_digest_cadence`, `email_digest_address`, `last_email_digest_at`.
- `client/src/components/views/SettingsView.tsx`: UI controls for email digest preferences, preview modal, and test sender.
- `tests/email_digest.test.ts`: Automated test suite covering template rendering, data grouping, provider fallback, and test delivery.

## Boundaries
- Always sanitize recipient inputs.
- Never crash if SMTP or Resend fails; catch and log cleanly.
- Strictly zero em-dashes across all code, emails, and documentation.
