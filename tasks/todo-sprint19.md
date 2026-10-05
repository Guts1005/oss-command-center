# Tasks: Sprint 19 (Option D: Weekly Email Summaries & Digest Engine)

- [x] Task 1: Expand database schema in server/db.ts with migration
  - Acceptance: user_settings contains email_digest_enabled, email_digest_cadence, email_digest_address, last_email_digest_at
  - Verify: Database migration checks pass without error
  - Files: server/db.ts

- [x] Task 2: Implement Digest Builder & Template Engine in server/email/digest.ts
  - Acceptance: Aggregates contributions by urgency, calculates velocity, renders HTML and plain text
  - Verify: Generates valid HTML and markdown text with accurate statistics
  - Files: server/email/digest.ts

- [x] Task 3: Implement Multi-Provider Transporter in server/email/transporter.ts
  - Acceptance: Supports Resend API, SMTP via Nodemailer, and in-memory mock sink
  - Verify: Successfully dispatches to mock sink and records delivered messages
  - Files: server/email/transporter.ts

- [x] Task 4: Expose routes in server/routes/digest.ts
  - Acceptance: GET /api/digest/preview and POST /api/digest/test
  - Verify: API returns preview HTML and triggers test delivery
  - Files: server/routes/digest.ts, server/routes/index.ts

- [x] Task 5: Hook email digest runner into Background Sync Worker
  - Acceptance: Background worker checks cadence and dispatches due digests
  - Verify: Worker records last_email_digest_at after successful dispatch
  - Files: server/sync/worker.ts

- [x] Task 6: Build automated test suite for Email Digest
  - Acceptance: Tests aggregation, template rendering, provider fallback, and API endpoints
  - Verify: npx tsx tests/email_digest.test.ts passes cleanly
  - Files: tests/email_digest.test.ts, tests/run_all.ts

- [x] Task 7: Update frontend SettingsView.tsx with Email Digest controls
  - Acceptance: UI provides email digest toggle, cadence selector, custom email input, preview button, and test dispatch
  - Verify: npm run build passes with 0 errors
  - Files: client/src/components/views/SettingsView.tsx

- [x] Task 8: Final verification and deployment
  - Acceptance: All 16 test suites pass, build succeeds, zero em-dash compliance verified, changes committed and pushed
  - Verify: npm test && npm run build
  - Files: All modified files
