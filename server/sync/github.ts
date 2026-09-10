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

export async function syncGitHub(token?: string, username = 'Guts1005') {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  console.log(`[GitHub Sync] Querying authored PRs and issues for user: ${username}`);

  // 1. Search for author PRs and issues
  const searchUrl = `https://api.github.com/search/issues?q=author:${username}&sort=updated&order=desc&per_page=30`;
  let items: any[] = [];
  try {
    const searchResp = await axios.get(searchUrl, { headers, timeout: 15000 });
    items = searchResp.data.items || [];
  } catch (err: any) {
    console.error(`[GitHub Sync] Search query failed: ${err.message}`);
    return;
  }

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
      unread = excluded.unread
  `);

  const insertEvent = db.prepare(`
    INSERT OR REPLACE INTO activity_events (
      id, contribution_id, actor, actor_avatar, type, review_state, body_excerpt, created_at
    ) VALUES (
      @id, @contribution_id, @actor, @actor_avatar, @type, @review_state, @body_excerpt, @created_at
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

    // 4. Derive action_needed dynamically
    let action_needed: 'reply' | 'push-changes' | 'none' = 'none';

    if (status === 'merged' || status === 'closed') {
      action_needed = 'none';
    } else {
      // Collect all conversational items from humans
      const humanEvents: { actor: string; created_at: string }[] = [];

      // Initial submission
      humanEvents.push({ actor: item.user?.login || username, created_at: item.created_at });

      // Issue comments from non-bots
      for (const c of comments) {
        const author = c.user?.login;
        if (author && !isBot(author)) {
          humanEvents.push({ actor: author, created_at: c.created_at });
        }
      }

      // Review comments from non-bots
      for (const rc of reviewComments) {
        const author = rc.user?.login;
        if (author && !isBot(author)) {
          humanEvents.push({ actor: author, created_at: rc.created_at });
        }
      }

      // Reviews with non-empty body from non-bots
      for (const rv of reviews) {
        const author = rv.user?.login;
        if (author && !isBot(author) && rv.body) {
          humanEvents.push({ actor: author, created_at: rv.submitted_at });
        }
      }

      humanEvents.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const latestHuman = humanEvents[humanEvents.length - 1];

      // Check latest reviews from non-authors
      const nonAuthorReviews = reviews
        .filter((r) => r.user && r.user.login && r.user.login.toLowerCase() !== username.toLowerCase())
        .sort((a, b) => new Date(a.submitted_at || 0).getTime() - new Date(b.submitted_at || 0).getTime());

      const latestReview = nonAuthorReviews[nonAuthorReviews.length - 1];

      // Check if changes requested, but account for author responses/commits after the review
      if (latestReview && latestReview.state === 'CHANGES_REQUESTED') {
        const reviewTime = new Date(latestReview.submitted_at || 0).getTime();
        const authorEvents = humanEvents.filter(e => e.actor.toLowerCase() === username.toLowerCase());
        const latestAuthorEvent = authorEvents[authorEvents.length - 1];
        const authorTime = latestAuthorEvent ? new Date(latestAuthorEvent.created_at).getTime() : 0;

        if (authorTime > reviewTime) {
          // Author already responded or pushed changes after the review
          action_needed = 'none'; // Waiting for maintainer re-review
        } else {
          action_needed = 'push-changes'; // Still owes changes to the maintainer
        }
      } else if (latestHuman && latestHuman.actor.toLowerCase() !== username.toLowerCase()) {
        action_needed = 'reply';
      } else {
        action_needed = 'none';
      }
    }

    // 5. Derive unread state
    const existing = db.prepare('SELECT last_activity_at, last_viewed_at, unread, notes FROM contributions WHERE id = ?').get(id) as any;
    const lastActivity = item.updated_at || item.created_at;

    let unread = 0;
    if (existing) {
      if (existing.last_viewed_at) {
        unread = new Date(lastActivity).getTime() > new Date(existing.last_viewed_at).getTime() ? 1 : 0;
      } else {
        // Not viewed yet: only mark unread if activity is within the last 14 days
        const ageDays = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24);
        unread = ageDays <= 14 ? 1 : 0;
      }
    } else {
      // First time seeing item: mark unread only if active within 14 days
      const ageDays = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24);
      unread = ageDays <= 14 ? 1 : 0;
    }

    // 6. Write contribution record
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
      notes: existing?.notes || null,
    });

    // 7. Write primary event (initial creation)
    insertEvent.run({
      id: `gh_created_${id}`,
      contribution_id: id,
      actor: item.user?.login || username,
      actor_avatar: item.user?.avatar_url || null,
      type: 'status-change',
      review_state: null,
      body_excerpt: item.body ? item.body.slice(0, 500) : 'Item opened',
      created_at: item.created_at,
    });

    // 8. Write comments into activity_events
    for (const c of comments) {
      try {
        insertEvent.run({
          id: `gh_comment_${c.id}`,
          contribution_id: id,
          actor: c.user?.login || 'unknown',
          actor_avatar: c.user?.avatar_url || null,
          type: 'comment',
          review_state: null,
          body_excerpt: c.body ? c.body.slice(0, 500) : 'Comment posted',
          created_at: c.created_at,
        });
      } catch (err: any) {
        console.warn(`[GitHub Sync] Error inserting comment event ${c.id}: ${err.message}`);
      }
    }

    // 9. Write reviews into activity_events
    for (const r of reviews) {
      try {
        insertEvent.run({
          id: `gh_review_${r.id}`,
          contribution_id: id,
          actor: r.user?.login || 'unknown',
          actor_avatar: r.user?.avatar_url || null,
          type: 'review',
          review_state: r.state,
          body_excerpt: r.body ? r.body.slice(0, 500) : `Review submitted (${r.state})`,
          created_at: r.submitted_at || item.created_at,
        });
      } catch (err: any) {
        console.warn(`[GitHub Sync] Error inserting review event ${r.id}: ${err.message}`);
      }
    }

    // 10. Write review comments into activity_events
    for (const rc of reviewComments) {
      try {
        insertEvent.run({
          id: `gh_revcomm_${rc.id}`,
          contribution_id: id,
          actor: rc.user?.login || 'unknown',
          actor_avatar: rc.user?.avatar_url || null,
          type: 'comment',
          review_state: null,
          body_excerpt: rc.body ? rc.body.slice(0, 500) : 'Code review comment',
          created_at: rc.created_at,
        });
      } catch (err: any) {
        console.warn(`[GitHub Sync] Error inserting review comment event ${rc.id}: ${err.message}`);
      }
    }
  }

  console.log(`[GitHub Sync] Successfully synced ${items.length} items with full conversation streams.`);
}
