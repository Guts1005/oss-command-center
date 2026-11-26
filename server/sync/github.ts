import axios from 'axios';
import { db, ContributionRecord } from '../db.js';
import { getGitHubApiBase } from './credentials.js';

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

export class UpstreamFetchError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'UpstreamFetchError';
    this.statusCode = statusCode;
  }
}

const isBot = (actor: string): boolean => {
  const a = (actor || '').toLowerCase();
  return (
    !a ||
    a.endsWith('[bot]') ||
    a === 'greptile-apps[bot]' ||
    a === 'codecov-commenter' ||
    a === 'github-actions[bot]'
  );
};

function buildGitHubHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'OSS-Command-Center',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function extractBountyAmount(title: string, labels: any[] = []): string | null {
  for (const lbl of labels) {
    const name = typeof lbl === 'string' ? lbl : lbl?.name || '';
    if (name.includes('$')) return name;
  }
  if (title.includes('$')) {
    const m = title.match(/\$(\d+)/);
    if (m) return `$${m[1]}`;
  }
  return null;
}

function resolveGitHubStatus(item: any, forceMerged = false): string {
  if (forceMerged || item.merged || item.pull_request?.merged_at || item.merged_at) {
    return 'merged';
  }
  if (item.state === 'closed') {
    return 'closed';
  }
  if (item.draft) {
    return 'draft';
  }
  return 'open';
}

export interface HydrateGitHubOptions {
  userId: string;
  repo: string;
  number: number;
  isPR: boolean;
  item: any;
  headers: Record<string, string>;
  authorFallback?: string;
  forceMerged?: boolean;
  skipUnchangedFetch?: boolean;
}

/**
 * Hydrates a single GitHub PR or Issue (status, action_needed, and full activity timeline) into SQLite.
 * Shared by both batch syncGitHub() and single-URL /api/track-url and /actions/sync flows.
 */
export async function hydrateGitHubContribution(opts: HydrateGitHubOptions): Promise<ContributionRecord> {
  const { userId, repo, number, isPR, item, headers, authorFallback = 'unknown', forceMerged = false, skipUnchangedFetch = false } = opts;
  const apiBase = getGitHubApiBase();
  const id = `gh:${repo}#${number}`;
  const now = new Date().toISOString();
  const author = item.user?.login || authorFallback;
  const status = resolveGitHubStatus(item, forceMerged);
  const bounty_amount = extractBountyAmount(item.title || '', item.labels || []);
  const itemUpdatedAt = item.updated_at || item.merged_at || item.created_at || now;
  const itemCreatedAt = item.created_at || now;

  const existing = db
    .prepare('SELECT last_activity_at, last_synced_at, status, unread, notes FROM contributions WHERE user_id = ? AND id = ?')
    .get(userId, id) as any;

  // Skip fetching comments/reviews for unchanged closed/merged contributions when events already exist
  if (skipUnchangedFetch && existing && (status === 'merged' || status === 'closed') && existing.status === status) {
    const eventRow = db
      .prepare('SELECT COUNT(*) as cnt FROM activity_events WHERE user_id = ? AND contribution_id = ?')
      .get(userId, id) as any;
    const syncedTime = existing.last_synced_at ? new Date(existing.last_synced_at).getTime() : 0;
    const updatedTime = new Date(itemUpdatedAt).getTime();
    if ((eventRow?.cnt || 0) > 1 && syncedTime >= updatedTime) {
      db.prepare('UPDATE contributions SET last_synced_at = ? WHERE user_id = ? AND id = ?').run(now, userId, id);
      return db.prepare('SELECT * FROM contributions WHERE user_id = ? AND id = ?').get(userId, id) as ContributionRecord;
    }
  }

  let comments: GitHubComment[] = [];
  try {
    const cResp = await axios.get(`${apiBase}/repos/${repo}/issues/${number}/comments?per_page=50`, {
      headers,
      timeout: 10000,
    });
    if (Array.isArray(cResp.data)) {
      comments = cResp.data;
    }
  } catch (err: any) {
    console.warn(`[GitHub Sync] Could not fetch comments for ${id}: ${err.message}`);
  }

  let reviews: GitHubReview[] = [];
  let reviewComments: GitHubComment[] = [];
  if (isPR) {
    try {
      const revResp = await axios.get(`${apiBase}/repos/${repo}/pulls/${number}/reviews?per_page=30`, {
        headers,
        timeout: 10000,
      });
      if (Array.isArray(revResp.data)) {
        reviews = revResp.data;
      }
    } catch (err: any) {
      console.warn(`[GitHub Sync] Could not fetch reviews for ${id}: ${err.message}`);
    }

    try {
      const rcResp = await axios.get(`${apiBase}/repos/${repo}/pulls/${number}/comments?per_page=50`, {
        headers,
        timeout: 10000,
      });
      if (Array.isArray(rcResp.data)) {
        reviewComments = rcResp.data;
      }
    } catch (err: any) {
      console.warn(`[GitHub Sync] Could not fetch review comments for ${id}: ${err.message}`);
    }
  }

  // Derive action_needed from chronological human timeline
  let lastActivityAt = itemUpdatedAt;
  let action_needed: 'reply' | 'push-changes' | 'none' = 'none';

  interface TimelineEvent {
    actor: string;
    createdAt: string;
    type: 'author' | 'maintainer';
    reviewState?: string;
  }
  const timeline: TimelineEvent[] = [
    { actor: author, createdAt: itemCreatedAt, type: 'author' },
  ];

  const isAuthorActor = (actor: string) => actor.toLowerCase() === author.toLowerCase();

  for (const c of comments) {
    const actor = c.user?.login || '';
    if (!isBot(actor)) {
      timeline.push({
        actor,
        createdAt: c.created_at,
        type: isAuthorActor(actor) ? 'author' : 'maintainer',
      });
    }
  }

  const sortedReviews = [...reviews]
    .filter((r) => !isBot(r.user?.login || '') && r.submitted_at)
    .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());

  const latestReviewStateByActor = new Map<string, string>();
  for (const r of sortedReviews) {
    const actor = r.user?.login || '';
    if (r.state === 'APPROVED' || r.state === 'CHANGES_REQUESTED' || r.state === 'DISMISSED') {
      latestReviewStateByActor.set(actor.toLowerCase(), r.state);
    }
    timeline.push({
      actor,
      createdAt: r.submitted_at,
      type: isAuthorActor(actor) ? 'author' : 'maintainer',
      reviewState: r.state,
    });
  }

  const hasChangesRequested = Array.from(latestReviewStateByActor.values()).includes('CHANGES_REQUESTED');

  for (const rc of reviewComments) {
    const actor = rc.user?.login || '';
    if (!isBot(actor)) {
      timeline.push({
        actor,
        createdAt: rc.created_at,
        type: isAuthorActor(actor) ? 'author' : 'maintainer',
      });
    }
  }

  timeline.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (timeline.length > 0) {
    const lastEvent = timeline[timeline.length - 1];
    lastActivityAt = lastEvent.createdAt || itemUpdatedAt;

    if (status === 'open' || status === 'draft') {
      if (hasChangesRequested) {
        action_needed = 'push-changes';
      } else if (lastEvent.type === 'maintainer' && lastEvent.reviewState !== 'APPROVED') {
        action_needed = 'reply';
      } else {
        action_needed = 'none';
      }
    } else {
      action_needed = 'none';
    }
  }

  const mergedAt: string | undefined = item.merged_at || item.pull_request?.merged_at;
  if (mergedAt && new Date(mergedAt).getTime() > new Date(lastActivityAt).getTime()) {
    lastActivityAt = mergedAt;
  }

  let unread = 1;
  if (existing) {
    unread = existing.last_activity_at === lastActivityAt ? existing.unread : 1;
  }

  db.prepare(`
    INSERT INTO contributions (
      user_id, id, platform, repo, number, title, type, url, author, status,
      action_needed, difficulty, bounty_amount, created_at, last_activity_at,
      last_synced_at, unread, notes
    ) VALUES (
      @user_id, @id, 'github', @repo, @number, @title, @type, @url, @author, @status,
      @action_needed, 'medium', @bounty_amount, @created_at, @last_activity_at,
      @last_synced_at, @unread, @notes
    )
    ON CONFLICT(user_id, id) DO UPDATE SET
      title = excluded.title,
      author = excluded.author,
      status = excluded.status,
      action_needed = excluded.action_needed,
      last_activity_at = excluded.last_activity_at,
      last_synced_at = excluded.last_synced_at,
      bounty_amount = COALESCE(excluded.bounty_amount, contributions.bounty_amount),
      unread = excluded.unread
  `).run({
    user_id: userId,
    id,
    repo,
    number,
    title: item.title || `${repo}#${number}`,
    type: isPR ? 'pr' : 'issue',
    url: item.html_url || `https://github.com/${repo}/${isPR ? 'pull' : 'issues'}/${number}`,
    author,
    status,
    action_needed,
    bounty_amount,
    created_at: itemCreatedAt,
    last_activity_at: lastActivityAt,
    last_synced_at: now,
    unread,
    notes: existing?.notes ?? null,
  });

  const insertEvent = db.prepare(`
    INSERT OR REPLACE INTO activity_events (
      id, user_id, contribution_id, actor, actor_avatar, type, review_state, body_excerpt, created_at
    ) VALUES (
      @id, @user_id, @contribution_id, @actor, @actor_avatar, @type, @review_state, @body_excerpt, @created_at
    )
  `);

  insertEvent.run({
    id: `${userId}:${id}:init`,
    user_id: userId,
    contribution_id: id,
    actor: author,
    actor_avatar: item.user?.avatar_url || null,
    type: isPR ? 'commit' : 'comment',
    review_state: null,
    body_excerpt: item.body ? String(item.body).slice(0, 500) : `Opened ${isPR ? 'pull request' : 'issue'}`,
    created_at: itemCreatedAt,
  });

  for (const c of comments) {
    insertEvent.run({
      id: `${userId}:${id}:comment:${c.id}`,
      user_id: userId,
      contribution_id: id,
      actor: c.user?.login || 'unknown',
      actor_avatar: c.user?.avatar_url || null,
      type: 'comment',
      review_state: null,
      body_excerpt: c.body ? String(c.body).slice(0, 500) : 'Comment posted',
      created_at: c.created_at,
    });
  }

  for (const r of reviews) {
    insertEvent.run({
      id: `${userId}:${id}:review:${r.id}`,
      user_id: userId,
      contribution_id: id,
      actor: r.user?.login || 'unknown',
      actor_avatar: r.user?.avatar_url || null,
      type: 'review',
      review_state: r.state,
      body_excerpt: r.body ? String(r.body).slice(0, 500) : `Review submitted (${r.state})`,
      created_at: r.submitted_at || itemCreatedAt,
    });
  }

  for (const rc of reviewComments) {
    insertEvent.run({
      id: `${userId}:${id}:revcomm:${rc.id}`,
      user_id: userId,
      contribution_id: id,
      actor: rc.user?.login || 'unknown',
      actor_avatar: rc.user?.avatar_url || null,
      type: 'comment',
      review_state: null,
      body_excerpt: rc.body ? String(rc.body).slice(0, 500) : 'Code review comment',
      created_at: rc.created_at,
    });
  }

  if (status === 'merged' && mergedAt) {
    const mergedBy = item.merged_by?.login || author;
    insertEvent.run({
      id: `${userId}:${id}:merged`,
      user_id: userId,
      contribution_id: id,
      actor: mergedBy,
      actor_avatar: item.merged_by?.avatar_url || null,
      type: 'status-change',
      review_state: 'APPROVED',
      body_excerpt: item.merged_by?.login
        ? `Pull request merged by @${item.merged_by.login}`
        : 'Pull request merged upstream',
      created_at: mergedAt,
    });
  }

  return db.prepare('SELECT * FROM contributions WHERE user_id = ? AND id = ?').get(userId, id) as ContributionRecord;
}

/**
 * Fetches a single GitHub PR or Issue from the upstream API using the user's PAT and hydrates full history.
 */
export async function fetchAndHydrateGitHubUrl(
  userId: string,
  repo: string,
  number: number,
  type: 'pr' | 'issue',
  token?: string
): Promise<ContributionRecord> {
  const apiBase = getGitHubApiBase();
  const headers = buildGitHubHeaders(token);
  const endpoint =
    type === 'pr'
      ? `${apiBase}/repos/${repo}/pulls/${number}`
      : `${apiBase}/repos/${repo}/issues/${number}`;

  let itemData: any;
  try {
    const resp = await axios.get(endpoint, { headers, timeout: 10000 });
    itemData = resp.data;
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 401) {
      throw new UpstreamFetchError(401, 'GitHub authentication failed. Reconnect your Personal Access Token.');
    }
    if (status === 403 || status === 429) {
      throw new UpstreamFetchError(
        403,
        'GitHub API rate limit or permission error (403). Ensure a valid GitHub Personal Access Token is connected.'
      );
    }
    if (status === 404) {
      throw new UpstreamFetchError(404, `GitHub ${type.toUpperCase()} ${repo}#${number} was not found or is private.`);
    }
    throw new UpstreamFetchError(502, `Failed to fetch ${repo}#${number} from GitHub: ${err.message}`);
  }

  if (
    !itemData ||
    typeof itemData !== 'object' ||
    Array.isArray(itemData) ||
    itemData.number === undefined
  ) {
    throw new UpstreamFetchError(502, `Unexpected response format from GitHub for ${repo}#${number}.`);
  }

  return hydrateGitHubContribution({
    userId,
    repo,
    number,
    isPR: type === 'pr',
    item: itemData,
    headers,
    authorFallback: itemData?.user?.login || repo.split('/')[0],
    skipUnchangedFetch: false,
  });
}

/**
 * Syncs authored PRs and issues (including a dedicated is:merged query so older merged PRs are never hidden).
 */
export async function syncGitHub(userId: string, token?: string, username?: string) {
  if (!username) {
    console.warn(`[GitHub Sync] No GitHub username configured for user ${userId}, skipping sync.`);
    return;
  }
  if (!token) {
    throw new Error('Missing GitHub Personal Access Token. Connect your account with a valid PAT.');
  }

  const apiBase = getGitHubApiBase();
  const headers = buildGitHubHeaders(token);
  console.log(`[GitHub Sync] Querying authored PRs and merged history for user: ${username} (ID: ${userId})`);

  const recentUrl = `${apiBase}/search/issues?q=author:${encodeURIComponent(username)}&sort=updated&order=desc&per_page=50`;
  const mergedUrl = `${apiBase}/search/issues?q=author:${encodeURIComponent(username)}+is:pr+is:merged&sort=updated&order=desc&per_page=50`;

  const itemsById = new Map<string, { item: any; forceMerged: boolean }>();

  const recentResp = await axios.get(recentUrl, { headers, timeout: 15000 });
  for (const item of recentResp.data?.items || []) {
    const repo = item.repository_url.replace('https://api.github.com/repos/', '');
    itemsById.set(`gh:${repo}#${item.number}`, { item, forceMerged: false });
  }

  try {
    const mergedResp = await axios.get(mergedUrl, { headers, timeout: 15000 });
    for (const item of mergedResp.data?.items || []) {
      const repo = item.repository_url.replace('https://api.github.com/repos/', '');
      const key = `gh:${repo}#${item.number}`;
      const existing = itemsById.get(key);
      itemsById.set(key, { item: existing ? { ...existing.item, ...item } : item, forceMerged: true });
    }
  } catch (err: any) {
    console.warn(`[GitHub Sync] Merged search fallback warning for ${username}: ${err.message}`);
  }

  for (const { item, forceMerged } of itemsById.values()) {
    const repo = item.repository_url.replace('https://api.github.com/repos/', '');
    await hydrateGitHubContribution({
      userId,
      repo,
      number: item.number,
      isPR: Boolean(item.pull_request),
      item,
      headers,
      authorFallback: username,
      forceMerged,
      skipUnchangedFetch: true,
    });
  }

  console.log(`[GitHub Sync] Successfully synced ${itemsById.size} items for user ${userId}.`);
}
