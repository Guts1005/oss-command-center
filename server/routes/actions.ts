import express, { Response } from 'express';
import axios from 'axios';
import { db, ContributionRecord, UserIntegrationRecord } from '../db.js';
import { decryptSecret } from '../security/crypto.js';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.js';
import { actionLimiter } from '../middleware/rate_limit.js';
import { sseManager } from '../sse.js';

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

/**
 * Helper to fetch and decrypt a user integration token.
 */
function getDecryptedToken(userId: string, platform: 'github' | 'gitlab'): { token: string; username: string; host: string } | null {
  const integration = db.prepare(`
    SELECT * FROM user_integrations 
    WHERE user_id = ? AND platform = ?
  `).get(userId, platform) as UserIntegrationRecord | undefined;

  if (!integration || !integration.encrypted_token || !integration.token_iv || !integration.token_auth_tag) {
    return null;
  }

  try {
    const token = decryptSecret(integration.encrypted_token, integration.token_iv, integration.token_auth_tag);
    return { token, username: integration.username, host: integration.host || 'https://gitlab.com' };
  } catch (err) {
    console.error(`[Actions] Failed to decrypt ${platform} token for user ${userId}:`, err);
    return null;
  }
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

  const creds = getDecryptedToken(userId, contrib.platform);
  if (!creds) {
    return res.status(400).json({ 
      error: `Missing connected ${contrib.platform} token. Please connect your account in Settings or Integrations.` 
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

  const creds = getDecryptedToken(userId, 'github');
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

  const creds = getDecryptedToken(userId, contrib.platform);
  if (!creds) {
    return res.status(400).json({ error: `Missing connected ${contrib.platform} token` });
  }

  const now = new Date().toISOString();

  try {
    if (contrib.platform === 'github') {
      const prUrl = `https://api.github.com/repos/${contrib.repo}/pulls/${contrib.number}`;
      const prRes = await axios.get(prUrl, {
        headers: {
          Authorization: `Bearer ${creds.token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'OSS-Command-Center',
        },
      });

      const pr = prRes.data;
      let status = pr.state;
      if (pr.merged) status = 'merged';

      db.prepare(`
        UPDATE contributions 
        SET title = ?, status = ?, last_activity_at = ?, last_synced_at = ?
        WHERE user_id = ? AND id = ?
      `).run(pr.title, status, pr.updated_at || now, now, userId, contribId);
    }

    const updated = db.prepare('SELECT * FROM contributions WHERE user_id = ? AND id = ?').get(userId, contribId);
    const events = db.prepare('SELECT * FROM activity_events WHERE user_id = ? AND contribution_id = ? ORDER BY created_at DESC').all(userId, contribId);

    return res.status(200).json({
      success: true,
      message: 'Contribution re-synced successfully',
      item: updated,
      events,
    });
  } catch (err: any) {
    console.error(`[Actions /sync error]:`, err.response?.data || err.message);
    return res.status(err.response?.status || 500).json({
      error: 'Failed to sync contribution from upstream',
      details: err.response?.data?.message || err.message,
    });
  }
});
