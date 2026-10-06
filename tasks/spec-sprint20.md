# Spec: Sprint 20 (Option E: Public Interactive Sandbox & Demo Mode)

## Objective
Implement an interactive Public Sandbox and Demo Mode enabling unauthenticated visitors to explore the complete feature set of Open Source Command Center with zero signup friction.
Visitors can inspect curated real-world telemetry (from high-profile projects like React, Linux kernel, Inkscape, Next.js, Antigravity, and Kubernetes), filter and sort contributions, inspect activity timelines, edit triage notes, simulate pull request actions, and switch to their live account when ready.

## User Stories & Acceptance Criteria
1. **Frictionless Demo Access**:
   - Visitors arriving at the application can immediately enter Demo Mode via a header toggle, an unauthenticated splash banner, or URL query parameter (`/?demo=true` or `/?demo=1`).
   - Demo mode preferences persist in `localStorage` (`oss_demo_mode`).
   - A distinct `DEMO SANDBOX` telemetry badge and alert banner inform the visitor that data is simulated and provide a one-click CTA to connect real GitHub/GitLab accounts.

2. **Curated Real-World Telemetry Dataset**:
   - Expose `GET /api/demo/dataset` providing a realistic set of open source pull requests and merge requests across both GitHub and GitLab.
   - Includes real projects: `facebook/react`, `torvalds/linux`, `inkscape/inkscape`, `vercel/next.js`, `google-deepmind/antigravity`, `kubernetes/kubernetes`, `astral-sh/uv`.
   - Populated with diverse statuses (`open`, `submitted`, `in_review`, `merged`, `closed`), triage flags (`reply`, `push-changes`, `none`), difficulties, bounty tags, and rich activity events.
   - Provides corresponding aggregated statistics, velocity analytics, repository health rankings, and 365-day activity heatmaps.
   - Client includes embedded fallback dataset to guarantee instant offline or disconnected availability.

3. **Interactive Sandbox Exploration & Reactive Filtering**:
   - Filter tabs (`ALL`, `ACTION NEEDED`, `IN REVIEW`, `MERGED`, `CLOSED`) filter the demo stream reactively.
   - Platform filters (`All`, `GitHub`, `GitLab`), Scope filters (`All`, `Own`, `External`), and Sorting (`Last Activity`, `Unread First`, `Difficulty`) update without latency.
   - Real-time search by repository name, title, or PR ID filters demo items instantaneously.
   - Stream density controls (Compact, Comfortable, Relaxed) format the demo items seamlessly.

4. **In-Memory & Simulated Mutations**:
   - Clicking an item opens the SlideOverDetail drawer with its timeline events.
   - Opening an unread contribution marks it as read in the local demo state and decrements the unread badge.
   - Updating notes or triage flags in the drawer persists in local demo state and displays a helpful demo simulation confirmation.
   - Direct PR actions (Post Reply, Request Review) simulate upstream responses and append an event to the local timeline without calling upstream provider APIs or requiring real tokens.
   - Track URL modal allows pasting a GitHub/GitLab URL and simulates tracking a new contribution in demo mode.

5. **Security & Isolation Guarantees**:
   - Demo mode operates entirely without database mutations or phantom user creation in SQLite.
   - Live endpoints for real users (`/api/contributions`, `/api/stats`, `/api/analytics`) continue to enforce strict authentication boundaries and return zeroed responses for unauthenticated requests.
   - No cross-tenant data leakage between demo visitors and registered tenants.

6. **Automated Testing & DevTools Verification**:
   - Automated test suite `tests/demo_sandbox.test.ts` validates the demo dataset endpoint, schema integrity, and security isolation.
   - Visual verification using Chrome DevTools captures full-screen evidence of the active demo sandbox.

## Technical Architecture
- `server/routes/demo.ts`: Public route handler for `GET /api/demo/dataset` serving curated demo data.
- `server/routes/index.ts`: Mounts demo router at `/api/demo`.
- `client/src/data/demoDataset.ts`: Standardized demo dataset and client fallback data structure.
- `client/src/App.tsx`: Demo mode state management (`isDemoMode`), URL query detection, localStorage sync, and simulated handlers.
- `client/src/components/HeaderTelemetry.tsx`: Sandbox indicator badge, demo toggle switch, and connect prompt.
- `client/src/components/SlideOverDetail.tsx`: Demo badge and feedback for simulated triage notes and PR replies.
- `tests/demo_sandbox.test.ts`: Integration test suite added to `tests/run_all.ts`.

## Boundaries & Constraints
- Zero em-dashes in any file, response, or commit message.
- 100% pass rate across all test suites.
- Zero server database mutations caused by demo actions.
