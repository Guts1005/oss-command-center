import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './db.js';
import { apiRouter } from './routes/index.js';
import { runSync } from './sync/engine.js';

import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

const app = express();
const PORT = process.env.PORT || 3100;

app.use(cors());
app.use(express.json());

// Initialize SQLite schema
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
  console.log(`⚙️  OSS Contribution Command Center Server Active`);
  console.log(`📡  Listening on: http://localhost:${PORT}`);
  console.log(`======================================================\n`);

  // Run initial sync on startup
  runSync().catch(err => console.error('[Startup Sync Error]:', err));
});
