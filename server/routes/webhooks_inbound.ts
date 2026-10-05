import express, { Request, Response } from 'express';
import { db, ContributionRecord } from '../db.js';
import { verifyWebhookSignature } from '../security/crypto.js';
import { sseManager } from '../sse.js';

export const inboundWebhooksRouter = express.Router();

/**
 * Helper to resolve raw body buffer for signature validation.
 */
function getRawBody(req: Request): Buffer {
  if ((req as any).rawBody && Buffer.isBuffer((req as any).rawBody)) {
    return (req as any).rawBody;
  }
  return Buffer.from(JSON.stringify(req.body || {}));
}

/**
 * Resolves the webhook secret for a user or system fallback.
 */
function resolveWebhookSecret(userId?: string): string | null {
  if (userId) {
    const settings = db.prepare('SELECT webhook_secret FROM user_settings WHERE user_id = ?').get(userId) as any;
    if (settings?.webhook_secret) return settings.webhook_secret;
  }
  return process.env.GITHUB_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET || null;
}

/**
 * Resolves the GitLab secret token for a user or system fallback.
 */
function resolveGitLabToken(userId?: string): string | null {
  if (userId) {
    const settings = db.prepare('SELECT webhook_secret FROM user_settings WHERE user_id = ?').get(userId) as any;
    if (settings?.webhook_secret) return settings.webhook_secret;
  }
  return process.env.GITLAB_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET || null;
}

// ==========================================
// 1. GitHub Inbound Webhook Endpoints
// ==========================================

async function handleGitHubWebhook(req: Request, res: Response, targetUserId?: string) {
  const event = req.header('x-github-event') || req.header('X-GitHub-Event');
  const signature = req.header('x-hub-signature-256') || req.header('X-Hub-Signature-256');

  if (!event) {
    return res.status(400).json({ error: 'Missing X-GitHub-Event header' });
  }

  // 1. Signature Verification
  const secret = resolveWebhookSecret(targetUserId);
  if (secret) {
    if (!signature) {
      return res.status(401).json({ error: 'Missing X-Hub-Signature-256 header' });
    }
    const rawBody = getRawBody(req);
    const isValid = verifyWebhookSignature(rawBody, signature, secret);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid HMAC-SHA256 webhook signature' });
    }
  }

  // 2. Event Handling
  const payload = req.body;
  if (!payload) {
    return res.status(400).json({ error: 'Missing JSON payload' });
  }

  // Ping event
  if (event === 'ping') {
    return res.status(200).json({ status: 'ok', message: 'pong', hook_id: payload.hook_id });
  }

  const now = new Date().toISOString();

  // Pull Request Lifecycle Events
  if (event === 'pull_request') {
    const action = payload.action;
    const pr = payload.pull_request;
    const repo = payload.repository?.full_name;

    if (!pr || !repo) {
      return res.status(400).json({ error: 'Invalid pull_request payload' });
    }

    const prNumber = pr.number;
    const title = pr.title;
    const isMerged = Boolean(pr.merged);
    const prState = pr.state; // 'open' or 'closed'
    const author = pr.user?.login;

    // Locate existing contributions in the database
    let query = "SELECT * FROM contributions WHERE platform = 'github' AND repo = ? AND number = ?";
    const params: any[] = [repo, prNumber];

    if (targetUserId) {
      query += ' AND user_id = ?';
      params.push(targetUserId);
    }

    const existingItems = db.prepare(query).all(...params) as ContributionRecord[];

    let status = 'open';
    let actionNeeded: 'none' | 'reply' | 'push-changes' = 'none';

    if (isMerged) {
      status = 'merged';
      actionNeeded = 'none';
    } else if (prState === 'closed') {
      status = 'closed';
      actionNeeded = 'none';
    } else if (action === 'synchronize') {
      status = 'open';
      actionNeeded = 'none'; // Author just pushed commits, waiting for review
    } else if (action === 'review_requested') {
      status = 'open';
      actionNeeded = 'none';
    }

    if (existingItems.length > 0) {
      for (const item of existingItems) {
        db.prepare(`
          UPDATE contributions
          SET title = ?, status = ?, action_needed = ?, last_activity_at = ?, unread = 1
          WHERE user_id = ? AND id = ?
        `).run(title, status, actionNeeded, now, item.user_id, item.id);

        // Record activity event
        db.prepare(`
          INSERT INTO activity_events (id, user_id, contribution_id, actor, actor_avatar, type, body_excerpt, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          item.user_id,
          item.id,
          payload.sender?.login || author || 'github',
          payload.sender?.avatar_url || null,
          'pull_request',
          `Pull request #${prNumber} ${action}`,
          now
        );

        // Instant SSE broadcast to tenant
        sseManager.sendToUser(item.user_id, 'contribution_updated', {
          id: item.id,
          repo,
          number: prNumber,
          status,
          action_needed: actionNeeded,
          action,
        });
      }
    } else if (targetUserId) {
      // Auto-ingest new PR if directed to a specific tenant
      const contribId = `gh:${repo}#${prNumber}`;
      db.prepare(`
        INSERT INTO contributions (
          user_id, id, platform, repo, number, title, type, url, author, status,
          action_needed, created_at, last_activity_at, last_synced_at, unread
        ) VALUES (?, ?, 'github', ?, ?, ?, 'pull', ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        targetUserId,
        contribId,
        repo,
        prNumber,
        title,
        pr.html_url,
        author || 'unknown',
        status,
        actionNeeded,
        pr.created_at || now,
        now,
        now
      );

      sseManager.sendToUser(targetUserId, 'contribution_created', {
        id: contribId,
        repo,
        number: prNumber,
        status,
      });
    }

    return res.status(200).json({ status: 'ok', event, action, repo, prNumber });
  }

  // Pull Request Review Events
  if (event === 'pull_request_review') {
    const action = payload.action;
    const review = payload.review;
    const pr = payload.pull_request;
    const repo = payload.repository?.full_name;

    if (!review || !pr || !repo) {
      return res.status(400).json({ error: 'Invalid pull_request_review payload' });
    }

    const prNumber = pr.number;
    const reviewState = (review.state || '').toUpperCase();
    const reviewer = review.user?.login || 'reviewer';

    let actionNeeded: 'none' | 'reply' | 'push-changes' = 'none';
    if (reviewState === 'CHANGES_REQUESTED') {
      actionNeeded = 'push-changes';
    } else if (reviewState === 'COMMENTED') {
      actionNeeded = 'reply';
    } else if (reviewState === 'APPROVED') {
      actionNeeded = 'none';
    }

    let query = "SELECT * FROM contributions WHERE platform = 'github' AND repo = ? AND number = ?";
    const params: any[] = [repo, prNumber];
    if (targetUserId) {
      query += ' AND user_id = ?';
      params.push(targetUserId);
    }

    const items = db.prepare(query).all(...params) as ContributionRecord[];
    for (const item of items) {
      db.prepare(`
        UPDATE contributions
        SET action_needed = ?, last_activity_at = ?, unread = 1
        WHERE user_id = ? AND id = ?
      `).run(actionNeeded, now, item.user_id, item.id);

      db.prepare(`
        INSERT INTO activity_events (id, user_id, contribution_id, actor, actor_avatar, type, review_state, body_excerpt, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        item.user_id,
        item.id,
        reviewer,
        review.user?.avatar_url || null,
        'review',
        reviewState,
        (review.body || `${reviewState} on PR #${prNumber}`).slice(0, 300),
        now
      );

      sseManager.sendToUser(item.user_id, 'contribution_updated', {
        id: item.id,
        repo,
        number: prNumber,
        action_needed: actionNeeded,
        review_state: reviewState,
      });
    }

    return res.status(200).json({ status: 'ok', event, action, reviewState, prNumber });
  }

  // Issue Comment on Pull Request
  if (event === 'issue_comment') {
    const action = payload.action;
    const comment = payload.comment;
    const issue = payload.issue;
    const repo = payload.repository?.full_name;

    // Only process comments on Pull Requests
    if (!issue?.pull_request || !comment || !repo) {
      return res.status(200).json({ status: 'ignored', reason: 'Not a pull request comment' });
    }

    const prNumber = issue.number;
    const commenter = comment.user?.login;

    let query = "SELECT * FROM contributions WHERE platform = 'github' AND repo = ? AND number = ?";
    const params: any[] = [repo, prNumber];
    if (targetUserId) {
      query += ' AND user_id = ?';
      params.push(targetUserId);
    }

    const items = db.prepare(query).all(...params) as ContributionRecord[];
    for (const item of items) {
      // If someone else commented on the user's PR, mark as reply needed
      const isAuthorComment = commenter && commenter.toLowerCase() === item.author.toLowerCase();
      const nextAction = isAuthorComment ? item.action_needed : 'reply';

      db.prepare(`
        UPDATE contributions
        SET action_needed = ?, last_activity_at = ?, unread = 1
        WHERE user_id = ? AND id = ?
      `).run(nextAction, now, item.user_id, item.id);

      db.prepare(`
        INSERT INTO activity_events (id, user_id, contribution_id, actor, actor_avatar, type, body_excerpt, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        item.user_id,
        item.id,
        commenter || 'maintainer',
        comment.user?.avatar_url || null,
        'comment',
        (comment.body || '').slice(0, 300),
        now
      );

      sseManager.sendToUser(item.user_id, 'contribution_updated', {
        id: item.id,
        repo,
        number: prNumber,
        action_needed: nextAction,
        commenter,
      });
    }

    return res.status(200).json({ status: 'ok', event, action, prNumber, commenter });
  }

  return res.status(200).json({ status: 'ignored', event });
}

inboundWebhooksRouter.post('/github', (req: Request, res: Response) => handleGitHubWebhook(req, res));
inboundWebhooksRouter.post('/github/:userId', (req: Request, res: Response) => {
  const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  return handleGitHubWebhook(req, res, userId);
});

// ==========================================
// 2. GitLab Inbound Webhook Endpoints
// ==========================================

async function handleGitLabWebhook(req: Request, res: Response, targetUserId?: string) {
  const event = req.header('x-gitlab-event') || req.header('X-Gitlab-Event');
  const token = req.header('x-gitlab-token') || req.header('X-Gitlab-Token');

  if (!event) {
    return res.status(400).json({ error: 'Missing X-Gitlab-Event header' });
  }

  // Token Verification
  const expectedToken = resolveGitLabToken(targetUserId);
  if (expectedToken) {
    if (!token || token !== expectedToken) {
      return res.status(401).json({ error: 'Invalid X-Gitlab-Token' });
    }
  }

  const payload = req.body;
  if (!payload) {
    return res.status(400).json({ error: 'Missing JSON payload' });
  }

  const now = new Date().toISOString();

  // Merge Request Hook
  if (event === 'Merge Request Hook') {
    const attrs = payload.object_attributes;
    const project = payload.project;
    if (!attrs || !project) {
      return res.status(400).json({ error: 'Invalid Merge Request payload' });
    }

    const repo = project.path_with_namespace;
    const mrNumber = attrs.iid;
    const mrState = attrs.state; // 'opened', 'closed', 'merged'
    const action = attrs.action;

    let status = 'open';
    if (mrState === 'merged') status = 'merged';
    else if (mrState === 'closed') status = 'closed';

    let query = "SELECT * FROM contributions WHERE platform = 'gitlab' AND repo = ? AND number = ?";
    const params: any[] = [repo, mrNumber];
    if (targetUserId) {
      query += ' AND user_id = ?';
      params.push(targetUserId);
    }

    const items = db.prepare(query).all(...params) as ContributionRecord[];
    for (const item of items) {
      db.prepare(`
        UPDATE contributions
        SET status = ?, last_activity_at = ?, unread = 1
        WHERE user_id = ? AND id = ?
      `).run(status, now, item.user_id, item.id);

      db.prepare(`
        INSERT INTO activity_events (id, user_id, contribution_id, actor, actor_avatar, type, body_excerpt, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        item.user_id,
        item.id,
        payload.user?.username || 'gitlab',
        payload.user?.avatar_url || null,
        'merge_request',
        `MR !${mrNumber} ${action || mrState}`,
        now
      );

      sseManager.sendToUser(item.user_id, 'contribution_updated', {
        id: item.id,
        repo,
        number: mrNumber,
        status,
      });
    }

    return res.status(200).json({ status: 'ok', event, mrNumber, itemStatus: status });
  }

  return res.status(200).json({ status: 'ignored', event });
}

inboundWebhooksRouter.post('/gitlab', (req: Request, res: Response) => handleGitLabWebhook(req, res));
inboundWebhooksRouter.post('/gitlab/:userId', (req: Request, res: Response) => {
  const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  return handleGitLabWebhook(req, res, userId);
});
