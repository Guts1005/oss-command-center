import { db } from '../db.js';
import { syncGitHub } from './github.js';
import { syncGitLab } from './gitlab.js';
import { decryptSecret } from '../security/crypto.js';

let isGlobalSyncRunning = false;

export async function syncUser(userId: string): Promise<{ status: string; syncedAt: string; errors?: string[] }> {
  const integrations = db.prepare(`
    SELECT id, platform, username, host, encrypted_token, token_iv, token_auth_tag
    FROM user_integrations
    WHERE user_id = ?
  `).all(userId) as any[];

  const now = new Date().toISOString();
  const errors: string[] = [];

  // Fallback for default local user if no integrations are configured yet
  if (integrations.length === 0 && userId === 'default-local-user') {
    const githubToken = process.env.GITHUB_TOKEN;
    const githubUser = process.env.GITHUB_USERNAME || 'Guts1005';
    const gitlabUser = process.env.GITLAB_USERNAME || 'Sharvin';
    const gitlabHost = process.env.GITLAB_HOST || 'https://gitlab.rtems.org';

    await Promise.allSettled([
      syncGitHub(userId, githubToken, githubUser),
      syncGitLab(userId, gitlabHost, gitlabUser)
    ]);

    db.prepare("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('last_synced_at', ?)").run(now);
    return { status: 'completed', syncedAt: now };
  }

  for (const integration of integrations) {
    db.prepare("UPDATE user_integrations SET sync_status = 'syncing' WHERE id = ?").run(integration.id);

    let decryptedToken: string | undefined = undefined;
    if (integration.encrypted_token && integration.token_iv && integration.token_auth_tag) {
      try {
        decryptedToken = decryptSecret(
          integration.encrypted_token,
          integration.token_iv,
          integration.token_auth_tag
        );
      } catch (err: any) {
        console.error(`[Sync Engine] Token decryption failed for integration ${integration.id}:`, err.message);
        db.prepare("UPDATE user_integrations SET sync_status = 'failed', sync_error = 'Decryption failed' WHERE id = ?").run(integration.id);
        errors.push(`Token decryption failed for ${integration.platform}`);
        continue;
      }
    }

    try {
      if (integration.platform === 'github') {
        await syncGitHub(userId, decryptedToken, integration.username);
      } else if (integration.platform === 'gitlab') {
        await syncGitLab(userId, integration.host, integration.username, decryptedToken);
      }

      db.prepare(`
        UPDATE user_integrations
        SET sync_status = 'success', sync_error = NULL, last_synced_at = ?
        WHERE id = ?
      `).run(now, integration.id);
    } catch (err: any) {
      const errMsg = err.message || 'Unknown sync error';
      errors.push(`${integration.platform}: ${errMsg}`);
      db.prepare(`
        UPDATE user_integrations
        SET sync_status = 'failed', sync_error = ?
        WHERE id = ?
      `).run(errMsg, integration.id);
    }
  }

  return {
    status: errors.length > 0 ? 'partial' : 'completed',
    syncedAt: now,
    errors: errors.length > 0 ? errors : undefined
  };
}

export async function syncAllUsers() {
  if (isGlobalSyncRunning) {
    console.log('[Multi-Tenant Sync Engine] Sync cycle already running, skipping.');
    return;
  }

  isGlobalSyncRunning = true;
  console.log('[Multi-Tenant Sync Engine] Starting cycle across all users...');

  try {
    const users = db.prepare('SELECT DISTINCT user_id FROM user_integrations').all() as any[];
    
    // Always sync default-local-user if present
    const userIds = new Set(users.map(u => u.user_id));
    userIds.add('default-local-user');

    for (const userId of userIds) {
      try {
        await syncUser(userId);
      } catch (err: any) {
        console.error(`[Multi-Tenant Sync Engine] Error syncing user ${userId}:`, err.message);
      }
    }

    const finishedAt = new Date().toISOString();
    db.prepare("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('last_synced_at', ?)").run(finishedAt);
    console.log(`[Multi-Tenant Sync Engine] Cycle finished at ${finishedAt}`);
  } finally {
    isGlobalSyncRunning = false;
  }
}

let syncIntervalTimer: NodeJS.Timeout | null = null;

export function startPeriodicSync(intervalMinutes = 30) {
  if (syncIntervalTimer) clearInterval(syncIntervalTimer);
  const ms = intervalMinutes * 60 * 1000;
  console.log(`[Multi-Tenant Sync Engine] Scheduled periodic sync every ${intervalMinutes} minutes.`);
  syncIntervalTimer = setInterval(() => {
    syncAllUsers().catch(err => console.error('[Periodic Sync Error]:', err));
  }, ms);
}export function getLastSyncTime(): string | null {
  const row = db.prepare("SELECT value FROM sync_meta WHERE key = 'last_synced_at'").get() as any;
  return row ? row.value : null;
}
