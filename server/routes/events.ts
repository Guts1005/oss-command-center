import express, { Response } from 'express';
import { AuthenticatedRequest, optionalAuth } from '../middleware/auth.js';
import { db } from '../db.js';
import { sseManager } from '../sse.js';

export const eventsRouter = express.Router();

eventsRouter.use(optionalAuth);

/**
 * GET /api/events
 * Real-time Server-Sent Events stream for connected HUD clients.
 * Authenticates via session cookie or ?token=<sessionToken> query parameter.
 */
eventsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  let userId = req.user?.id;

  // Fallback to query token if EventSource client passed token in URL
  if (!userId && req.query.token && typeof req.query.token === 'string') {
    const session = db.prepare(`
      SELECT s.user_id, s.expires_at 
      FROM sessions s 
      WHERE s.id = ?
    `).get(req.query.token) as any;

    if (session && new Date(session.expires_at) > new Date()) {
      userId = session.user_id;
    }
  }

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Valid session required for event stream' });
  }

  // Set SSE response headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable proxy buffering (Nginx)
  });

  // Flush headers immediately
  if ((res as any).flushHeaders) {
    (res as any).flushHeaders();
  }

  // Register client in SSE manager
  sseManager.addClient(userId, res);
});
