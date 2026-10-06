# Todo: Sprint 20 (Option E: Public Interactive Sandbox & Demo Mode)

## Phase 1: Curated Dataset & Server Endpoint
- [ ] Create `server/routes/demo.ts` with comprehensive sample contributions, activity events, repositories, analytics, and stats.
- [ ] Mount `/api/demo` in `server/routes/index.ts`.
- [ ] Verify endpoint returns 200 without authentication headers.

## Phase 2: Client Dataset & State Management
- [ ] Create `client/src/data/demoDataset.ts` exporting default demo state and helpers.
- [ ] In `client/src/App.tsx`:
  - [ ] Add `isDemoMode` state initialized from URL param (`?demo=1`) or `localStorage.getItem('oss_demo_mode')`.
  - [ ] If visitor is not authenticated and demo mode is active, fetch from `/api/demo/dataset` (fallback to local dataset).
  - [ ] Provide toggle function `toggleDemoMode()` that switches demo state and updates localStorage.
  - [ ] Support simulated mutations for notes editing, marking read, direct PR replies, review requests, and tracking new URLs.
  - [ ] Ensure switching to real login immediately switches to tenant data.

## Phase 3: UI Polish & Banner Integration
- [ ] In `client/src/components/HeaderTelemetry.tsx`:
  - [ ] Display `DEMO SANDBOX` active indicator pill when demo mode is enabled.
  - [ ] Add a quick toggle switch or button to turn Demo Mode on/off.
  - [ ] Show subtle notification banner when exploring in demo mode with a button to Connect Live Account.
- [ ] In `client/src/components/SlideOverDetail.tsx`:
  - [ ] Display demo simulation badges when in demo mode.
  - [ ] Notify user that notes and comment replies are simulated locally and not sent upstream.

## Phase 4: Automated Testing
- [ ] Create `tests/demo_sandbox.test.ts`.
  - [ ] Test 1: Public access to `GET /api/demo/dataset` returns 200 without credentials.
  - [ ] Test 2: Demo dataset schema matches expected types (contributions, stats, analytics, repositories).
  - [ ] Test 3: Unauthenticated requests to live endpoints (`/api/contributions`, `/api/stats`) remain empty.
  - [ ] Test 4: Live mutation endpoints without authentication remain protected (return 401).
  - [ ] Test 5: Verify SQLite database state is completely unchanged by demo dataset requests.
- [ ] Register in `tests/run_all.ts` (17 total suites).
- [ ] Execute `tests/run_all.ts` and confirm all 17 suites pass cleanly.

## Phase 5: Visual Verification & Git Hygiene
- [ ] Verify frontend build with `npm run build`.
- [ ] Use Chrome DevTools to navigate to demo mode, inspect interactive elements, and capture screenshots.
- [ ] Store screenshots in brain artifacts folder.
- [ ] Commit and push: `feat(demo): add interactive public demo mode and sandbox telemetry`.
- [ ] Immediately proceed to Option F (Sprint 21).
