import express from 'express';
import axios from 'axios';
import { db } from '../db.js';
import { syncUser, getLastSyncTime } from '../sync/multi_engine.js';
import { authRouter } from './auth.js';
import { integrationsRouter } from './integrations.js';
import { settingsRouter } from './settings.js';
import { inboundWebhooksRouter } from './webhooks_inbound.js';
import { eventsRouter } from './events.js';
import { actionsRouter } from './actions.js';
import { syncRouter } from './sync.js';
import { digestRouter } from './digest.js';
import { demoRouter } from './demo.js';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { z } from 'zod';

export const apiRouter = express.Router();

// Mount Auth, Integrations, Settings, Webhooks, Events, Actions, Sync, Digest, and Demo sub-routers
apiRouter.use('/auth', authRouter);
apiRouter.use('/integrations', integrationsRouter);
apiRouter.use('/settings', settingsRouter);
apiRouter.use('/webhooks', inboundWebhooksRouter);
apiRouter.use('/events', eventsRouter);
apiRouter.use('/contributions', actionsRouter);
apiRouter.use('/sync', syncRouter);
apiRouter.use('/digest', digestRouter);
apiRouter.use('/demo', demoRouter);

// Apply optionalAuth to all remaining contribution endpoints
apiRouter.use(optionalAuth);

function getEffectiveUserId(req: AuthenticatedRequest): string | null {
  if (req.user) return req.user.id;
  return null;
}

// GET /api/stats - High-level operational metrics
apiRouter.get('/stats', (req: AuthenticatedRequest, res) => {
  try {
    const userId = getEffectiveUserId(req);
    if (!userId) {
      return res.json({
        total: 0,
        actionNeeded: 0,
        awaitingMaintainer: 0,
        merged: 0,
        unreadCount: 0,
        lastSync: null
      });
    }

    const total = (db.prepare('SELECT COUNT(*) as count FROM contributions WHERE user_id = ?').get(userId) as any)?.count || 0;
    const actionNeeded = (db.prepare("SELECT COUNT(*) as count FROM contributions WHERE user_id = ? AND action_needed != 'none'").get(userId) as any)?.count || 0;
    const awaitingMaintainer = (db.prepare("SELECT COUNT(*) as count FROM contributions WHERE user_id = ? AND status IN ('open', 'opened', 'submitted', 'awaiting-reply') AND action_needed = 'none'").get(userId) as any)?.count || 0;
    const merged = (db.prepare("SELECT COUNT(*) as count FROM contributions WHERE user_id = ? AND status = 'merged'").get(userId) as any)?.count || 0;
    const closed = (db.prepare("SELECT COUNT(*) as count FROM contributions WHERE user_id = ? AND status = 'closed'").get(userId) as any)?.count || 0;
    const unreadCount = (db.prepare('SELECT COUNT(*) as count FROM contributions WHERE user_id = ? AND unread = 1').get(userId) as any)?.count || 0;
    const lastSync = getLastSyncTime();

    return res.json({
      total,
      actionNeeded,
      awaitingMaintainer,
      merged,
      closed,
      unreadCount,
      lastSync
    });
  } catch (err: any) {
    console.error('[API /stats error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve stats', details: err.message });
  }
});

// GET /api/analytics: Deep pipeline velocity, maintainer turnaround, and activity heatmaps
apiRouter.get('/analytics', (req: AuthenticatedRequest, res) => {
  try {
    const userId = getEffectiveUserId(req);
    if (!userId) {
      return res.json({
        summary: {
          total: 0,
          merged: 0,
          closed: 0,
          open: 0,
          actionNeeded: 0,
          acceptanceRate: 0,
        },
        velocity: {
          medianTimeToMergeHours: 0,
          avgTimeToMergeHours: 0,
          medianFirstReviewHours: 0,
          totalMergedEvaluated: 0,
        },
        platformBreakdown: { github: 0, gitlab: 0 },
        scopeBreakdown: { external: 0, own: 0 },
        topRepositories: [],
        heatmap: [],
      });
    }

    // 1. Summary metrics
    const total = (db.prepare('SELECT COUNT(*) as count FROM contributions WHERE user_id = ?').get(userId) as any)?.count || 0;
    const merged = (db.prepare("SELECT COUNT(*) as count FROM contributions WHERE user_id = ? AND status = 'merged'").get(userId) as any)?.count || 0;
    const closed = (db.prepare("SELECT COUNT(*) as count FROM contributions WHERE user_id = ? AND status = 'closed'").get(userId) as any)?.count || 0;
    const actionNeeded = (db.prepare("SELECT COUNT(*) as count FROM contributions WHERE user_id = ? AND action_needed != 'none'").get(userId) as any)?.count || 0;
    const open = Math.max(0, total - merged - closed);
    const acceptanceRate = (merged + closed > 0)
      ? Math.round((merged / (merged + closed)) * 100)
      : (total > 0 ? Math.round((merged / total) * 100) : 0);

    // 2. Velocity: Time to Merge
    const mergedRows = db.prepare(`
      SELECT created_at, last_activity_at 
      FROM contributions 
      WHERE user_id = ? AND status = 'merged'
    `).all(userId) as { created_at: string; last_activity_at: string }[];

    const mergeDurationsHours: number[] = [];
    for (const row of mergedRows) {
      const created = new Date(row.created_at).getTime();
      const resolved = new Date(row.last_activity_at).getTime();
      if (!isNaN(created) && !isNaN(resolved) && resolved >= created) {
        mergeDurationsHours.push((resolved - created) / (1000 * 60 * 60));
      }
    }

    mergeDurationsHours.sort((a, b) => a - b);
    const medianTimeToMergeHours = mergeDurationsHours.length > 0
      ? Math.round(mergeDurationsHours[Math.floor(mergeDurationsHours.length / 2)] * 10) / 10
      : 0;
    const avgTimeToMergeHours = mergeDurationsHours.length > 0
      ? Math.round((mergeDurationsHours.reduce((sum, h) => sum + h, 0) / mergeDurationsHours.length) * 10) / 10
      : 0;

    // 3. Velocity: Time to First Review
    const firstReviewEvents = db.prepare(`
      SELECT c.created_at as pr_created, MIN(e.created_at) as first_review
      FROM contributions c
      JOIN activity_events e ON c.id = e.contribution_id AND c.user_id = e.user_id
      WHERE c.user_id = ? AND e.type IN ('review', 'comment')
      GROUP BY c.id
    `).all(userId) as { pr_created: string; first_review: string }[];

    const firstReviewDurations: number[] = [];
    for (const r of firstReviewEvents) {
      const prDate = new Date(r.pr_created).getTime();
      const revDate = new Date(r.first_review).getTime();
      if (!isNaN(prDate) && !isNaN(revDate) && revDate >= prDate) {
        firstReviewDurations.push((revDate - prDate) / (1000 * 60 * 60));
      }
    }
    firstReviewDurations.sort((a, b) => a - b);
    const medianFirstReviewHours = firstReviewDurations.length > 0
      ? Math.round(firstReviewDurations[Math.floor(firstReviewDurations.length / 2)] * 10) / 10
      : 0;

    // 4. Platform breakdown
    const ghCount = (db.prepare("SELECT COUNT(*) as count FROM contributions WHERE user_id = ? AND platform = 'github'").get(userId) as any)?.count || 0;
    const glCount = (db.prepare("SELECT COUNT(*) as count FROM contributions WHERE user_id = ? AND platform = 'gitlab'").get(userId) as any)?.count || 0;

    // 5. Scope breakdown
    const integrations = db.prepare('SELECT username FROM user_integrations WHERE user_id = ?').all(userId) as { username: string }[];
    const usernames = integrations.map(i => i.username.toLowerCase()).filter(Boolean);
    let ownCount = 0;
    let externalCount = total;
    if (usernames.length > 0) {
      const conditions = usernames.map(() => 'LOWER(repo) LIKE ?').join(' OR ');
      const params = usernames.map(u => `${u}/%`);
      ownCount = (db.prepare(`SELECT COUNT(*) as count FROM contributions WHERE user_id = ? AND (${conditions})`).get(userId, ...params) as any)?.count || 0;
      externalCount = Math.max(0, total - ownCount);
    }

    // 6. Top repositories
    const topRepositories = db.prepare(`
      SELECT repo, platform, COUNT(*) as total,
             SUM(CASE WHEN status = 'merged' THEN 1 ELSE 0 END) as merged,
             SUM(CASE WHEN action_needed != 'none' THEN 1 ELSE 0 END) as actionNeeded
      FROM contributions
      WHERE user_id = ?
      GROUP BY repo, platform
      ORDER BY total DESC
      LIMIT 6
    `).all(userId);

    // 7. Activity Heatmap for the past 365 days
    const daysMap = new Map<string, number>();
    const now = new Date();
    for (let i = 364; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const iso = d.toISOString().split('T')[0];
      daysMap.set(iso, 0);
    }

    const prActivity = db.prepare(`
      SELECT SUBSTR(created_at, 1, 10) as day, COUNT(*) as count
      FROM contributions
      WHERE user_id = ?
      GROUP BY day
    `).all(userId) as { day: string; count: number }[];

    for (const item of prActivity) {
      if (item.day && daysMap.has(item.day)) {
        daysMap.set(item.day, (daysMap.get(item.day) || 0) + item.count);
      }
    }

    const eventActivity = db.prepare(`
      SELECT SUBSTR(created_at, 1, 10) as day, COUNT(*) as count
      FROM activity_events
      WHERE user_id = ?
      GROUP BY day
    `).all(userId) as { day: string; count: number }[];

    for (const item of eventActivity) {
      if (item.day && daysMap.has(item.day)) {
        daysMap.set(item.day, (daysMap.get(item.day) || 0) + item.count);
      }
    }

    const heatmap = Array.from(daysMap.entries()).map(([date, count]) => {
      let level = 0;
      if (count >= 5) level = 4;
      else if (count >= 3) level = 3;
      else if (count >= 2) level = 2;
      else if (count >= 1) level = 1;
      return { date, count, level };
    });

    return res.json({
      summary: {
        total,
        merged,
        closed,
        open,
        actionNeeded,
        acceptanceRate,
      },
      velocity: {
        medianTimeToMergeHours,
        avgTimeToMergeHours,
        medianFirstReviewHours,
        totalMergedEvaluated: mergeDurationsHours.length,
      },
      platformBreakdown: { github: ghCount, gitlab: glCount },
      scopeBreakdown: { external: externalCount, own: ownCount },
      topRepositories,
      heatmap,
    });
  } catch (err: any) {
    console.error('[API /analytics error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve analytics', details: err.message });
  }
});

// GET /api/repositories: Aggregated ecosystem view of tracked repositories
apiRouter.get('/repositories', (req: AuthenticatedRequest, res) => {
  try {
    const userId = getEffectiveUserId(req);
    if (!userId) {
      return res.json([]);
    }

    const integrations = db.prepare('SELECT username FROM user_integrations WHERE user_id = ?').all(userId) as any[];
    const usernames = new Set(integrations.map(i => i.username.toLowerCase()).filter(Boolean));

    const repos = db.prepare(`
      SELECT 
        repo,
        platform,
        COUNT(*) as totalContributions,
        SUM(CASE WHEN status IN ('open', 'opened', 'submitted', 'awaiting-reply') THEN 1 ELSE 0 END) as openContributions,
        SUM(CASE WHEN status = 'merged' THEN 1 ELSE 0 END) as mergedContributions,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closedContributions,
        SUM(CASE WHEN action_needed != 'none' THEN 1 ELSE 0 END) as actionNeededCount,
        MAX(last_activity_at) as lastActivityAt
      FROM contributions
      WHERE user_id = ?
      GROUP BY repo, platform
      ORDER BY totalContributions DESC
    `).all(userId) as any[];

    if (!repos || repos.length === 0) {
      return res.json([]);
    }

    const allContribs = db.prepare(`
      SELECT id, repo, platform, created_at, status, action_needed
      FROM contributions
      WHERE user_id = ?
    `).all(userId) as any[];

    const contribsByRepo = new Map<string, any[]>();
    for (const c of allContribs) {
      const key = `${c.platform}:${c.repo}`;
      if (!contribsByRepo.has(key)) contribsByRepo.set(key, []);
      contribsByRepo.get(key)!.push(c);
    }

    const reviewEvents = db.prepare(`
      SELECT e.contribution_id, e.actor, e.created_at, c.created_at as pr_created_at, c.repo, c.platform, c.author
      FROM activity_events e
      JOIN contributions c ON e.contribution_id = c.id AND e.user_id = c.user_id
      WHERE e.user_id = ? AND (e.type = 'review' OR e.type = 'comment')
      ORDER BY e.created_at ASC
    `).all(userId) as any[];

    const firstReviewMap = new Map<string, number>();
    for (const ev of reviewEvents) {
      const actorLower = (ev.actor || '').toLowerCase();
      const authorLower = (ev.author || '').toLowerCase();
      if (actorLower && (actorLower === authorLower || usernames.has(actorLower))) {
        continue;
      }
      if (!firstReviewMap.has(ev.contribution_id)) {
        const prCreated = new Date(ev.pr_created_at).getTime();
        const evCreated = new Date(ev.created_at).getTime();
        if (evCreated >= prCreated) {
          const hours = (evCreated - prCreated) / (1000 * 3600);
          firstReviewMap.set(ev.contribution_id, hours);
        }
      }
    }

    const now = Date.now();

    const result = repos.map((r) => {
      const key = `${r.platform}:${r.repo}`;
      const repoContribs = contribsByRepo.get(key) || [];
      const reviewLatencies: number[] = [];

      for (const c of repoContribs) {
        if (firstReviewMap.has(c.id)) {
          reviewLatencies.push(firstReviewMap.get(c.id)!);
        }
      }

      let medianFirstReviewHours: number | null = null;
      let responsiveness: 'Fast' | 'Moderate' | 'Slow' | 'Pending' = 'Pending';

      if (reviewLatencies.length > 0) {
        reviewLatencies.sort((a, b) => a - b);
        const mid = Math.floor(reviewLatencies.length / 2);
        medianFirstReviewHours = Math.round(
          (reviewLatencies.length % 2 === 0
            ? (reviewLatencies[mid - 1] + reviewLatencies[mid]) / 2
            : reviewLatencies[mid]) * 10
        ) / 10;

        if (medianFirstReviewHours <= 12) {
          responsiveness = 'Fast';
        } else if (medianFirstReviewHours <= 72) {
          responsiveness = 'Moderate';
        } else {
          responsiveness = 'Slow';
        }
      } else {
        const hasStaleOpen = repoContribs.some((c) => {
          const isPending = ['open', 'opened', 'submitted', 'awaiting-reply'].includes(c.status);
          const ageDays = (now - new Date(c.created_at).getTime()) / (1000 * 3600 * 24);
          return isPending && ageDays > 7;
        });
        if (hasStaleOpen) {
          responsiveness = 'Slow';
        } else {
          responsiveness = 'Pending';
        }
      }

      const resolved = r.mergedContributions + r.closedContributions;
      const acceptanceRate = resolved > 0
        ? Math.round((r.mergedContributions / resolved) * 100)
        : (r.totalContributions > 0 ? Math.round((r.mergedContributions / r.totalContributions) * 100) : 0);

      let health: 'Healthy' | 'Attention Required' | 'Stale' = 'Healthy';
      const lastActivityTime = r.lastActivityAt ? new Date(r.lastActivityAt).getTime() : 0;
      const daysSinceActivity = (now - lastActivityTime) / (1000 * 3600 * 24);

      if (r.actionNeededCount > 0) {
        health = 'Attention Required';
      } else if (daysSinceActivity > 45 || responsiveness === 'Slow') {
        health = 'Stale';
      } else {
        health = 'Healthy';
      }

      const url = r.platform === 'gitlab'
        ? `https://gitlab.com/${r.repo}`
        : `https://github.com/${r.repo}`;

      return {
        repo: r.repo,
        platform: r.platform,
        url,
        totalContributions: Number(r.totalContributions),
        openContributions: Number(r.openContributions),
        mergedContributions: Number(r.mergedContributions),
        closedContributions: Number(r.closedContributions),
        actionNeededCount: Number(r.actionNeededCount),
        acceptanceRate,
        medianFirstReviewHours,
        responsiveness,
        health,
        lastActivityAt: r.lastActivityAt,
      };
    });

    return res.json(result);
  } catch (err: any) {
    console.error('[API /repositories error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve repositories', details: err.message });
  }
});

// GET /api/contributions - Filtered & sorted query scoped to current user
apiRouter.get('/contributions', (req: AuthenticatedRequest, res) => {
  try {
    const userId = getEffectiveUserId(req);
    if (!userId) {
      return res.json([]);
    }
    const platform = typeof req.query.platform === 'string' ? req.query.platform : (Array.isArray(req.query.platform) ? String(req.query.platform[0]) : undefined);
    const scope = typeof req.query.scope === 'string' ? req.query.scope : (Array.isArray(req.query.scope) ? String(req.query.scope[0]) : undefined);
    const status = typeof req.query.status === 'string' ? req.query.status : (Array.isArray(req.query.status) ? String(req.query.status[0]) : undefined);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : (Array.isArray(req.query.search) ? String(req.query.search[0]).trim() : undefined);
    const sort = typeof req.query.sort === 'string' ? req.query.sort : (Array.isArray(req.query.sort) ? String(req.query.sort[0]) : undefined);
    const rawAction = req.query.action_needed || req.query.action;
    const actionParam = typeof rawAction === 'string' ? rawAction : (Array.isArray(rawAction) ? String(rawAction[0]) : undefined);

    let query = 'SELECT * FROM contributions WHERE user_id = ?';
    const params: any[] = [userId];

    if (platform && platform !== 'all') {
      query += ' AND platform = ?';
      params.push(platform);
    }

    if (scope && scope !== 'all') {
      const integrations = db.prepare('SELECT username FROM user_integrations WHERE user_id = ?').all(userId) as any[];
      const usernames = integrations.map(i => i.username.toLowerCase()).filter(Boolean);
      if (usernames.length > 0) {
        if (scope === 'own') {
          const conditions = usernames.map(() => 'LOWER(repo) LIKE ?').join(' OR ');
          query += ` AND (${conditions})`;
          params.push(...usernames.map(u => `${u}/%`));
        } else if (scope === 'external') {
          const conditions = usernames.map(() => 'LOWER(repo) NOT LIKE ?').join(' AND ');
          query += ` AND (${conditions})`;
          params.push(...usernames.map(u => `${u}/%`));
        }
      }
    }

    if (status && status !== 'all') {
      if (status === 'active') {
        query += " AND status IN ('open', 'opened', 'submitted', 'in_review', 'awaiting-reply') AND (julianday('now') - julianday(COALESCE(last_activity_at, created_at, 'now'))) < 30";
      } else if (status === 'stale') {
        query += " AND status IN ('open', 'opened', 'submitted', 'in_review', 'awaiting-reply') AND (julianday('now') - julianday(COALESCE(last_activity_at, created_at, 'now'))) >= 30";
      } else {
        query += ' AND status = ?';
        params.push(status);
      }
    }

    if (actionParam && actionParam !== 'all') {
      if (actionParam === 'action-needed' || actionParam === 'needed' || actionParam === 'true') {
        query += " AND action_needed != 'none'";
      } else {
        query += ' AND action_needed = ?';
        params.push(actionParam);
      }
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
      query += " ORDER BY CASE difficulty WHEN 'hard' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, last_activity_at DESC";
    } else {
      query += ' ORDER BY last_activity_at DESC';
    }

    const items = db.prepare(query).all(...params);
    return res.json(items);
  } catch (err: any) {
    console.error('[API /contributions error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve contributions', details: err.message });
  }
});

// GET /api/contributions/:id - Single item with event timeline & mark read
apiRouter.get('/contributions/:id', (req: AuthenticatedRequest, res) => {
  try {
    const userId = getEffectiveUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }
    const { id } = req.params;
    const item = db.prepare('SELECT * FROM contributions WHERE user_id = ? AND id = ?').get(userId, id) as any;
    if (!item) {
      return res.status(404).json({ error: 'Contribution not found' });
    }

    // Mark as read locally
    const now = new Date().toISOString();
    db.prepare('UPDATE contributions SET unread = 0, last_viewed_at = ? WHERE user_id = ? AND id = ?').run(now, userId, id);
    item.unread = 0;
    item.last_viewed_at = now;

    // Fetch events
    const events = db.prepare('SELECT * FROM activity_events WHERE user_id = ? AND contribution_id = ? ORDER BY created_at ASC').all(userId, id);

    return res.json({ item, events });
  } catch (err: any) {
    console.error('[API /contributions/:id error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve contribution detail', details: err.message });
  }
});

// PATCH /api/contributions/:id/notes - Add or update triage notes
apiRouter.patch('/contributions/:id/notes', (req: AuthenticatedRequest, res) => {
  try {
    const userId = getEffectiveUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }
    const { id } = req.params;
    const { notes, action_needed } = req.body;

    const item = db.prepare('SELECT * FROM contributions WHERE user_id = ? AND id = ?').get(userId, id);
    if (!item) {
      return res.status(404).json({ error: 'Contribution not found' });
    }

    db.prepare(`
      UPDATE contributions 
      SET notes = COALESCE(?, notes),
          action_needed = COALESCE(?, action_needed)
      WHERE user_id = ? AND id = ?
    `).run(notes !== undefined ? notes : null, action_needed !== undefined ? action_needed : null, userId, id);

    const updated = db.prepare('SELECT * FROM contributions WHERE user_id = ? AND id = ?').get(userId, id);
    return res.json({ item: updated });
  } catch (err: any) {
    console.error('[API /contributions/:id/notes error]:', err);
    return res.status(500).json({ error: 'Failed to update notes', details: err.message });
  }
});

// POST /api/sync - Manual trigger for current user
apiRouter.post('/sync', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = getEffectiveUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }
    const result = await syncUser(userId);
    return res.json(result);
  } catch (err: any) {
    console.error('[API /sync error]:', err);
    return res.status(500).json({ error: 'Sync failed', details: err.message });
  }
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

apiRouter.post('/ingest', (req: AuthenticatedRequest, res) => {
  try {
    const userId = getEffectiveUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }
    const data = IngestSchema.parse(req.body);
    const id = data.platform === 'github' ? `gh:${data.repo}#${data.number}` : `gl:${data.repo}!${data.number}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO contributions (
        user_id, id, platform, repo, number, title, type, url, author, status,
        action_needed, difficulty, bounty_amount, created_at, last_activity_at,
        last_synced_at, unread, notes
      ) VALUES (
        @user_id, @id, @platform, @repo, @number, @title, @type, @url, @author, @status,
        @action_needed, @difficulty, @bounty_amount, @created_at, @last_activity_at,
        @last_synced_at, 1, @notes
      )
      ON CONFLICT(user_id, id) DO UPDATE SET
        title = excluded.title,
        status = excluded.status,
        action_needed = excluded.action_needed,
        bounty_amount = COALESCE(excluded.bounty_amount, contributions.bounty_amount),
        notes = COALESCE(excluded.notes, contributions.notes),
        unread = 1
    `).run({
      user_id: userId,
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
apiRouter.post('/track-url', async (req: AuthenticatedRequest, res) => {
  const userId = getEffectiveUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
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
        user_id, id, platform, repo, number, title, type, url, author, status,
        action_needed, difficulty, bounty_amount, created_at, last_activity_at,
        last_synced_at, unread, notes
      ) VALUES (
        @user_id, @id, 'github', @repo, @number, @title, @type, @url, @author, @status,
        'none', 'medium', null, @createdAt, @updatedAt, @now, 1, null
      )
      ON CONFLICT(user_id, id) DO UPDATE SET
        title = excluded.title,
        status = excluded.status,
        last_activity_at = excluded.last_activity_at,
        last_synced_at = excluded.last_synced_at,
        unread = 1
    `).run({
      user_id: userId,
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
        id, user_id, contribution_id, actor, actor_avatar, type, review_state, body_excerpt, created_at
      ) VALUES (
        @id, @user_id, @contribution_id, @actor, null, 'status-change', null, @body_excerpt, @created_at
      )
    `).run({
      id: `init_${id}`,
      user_id: userId,
      contribution_id: id,
      actor: author,
      body_excerpt: body ? body.slice(0, 500) : `Tracked contribution: ${title}`,
      created_at: createdAt
    });

    const item = db.prepare('SELECT * FROM contributions WHERE user_id = ? AND id = ?').get(userId, id);
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
        user_id, id, platform, repo, number, title, type, url, author, status,
        action_needed, difficulty, bounty_amount, created_at, last_activity_at,
        last_synced_at, unread, notes
      ) VALUES (
        @user_id, @id, 'gitlab', @repo, @number, @title, @type, @url, @author, @status,
        'none', 'medium', null, @createdAt, @updatedAt, @now, 1, null
      )
      ON CONFLICT(user_id, id) DO UPDATE SET
        title = excluded.title,
        status = excluded.status,
        last_activity_at = excluded.last_activity_at,
        last_synced_at = excluded.last_synced_at,
        unread = 1
    `).run({
      user_id: userId,
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
        id, user_id, contribution_id, actor, actor_avatar, type, review_state, body_excerpt, created_at
      ) VALUES (
        @id, @user_id, @contribution_id, @actor, null, 'status-change', null, @body_excerpt, @created_at
      )
    `).run({
      id: `init_${id}`,
      user_id: userId,
      contribution_id: id,
      actor: author,
      body_excerpt: body ? body.slice(0, 500) : `Tracked contribution: ${title}`,
      created_at: createdAt
    });

    const item = db.prepare('SELECT * FROM contributions WHERE user_id = ? AND id = ?').get(userId, id);
    return res.status(201).json({ success: true, item });
  }
});
