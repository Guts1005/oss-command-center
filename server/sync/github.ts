import axios from 'axios';
import { db, ContributionRecord, ActivityEventRecord } from '../db.js';

export async function syncGitHub(token?: string, username = 'Guts1005') {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  console.log(`[GitHub Sync] Querying authored PRs and issues for user: ${username}`);
  
  // 1. Search for author PRs
  const searchUrl = `https://api.github.com/search/issues?q=author:${username}&sort=updated&order=desc&per_page=30`;
  const searchResp = await axios.get(searchUrl, { headers, timeout: 15000 });
  const items = searchResp.data.items || [];

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
      bounty_amount = COALESCE(excluded.bounty_amount, contributions.bounty_amount),
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
    for (const item of items) {
      const repo = item.repository_url.replace('https://api.github.com/repos/', '');
      const number = item.number;
      const isPR = Boolean(item.pull_request);
      const id = `gh:${repo}#${number}`;

      let status = item.state; // 'open' or 'closed'
      if (item.pull_request?.merged_at) {
        status = 'merged';
      }

      let action_needed: 'reply' | 'push-changes' | 'none' = 'none';

      // Check for bounty indicators in title or labels
      let bounty_amount: string | undefined = undefined;
      const labels = (item.labels || []).map((l: any) => l.name);
      for (const lbl of labels) {
        if (lbl.includes('$')) {
          bounty_amount = lbl;
        }
      }
      if (!bounty_amount && item.title.includes('$')) {
        const m = item.title.match(/\$(\d+)/);
        if (m) bounty_amount = `$${m[1]}`;
      }

      // Check existing record to preserve read/notes
      const existing = db.prepare('SELECT last_activity_at, unread, notes FROM contributions WHERE id = ?').get(id) as any;
      const lastActivity = item.updated_at || item.created_at;
      const unread = existing ? (lastActivity > existing.last_activity_at ? 1 : existing.unread) : 1;

      insertContrib.run({
        id,
        platform: 'github',
        repo,
        number,
        title: item.title,
        type: isPR ? 'pr' : 'issue',
        url: item.html_url,
        author: item.user?.login || username,
        status,
        action_needed,
        difficulty: 'medium',
        bounty_amount: bounty_amount || null,
        created_at: item.created_at,
        last_activity_at: lastActivity,
        last_synced_at: now,
        unread,
        notes: existing?.notes || null
      });

      // Insert primary event
      insertEvent.run({
        id: `gh_created_${id}`,
        contribution_id: id,
        actor: item.user?.login || username,
        actor_avatar: item.user?.avatar_url || null,
        type: 'status-change',
        review_state: null,
        body_excerpt: item.body ? item.body.slice(0, 300) : 'Item created',
        created_at: item.created_at
      });
    }
  });

  syncTransaction();
  console.log(`[GitHub Sync] Processed ${items.length} items.`);
}
