# OSS Contribution Command Center

A local-first, high-density telemetry command center for tracking, triaging, and managing open-source contributions across GitHub and GitLab.

Built with **Tactical Telemetry & Industrial Brutalism** design principles: Space Grotesk headers, JetBrains Mono telemetry metrics, IBM Plex Sans body typography, zero generic AI slop, 90° razor borders, and calibrated contrast.

---

## ⚡ Key Capabilities

1. **Unified Multi-Platform Aggregation**:
   - Background sync layer pulling authored PRs, MRs, and issues across GitHub (`Guts1005`) and GitLab (`Sharvin` on RTEMS).
   - Non-blocking SQLite storage with WAL (Write-Ahead Logging) mode.

2. **Action-Surfacing & Local Unread Tracking**:
   - Immediate visibility into items requiring action: `OWE REPLY`, `CHANGES REQ`, and unread maintainer activity.
   - Local-only unread tracking (`unread = 1` strictly when `last_activity_at > last_viewed_at`). Opening an item marks it read.

3. **Dense Scannable Interface & Slide-Over Drawer**:
   - High-signal scannable table retaining scroll position and active filters when opening items in the slide-over detail drawer.
   - Interactive activity event timeline and editable operational triage notes.

4. **Power-User Keyboard Navigation**:
   - `j` / `k` or `↓` / `↑`: Cycle through contribution rows.
   - `Enter`: Open slide-over detail drawer for selected item.
   - `Esc`: Close drawer or dismiss command palette.
   - `Ctrl+K`: Global command palette to instantly search across repos, titles, numbers, and notes.

5. **CLI / Plan Triage Ingest Endpoint**:
   - `POST /api/ingest`: Pipe newly discovered issues or bounties directly from Antigravity CLI `/plan` sessions into the database.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, `better-sqlite3` (WAL mode), `zod`, `axios`, `dotenv`, `tsx`
- **Frontend**: React 18, Vite, Tailwind CSS with custom design tokens (`tokens.css`), Lucide icons
- **Architecture**: Local-first, single-port capable (Vite dev proxy on `5173`, Express API + static dist on `3100`).

---

## 🚀 Quick Start

### 1. Configure Environment
Create `.env` in the root directory:
```env
PORT=3100
GITHUB_TOKEN=your_github_token_here
GITHUB_USERNAME=Guts1005
GITLAB_USERNAME=Sharvin
GITLAB_HOST=https://gitlab.rtems.org
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Dev Server
```bash
# Starts both Express backend (:3100) and Vite frontend (:5173) concurrently
npm run dev
```

Visit **`http://localhost:5173`** for local development with HMR, or **`http://localhost:3100`** for the compiled static bundle.

### 4. Run Test Suite
```bash
# Verify SQLite schema and WAL transactions
npm run test:db

# Run end-to-end integration tests
npx tsx tests/api_integration.test.ts
```

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/stats` | High-level metrics (`total`, `actionNeeded`, `awaitingMaintainer`, `merged`, `unreadCount`, `lastSync`). |
| `GET` | `/api/contributions` | Filtered contributions (`?platform=...&status=...&action=...&search=...&sort=...`). |
| `GET` | `/api/contributions/:id` | Single item details + event timeline. Automatically marks unread as 0. |
| `PATCH` | `/api/contributions/:id/notes` | Update operational notes and `action_needed` state. |
| `POST` | `/api/sync` | Manually trigger a background sync pass against GitHub and GitLab. |
| `POST` | `/api/ingest` | Ingest a new contribution or issue directly from the CLI. |

### CLI Ingestion Example (`curl`):
```bash
curl -X POST http://localhost:3100/api/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "github",
    "repo": "vllm-project/vllm",
    "number": 12345,
    "title": "perf: optimize paged attention kernel memory footprint",
    "type": "issue",
    "url": "https://github.com/vllm-project/vllm/issues/12345",
    "author": "Guts1005",
    "difficulty": "hard",
    "bounty_amount": "$500",
    "notes": "Triaged from CLI /plan"
  }'
```
