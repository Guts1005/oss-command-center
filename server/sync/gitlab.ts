import axios from 'axios';
import { db } from '../db.js';

export async function syncGitLab(host = 'https://gitlab.rtems.org', username = 'Sharvin') {
  console.log(`[GitLab Sync] Querying authored MRs on ${host} for user: ${username}`);
  
  // RTEMS upstream project: rtems/rtos/rtems
  const projectPath = encodeURIComponent('rtems/rtos/rtems');
  const url = `${host}/api/v4/projects/${projectPath}/merge_requests?author_username=${username}&per_page=20`;

  try {
    const resp = await axios.get(url, { timeout: 15000 });
    const mrs = resp.data || [];
    const now = new Date().toISOString();

    const insertContrib = db.prepare(`
      INSERT INTO contributions (
        id, platform, repo, number, title, type, url, author, status,
        action_needed, difficulty, bounty_amount, created_at, last_activity_at,
        last_synced_at, unread, notes
      ) VALUES (
        @id, @platform, @repo, @number, @title, @type, @url, @author, @status,
        @action_needed, @difficulty, @bounty_amount, @created_at, @last_activity_at,
        @last_synced_at, @unread, @notes
      )
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        status = excluded.status,
        action_needed = excluded.action_needed,
        last_activity_at = excluded.last_activity_at,
        last_synced_at = excluded.last_synced_at,
        unread = CASE
          WHEN excluded.last_activity_at > contributions.last_activity_at THEN 1
          ELSE contributions.unread
        END
    `);

    const insertEvent = db.prepare(`
      INSERT OR REPLACE INTO activity_events (
        id, contribution_id, actor, actor_avatar, type, review_state, body_excerpt, created_at
      ) VALUES (
        @id, @contribution_id, @actor, @actor_avatar, @type, @review_state, @body_excerpt, @created_at
      )
    `);

    const syncTransaction = db.transaction(() => {
      for (const mr of mrs) {
        const id = `gl:rtems/rtos/rtems!${mr.iid}`;
        let status = mr.state; // 'opened' | 'merged' | 'closed'
        if (mr.draft) {
          status = 'draft';
        }

        let action_needed: 'reply' | 'push-changes' | 'none' = 'none';
        if (status === 'merged') {
          action_needed = 'none';
        }

        const existing = db.prepare('SELECT last_activity_at, unread, notes FROM contributions WHERE id = ?').get(id) as any;
        const lastActivity = mr.updated_at || mr.created_at;
        const unread = existing ? (lastActivity > existing.last_activity_at ? 1 : existing.unread) : 1;

        insertContrib.run({
          id,
          platform: 'gitlab',
          repo: 'rtems/rtos/rtems',
          number: mr.iid,
          title: mr.title,
          type: 'pr', // map MR to pr type
          url: mr.web_url,
          author: mr.author?.username || username,
          status,
          action_needed,
          difficulty: 'hard',
          bounty_amount: null,
          created_at: mr.created_at,
          last_activity_at: lastActivity,
          last_synced_at: now,
          unread,
          notes: existing?.notes || null
        });

        // Insert event
        insertEvent.run({
          id: `gl_created_${id}`,
          contribution_id: id,
          actor: mr.author?.username || username,
          actor_avatar: mr.author?.avatar_url || null,
          type: 'status-change',
          review_state: mr.state === 'merged' ? 'APPROVED' : null,
          body_excerpt: mr.description ? mr.description.slice(0, 300) : 'Merge request opened',
          created_at: mr.created_at
        });
      }
    });

    syncTransaction();
    console.log(`[GitLab Sync] Processed ${mrs.length} MRs.`);
  } catch (err: any) {
    console.error(`[GitLab Sync] Error: ${err.message}`);
  }
}
