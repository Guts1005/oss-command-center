import express from 'express';
import axios from 'axios';
import { db } from '../db.js';
import { runSync, getLastSyncTime } from '../sync/engine.js';
import { z } from 'zod';

export const apiRouter = express.Router();

// GET /api/stats - High-level operational metrics
apiRouter.get('/stats', (req, res) => {
  const total = (db.prepare('SELECT COUNT(*) as count FROM contributions').get() as any).count;
  const actionNeeded = (db.prepare("SELECT COUNT(*) as count FROM contributions WHERE action_needed != 'none'").get() as any).count;
  const awaitingMaintainer = (db.prepare("SELECT COUNT(*) as count FROM contributions WHERE status IN ('open', 'opened', 'submitted', 'awaiting-reply') AND action_needed = 'none'").get() as any).count;
  const merged = (db.prepare("SELECT COUNT(*) as count FROM contributions WHERE status = 'merged'").get() as any).count;
  const unreadCount = (db.prepare('SELECT COUNT(*) as count FROM contributions WHERE unread = 1').get() as any).count;
  const lastSync = getLastSyncTime();

  res.json({
    total,
    actionNeeded,
    awaitingMaintainer,
    merged,
    unreadCount,
    lastSync
  });
});

// GET /api/contributions - Filtered & sorted query
apiRouter.get('/contributions', (req, res) => {
  const { platform, status, search, sort } = req.query;
  const actionParam = (req.query.action_needed || req.query.action) as string | undefined;

  let query = 'SELECT * FROM contributions WHERE 1=1';
  const params: any[] = [];

  if (platform && platform !== 'all') {
    query += ' AND platform = ?';
    params.push(platform);
  }

  if (status && status !== 'all') {
    if (status === 'active') {
      query += ' AND status IN ("open", "opened") AND (julianday("now") - julianday(last_activity_at)) < 30';
    } else if (status === 'stale') {
      query += ' AND status IN ("open", "opened") AND (julianday("now") - julianday(last_activity_at)) >= 30';
    } else {
      query += ' AND status = ?';
      params.push(status);
    }
  }

  if (actionParam && actionParam !== 'all') {
    query += ' AND action_needed = ?';
    params.push(actionParam);
  }

  if (search) {
    query += ' AND (title LIKE ? OR repo LIKE ? OR id LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  // Sort logic
  if (sort === 'unread') {
    query += ' ORDER BY unread DESC, last_activity_at DESC';
  } else if (sort === 'difficulty') {
    query += ' ORDER BY CASE difficulty WHEN "hard" THEN 1 WHEN "medium" THEN 2 ELSE 3 END, last_activity_at DESC';
  } else {
    query += ' ORDER BY last_activity_at DESC';
  }

  const items = db.prepare(query).all(...params);
  res.json(items);
});

// GET /api/contributions/:id - Single item with event timeline & mark read
apiRouter.get('/contributions/:id', (req, res) => {
  const { id } = req.params;
  const item = db.prepare('SELECT * FROM contributions WHERE id = ?').get(id) as any;
  if (!item) {
    return res.status(404).json({ error: 'Contribution not found' });
  }

  // Mark as read locally
  const now = new Date().toISOString();
  db.prepare('UPDATE contributions SET unread = 0, last_viewed_at = ? WHERE id = ?').run(now, id);
  item.unread = 0;
  item.last_viewed_at = now;

  // Fetch events
  const events = db.prepare('SELECT * FROM activity_events WHERE contribution_id = ? ORDER BY created_at ASC').all(id);

  res.json({ item, events });
});

// PATCH /api/contributions/:id/notes - Add or update triage notes
apiRouter.patch('/contributions/:id/notes', (req, res) => {
  const { id } = req.params;
  const { notes, action_needed } = req.body;

  const item = db.prepare('SELECT * FROM contributions WHERE id = ?').get(id);
  if (!item) {
    return res.status(404).json({ error: 'Contribution not found' });
  }

  db.prepare(`
    UPDATE contributions 
    SET notes = COALESCE(?, notes),
        action_needed = COALESCE(?, action_needed)
    WHERE id = ?
  `).run(notes !== undefined ? notes : null, action_needed !== undefined ? action_needed : null, id);

  const updated = db.prepare('SELECT * FROM contributions WHERE id = ?').get(id);
  res.json({ item: updated });
});

// POST /api/sync - Manual trigger
apiRouter.post('/sync', async (req, res) => {
  const result = await runSync();
  res.json(result);
});

// POST /api/ingest - Endpoint for /plan and triage pipeline to push newly found items
const IngestSchema = z.object({
  platform: z.enum(['github', 'gitlab']),
  repo: z.string(),
  number: z.number(),
  title: z.string(),
  type: z.enum(['pr', 'issue']),
  url: z.string().url(),
  author: z.string(),
  status: z.string().default('submitted'),
  action_needed: z.enum(['reply', 'push-changes', 'none']).default('none'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  bounty_amount: z.string().optional(),
  notes: z.string().optional()
});

apiRouter.post('/ingest', (req, res) => {
  try {
    const data = IngestSchema.parse(req.body);
    const id = data.platform === 'github' ? `gh:${data.repo}#${data.number}` : `gl:${data.repo}!${data.number}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO contributions (
        id, platform, repo, number, title, type, url, author, status,
        action_needed, difficulty, bounty_amount, created_at, last_activity_at,
        last_synced_at, unread, notes
      ) VALUES (
        @id, @platform, @repo, @number, @title, @type, @url, @author, @status,
        @action_needed, @difficulty, @bounty_amount, @created_at, @last_activity_at,
        @last_synced_at, 1, @notes
      )
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        status = excluded.status,
        action_needed = excluded.action_needed,
        bounty_amount = COALESCE(excluded.bounty_amount, contributions.bounty_amount),
        notes = COALESCE(excluded.notes, contributions.notes),
        unread = 1
    `).run({
      id,
      ...data,
      bounty_amount: data.bounty_amount || null,
      notes: data.notes || null,
      created_at: now,
      last_activity_at: now,
      last_synced_at: now
    });

    res.status(201).json({ success: true, id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/track-url - Ingest any GitHub/GitLab URL directly from UI
apiRouter.post('/track-url', async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'A valid URL is required' });
  }

  const trimmed = url.trim();

  // GitHub Pattern: https://github.com/:owner/:repo/(pull|issues)/:number
  const ghMatch = trimmed.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/(pull|issues)\/(\d+)/i);

  // GitLab Pattern: https://:host/:namespace/:repo/-/(merge_requests|issues)/:number
  const glMatch = trimmed.match(/^https?:\/\/([^\/]+)\/(.+?)\/-\/(merge_requests|issues)\/(\d+)/i);

  if (!ghMatch && !glMatch) {
    return res.status(400).json({
      error: 'Unsupported link. Please paste a GitHub Pull Request/Issue or GitLab Merge Request/Issue URL.'
    });
  }

  const now = new Date().toISOString();

  if (ghMatch) {
    const [, owner, repoName, rawType, rawNumber] = ghMatch;
    const repo = `${owner}/${repoName}`;
    const number = parseInt(rawNumber, 10);
    const type: 'pr' | 'issue' = rawType.toLowerCase() === 'pull' ? 'pr' : 'issue';
    const id = `gh:${repo}#${number}`;

    let title = `${repo}#${number}`;
    let author = owner;
    let status = 'open';
    let body = '';
    let createdAt = now;
    let updatedAt = now;

    try {
      const endpoint = type === 'pr'
        ? `https://api.github.com/repos/${repo}/pulls/${number}`
        : `https://api.github.com/repos/${repo}/issues/${number}`;

      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'oss-command-center'
      };
      const token = process.env.GITHUB_TOKEN;
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const resp = await axios.get(endpoint, { headers, timeout: 8000 });
      if (resp.data) {
        title = resp.data.title || title;
        author = resp.data.user?.login || author;
        createdAt = resp.data.created_at || createdAt;
        updatedAt = resp.data.updated_at || updatedAt;
        body = resp.data.body || '';

        if (resp.data.state === 'closed') {
          status = resp.data.merged ? 'merged' : 'closed';
        } else if (resp.data.draft) {
          status = 'draft';
        } else {
          status = 'open';
        }
      }
    } catch (err: any) {
      console.warn(`[Track URL] GitHub live fetch warning: ${err.message}`);
    }

    db.prepare(`
      INSERT INTO contributions (
        id, platform, repo, number, title, type, url, author, status,
        action_needed, difficulty, bounty_amount, created_at, last_activity_at,
        last_synced_at, unread, notes
      ) VALUES (
        @id, 'github', @repo, @number, @title, @type, @url, @author, @status,
        'none', 'medium', null, @createdAt, @updatedAt, @now, 1, null
      )
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        status = excluded.status,
        last_activity_at = excluded.last_activity_at,
        last_synced_at = excluded.last_synced_at,
        unread = 1
    `).run({
      id,
      repo,
      number,
      title,
      type,
      url: trimmed,
      author,
      status,
      createdAt,
      updatedAt,
      now
    });

    db.prepare(`
      INSERT OR REPLACE INTO activity_events (
        id, contribution_id, actor, actor_avatar, type, review_state, body_excerpt, created_at
      ) VALUES (
        @id, @contribution_id, @actor, null, 'status-change', null, @body_excerpt, @created_at
      )
    `).run({
      id: `init_${id}`,
      contribution_id: id,
      actor: author,
      body_excerpt: body ? body.slice(0, 500) : `Tracked contribution: ${title}`,
      created_at: createdAt
    });

    const item = db.prepare('SELECT * FROM contributions WHERE id = ?').get(id);
    return res.status(201).json({ success: true, item });
  }

  if (glMatch) {
    const [, host, projectPath, rawType, rawNumber] = glMatch;
    const number = parseInt(rawNumber, 10);
    const type: 'pr' | 'issue' = rawType.toLowerCase() === 'merge_requests' ? 'pr' : 'issue';
    const repo = projectPath;
    const id = `gl:${repo}!${number}`;

    let title = `${repo}!${number}`;
    let author = 'GitLab User';
    let status = 'open';
    let body = '';
    let createdAt = now;
    let updatedAt = now;

    try {
      const endpoint = `https://${host}/api/v4/projects/${encodeURIComponent(projectPath)}/${rawType}/${number}`;
      const resp = await axios.get(endpoint, { timeout: 8000 });
      if (resp.data) {
        title = resp.data.title || title;
        author = resp.data.author?.username || author;
        createdAt = resp.data.created_at || createdAt;
        updatedAt = resp.data.updated_at || updatedAt;
        body = resp.data.description || '';

        if (resp.data.state === 'merged') {
          status = 'merged';
        } else if (resp.data.state === 'closed') {
          status = 'closed';
        } else if (resp.data.draft || resp.data.work_in_progress) {
          status = 'draft';
        } else {
          status = 'open';
        }
      }
    } catch (err: any) {
      console.warn(`[Track URL] GitLab live fetch warning: ${err.message}`);
    }

    db.prepare(`
      INSERT INTO contributions (
        id, platform, repo, number, title, type, url, author, status,
        action_needed, difficulty, bounty_amount, created_at, last_activity_at,
        last_synced_at, unread, notes
      ) VALUES (
        @id, 'gitlab', @repo, @number, @title, @type, @url, @author, @status,
        'none', 'medium', null, @createdAt, @updatedAt, @now, 1, null
      )
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        status = excluded.status,
        last_activity_at = excluded.last_activity_at,
        last_synced_at = excluded.last_synced_at,
        unread = 1
    `).run({
      id,
      repo,
      number,
      title,
      type,
      url: trimmed,
      author,
      status,
      createdAt,
      updatedAt,
      now
    });

    db.prepare(`
      INSERT OR REPLACE INTO activity_events (
        id, contribution_id, actor, actor_avatar, type, review_state, body_excerpt, created_at
      ) VALUES (
        @id, @contribution_id, @actor, null, 'status-change', null, @body_excerpt, @created_at
      )
    `).run({
      id: `init_${id}`,
      contribution_id: id,
      actor: author,
      body_excerpt: body ? body.slice(0, 500) : `Tracked contribution: ${title}`,
      created_at: createdAt
    });

    const item = db.prepare('SELECT * FROM contributions WHERE id = ?').get(id);
    return res.status(201).json({ success: true, item });
  }
});
