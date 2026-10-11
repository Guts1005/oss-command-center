# Production Deployment Runbook

This guide covers deployment procedures, persistent storage architecture, disaster recovery strategies, and operational monitoring for the OSS Command Center.

---

## 1. System Architecture

The OSS Command Center is packaged as a single deployable unit:

* **Runtime:** Node.js 22 LTS Bookworm Slim
* **Backend:** Express API server with Server-Sent Events (SSE) connection pool
* **Frontend:** Pre-compiled Vite React single page application with Tailwind CSS and Framer Motion
* **Database:** SQLite 3 with Write-Ahead Logging (WAL) mode enabled for concurrent reads and writes
* **Security Layer:** Helmet security headers, AES-256-GCM token encryption, strict CORS, express-rate-limit
* **Observability:** `/health` and `/api/health` probes verifying database connectivity and process uptime

---

## 2. Prerequisites and Environment Configuration

Generate required cryptographic secrets before deploying:

```bash
# Generate 32-byte AES-256-GCM master encryption key
openssl rand -hex 32

# Generate session secret
openssl rand -base64 32
```

Create a production `.env` file based on `.env.production.example`:

| Variable | Required | Description | Example |
|---|---|---|---|
| `NODE_ENV` | Yes | Runtime environment | `production` |
| `PORT` | Yes | HTTP listening port | `3100` |
| `DB_PATH` | Yes | SQLite database file path | `/app/data/contributions.db` |
| `ENCRYPTION_KEY` | Yes | 32-byte hex key for credential encryption | 64-character hex string |
| `GITHUB_WEBHOOK_SECRET` | No | Secret for verifying GitHub webhook HMAC signatures | random secret string |
| `GITLAB_WEBHOOK_SECRET` | No | Secret for verifying GitLab webhook token | random secret string |
| `SESSION_SECRET` | No | Random key for session integrity | random base64 string |

---

## 3. Deployment Option 1: Docker Compose (Self-Hosted VPS)

This is the recommended path for production deployments on Ubuntu, Debian, Hetzner, DigitalOcean, or AWS EC2.

### Step 1: Clone Repository and Configure Environment

```bash
git clone https://github.com/Guts1005/oss-command-center.git /opt/oss-command-center
cd /opt/oss-command-center

cp .env.production.example .env
# Edit .env with your generated keys:
nano .env
```

### Step 2: Build and Launch Container

```bash
# Build and start services in detached mode
docker compose up -d --build

# Verify container health status
docker compose ps
```

The container includes a built-in Docker health check probing `http://localhost:3100/health` every 30 seconds.

### Step 3: Configure Reverse Proxy with Automatic HTTPS (Caddy)

Caddy provides automatic SSL certificates via Let's Encrypt with minimal configuration:

```caddyfile
# /etc/caddy/Caddyfile
command-center.yourdomain.com {
    reverse_proxy 127.0.0.1:3100 {
        # Enable streaming support for Server-Sent Events
        flush_interval -1
    }
}
```

Reload Caddy:

```bash
sudo systemctl reload caddy
```

---

## 4. Deployment Option 2: Render.com

The repository includes a ready-to-use [`render.yaml`](file:///E:/OPEN%20SOURCE%20AUTOMATION/oss-command-center/render.yaml) blueprint.

1. Connect your GitHub repository to Render.
2. Select **New** > **Blueprint** and point to your repository.
3. Render automatically provisions the web service with:
   * Build command: `npm install --include=dev && npm run build`
   * Start command: `npm start`
   * Health check path: `/health`
4. In the Render Dashboard under **Disks**, attach a persistent disk mounted to `/data` and update the environment variable:
   * `DB_PATH=/data/contributions.db`
5. Configure `ENCRYPTION_KEY` in Render environment secrets.

---

## 5. Deployment Option 3: Fly.io

Deploying to Fly.io with a persistent NVMe volume:

### Step 1: Initialize Fly Application

```bash
fly launch --no-deploy
```

### Step 2: Create Persistent Storage Volume

```bash
fly volumes create oss_data --size 1 --region ord
```

### Step 3: Configure fly.toml

```toml
app = "oss-command-center"
primary_region = "ord"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "3100"
  DB_PATH = "/app/data/contributions.db"

[mounts]
  source = "oss_data"
  destination = "/app/data"

[[services]]
  protocol = "tcp"
  internal_port = 3100

  [[services.ports]]
    port = 80
    handlers = ["http"]
    force_https = true

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [[services.http_checks]]
    interval = "15s"
    grace_period = "5s"
    method = "get"
    path = "/health"
    protocol = "http"
    timeout = "2s"
```

### Step 4: Set Secrets and Deploy

```bash
fly secrets set ENCRYPTION_KEY=$(openssl rand -hex 32)
fly deploy
```

---

## 6. Database Backups and Disaster Recovery

### Point-in-Time Hot Backups (Built-in Script)

The repository includes [`scripts/backup-db.sh`](file:///E:/OPEN%20SOURCE%20AUTOMATION/oss-command-center/scripts/backup-db.sh) which performs transactional snapshots of the active SQLite database using SQLite's online backup API without locking readers or writers.

Make the script executable:

```bash
chmod +x scripts/backup-db.sh
```

Execute a manual backup:

```bash
DB_PATH=/app/data/contributions.db BACKUP_DIR=/var/backups/oss-command ./scripts/backup-db.sh
```

Schedule daily automated backups via cron:

```cron
# Run daily at 02:00 AM UTC with 7-day retention
0 2 * * * DB_PATH=/app/data/contributions.db BACKUP_DIR=/var/backups/oss-command /opt/oss-command-center/scripts/backup-db.sh >> /var/log/oss-backups.log 2>&1
```

### Continuous Replication via Litestream

For zero Recovery Point Objective (sub-second data loss tolerance), use [Litestream](https://litestream.io/) to continuously stream WAL frames to AWS S3 or Cloudflare R2:

1. Configure storage credentials in `litestream.yml`.
2. Run Litestream replication sidecar:

```bash
litestream replicate -config /app/litestream.yml
```

### Disaster Recovery Restoration

To restore the SQLite database from a compressed backup:

```bash
# Stop application process
docker compose stop

# Decompress and replace database file
gunzip -c /var/backups/oss-command/contributions_20261006_020000.db.gz > /app/data/contributions.db

# Verify database integrity
sqlite3 /app/data/contributions.db "PRAGMA integrity_check;"

# Restart application
docker compose start
```

---

## 7. Inbound Webhook Configuration

To receive instantaneous updates when PRs, issues, or reviews occur:

### GitHub Webhooks Setup
1. Navigate to your repository on GitHub: **Settings** > **Webhooks** > **Add webhook**.
2. **Payload URL:** `https://command-center.yourdomain.com/api/webhooks/inbound/github`
3. **Content type:** `application/json`
4. **Secret:** Match the value in `GITHUB_WEBHOOK_SECRET`.
5. **Events:** Select "Let me select individual events" (Pull requests, Issues, Issue comments, Pull request reviews).

### GitLab Webhooks Setup
1. Navigate to your project on GitLab: **Settings** > **Webhooks** > **Add new webhook**.
2. **URL:** `https://command-center.yourdomain.com/api/webhooks/inbound/gitlab`
3. **Secret token:** Match the value in `GITLAB_WEBHOOK_SECRET`.
4. **Trigger:** Select Merge requests, Issues, Comments.

---

## 8. Operational Health Checks and Telemetry

The application exposes two health check endpoints:

* **Endpoint:** `GET /health` or `GET /api/health`
* **Response:**
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-10-06T01:30:00.000Z",
    "uptimeSeconds": 1420.5,
    "environment": "production",
    "database": "connected"
  }
  ```
* **Failure Condition:** If SQLite connectivity fails, the endpoint returns HTTP `503 Service Unavailable` with `"database": "disconnected"`.

---

## 9. Automated CI/CD Quality Gate

The repository includes a ready-to-run GitHub Actions quality gate template at [`ci/workflows/ci.yml`](./ci/workflows/ci.yml):

* **Triggers:** Pull requests and pushes targeting the `main` branch
* **Environment:** Node.js 22 LTS with npm dependency caching
* **Verification Gates:**
  1. Static type checking (`npx tsc --noEmit`)
  2. Production Vite bundle build (`npm run build`)
  3. Master test suite execution across all 13 suites (`npm test`)

To activate the workflow in your GitHub repository, copy `ci/workflows/ci.yml` to `.github/workflows/ci.yml` via the GitHub Web UI or through a GitHub Personal Access Token configured with the `workflow` scope.
