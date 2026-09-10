import axios from 'axios';
import { db, ContributionRecord, ActivityEventRecord } from '../db.js';

interface GitHubUser {
  login: string;
  avatar_url?: string;
}

interface GitHubComment {
  id: number;
  user: GitHubUser;
  body: string;
  created_at: string;
}

interface GitHubReview {
  id: number;
  user: GitHubUser;
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED';
  body: string;
  submitted_at: string;
}

export async function syncGitHub(userId: string, token?: string, username = 'Guts1005') {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  console.log(`[GitHub Sync] Querying authored PRs and issues for user: ${username} (ID: ${userId})`);

  // 1. Search for author PRs and issues
  const searchUrl = `https://api.github.com/search/issues?q=author:${username}&sort=updated&order=desc&per_page=30`;
  let items: any[] = [];
  try {
    const searchResp = await axios.get(searchUrl, { headers, timeout: 15000 });
    items = searchResp.data.items || [];
  } catch (err: any) {
    console.error(`[GitHub Sync] Search query failed for user ${userId}: ${err.message}`);
    throw err;
  }

  const now = new Date().toISOString();

  const insertContrib = db.prepare(`
    INSERT INTO contributions (
      user_id, id, platform, repo, number, title, type, url, author, status,
      action_needed, difficulty, bounty_amount, created_at, last_activity_at,
      last_synced_at, unread, notes
    ) VALUES (
      @user_id, @id, @platform, @repo, @number, @title, @type, @url, @author, @status,
      @action_needed, @difficulty, @bounty_amount, @created_at, @last_activity_at,
      @last_synced_at, @unread, @notes
    )
    ON CONFLICT(user_id, id) DO UPDATE SET
      title = excluded.title,
      status = excluded.status,
      action_needed = excluded.action_needed,
      last_activity_at = excluded.last_activity_at,
      last_synced_at = excluded.last_synced_at,
      bounty_amount = COALESCE(excluded.bounty_amount, contributions.bounty_amount),
      unread = excluded.unread
  `);

  const insertEvent = db.prepare(`
    INSERT OR REPLACE INTO activity_events (
      id, user_id, contribution_id, actor, actor_avatar, type, review_state, body_excerpt, created_at
    ) VALUES (
      @id, @user_id, @contribution_id, @actor, @actor_avatar, @type, @review_state, @body_excerpt, @created_at
    )
  `);

  const isBot = (actor: string) => {
    const a = actor.toLowerCase();
    return a.endsWith('[bot]') || a === 'greptile-apps[bot]' || a === 'codecov-commenter' || a === 'github-actions[bot]';
  };

  for (const item of items) {
    const repo = item.repository_url.replace('https://api.github.com/repos/', '');
    const number = item.number;
    const isPR = Boolean(item.pull_request);
    const id = `gh:${repo}#${number}`;

    let status = item.state; // 'open' or 'closed'
    if (item.pull_request?.merged_at) {
      status = 'merged';
    }

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

    // 2. Fetch comments for this issue/PR
    let comments: GitHubComment[] = [];
    try {
      const cResp = await axios.get(
        `https://api.github.com/repos/${repo}/issues/${number}/comments?per_page=50`,
        { headers, timeout: 10000 }
      );
      if (Array.isArray(cResp.data)) {
        comments = cResp.data;
      }
    } catch (err: any) {
      console.warn(`[GitHub Sync] Could not fetch comments for ${id}: ${err.message}`);
    }

    // 3. If PR, fetch reviews and review comments
    let reviews: GitHubReview[] = [];
    let reviewComments: GitHubComment[] = [];
    if (isPR) {
      try {
        const revResp = await axios.get(
          `https://api.github.com/repos/${repo}/pulls/${number}/reviews?per_page=30`,
          { headers, timeout: 10000 }
        );
        if (Array.isArray(revResp.data)) {
          reviews = revResp.data;
        }
      } catch (err: any) {
        console.warn(`[GitHub Sync] Could not fetch reviews for ${id}: ${err.message}`);
      }

      try {
        const rcResp = await axios.get(
          `https://api.github.com/repos/${repo}/pulls/${number}/comments?per_page=50`,
          { headers, timeout: 10000 }
        );
        if (Array.isArray(rcResp.data)) {
          reviewComments = rcResp.data;
        }
      } catch (err: any) {
        console.warn(`[GitHub Sync] Could not fetch review comments for ${id}: ${err.message}`);
      }
    }

    // 4. Derive Action State & Last Activity
    let lastActivityAt = item.created_at;
    let action_needed: 'reply' | 'push-changes' | 'none' = 'none';

    // Compile timeline of human events
    interface TimelineEvent {
      actor: string;
      createdAt: string;
      type: 'author' | 'maintainer';
      state?: string;
    }
    const timeline: TimelineEvent[] = [];

    // Author created item
    timeline.push({
      actor: item.user?.login || username,
      createdAt: item.created_at,
      type: 'author',
    });

    // Add comments
    for (const c of comments) {
      const actor = c.user?.login || '';
      if (!isBot(actor)) {
        timeline.push({
          actor,
          createdAt: c.created_at,
          type: actor.toLowerCase() === username.toLowerCase() ? 'author' : 'maintainer',
        });
      }
    }

    // Add reviews
    let hasChangesRequested = false;
    for (const r of reviews) {
      const actor = r.user?.login || '';
      if (!isBot(actor) && r.submitted_at) {
        if (r.state === 'CHANGES_REQUESTED') {
          hasChangesRequested = true;
        }
        timeline.push({
          actor,
          createdAt: r.submitted_at,
          type: actor.toLowerCase() === username.toLowerCase() ? 'author' : 'maintainer',
          state: r.state,
        });
      }
    }

    // Add review comments
    for (const rc of reviewComments) {
      const actor = rc.user?.login || '';
      if (!isBot(actor)) {
        timeline.push({
          actor,
          createdAt: rc.created_at,
          type: actor.toLowerCase() === username.toLowerCase() ? 'author' : 'maintainer',
        });
      }
    }

    // Sort timeline chronologically
    timeline.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (timeline.length > 0) {
      const lastEvent = timeline[timeline.length - 1];
      lastActivityAt = lastEvent.createdAt;

      if (status === 'open') {
        if (hasChangesRequested) {
          action_needed = 'push-changes';
        } else if (lastEvent.type === 'maintainer') {
          action_needed = 'reply';
        } else {
          action_needed = 'none'; // waiting on maintainer
        }
      } else {
        action_needed = 'none';
      }
    }

    // 5. Check if user already viewed this item
    const existing = db.prepare('SELECT last_activity_at, unread FROM contributions WHERE user_id = ? AND id = ?').get(userId, id) as any;
    let unread = 1;
    if (existing) {
      if (existing.last_activity_at === lastActivityAt) {
        unread = existing.unread;
      } else {
        unread = 1;
      }
    }

    // 6. Insert/Update contribution scoped to user_id
    insertContrib.run({
      user_id: userId,
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
      last_activity_at: lastActivityAt,
      last_synced_at: now,
      unread,
      notes: null,
    });

    // 7. Write initial event into activity_events
    insertEvent.run({
      id: `gh_init_${item.id}`,
      user_id: userId,
      contribution_id: id,
      actor: item.user?.login || username,
      actor_avatar: item.user?.avatar_url || null,
      type: isPR ? 'commit' : 'comment',
      review_state: null,
      body_excerpt: item.body ? item.body.slice(0, 500) : 'Item opened',
      created_at: item.created_at,
    });

    // 8. Write comments into activity_events
    for (const c of comments) {
      try {
        insertEvent.run({
          id: `gh_comment_${c.id}`,
          user_id: userId,
          contribution_id: id,
          actor: c.user?.login || 'unknown',
          actor_avatar: c.user?.avatar_url || null,
          type: 'comment',
          review_state: null,
          body_excerpt: c.body ? c.body.slice(0, 500) : 'Comment posted',
          created_at: c.created_at,
        });
      } catch (err: any) {
        // ignore duplicate
      }
    }

    // 9. Write reviews into activity_events
    for (const r of reviews) {
      try {
        insertEvent.run({
          id: `gh_review_${r.id}`,
          user_id: userId,
          contribution_id: id,
          actor: r.user?.login || 'unknown',
          actor_avatar: r.user?.avatar_url || null,
          type: 'review',
          review_state: r.state,
          body_excerpt: r.body ? r.body.slice(0, 500) : `Review submitted (${r.state})`,
          created_at: r.submitted_at || item.created_at,
        });
      } catch (err: any) {
        // ignore duplicate
      }
    }

    // 10. Write review comments into activity_events
    for (const rc of reviewComments) {
      try {
        insertEvent.run({
          id: `gh_revcomm_${rc.id}`,
          user_id: userId,
          contribution_id: id,
          actor: rc.user?.login || 'unknown',
          actor_avatar: rc.user?.avatar_url || null,
          type: 'comment',
          review_state: null,
          body_excerpt: rc.body ? rc.body.slice(0, 500) : 'Code review comment',
          created_at: rc.created_at,
        });
      } catch (err: any) {
        // ignore duplicate
      }
    }
  }

  console.log(`[GitHub Sync] Successfully synced ${items.length} items for user ${userId}.`);
}
