import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './db.js';
import { apiRouter } from './routes/index.js';
import { startPeriodicSync, syncAllUsers } from './sync/multi_engine.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

const app = express();
const PORT = process.env.PORT || 3100;

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Initialize SQLite multi-tenant schema
initDatabase();

// Mount API router
app.use('/api', apiRouter);

// Serve static assets from dist
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  OSS Contribution Command Center Multi-User Active`);
  console.log(`  Listening on: http://localhost:${PORT}`);
  console.log(`======================================================\n`);

  // Start periodic background sync for active users
  startPeriodicSync(30);

  // Run initial sync cycle in background
  syncAllUsers().catch(err => console.error('[Startup Sync Error]:', err));
});
