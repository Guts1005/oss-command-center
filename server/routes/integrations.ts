import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { db } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { encryptSecret } from '../security/crypto.js';
import { syncUser } from '../sync/multi_engine.js';

export const integrationsRouter = Router();

// Guard all integration routes with requireAuth
integrationsRouter.use(requireAuth);

const IntegrationInputSchema = z.object({
  platform: z.enum(['github', 'gitlab']),
  username: z.string().min(1, 'Username is required').trim(),
  token: z.string().trim().optional(),
  host: z.string().url('Invalid host URL').trim().optional()
});

// GET /api/integrations - List connected integrations
integrationsRouter.get('/', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const rows = db.prepare(`
    SELECT id, platform, username, host, last_synced_at, sync_status, sync_error, created_at,
           (encrypted_token IS NOT NULL) as has_token
    FROM user_integrations
    WHERE user_id = ?
    ORDER BY created_at ASC
  `).all(userId) as any[];

  return res.json({
    integrations: rows.map(r => ({
      ...r,
      has_token: Boolean(r.has_token)
    }))
  });
});

// POST /api/integrations - Connect or update a platform account
integrationsRouter.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const parseResult = IntegrationInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors.map(e => e.message)
      });
    }

    const userId = req.user!.id;
    const { platform, username, token, host = (platform === 'gitlab' ? 'https://gitlab.com' : 'https://github.com') } = parseResult.data;

    let ciphertext: string | null = null;
    let iv: string | null = null;
    let authTag: string | null = null;

    if (token) {
      const enc = encryptSecret(token);
      ciphertext = enc.ciphertext;
      iv = enc.iv;
      authTag = enc.authTag;
    }

    const now = new Date().toISOString();
    const integrationId = crypto.randomUUID();

    db.prepare(`
      INSERT INTO user_integrations (
        id, user_id, platform, username, host, encrypted_token, token_iv, token_auth_tag, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, platform, host) DO UPDATE SET
        username = excluded.username,
        encrypted_token = excluded.encrypted_token,
        token_iv = excluded.token_iv,
        token_auth_tag = excluded.token_auth_tag,
        sync_error = NULL
    `).run(integrationId, userId, platform, username, host, ciphertext, iv, authTag, now);

    // Trigger initial background sync for this user
    syncUser(userId).catch(err => console.error('[Initial Integration Sync Error]:', err));

    return res.status(201).json({
      success: true,
      message: `${platform.toUpperCase()} integration connected securely. Background sync initiated.`,
      integration: {
        platform,
        username,
        host,
        has_token: true
      }
    });
  } catch (err: any) {
    console.error('[Integration Connect Error]:', err);
    return res.status(500).json({ error: 'Failed to save integration. Please try again.' });
  }
});

// DELETE /api/integrations/:id - Remove integration and cascade clean up harvested contributions
integrationsRouter.delete('/:id', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const keepContributions = req.query.keep_contributions === 'true';

  try {
    // 1. Fetch integration details to identify platform
    const integration = db.prepare(`
      SELECT id, platform, username, host
      FROM user_integrations
      WHERE id = ? AND user_id = ?
    `).get(id, userId) as any;

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found or not owned by user' });
    }

    // 2. Perform deletion inside an atomic SQLite transaction
    const purgeTransaction = db.transaction(() => {
      // Delete integration record
      db.prepare(`
        DELETE FROM user_integrations
        WHERE id = ? AND user_id = ?
      `).run(id, userId);

      let purgedCount = 0;
      if (!keepContributions) {
        // Find contribution IDs to remove related activity_events
        const contribs = db.prepare(`
          SELECT id FROM contributions
          WHERE user_id = ? AND platform = ?
        `).all(userId, integration.platform) as any[];

        if (contribs.length > 0) {
          const contribIds = contribs.map((c: any) => c.id);
          const placeholders = contribIds.map(() => '?').join(',');
          
          db.prepare(`
            DELETE FROM activity_events
            WHERE user_id = ? AND contribution_id IN (${placeholders})
          `).run(userId, ...contribIds);

          const result = db.prepare(`
            DELETE FROM contributions
            WHERE user_id = ? AND platform = ?
          `).run(userId, integration.platform);
          purgedCount = result.changes;
        }
      }

      return purgedCount;
    });

    const purgedCount = purgeTransaction();

    return res.json({
      success: true,
      message: `Disconnected ${integration.platform.toUpperCase()} (${integration.username}). ${purgedCount > 0 ? `${purgedCount} associated contributions purged.` : ''}`.trim(),
      platform: integration.platform,
      purgedCount
    });
  } catch (err: any) {
    console.error('[Integration Delete Error]:', err);
    return res.status(500).json({ error: 'Failed to delete integration', details: err.message });
  }
});

// POST /api/integrations/sync - Manually trigger sync for all user integrations
integrationsRouter.post('/sync', async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  try {
    const result = await syncUser(userId);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: 'Sync failed', message: err.message });
  }
});
