import express, { Response } from 'express';
import axios from 'axios';
import { db, ContributionRecord } from '../db.js';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.js';
import { actionLimiter } from '../middleware/rate_limit.js';
import { sseManager } from '../sse.js';
import { getDecryptedUserIntegration, validateExternalHost } from '../sync/credentials.js';
import { fetchAndHydrateGitHubUrl, UpstreamFetchError } from '../sync/github.js';
import { fetchAndHydrateGitLabUrl } from '../sync/gitlab.js';

export const actionsRouter = express.Router();

// Apply Tier 2 Action Mutation rate limiter to all upstream PR actions
actionsRouter.use(actionLimiter);

/**
 * Helper to fetch a contribution owned by the authenticated user.
 */
function getUserContribution(userId: string, id: string): ContributionRecord | null {
  const item = db.prepare(`
    SELECT * FROM contributions 
    WHERE user_id = ? AND id = ?
  `).get(userId, id) as ContributionRecord | undefined;
  return item || null;
}

function getIntegrationForContribution(userId: string, contrib: ContributionRecord) {
  if (contrib.platform === 'gitlab' && contrib.url) {
    try {
      const safeHost = validateExternalHost(new URL(contrib.url).origin, 'gitlab');
      return getDecryptedUserIntegration(userId, 'gitlab', safeHost);
    } catch {
      return null;
    }
  }
  return getDecryptedUserIntegration(userId, contrib.platform);
}

/**
 * POST /api/contributions/:id/actions/comment
 * Posts a comment or reply directly to the upstream PR on GitHub or GitLab.
 */
actionsRouter.post('/:id/actions/comment', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const contribId = req.params.id as string;
  const { comment } = req.body;

  if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
    return res.status(400).json({ error: 'Comment body cannot be empty' });
  }

  const contrib = getUserContribution(userId, contribId);
  if (!contrib) {
    return res.status(404).json({ error: 'Contribution not found' });
  }

  const creds = getIntegrationForContribution(userId, contrib);
  if (!creds) {
    return res.status(400).json({ 
      error: `Missing connected ${contrib.platform} token matching this host. Please connect your account in Linked Accounts.` 
    });
  }

  const now = new Date().toISOString();

  try {
    if (contrib.platform === 'github') {
      // GitHub Issues/PR comment endpoint
      const apiUrl = `https://api.github.com/repos/${contrib.repo}/issues/${contrib.number}/comments`;
      await axios.post(
        apiUrl,
        { body: comment },
        {
          headers: {
            Authorization: `Bearer ${creds.token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'OSS-Command-Center',
          },
        }
      );
    } else if (contrib.platform === 'gitlab') {
      // GitLab Merge Request notes endpoint
      const apiUrl = `${creds.host}/api/v4/projects/${encodeURIComponent(contrib.repo)}/merge_requests/${contrib.number}/notes`;
      await axios.post(
        apiUrl,
        { body: comment },
        {
          headers: {
            'PRIVATE-TOKEN': creds.token,
          },
        }
      );
    }

    // Since the author just commented/replied, reset action_needed to 'none'
    db.prepare(`
      UPDATE contributions 
      SET action_needed = 'none', last_activity_at = ?, unread = 0
      WHERE user_id = ? AND id = ?
    `).run(now, userId, contribId);

    // Record activity event in local ledger
    const eventId = 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    db.prepare(`
      INSERT INTO activity_events (id, user_id, contribution_id, actor, actor_avatar, type, body_excerpt, created_at)
      VALUES (?, ?, ?, ?, NULL, 'comment', ?, ?)
    `).run(eventId, userId, contribId, creds.username, comment.slice(0, 300), now);

    // Broadcast SSE update to connected client
    sseManager.sendToUser(userId, 'contribution_updated', {
      id: contribId,
      action_needed: 'none',
      status: contrib.status,
    });

    return res.status(200).json({
      success: true,
      message: `Comment successfully posted to upstream ${contrib.platform} PR #${contrib.number}`,
      item: {
        ...contrib,
        action_needed: 'none',
        last_activity_at: now,
      },
    });
  } catch (err: any) {
    console.error(`[Actions /comment error]:`, err.response?.data || err.message);
    const details = err.response?.data?.message || err.message;
    return res.status(err.response?.status || 500).json({ 
      error: 'Failed to post comment to upstream repository',
      details,
    });
  }
});

/**
 * POST /api/contributions/:id/actions/request-review
 * Requests re-review from maintainers on GitHub.
 */
actionsRouter.post('/:id/actions/request-review', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const contribId = req.params.id as string;
  const { reviewers } = req.body;

  const contrib = getUserContribution(userId, contribId);
  if (!contrib) {
    return res.status(404).json({ error: 'Contribution not found' });
  }

  if (contrib.platform !== 'github') {
    return res.status(400).json({ error: 'Re-requesting review is currently supported on GitHub pull requests' });
  }

  const creds = getIntegrationForContribution(userId, contrib);
  if (!creds) {
    return res.status(400).json({ error: 'Missing connected GitHub integration token' });
  }

  const now = new Date().toISOString();

  try {
    const apiUrl = `https://api.github.com/repos/${contrib.repo}/pulls/${contrib.number}/requested_reviewers`;
    await axios.post(
      apiUrl,
      { reviewers: Array.isArray(reviewers) && reviewers.length > 0 ? reviewers : [] },
      {
        headers: {
          Authorization: `Bearer ${creds.token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'OSS-Command-Center',
        },
      }
    );

    // Reset action_needed to 'none' and status to 'awaiting-reply'
    db.prepare(`
      UPDATE contributions 
      SET action_needed = 'none', status = 'awaiting-reply', last_activity_at = ?, unread = 0
      WHERE user_id = ? AND id = ?
    `).run(now, userId, contribId);

    const eventId = 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    db.prepare(`
      INSERT INTO activity_events (id, user_id, contribution_id, actor, actor_avatar, type, body_excerpt, created_at)
      VALUES (?, ?, ?, ?, NULL, 'review_requested', 'Re-requested maintainer review', ?)
    `).run(eventId, userId, contribId, creds.username, now);

    sseManager.sendToUser(userId, 'contribution_updated', {
      id: contribId,
      action_needed: 'none',
      status: 'awaiting-reply',
    });

    return res.status(200).json({
      success: true,
      message: 'Review successfully re-requested from maintainers',
      action_needed: 'none',
      status: 'awaiting-reply',
    });
  } catch (err: any) {
    console.error(`[Actions /request-review error]:`, err.response?.data || err.message);
    const details = err.response?.data?.message || err.message;
    return res.status(err.response?.status || 500).json({
      error: 'Failed to request review from GitHub',
      details,
    });
  }
});

/**
 * POST /api/contributions/:id/actions/sync
 * Performs an immediate targeted sync for a single contribution.
 */
actionsRouter.post('/:id/actions/sync', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const contribId = req.params.id as string;

  const contrib = getUserContribution(userId, contribId);
  if (!contrib) {
    return res.status(404).json({ error: 'Contribution not found' });
  }

  const creds = getIntegrationForContribution(userId, contrib);
  if (!creds) {
    return res.status(400).json({ error: `Missing connected ${contrib.platform} token matching this host` });
  }

  const now = new Date().toISOString();

  try {
    let updated: any;
    if (contrib.platform === 'github') {
      const itemType: 'pr' | 'issue' = contrib.type === 'issue' ? 'issue' : 'pr';
      updated = await fetchAndHydrateGitHubUrl(userId, contrib.repo, contrib.number, itemType, creds.token);
    } else if (contrib.platform === 'gitlab') {
      const glType: 'merge_requests' | 'issues' = contrib.type === 'issue' ? 'issues' : 'merge_requests';
      updated = await fetchAndHydrateGitLabUrl(userId, creds.host, contrib.repo, glType, contrib.number, creds.token);
    } else {
      updated = db.prepare('SELECT * FROM contributions WHERE user_id = ? AND id = ?').get(userId, contribId);
    }

    const events = db.prepare('SELECT * FROM activity_events WHERE user_id = ? AND contribution_id = ? ORDER BY created_at ASC').all(userId, contribId);

    return res.status(200).json({
      success: true,
      message: 'Contribution re-synced successfully',
      item: updated,
      events,
    });
  } catch (err: any) {
    console.error(`[Actions /sync error]:`, err.response?.data || err.message);
    if (err instanceof UpstreamFetchError) {
      return res.status(err.statusCode).json({
        error: 'Failed to sync contribution from upstream',
        details: err.message,
      });
    }
    return res.status(err.response?.status || 500).json({
      error: 'Failed to sync contribution from upstream',
      details: err.response?.data?.message || err.message,
    });
  }
});
