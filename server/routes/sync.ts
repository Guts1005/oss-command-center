import express from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { actionLimiter } from '../middleware/rate_limit.js';
import {
  getBackgroundWorkerStatus,
  executeBackgroundSyncPass,
} from '../sync/worker.js';

export const syncRouter = express.Router();

/**
 * GET /api/sync/status
 * Telemetry endpoint exposing background worker health, interval, and next execution.
 */
syncRouter.get('/status', (req, res) => {
  const status = getBackgroundWorkerStatus();
  return res.json({
    status: 'ok',
    worker: status,
  });
});

/**
 * POST /api/sync/trigger
 * Triggers an immediate background synchronization pass across all active integrations.
 */
syncRouter.post('/trigger', actionLimiter, requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await executeBackgroundSyncPass();
    return res.json({
      success: true,
      message: 'Background synchronization pass completed.',
      ...result,
    });
  } catch (err: any) {
    console.error('[API /api/sync/trigger error]:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Background sync pass failed',
    });
  }
});
