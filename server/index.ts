import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { db, initDatabase } from './db.js';
import { apiRouter } from './routes/index.js';
import { startPeriodicSync, syncAllUsers } from './sync/multi_engine.js';
import { sseManager } from './sse.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

export const app = express();
const PORT = process.env.PORT || 3100;
const isProd = process.env.NODE_ENV === 'production';

// 1. Process Security HTTP Headers (Helmet)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https:", "http:", "ws:", "wss:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: isProd ? [] : null,
    },
  },
  xFrameOptions: { action: 'deny' },
  crossOriginEmbedderPolicy: false,
}));

// 2. Response Compression (Gzip / Deflate, bypassing SSE streams)
app.use(compression({
  filter: (req, res) => {
    if (req.headers.accept === 'text/event-stream' || req.path === '/api/events') {
      return false;
    }
    return compression.filter(req, res);
  },
}));

// 3. API Rate Limiting Protection
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'API rate limit exceeded. Please throttle requests and try again later.' },
});

app.use('/api', apiLimiter);

// 4. CORS, Raw Body Capture for HMAC, and Cookie Parser
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  },
}));

app.use(cookieParser());

// 5. Initialize SQLite Multi-Tenant Schema
initDatabase();

// 6. Production Health Check Probes (/health and /api/health)
app.get(['/health', '/api/health'], (_req, res) => {
  try {
    const dbCheck = db.prepare('SELECT 1 as alive').get() as { alive: number } | undefined;
    if (!dbCheck || dbCheck.alive !== 1) {
      return res.status(503).json({
        status: 'degraded',
        error: 'Database connection check failed',
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: 'connected',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (err: any) {
    return res.status(503).json({
      status: 'unhealthy',
      error: err.message || 'Health check error',
      timestamp: new Date().toISOString(),
    });
  }
});

// 7. Mount Core API Sub-Routers
app.use('/api', apiRouter);

// 8. Serve Static Assets with Long-Term Cache Headers
app.use(express.static(distPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    } else if (filePath.includes('/assets/') || filePath.includes('\\assets\\')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  },
}));

// SPA Fallback for client-side routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/health')) return next();
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start Server and Attach Graceful Process Shutdown
let server: any = null;
const isDirectEntry = Boolean(
  process.argv[1] && (
    path.resolve(process.argv[1]) === path.resolve(__filename) ||
    process.argv[1].endsWith('server/index.ts') ||
    process.argv[1].endsWith('server\\index.ts')
  )
);

if (process.env.NODE_ENV !== 'test' && isDirectEntry) {
  server = app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`  OSS Contribution Command Center Multi-User Active`);
    console.log(`  Listening on: http://localhost:${PORT}`);
    console.log(`======================================================\n`);

    // Start background sync cadence
    startPeriodicSync(30);

    // Initial background sync cycle
    syncAllUsers().catch(err => console.error('[Startup Sync Error]:', err));
  });

  const handleShutdown = (signal: string) => {
    console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);
    if (server) {
      server.close(() => {
        console.log('[Server] HTTP listener closed.');
        try {
          // Checkpoint WAL journal and cleanly close SQLite database connection
          db.pragma('wal_checkpoint(TRUNCATE)');
          db.close();
          console.log('[Database] SQLite WAL checkpointed and closed cleanly.');
        } catch (dbErr) {
          console.error('[Database Error during shutdown]:', dbErr);
        }
        process.exit(0);
      });

      // Force terminate if graceful cleanup hangs over 10s
      setTimeout(() => {
        console.error('[Server] Graceful shutdown timed out. Forcing process exit.');
        process.exit(1);
      }, 10000);
    } else {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}
