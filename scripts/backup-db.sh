#!/usr/bin/env bash
# Automated Point-in-Time SQLite Backup Script
# Creates transactional, non-locking hot backups of the live SQLite database.

set -euo pipefail

# Configuration defaults
DB_PATH="${DB_PATH:-./data/contributions.db}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
BACKUP_FILE="${BACKUP_DIR}/contributions_${TIMESTAMP}.db"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting SQLite backup..."

# Verify database file exists
if [ ! -f "${DB_PATH}" ]; then
  echo "Error: Database file not found at ${DB_PATH}" >&2
  exit 1
fi

# Ensure destination directory exists
mkdir -p "${BACKUP_DIR}"

# Execute transactional online backup via sqlite3 CLI
# The .backup command utilizes the SQLite online backup API to prevent corruption
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Creating snapshot at ${BACKUP_FILE}..."
sqlite3 "${DB_PATH}" ".backup '${BACKUP_FILE}'"

# Verify backup integrity
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Verifying backup integrity..."
INTEGRITY_CHECK=$(sqlite3 "${BACKUP_FILE}" "PRAGMA integrity_check;")
if [ "${INTEGRITY_CHECK}" != "ok" ]; then
  echo "Error: Integrity check failed for backup (${INTEGRITY_CHECK})" >&2
  rm -f "${BACKUP_FILE}"
  exit 1
fi

# Compress verified backup
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Compressing backup file..."
gzip -9 "${BACKUP_FILE}"
FINAL_ARCHIVE="${BACKUP_FILE}.gz"

BACKUP_SIZE=$(ls -lh "${FINAL_ARCHIVE}" | awk '{print $5}')
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup completed successfully: ${FINAL_ARCHIVE} (${BACKUP_SIZE})"

# Prune archives older than retention threshold
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Pruning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "contributions_*.db.gz" -type f -mtime +"${RETENTION_DAYS}" -delete

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup and cleanup routine completed."
