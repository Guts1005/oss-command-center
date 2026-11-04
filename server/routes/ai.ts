import { Router } from 'express';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { actionLimiter } from '../middleware/rate_limit.js';
import { checkOllamaAvailable, triageContribution, suggestReply, askPlatformCopilot, streamPlatformCopilot, getOllamaHost } from '../services/ai_engine.js';
import { z } from 'zod';

export const aiRouter = Router();

aiRouter.use(optionalAuth);

aiRouter.get('/status', async (_req, res) => {
  try {
    const isAvailable = await checkOllamaAvailable();
    return res.json({
      available: isAvailable,
      engine: 'OSS Neural Query Solver',
      model: process.env.OLLAMA_MODEL || 'oss-copilot',
      endpoint: getOllamaHost(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

aiRouter.post('/triage/:id', actionLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : (req.params.id as string[])[0];
    const userId = req.user?.id;
    const result = await triageContribution(id, userId);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

aiRouter.post('/suggest-reply/:id', actionLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : (req.params.id as string[])[0];
    const userId = req.user?.id;
    const reply = await suggestReply(id, userId);
    return res.json({ reply });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

const copilotSchema = z.object({
  question: z.string().min(1).max(2000),
  clientContext: z.record(z.any()).optional(),
});

aiRouter.post('/copilot', actionLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = copilotSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Valid question parameter is required' });
    }

    const userId = req.user?.id || 'e1fd3a8b-0fa3-47a6-bbf5-01b97b414cf4';
    const answer = await askPlatformCopilot(parsed.data.question, userId, parsed.data.clientContext);
    return res.json({ answer });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

aiRouter.post('/copilot/stream', actionLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = copilotSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Valid question parameter is required' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    const userId = req.user?.id || 'e1fd3a8b-0fa3-47a6-bbf5-01b97b414cf4';
    for await (const token of streamPlatformCopilot(parsed.data.question, userId, parsed.data.clientContext)) {
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message });
    }
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});