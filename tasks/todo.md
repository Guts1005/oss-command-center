# Implementation Tasks: Multi-Page Expansion & Calibrated Light Mode

## Sprint 1: Navigation Shell & View Routing
- [x] Task 1.1: Build client-side view state hook with browser URL synchronization (`?view=stream|analytics|repos|settings`)
- [x] Task 1.2: Add desktop view switcher in `HeaderTelemetry.tsx` and mobile dock tabs in `MobileBottomDock.tsx`
- [x] Task 1.3: Create placeholder view containers for Analytics, Repositories, and Settings
- [x] Checkpoint: Sprint 1 Verification (URL sync, desktop and mobile tab clicks, `npm run build` exits 0)

## Sprint 2: Analytics & Velocity Dashboard
- [x] Task 2.1: Implement backend endpoint `GET /api/analytics` for merge velocity, review turnaround, and acceptance rate
- [x] Task 2.2: Add unit and integration tests in `tests/analytics.test.ts`
- [x] Task 2.3: Build `AnalyticsView.tsx` with velocity metrics, lead time cards, and 52-week activity heatmap
- [x] Checkpoint: Sprint 2 Verification (`npm test` passes, visual verification in browser, build clean)

## Sprint 3: Repositories & Ecosystem Explorer
- [x] Task 3.1: Implement backend endpoint `GET /api/repositories` aggregating tracked upstream projects
- [x] Task 3.2: Add unit tests in `tests/repositories.test.ts`
- [x] Task 3.3: Build `RepositoriesView.tsx` with responsiveness ratings and click-through filtering to Stream
- [x] Checkpoint: Sprint 3 Verification (`npm test` passes, repo filter navigation verified in browser)

## Sprint 4: Settings & Outbound Webhook Routing
- [x] Task 4.1: Implement user settings and webhook routing backend with payload signature generation
- [x] Task 4.2: Add unit tests in `tests/webhooks.test.ts`
- [x] Task 4.3: Build `SettingsView.tsx` with token vault management, sync cadence selector, and webhook test ping
- [x] Checkpoint: Sprint 4 Verification (`npm test` passes, webhook test ping verified)

## Sprint 5: Calibrated Light Mode
- [x] Task 5.1: Define `[data-theme="light"]` token ladder in `tokens.css` preserving palette and contrast
- [x] Task 5.2: Add theme toggle component in `HeaderTelemetry.tsx` with persistence and system preference sync
- [x] Task 5.3: Audit all component styles for seamless light/dark rendering
- [x] Checkpoint: Sprint 5 Verification (Contrast checks pass, visual verification on desktop and mobile)

## Sprint 6: Mobile Touch Polish & Final Regression
- [x] Task 6.1: Add horizontal swipe gestures on mobile cards for rapid triage
- [x] Task 6.2: Run full automated test suite across all suites (`npm test`)
- [x] Task 6.3: Final production build and end-to-end verification
- [x] Checkpoint: Sprint 6 Complete (Full green test suite, zero regressions, ready to ship)
