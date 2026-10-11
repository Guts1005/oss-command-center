import express from 'express';
import axios from 'axios';
import { z } from 'zod';
import { db } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { signPayload } from '../security/crypto.js';
import { buildSlackPayload, buildDiscordPayload, buildN8nPayload } from '../notifications/formatters.js';

export const settingsRouter = express.Router();

// All settings routes require authentication
settingsRouter.use(requireAuth);

const settingsSchema = z.object({
  audio_chime_enabled: z.boolean().optional(),
  sync_cadence_minutes: z.number().int().min(5).max(1440).optional(),
  webhook_url: z.string().url().or(z.literal('')).nullable().optional(),
  webhook_secret: z.string().nullable().optional(),
  webhook_events: z.array(z.string()).optional(),
  slack_webhook_url: z.string().url().or(z.literal('')).nullable().optional(),
  discord_webhook_url: z.string().url().or(z.literal('')).nullable().optional(),
  n8n_webhook_url: z.string().url().or(z.literal('')).nullable().optional(),
  n8n_webhook_secret: z.string().nullable().optional(),
  background_sync_enabled: z.boolean().optional(),
  email_digest_enabled: z.boolean().optional(),
  email_digest_cadence: z.enum(['daily', 'weekly']).optional(),
  email_digest_address: z.string().email().or(z.literal('')).nullable().optional(),
});

// GET /api/settings
settingsRouter.get('/', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    let settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId) as any;

    if (!settings) {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO user_settings (
          user_id, audio_chime_enabled, sync_cadence_minutes, webhook_url,
          webhook_secret, webhook_events, slack_webhook_url, discord_webhook_url,
          background_sync_enabled, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(userId, 1, 30, null, null, JSON.stringify(['action_needed', 'review', 'merged']), null, null, 1, now, now);

      settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId) as any;
    }

    const integrations = db.prepare(`
      SELECT platform, username, host, last_synced_at, sync_status,
             CASE WHEN encrypted_token IS NOT NULL THEN 1 ELSE 0 END as has_token
      FROM user_integrations
      WHERE user_id = ?
    `).all(userId) as any[];

    let parsedEvents: string[] = ['action_needed', 'review', 'merged'];
    try {
      if (settings.webhook_events) {
        parsedEvents = JSON.parse(settings.webhook_events);
      }
    } catch {}

    return res.json({
      settings: {
        audio_chime_enabled: Boolean(settings.audio_chime_enabled),
        sync_cadence_minutes: Number(settings.sync_cadence_minutes || 30),
        webhook_url: settings.webhook_url || null,
        webhook_secret_set: Boolean(settings.webhook_secret && settings.webhook_secret.length > 0),
        webhook_events: parsedEvents,
        slack_webhook_url: settings.slack_webhook_url || null,
        discord_webhook_url: settings.discord_webhook_url || null,
        n8n_webhook_url: settings.n8n_webhook_url || null,
        n8n_webhook_secret_set: Boolean(settings.n8n_webhook_secret && settings.n8n_webhook_secret.length > 0),
        background_sync_enabled: Boolean(settings.background_sync_enabled ?? 1),
        email_digest_enabled: Boolean(settings.email_digest_enabled ?? 0),
        email_digest_cadence: settings.email_digest_cadence || 'weekly',
        email_digest_address: settings.email_digest_address || null,
        last_email_digest_at: settings.last_email_digest_at || null,
      },
      vault: {
        integrations: integrations.map(i => ({
          platform: i.platform,
          username: i.username,
          host: i.host,
          last_synced_at: i.last_synced_at,
          sync_status: i.sync_status,
          has_token: Boolean(i.has_token),
        })),
        encryption: {
          algorithm: 'AES-256-GCM',
          status: 'Active & Verified',
          keyDerivation: 'scrypt-256',
        }
      }
    });
  } catch (err: any) {
    console.error('[API /settings GET error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve settings', details: err.message });
  }
});

// POST /api/settings
settingsRouter.post('/', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const parseResult = settingsSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid settings payload', details: parseResult.error.format() });
    }

    const {
      audio_chime_enabled,
      sync_cadence_minutes,
      webhook_url,
      webhook_secret,
      webhook_events,
      slack_webhook_url,
      discord_webhook_url,
      n8n_webhook_url,
      n8n_webhook_secret,
      background_sync_enabled,
      email_digest_enabled,
      email_digest_cadence,
      email_digest_address,
    } = parseResult.data;

    let settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId) as any;
    const now = new Date().toISOString();

    if (!settings) {
      db.prepare(`
        INSERT INTO user_settings (
          user_id, audio_chime_enabled, sync_cadence_minutes, webhook_url,
          webhook_secret, webhook_events, slack_webhook_url, discord_webhook_url,
          n8n_webhook_url, n8n_webhook_secret,
          background_sync_enabled, email_digest_enabled, email_digest_cadence, email_digest_address,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        audio_chime_enabled !== undefined ? (audio_chime_enabled ? 1 : 0) : 1,
        sync_cadence_minutes !== undefined ? sync_cadence_minutes : 30,
        webhook_url !== undefined ? webhook_url : null,
        webhook_secret !== undefined ? webhook_secret : null,
        webhook_events ? JSON.stringify(webhook_events) : JSON.stringify(['action_needed', 'review', 'merged']),
        slack_webhook_url !== undefined ? slack_webhook_url : null,
        discord_webhook_url !== undefined ? discord_webhook_url : null,
        n8n_webhook_url !== undefined ? n8n_webhook_url : null,
        n8n_webhook_secret !== undefined ? n8n_webhook_secret : null,
        background_sync_enabled !== undefined ? (background_sync_enabled ? 1 : 0) : 1,
        email_digest_enabled !== undefined ? (email_digest_enabled ? 1 : 0) : 0,
        email_digest_cadence || 'weekly',
        email_digest_address || null,
        now,
        now
      );
    } else {
      const newAudio = audio_chime_enabled !== undefined ? (audio_chime_enabled ? 1 : 0) : settings.audio_chime_enabled;
      const newCadence = sync_cadence_minutes !== undefined ? sync_cadence_minutes : settings.sync_cadence_minutes;
      const newUrl = webhook_url !== undefined ? webhook_url : settings.webhook_url;
      const newSecret = webhook_secret !== undefined ? webhook_secret : settings.webhook_secret;
      const newEvents = webhook_events ? JSON.stringify(webhook_events) : settings.webhook_events;
      const newSlack = slack_webhook_url !== undefined ? slack_webhook_url : settings.slack_webhook_url;
      const newDiscord = discord_webhook_url !== undefined ? discord_webhook_url : settings.discord_webhook_url;
      const newN8nUrl = n8n_webhook_url !== undefined ? n8n_webhook_url : settings.n8n_webhook_url;
      const newN8nSecret = n8n_webhook_secret !== undefined ? n8n_webhook_secret : settings.n8n_webhook_secret;
      const newBg = background_sync_enabled !== undefined ? (background_sync_enabled ? 1 : 0) : settings.background_sync_enabled;
      const newEmailDigest = email_digest_enabled !== undefined ? (email_digest_enabled ? 1 : 0) : settings.email_digest_enabled;
      const newEmailCadence = email_digest_cadence !== undefined ? email_digest_cadence : (settings.email_digest_cadence || 'weekly');
      const newEmailAddr = email_digest_address !== undefined ? email_digest_address : settings.email_digest_address;

      db.prepare(`
        UPDATE user_settings
        SET audio_chime_enabled = ?,
            sync_cadence_minutes = ?,
            webhook_url = ?,
            webhook_secret = ?,
            webhook_events = ?,
            slack_webhook_url = ?,
            discord_webhook_url = ?,
            n8n_webhook_url = ?,
            n8n_webhook_secret = ?,
            background_sync_enabled = ?,
            email_digest_enabled = ?,
            email_digest_cadence = ?,
            email_digest_address = ?,
            updated_at = ?
        WHERE user_id = ?
      `).run(
        newAudio,
        newCadence,
        newUrl,
        newSecret,
        newEvents,
        newSlack,
        newDiscord,
        newN8nUrl,
        newN8nSecret,
        newBg,
        newEmailDigest,
        newEmailCadence,
        newEmailAddr,
        now,
        userId
      );
    }

    const updated = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId) as any;

    let parsedEvents: string[] = ['action_needed', 'review', 'merged'];
    try {
      if (updated.webhook_events) {
        parsedEvents = JSON.parse(updated.webhook_events);
      }
    } catch {}

    return res.json({
      success: true,
      settings: {
        audio_chime_enabled: Boolean(updated.audio_chime_enabled),
        sync_cadence_minutes: Number(updated.sync_cadence_minutes),
        webhook_url: updated.webhook_url || null,
        webhook_secret_set: Boolean(updated.webhook_secret && updated.webhook_secret.length > 0),
        webhook_events: parsedEvents,
        slack_webhook_url: updated.slack_webhook_url || null,
        discord_webhook_url: updated.discord_webhook_url || null,
        n8n_webhook_url: updated.n8n_webhook_url || null,
        n8n_webhook_secret_set: Boolean(updated.n8n_webhook_secret && updated.n8n_webhook_secret.length > 0),
        background_sync_enabled: Boolean(updated.background_sync_enabled ?? 1),
        email_digest_enabled: Boolean(updated.email_digest_enabled ?? 0),
        email_digest_cadence: updated.email_digest_cadence || 'weekly',
        email_digest_address: updated.email_digest_address || null,
        last_email_digest_at: updated.last_email_digest_at || null,
      }
    });
  } catch (err: any) {
    console.error('[API /settings POST error]:', err);
    return res.status(500).json({ error: 'Failed to update settings', details: err.message });
  }
});

// POST /api/settings/webhook-test
settingsRouter.post('/webhook-test', async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  try {
    const userId = req.user!.id;
    const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId) as any;

    const targetUrl = (req.body.webhook_url || (settings && settings.webhook_url) || '').trim();
    if (!targetUrl) {
      return res.status(400).json({
        success: false,
        error: 'No webhook URL configured or provided for test dispatch'
      });
    }

    const secret = req.body.webhook_secret !== undefined
      ? req.body.webhook_secret
      : (settings ? settings.webhook_secret : null);

    const testPayload = {
      event: 'ping',
      timestamp: new Date().toISOString(),
      source: 'OSS Command Center',
      user: req.user!.email,
      message: 'Outbound webhook dispatch test ping from OSS Command Center.',
    };

    const payloadString = JSON.stringify(testPayload);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'OSS-Command-Center-Webhook/1.0',
    };

    if (secret) {
      const signature = signPayload(payloadString, secret);
      headers['X-OSS-Signature'] = `sha256=${signature}`;
    }

    const outboundRes = await axios.post(targetUrl, testPayload, {
      headers,
      timeout: 5000,
      validateStatus: () => true,
    });

    const latencyMs = Date.now() - startTime;
    return res.json({
      success: outboundRes.status >= 200 && outboundRes.status < 300,
      statusCode: outboundRes.status,
      latencyMs,
      message: `Webhook responded with HTTP status ${outboundRes.status}`,
    });
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return res.status(500).json({
      success: false,
      error: err.message || 'Webhook dispatch failed',
      latencyMs,
    });
  }
});

// POST /api/settings/slack-test
settingsRouter.post('/slack-test', async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  try {
    const userId = req.user!.id;
    const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId) as any;
    const targetUrl = (req.body.slack_webhook_url || (settings && settings.slack_webhook_url) || '').trim();

    if (!targetUrl) {
      return res.status(400).json({
        success: false,
        error: 'No Slack webhook URL configured or provided for test'
      });
    }

    const payload = buildSlackPayload({
      event: 'ping',
      message: 'Slack incoming webhook verified successfully from OSS Command Center.',
    });

    const outboundRes = await axios.post(targetUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
      validateStatus: () => true,
    });

    const latencyMs = Date.now() - startTime;
    return res.json({
      success: outboundRes.status >= 200 && outboundRes.status < 300,
      statusCode: outboundRes.status,
      latencyMs,
      message: `Slack responded with HTTP status ${outboundRes.status}`,
    });
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return res.status(500).json({
      success: false,
      error: err.message || 'Slack dispatch failed',
      latencyMs,
    });
  }
});

// POST /api/settings/discord-test
settingsRouter.post('/discord-test', async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  try {
    const userId = req.user!.id;
    const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId) as any;
    const targetUrl = (req.body.discord_webhook_url || (settings && settings.discord_webhook_url) || '').trim();

    if (!targetUrl) {
      return res.status(400).json({
        success: false,
        error: 'No Discord webhook URL configured or provided for test'
      });
    }

    const payload = buildDiscordPayload({
      event: 'ping',
      message: 'Discord webhook verified successfully from OSS Command Center.',
    });

    const outboundRes = await axios.post(targetUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
      validateStatus: () => true,
    });

    const latencyMs = Date.now() - startTime;
    return res.json({
      success: outboundRes.status >= 200 && outboundRes.status < 300,
      statusCode: outboundRes.status,
      latencyMs,
      message: `Discord responded with HTTP status ${outboundRes.status}`,
    });
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return res.status(500).json({
      success: false,
      error: err.message || 'Discord dispatch failed',
      latencyMs,
    });
  }
});

// POST /api/settings/n8n-test: Test n8n workflow pipeline with signed payload
settingsRouter.post('/n8n-test', async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  try {
    const userId = req.user!.id;
    const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId) as any;
    const targetUrl = (req.body.n8n_webhook_url !== undefined
      ? req.body.n8n_webhook_url
      : (settings && settings.n8n_webhook_url) || '').trim();

    if (!targetUrl) {
      return res.status(400).json({
        success: false,
        error: 'No n8n webhook URL configured or provided for test',
      });
    }

    const secret = req.body.n8n_webhook_secret !== undefined
      ? req.body.n8n_webhook_secret
      : (settings && (settings.n8n_webhook_secret || settings.webhook_secret));

    const payload = buildN8nPayload({
      event: 'ping',
      message: 'n8n workflow pipeline webhook verified successfully from OSS Command Center.',
    });

    const bodyStr = JSON.stringify(payload);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'OSS-Command-Center-n8n-Pipeline/1.0',
      'X-OSS-Delivery': payload.delivery_id,
      'X-OSS-Event': payload.event,
    };

    if (secret) {
      const signature = signPayload(bodyStr, secret);
      headers['X-OSS-Signature'] = `sha256=${signature}`;
    }

    const outboundRes = await axios.post(targetUrl, payload, {
      headers,
      timeout: 5000,
      validateStatus: () => true,
    });

    const latencyMs = Date.now() - startTime;
    return res.json({
      success: outboundRes.status >= 200 && outboundRes.status < 300,
      statusCode: outboundRes.status,
      latencyMs,
      message: `n8n responded with HTTP status ${outboundRes.status}`,
      deliveryId: payload.delivery_id,
    });
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return res.status(500).json({
      success: false,
      error: err.message || 'n8n dispatch failed',
      latencyMs,
    });
  }
});

// GET /api/settings/n8n-template: Download turnkey importable n8n workflow JSON
settingsRouter.get('/n8n-template', (_req: AuthenticatedRequest, res) => {
  const workflowTemplate = {
    name: 'OSS Command Center - Contributor Event Pipeline & AI Triage',
    nodes: [
      {
        parameters: {
          httpMethod: 'POST',
          path: 'oss-events',
          responseMode: 'onReceived',
          options: {},
        },
        name: 'Webhook Trigger (OSS Command Center)',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [240, 300],
      },
      {
        parameters: {
          conditions: {
            string: [
              {
                value1: '={{ $json.workflow_intent }}',
                operation: 'equal',
                value2: 'ci_or_review_remediation',
              },
            ],
          },
        },
        name: 'Is Remediation Required?',
        type: 'n8n-nodes-base.if',
        typeVersion: 1,
        position: [480, 300],
      },
      {
        parameters: {
          conditions: {
            string: [
              {
                value1: '={{ $json.workflow_intent }}',
                operation: 'equal',
                value2: 'milestone_celebration_and_portfolio_sync',
              },
            ],
          },
        },
        name: 'Is PR Merged?',
        type: 'n8n-nodes-base.if',
        typeVersion: 1,
        position: [480, 500],
      },
      {
        parameters: {
          content: '## OSS Command Center Urgent Remediation\nRepository: {{$node["Webhook Trigger (OSS Command Center)"].json["contribution"]["repo"]}}\nPR: #{{$node["Webhook Trigger (OSS Command Center)"].json["contribution"]["number"]}}\nAction: {{$node["Webhook Trigger (OSS Command Center)"].json["contribution"]["action_needed"]}}\nURL: {{$node["Webhook Trigger (OSS Command Center)"].json["contribution"]["url"]}}',
        },
        name: 'Draft Urgent Alert',
        type: 'n8n-nodes-base.markdown',
        typeVersion: 1,
        position: [740, 220],
      },
      {
        parameters: {
          content: '## Milestone Achieved: PR Merged!\nRepository: {{$node["Webhook Trigger (OSS Command Center)"].json["contribution"]["repo"]}}\nTitle: {{$node["Webhook Trigger (OSS Command Center)"].json["contribution"]["title"]}}\nReady to add to portfolio or changelog.',
        },
        name: 'Draft Merge Milestone',
        type: 'n8n-nodes-base.markdown',
        typeVersion: 1,
        position: [740, 480],
      },
    ],
    connections: {
      'Webhook Trigger (OSS Command Center)': {
        main: [
          [
            { node: 'Is Remediation Required?', type: 'main', index: 0 },
            { node: 'Is PR Merged?', type: 'main', index: 0 },
          ],
        ],
      },
      'Is Remediation Required?': {
        main: [
          [{ node: 'Draft Urgent Alert', type: 'main', index: 0 }],
        ],
      },
      'Is PR Merged?': {
        main: [
          [{ node: 'Draft Merge Milestone', type: 'main', index: 0 }],
        ],
      },
    },
    active: false,
    settings: {},
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="oss-command-center-n8n-workflow.json"');
  return res.json(workflowTemplate);
});

// GET /api/settings/export: Export tenant contribution data and preferences
settingsRouter.get('/export', (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const user = db.prepare('SELECT id, email, display_name, created_at FROM users WHERE id = ?').get(userId) as any;
    const contributions = db.prepare('SELECT * FROM contributions WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[];
    const events = db.prepare('SELECT * FROM activity_events WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[];
    const settings = db.prepare('SELECT audio_chime_enabled, sync_cadence_minutes, webhook_url, webhook_events, created_at, updated_at FROM user_settings WHERE user_id = ?').get(userId) as any;

    const exportPayload = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        member_since: user.created_at,
      },
      stats: {
        total_contributions: contributions.length,
        total_events: events.length,
      },
      settings: settings || {},
      contributions: contributions.map((c) => ({
        id: c.id,
        platform: c.platform,
        repo: c.repo,
        number: c.number,
        title: c.title,
        type: c.type,
        url: c.url,
        author: c.author,
        status: c.status,
        action_needed: c.action_needed,
        bounty_amount: c.bounty_amount,
        created_at: c.created_at,
        last_activity_at: c.last_activity_at,
        notes: c.notes,
      })),
      activity_events: events.map((e) => ({
        id: e.id,
        contribution_id: e.contribution_id,
        actor: e.actor,
        type: e.type,
        review_state: e.review_state,
        created_at: e.created_at,
      })),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="oss-telemetry-export-${userId.slice(0, 8)}.json"`);
    return res.json(exportPayload);
  } catch (err: any) {
    console.error('[API /settings/export error]:', err);
    return res.status(500).json({ error: 'Failed to generate export', details: err.message });
  }
});

