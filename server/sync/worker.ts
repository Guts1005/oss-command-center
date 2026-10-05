import { db, ContributionRecord } from '../db.js';
import { syncUser } from './multi_engine.js';
import { sseManager } from '../sse.js';
import { dispatchNotification } from '../notifications/dispatcher.js';
import { compileUserDigest, renderDigestHtml, renderDigestText } from '../email/digest.js';
import { sendEmail } from '../email/transporter.js';

interface WorkerStatus {
  active: boolean;
  isSyncing: boolean;
  intervalMinutes: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  totalCycles: number;
  lastErrors: string[];
}

let workerInterval: NodeJS.Timeout | null = null;
let isSyncing = false;
let lastRunAt: string | null = null;
let nextRunAt: string | null = null;
let totalCycles = 0;
let lastErrors: string[] = [];
let activeIntervalMinutes = 15;

/**
 * Returns current health and telemetry status of the background sync worker.
 */
export function getBackgroundWorkerStatus(): WorkerStatus {
  return {
    active: workerInterval !== null,
    isSyncing,
    intervalMinutes: activeIntervalMinutes,
    lastRunAt,
    nextRunAt,
    totalCycles,
    lastErrors: [...lastErrors],
  };
}

/**
 * Resolves the background sync interval in minutes from environment or default.
 */
function getIntervalMinutes(): number {
  const envVal = process.env.BACKGROUND_SYNC_INTERVAL_MINUTES;
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 1440) {
      return parsed;
    }
  }
  return 15; // Default 15 minutes
}

/**
 * Executes a single background sync pass across all registered users.
 * Detects contribution state transitions and emits real-time notifications.
 */
export async function executeBackgroundSyncPass(): Promise<{ usersProcessed: number; changesDetected: number }> {
  if (isSyncing) {
    console.log('[Background Sync Worker] Sync cycle currently in progress, skipping overlapping execution.');
    return { usersProcessed: 0, changesDetected: 0 };
  }

  isSyncing = true;
  lastErrors = [];
  lastRunAt = new Date().toISOString();
  totalCycles++;

  let usersProcessed = 0;
  let changesDetected = 0;

  try {
    // Find users with active integrations who have background sync enabled
    const eligibleUsers = db.prepare(`
      SELECT DISTINCT ui.user_id
      FROM user_integrations ui
      LEFT JOIN user_settings us ON us.user_id = ui.user_id
      WHERE us.background_sync_enabled IS NULL OR us.background_sync_enabled = 1
    `).all() as Array<{ user_id: string }>;

    for (const { user_id } of eligibleUsers) {
      usersProcessed++;

      // 1. Capture snapshot of contributions before sync
      const beforeRows = db.prepare(`
        SELECT id, repo, number, title, status, action_needed, url, platform
        FROM contributions
        WHERE user_id = ?
      `).all(user_id) as ContributionRecord[];

      const beforeMap = new Map<string, { status: string; action_needed: string }>();
      for (const row of beforeRows) {
        beforeMap.set(row.id, { status: row.status, action_needed: row.action_needed });
      }

      // 2. Perform synchronization
      try {
        const syncResult = await syncUser(user_id);
        if (syncResult.errors && syncResult.errors.length > 0) {
          lastErrors.push(`User ${user_id.slice(0, 8)}: ${syncResult.errors.join(', ')}`);
        }
      } catch (err: any) {
        lastErrors.push(`User ${user_id.slice(0, 8)} sync failed: ${err.message}`);
        continue;
      }

      // 3. Inspect contributions after sync to detect diffs
      const afterRows = db.prepare(`
        SELECT id, repo, number, title, status, action_needed, url, platform, author
        FROM contributions
        WHERE user_id = ?
      `).all(user_id) as ContributionRecord[];

      for (const after of afterRows) {
        const before = beforeMap.get(after.id);

        // Case A: New contribution discovered
        if (!before) {
          changesDetected++;
          sseManager.sendToUser(user_id, 'contribution_created', {
            id: after.id,
            repo: after.repo,
            number: after.number,
            status: after.status,
            action_needed: after.action_needed,
          });

          if (after.action_needed === 'reply' || after.action_needed === 'push-changes') {
            await dispatchNotification(user_id, {
              event: 'action_needed',
              contribution: after,
              message: `New contribution tracked requiring action (${after.action_needed}).`,
            });
          }
          continue;
        }

        // Case B: Action needed transition (e.g. none -> reply or push-changes)
        if (before.action_needed !== after.action_needed) {
          changesDetected++;
          sseManager.sendToUser(user_id, 'contribution_updated', {
            id: after.id,
            repo: after.repo,
            number: after.number,
            status: after.status,
            action_needed: after.action_needed,
          });

          if (after.action_needed === 'reply' || after.action_needed === 'push-changes') {
            await dispatchNotification(user_id, {
              event: 'action_needed',
              contribution: after,
              message: `State updated: Action required on ${after.repo}#${after.number} (${after.action_needed}).`,
            });
          }
        }

        // Case C: Status transition to merged
        if (before.status !== 'merged' && after.status === 'merged') {
          changesDetected++;
          sseManager.sendToUser(user_id, 'contribution_updated', {
            id: after.id,
            repo: after.repo,
            number: after.number,
            status: after.status,
            action_needed: after.action_needed,
          });

          await dispatchNotification(user_id, {
            event: 'merged',
            contribution: after,
            message: `Contribution merged: ${after.repo}#${after.number} was merged upstream!`,
          });
        }
      }
    }

    // 4. Check if Email Digest is due for any active user with email_digest_enabled = 1
    try {
      const digestUsers = db.prepare(`
        SELECT us.user_id, us.email_digest_cadence, us.email_digest_address, us.last_email_digest_at, u.email
        FROM user_settings us
        JOIN users u ON u.id = us.user_id
        WHERE us.email_digest_enabled = 1
      `).all() as any[];

      for (const digestSettings of digestUsers) {
        try {
          const cadence = digestSettings.email_digest_cadence || 'weekly';
          const intervalMs = cadence === 'daily' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
          const lastDigestTime = digestSettings.last_email_digest_at ? new Date(digestSettings.last_email_digest_at).getTime() : 0;
          const isDue = Date.now() - lastDigestTime >= intervalMs;

          if (isDue) {
            const targetEmail = digestSettings.email_digest_address || digestSettings.email;
            if (targetEmail) {
              const summary = compileUserDigest(digestSettings.user_id, cadence);
              const dashboardUrl = process.env.APP_URL || 'http://localhost:3100';
              const html = renderDigestHtml(summary, dashboardUrl);
              const text = renderDigestText(summary, dashboardUrl);
              const cadenceTitle = cadence === 'daily' ? 'Daily' : 'Weekly';
              const subject = `${cadenceTitle} Contribution Briefing // OSS Command Center`;

              const emailRes = await sendEmail({
                to: targetEmail,
                subject,
                html,
                text
              });

              if (emailRes.success) {
                const nowIso = new Date().toISOString();
                db.prepare('UPDATE user_settings SET last_email_digest_at = ? WHERE user_id = ?').run(nowIso, digestSettings.user_id);
                console.log(`[Email Digest] Successfully delivered ${cadence} digest to ${targetEmail}`);
              } else {
                console.warn(`[Email Digest] Delivery failed for user ${digestSettings.user_id}: ${emailRes.error}`);
              }
            }
          }
        } catch (userDigestErr: any) {
          console.warn(`[Email Digest] Error processing digest for user ${digestSettings.user_id}:`, userDigestErr.message);
        }
      }
    } catch (digestCycleErr: any) {
      console.warn('[Email Digest] Error in digest cycle:', digestCycleErr.message);
    }

    // Record telemetry in database
    db.prepare(`
      INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('last_background_sync_at', ?)
    `).run(lastRunAt);
  } catch (err: any) {
    console.error('[Background Sync Worker] Fatal cycle error:', err);
    lastErrors.push(`Fatal worker error: ${err.message}`);
  } finally {
    isSyncing = false;
    const intervalMs = getIntervalMinutes() * 60 * 1000;
    nextRunAt = new Date(Date.now() + intervalMs).toISOString();
  }

  return { usersProcessed, changesDetected };
}

/**
 * Starts the background sync worker on the specified or default interval.
 */
export function startBackgroundSyncWorker(intervalMinutes?: number): void {
  if (workerInterval) {
    clearInterval(workerInterval);
  }

  const mins = intervalMinutes || getIntervalMinutes();
  activeIntervalMinutes = mins;
  const ms = mins * 60 * 1000;

  nextRunAt = new Date(Date.now() + ms).toISOString();
  console.log(`[Background Sync Worker] Initialized. Running every ${mins} minutes. Next run: ${nextRunAt}`);

  workerInterval = setInterval(() => {
    executeBackgroundSyncPass().catch((err) => {
      console.error('[Background Sync Worker] Uncaught cycle error:', err);
    });
  }, ms);
}

/**
 * Gracefully stops the background sync worker.
 */
export function stopBackgroundSyncWorker(): void {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    nextRunAt = null;
    console.log('[Background Sync Worker] Stopped.');
  }
}
