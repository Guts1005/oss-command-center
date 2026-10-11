# Tasks: Sprint 17 (Option B: Real-World Notifications & Background Cron Worker)

- [x] Task 1: Expand database schema in server/db.ts with migration
  - Acceptance: user_settings contains slack_webhook_url, discord_webhook_url, background_sync_enabled
  - Verify: Database migration check executes without error on existing and new databases
  - Files: server/db.ts

- [x] Task 2: Implement Slack and Discord notification formatters
  - Acceptance: Discord embeds with accurate hex colors and Slack Block Kit payloads generated correctly
  - Verify: Unit test verifies payload schema and color mappings
  - Files: server/notifications/formatters.ts

- [x] Task 3: Implement centralized notification dispatcher
  - Acceptance: Dispatches to Slack, Discord, and Generic webhooks respecting user event filter preferences
  - Verify: Unit test tests simulated dispatch to HTTP sink
  - Files: server/notifications/dispatcher.ts

- [x] Task 4: Implement background sync worker
  - Acceptance: Periodic runner with concurrency lock, rate-limit safety, and state-change notification triggering
  - Verify: Unit test verifies timer execution, lock acquisition, and skip on active job
  - Files: server/sync/worker.ts

- [x] Task 5: Extend settings and sync routes
  - Acceptance: Support updating and testing Slack/Discord webhooks; endpoint GET /api/sync/status returns telemetry
  - Verify: API test verifies POST /api/settings and test ping endpoints
  - Files: server/routes/settings.ts, server/routes/sync.ts, server/index.ts

- [x] Task 6: Hook inbound webhooks to notification dispatcher
  - Acceptance: Inbound GitHub/GitLab webhook state changes trigger outbound notification dispatching
  - Verify: Integration test verifies outbound dispatch on inbound event
  - Files: server/routes/webhooks_inbound.ts

- [x] Task 7: Build automated test suite for Sprint 17
  - Acceptance: Complete test coverage across formatters, dispatchers, worker lifecycle, and settings
  - Verify: npx tsx tests/notifications_and_cron.test.ts passes cleanly
  - Files: tests/notifications_and_cron.test.ts, tests/run_all.ts

- [x] Task 8: Update frontend SettingsView.tsx
  - Acceptance: UI provides dedicated Slack and Discord configuration cards with live test buttons
  - Verify: Vite compilation passes with 0 warnings
  - Files: client/src/components/views/SettingsView.tsx

- [x] Task 9: Final verification and deployment
  - Acceptance: All 14 test suites pass, build succeeds, zero em-dash compliance verified, changes committed and pushed
  - Verify: npm test && npm run build
  - Files: All modified files
