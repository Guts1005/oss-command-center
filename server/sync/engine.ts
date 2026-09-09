import { db } from '../db.js';
import { syncGitHub } from './github.js';
import { syncGitLab } from './gitlab.js';

let isSyncing = false;

export async function runSync() {
  if (isSyncing) {
    console.log('[Sync Engine] Sync already in progress, skipping.');
    return { status: 'in-progress' };
  }

  isSyncing = true;
  const startedAt = new Date().toISOString();
  console.log(`[Sync Engine] Starting full sync at ${startedAt}`);

  try {
    const githubToken = process.env.GITHUB_TOKEN;
    const githubUser = process.env.GITHUB_USERNAME || 'Guts1005';
    const gitlabUser = process.env.GITLAB_USERNAME || 'Sharvin';
    const gitlabHost = process.env.GITLAB_HOST || 'https://gitlab.rtems.org';

    await Promise.allSettled([
      syncGitHub(githubToken, githubUser),
      syncGitLab(gitlabHost, gitlabUser)
    ]);

    // Update sync metadata
    const finishedAt = new Date().toISOString();
    db.prepare('INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)').run('last_synced_at', finishedAt);
    console.log(`[Sync Engine] Full sync completed at ${finishedAt}`);
    return { status: 'completed', finishedAt };
  } catch (error: any) {
    console.error('[Sync Engine] Sync error:', error.message);
    return { status: 'failed', error: error.message };
  } finally {
    isSyncing = false;
  }
}

export function getLastSyncTime(): string | null {
  const row = db.prepare("SELECT value FROM sync_meta WHERE key = 'last_synced_at'").get() as any;
  return row ? row.value : null;
}
