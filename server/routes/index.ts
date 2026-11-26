import express from 'express';
import { db } from '../db.js';
import { syncUser, getLastSyncTime } from '../sync/multi_engine.js';
import { getDecryptedUserIntegration, HostValidationError, validateExternalHost } from '../sync/credentials.js';
import { fetchAndHydrateGitHubUrl, UpstreamFetchError } from '../sync/github.js';
import { fetchAndHydrateGitLabUrl } from '../sync/gitlab.js';
import { authRouter } from './auth.js';
import { integrationsRouter } from './integrations.js';
import { settingsRouter } from './settings.js';
import { inboundWebhooksRouter } from './webhooks_inbound.js';
import { eventsRouter } from './events.js';
import { actionsRouter } from './actions.js';
import { syncRouter } from './sync.js';
import { digestRouter } from './digest.js';
import { demoRouter } from './demo.js';
import { aiRouter } from './ai.js';
import { notesRouter } from './notes.js';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { actionLimiter } from '../middleware/rate_limit.js';
import { z } from 'zod';

export const apiRouter = express.Router();

// Mount Auth, Integrations, Settings, Webhooks, Events, Actions, Sync, Digest, Demo, AI, and Notes sub-routers
apiRouter.use('/auth', authRouter);
apiRouter.use('/integrations', integrationsRouter);
apiRouter.use('/settings', settingsRouter);
apiRouter.use('/webhooks', inboundWebhooksRouter);
apiRouter.use('/events', eventsRouter);
apiRouter.use('/contributions', actionsRouter);
apiRouter.use('/sync', syncRouter);
apiRouter.use('/digest', digestRouter);
apiRouter.use('/demo', demoRouter);
apiRouter.use('/ai', aiRouter);
apiRouter.use('/notes', notesRouter);

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
    const lastSync = getLastSyncTime(userId);

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
    const timeframe = typeof req.query.timeframe === 'string' ? req.query.timeframe : (Array.isArray(req.query.timeframe) ? String(req.query.timeframe[0]) : undefined);

    let query = 'SELECT * FROM contributions WHERE user_id = ?';
    const params: any[] = [userId];

    if (timeframe && timeframe !== 'all') {
      if (timeframe === 'yesterday') {
        query += " AND (date(last_activity_at) = date('now', '-1 day') OR (julianday('now') - julianday(COALESCE(last_activity_at, created_at, 'now'))) BETWEEN 0.8 AND 2.0)";
      } else if (timeframe === 'today') {
        query += " AND date(last_activity_at) = date('now')";
      } else if (timeframe === 'week') {
        query += " AND (julianday('now') - julianday(COALESCE(last_activity_at, created_at, 'now'))) <= 7.0";
      }
    }

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
      if (status === 'active' || status === 'in_review' || status === 'in-review') {
        query += " AND status IN ('open', 'opened', 'submitted', 'in_review', 'awaiting-reply')";
      } else if (status === 'action-needed' || status === 'action_needed') {
        query += " AND action_needed != 'none'";
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

// POST /api/sync: Manual trigger for current user
apiRouter.post('/sync', actionLimiter, async (req: AuthenticatedRequest, res) => {
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

// POST /api/ingest: Endpoint for /plan and triage pipeline to push newly found items
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

apiRouter.post('/ingest', actionLimiter, (req: AuthenticatedRequest, res) => {
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

// POST /api/track-url: Ingest any GitHub/GitLab URL directly from UI
apiRouter.post('/track-url', actionLimiter, async (req: AuthenticatedRequest, res) => {
  const userId = getEffectiveUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'A valid URL is required' });
  }

  const trimmed = url.trim();

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmed);
  } catch {
    return res.status(400).json({ error: 'A valid URL is required' });
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const ghMatch =
    (parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:') && hostname === 'github.com'
      ? parsedUrl.pathname.match(/^\/([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)\/(pull|issues)\/(\d+)(?:\/.*)?$/i)
      : null;

  const glMatch =
    parsedUrl.protocol === 'https:' && hostname !== 'github.com'
      ? parsedUrl.pathname.match(/^\/(.+?)\/-\/(merge_requests|issues)\/(\d+)(?:\/.*)?$/i)
      : null;

  if (!ghMatch && !glMatch) {
    return res.status(400).json({
      error: 'Unsupported link. Please paste a GitHub Pull Request/Issue or GitLab Merge Request/Issue URL.'
    });
  }

  try {
    if (ghMatch) {
      const [, owner, repoName, rawType, rawNumber] = ghMatch;
      if (owner === '.' || owner === '..' || repoName === '.' || repoName === '..') {
        return res.status(400).json({ error: 'Invalid GitHub repository path in URL.' });
      }
      const repo = `${owner}/${repoName}`;
      const number = parseInt(rawNumber, 10);
      const type: 'pr' | 'issue' = rawType.toLowerCase() === 'pull' ? 'pr' : 'issue';

      const creds = getDecryptedUserIntegration(userId, 'github');
      if (!creds) {
        return res.status(400).json({
          error: 'Connect your GitHub account with a Personal Access Token in Linked Accounts first before tracking URLs.'
        });
      }

      const item = await fetchAndHydrateGitHubUrl(userId, repo, number, type, creds.token);
      return res.status(201).json({ success: true, item });
    }

    if (glMatch) {
      const [, projectPath, rawType, rawNumber] = glMatch;
      const safeHost = validateExternalHost(parsedUrl.origin, 'gitlab');
      const number = parseInt(rawNumber, 10);
      const glType: 'merge_requests' | 'issues' =
        rawType.toLowerCase() === 'merge_requests' ? 'merge_requests' : 'issues';

      const creds = getDecryptedUserIntegration(userId, 'gitlab', safeHost);
      if (!creds) {
        return res.status(400).json({
          error: `Connect a GitLab account for ${safeHost} with a Personal Access Token first before tracking URLs from that host.`
        });
      }

      const item = await fetchAndHydrateGitLabUrl(userId, safeHost, projectPath, glType, number, creds.token);
      return res.status(201).json({ success: true, item });
    }
  } catch (err: any) {
    if (err instanceof HostValidationError) {
      return res.status(400).json({ error: err.message });
    }
    if (err instanceof UpstreamFetchError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error('[Track URL error]:', err);
    return res.status(500).json({ error: err.message || 'Failed to track upstream contribution URL.' });
  }
});
