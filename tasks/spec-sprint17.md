# Spec: Sprint 17 (Option B: Real-World Notifications & Background Cron Worker)

## Objective
Equip the OSS Command Center with real-world push notification dispatchers (Slack blocks and Discord embeds) and an autonomous background synchronization worker so that contributors receive immediate alerts when maintainers request changes or require replies, even when no browser tabs are open.

## Capability Map

| Module ID | Responsibility | Dependencies |
|---|---|---|
| `db-settings` | Schema expansion for Slack, Discord, and background sync preferences | `server/db.ts` |
| `notifications` | Formatter and outbound dispatcher for Slack blocks, Discord embeds, and generic webhooks | `db-settings`, `server/security/crypto.ts` |
| `cron-worker` | In-process background poller with concurrency locks and change detection | `notifications`, `server/sync/multi_engine.ts`, `server/sse.ts` |
| `ui-settings` | Settings view cards for Slack, Discord, and background sync controls | `client/src/components/views/SettingsView.tsx` |
| `test-suite` | Automated integration and regression test suite | `tests/notifications_and_cron.test.ts` |

## Commands
* Build: `npm run build`
* Test single suite: `npx tsx tests/notifications_and_cron.test.ts`
* Test master suite: `npm test`
* Typecheck: `npx tsc --noEmit`

## Project Structure
* `server/notifications/dispatcher.ts`: Outbound dispatcher for Slack, Discord, and generic webhooks.
* `server/notifications/formatters.ts`: Payload transformers generating Slack Block Kit JSON and Discord Embed JSON.
* `server/sync/worker.ts`: Background cron worker with concurrency locking, telemetry, and rate-limit guard.
* `server/routes/settings.ts`: Extended API endpoints for testing Slack, Discord, and saving background sync settings.
* `server/routes/sync.ts`: Endpoint `GET /api/sync/status` returning background worker status and next execution time.
* `client/src/components/views/SettingsView.tsx`: Enhanced settings view with dedicated Slack and Discord cards.
* `tests/notifications_and_cron.test.ts`: Automated test suite covering formatters, dispatchers, and worker mechanics.

## Boundaries
* Always: Validate webhook URLs with Zod; sanitize outgoing payload content; enforce concurrency locks on sync cycles.
* Ask first: Modifying core database table foreign keys or deleting existing endpoints.
* Never: Expose plaintext tokens or webhook secrets in logs; introduce em-dashes into code or documentation; block server boot if external webhooks timeout.

## Success Criteria
1. Discord Webhooks: Payloads sent to Discord URLs use native `embeds` schema with accurate status colors (Amber for `owe-reply`, Red for `changes-requested`, Green for `merged`, Blue for ping).
2. Slack Webhooks: Payloads sent to Slack URLs use native `blocks` schema with structured markdown and clickable repository links.
3. Background Worker: Automatically runs at the configured cadence, safely recovers from API errors, emits SSE updates on contribution state changes, and dispatches outbound notifications.
4. Settings UI: Users can configure and independently test Slack, Discord, and Generic webhooks with real-time latency feedback.
5. All 14 test suites pass cleanly with 100% success rate.
