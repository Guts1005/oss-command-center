# Engineering Implementation Plan: Multi-Page Expansion & Calibrated Light Mode

## Overview
Transform the OSS Command Center from a single-stream PR watcher into an all-inclusive open-source operations station. This plan organizes delivery into test-driven sprints, concluding with a calibrated light mode that preserves our exact color scheme, visual hierarchy, and status semantics.

---

## Architecture Decisions
1. **Lightweight View State & History Synchronization**:
   - Manage multi-page navigation using browser history and URL query parameters (`?view=stream`, `?view=analytics`, `?view=repos`, `?view=settings`).
   - Enables direct bookmarking, browser back/forward button support, and zero full-page reloads without adding heavy router dependencies.
2. **Deterministic Telemetry over Heavy ML**:
   - Compute real statistical metrics on the backend (median merge velocity, maintainer response latency, review cycles, and activity heatmaps) in sub-millisecond SQLite queries rather than loading client-side neural networks.
3. **Calibrated Light Theme Architecture**:
   - Implement dual-theme CSS variables in `tokens.css` scoped under `[data-theme="light"]`.
   - Maintain the exact same palette ladder:
     - Base canvas: `#F4F6F9` (refined cool light slate canvas, avoiding raw `#FFFFFF` glare).
     - Surface: `#FFFFFF` (crisp white card background).
     - Card surface: `#F8FAFC`.
     - Elevated surface: `#EDF2F7`.
     - Active surface: `#E2E8F0`.
     - Subtle border: `#CBD5E1`.
     - Bold border: `#94A3B8`.
     - Text primary: `#0F172A` (obsidian charcoal for maximum contrast).
     - Preserves all semantic status colors: Merged emerald, Action coral, Review sapphire, Reply amber.
   - Sync with `localStorage` and system `prefers-color-scheme`.
4. **Sprint-Driven Verification Gate**:
   - Every sprint requires automated unit or integration tests, clean TypeScript compilation, and live browser DevTools inspection before advancing.

---

## Sprint Roadmap & Testing Gates

### Sprint 1: Navigation Shell & View Routing
* **Scope**:
  - Add primary view switcher to `HeaderTelemetry.tsx` (`STREAM`, `ANALYTICS`, `REPOSITORIES`, `SETTINGS`).
  - Wire mobile bottom dock to support view switching.
  - Implement bidirectional URL synchronization (`?view=...`) with browser back/forward support.
  - Create stub view components for subsequent sprints.
* **Testing Gate**:
  - Unit test for URL view synchronization and fallback handling.
  - DevTools verification of view switching across 360px and 1920px viewports.
  - `npm run build` exits 0.

### Sprint 2: Analytics & Velocity Dashboard
* **Scope**:
  - Backend endpoint `GET /api/analytics` calculating:
    - Median time to merge (hours and days).
    - Time to first maintainer review.
    - Acceptance rate (merged vs closed).
    - Organization ratio (external tier-1 organizations vs personal repos).
    - 52-week activity contribution punch card matrix.
  - Frontend `AnalyticsView.tsx` with obsidian cards, lead time metrics, and custom SVG punch card heatmap.
* **Testing Gate**:
  - Backend integration test in `tests/analytics.test.ts` verifying calculation accuracy against mock database rows.
  - DevTools verification of visual charts and responsive breakdown.
  - `npm test` and `npm run build` exit 0.

### Sprint 3: Repositories & Ecosystem Explorer
* **Scope**:
  - Backend endpoint `GET /api/repositories` aggregating:
    - Unique upstream repos tracked across GitHub and GitLab.
    - Active PR count, changes requested count, merged count per repo.
    - Maintainer responsiveness rating (Fast <12h, Moderate 1 to 3d, Slow >7d).
  - Frontend `RepositoriesView.tsx` with repo cards, language badges, and direct filter actions.
  - Clicking a repo navigates to the Stream view pre-filtered to that project.
* **Testing Gate**:
  - Backend integration test in `tests/repositories.test.ts` verifying multi-tenant repo aggregation.
  - UI test verifying click-through filtering to Stream view.
  - `npm test` and `npm run build` exit 0.

### Sprint 4: Settings & Outbound Webhook Dispatch
* **Scope**:
  - Backend endpoints for user settings and token vault inspection.
  - Outbound webhook dispatcher supporting Discord, Slack, and generic JSON payloads on maintainer actions.
  - Frontend `SettingsView.tsx` with token vault management, sync interval selector, audio alert preferences, and webhook configuration with a live "Send Test Ping" button.
* **Testing Gate**:
  - Unit test in `tests/webhooks.test.ts` verifying webhook payload generation and signature headers.
  - Integration test for updating settings and token validation.
  - `npm test` and `npm run build` exit 0.

### Sprint 5: Calibrated Light Mode
* **Scope**:
  - Define `[data-theme="light"]` token ladder in `tokens.css`.
  - Add theme toggle control in `HeaderTelemetry.tsx` (Dark, Light, System) with icon animations.
  - Persist user preference to `localStorage` and initialize before DOM paint to prevent flash of unstyled theme (FOUT).
  - Audit all modals, slide-overs, badges, and dropdowns for contrast compliance.
* **Testing Gate**:
  - Automated token check verifying all CSS variables are mirrored in both themes.
  - DevTools visual inspection of light mode across desktop and mobile.
  - Contrast check: verify WCAG AA compliance (minimum 4.5:1 for body text).
  - `npm run build` exits 0.

### Sprint 6: Mobile Touch Interactions & Final Polish
* **Scope**:
  - Add horizontal touch swipe gestures to mobile contribution cards (swipe right to copy link, swipe left to inspect).
  - Final performance pass and smooth transition tuning.
* **Testing Gate**:
  - DevTools mobile touch emulation test verifying swipe events without interfering with vertical scroll.
  - Full regression test run across all test suites (`npm test`).
  - Production build verification (`npm run build`).

---

## Risks and Mitigations
| Risk | Severity | Mitigation |
|---|---|---|
| View switching causes state loss in the Stream | Medium | Keep contribution list state alive in parent context or cache active filter selections in URL query parameters. |
| Light mode looks washed out or generic | High | Enforce strict palette mirroring with slate-tinted light surfaces (`#F4F6F9`, `#FFFFFF`, `#F8FAFC`) rather than generic grey, and preserve exact badge colors. |
| Webhook failures block database writes | Low | Fire outbound webhooks asynchronously in background workers without blocking the HTTP response cycle. |
