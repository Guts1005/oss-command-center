import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../db.js';
import { compileUserDigest, renderDigestHtml, renderDigestText } from '../email/digest.js';
import { sendEmail, getActiveEmailProvider } from '../email/transporter.js';

export const digestRouter = Router();

// GET /api/digest/preview - Preview the rendered HTML digest for the logged-in user
digestRouter.get('/preview', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const cadence = req.query.cadence === 'daily' ? 'daily' : 'weekly';
    const summary = compileUserDigest(userId, cadence);

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3100';
    const dashboardUrl = `${protocol}://${host}`;

    const html = renderDigestHtml(summary, dashboardUrl);
    const text = renderDigestText(summary, dashboardUrl);

    if (req.query.format === 'html') {
      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    }

    return res.json({
      summary,
      html,
      text,
      provider: getActiveEmailProvider()
    });
  } catch (err: any) {
    console.error('[Digest Preview Error]:', err);
    return res.status(500).json({ error: 'Failed to generate digest preview', details: err.message });
  }
});

const TestDigestInputSchema = z.object({
  email: z.string().email().optional(),
  cadence: z.enum(['daily', 'weekly']).optional()
});

// POST /api/digest/test - Send an immediate test digest email to the user
digestRouter.post('/test', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const parseResult = TestDigestInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid test digest payload', details: parseResult.error.format() });
    }

    const cadence = parseResult.data.cadence || 'weekly';
    const settings = db.prepare('SELECT email_digest_address FROM user_settings WHERE user_id = ?').get(userId) as any;
    const targetEmail = parseResult.data.email || settings?.email_digest_address || req.user!.email;

    if (!targetEmail) {
      return res.status(400).json({ error: 'No destination email address found' });
    }

    const summary = compileUserDigest(userId, cadence);

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3100';
    const dashboardUrl = `${protocol}://${host}`;

    const html = renderDigestHtml(summary, dashboardUrl);
    const text = renderDigestText(summary, dashboardUrl);
    const cadenceLabel = cadence === 'daily' ? 'Daily' : 'Weekly';
    const subject = `[TEST] ${cadenceLabel} Contribution Briefing // OSS Command Center`;

    const result = await sendEmail({
      to: targetEmail,
      subject,
      html,
      text
    });

    return res.json({
      success: result.success,
      provider: result.provider,
      messageId: result.messageId,
      latencyMs: result.latencyMs,
      targetEmail,
      error: result.error
    });
  } catch (err: any) {
    console.error('[Digest Test Send Error]:', err);
    return res.status(500).json({ error: 'Failed to send test digest', details: err.message });
  }
});
