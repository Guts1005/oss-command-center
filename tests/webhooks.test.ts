// tests/webhooks.test.ts
// Automated validation for user settings, webhook dispatch, HMAC-SHA256 signatures, and multi-tenant isolation

import { db, initDatabase } from '../server/db.js';
import { hashPassword, generateSessionToken, signPayload } from '../server/security/crypto.js';
import axios from 'axios';
import http from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import { apiRouter } from '../server/routes/index.js';

initDatabase();

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api', apiRouter);

const server = http.createServer(app);

// Temporary mock webhook receiver server
let receivedWebhookHeaders: Record<string, string> = {};
let receivedWebhookBody: any = null;

const webhookApp = express();
webhookApp.use(express.json());
webhookApp.post('/webhook-sink', (req, res) => {
  receivedWebhookHeaders = req.headers as Record<string, string>;
  receivedWebhookBody = req.body;
  res.status(200).json({ status: 'ok', received: true });
});

const webhookSinkServer = http.createServer(webhookApp);

async function run() {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  await new Promise<void>((resolve) => webhookSinkServer.listen(0, resolve));

  const port = (server.address() as any).port;
  const sinkPort = (webhookSinkServer.address() as any).port;
  const sinkUrl = `http://127.0.0.1:${sinkPort}/webhook-sink`;

  const client = axios.create({
    baseURL: `http://127.0.0.1:${port}`,
    validateStatus: () => true
  });

  console.log('=== Running Settings & Outbound Webhook Routing Tests ===');

  try {
    // Test 1: Unauthenticated request rejected
    const unauthRes = await client.get('/api/settings');
    if (unauthRes.status !== 401) {
      throw new Error(`Test 1 Failed: Expected 401 for unauthenticated request, got: ${unauthRes.status}`);
    }
    console.log('✔ Test 1: Unauthenticated settings access strictly rejected with 401.');

    // Test 2: Set up User A
    const userAId = 'webhook_user_a_' + Date.now();
    const tokenA = generateSessionToken();
    const passHash = await hashPassword('SecretPass123!');
    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 3600000).toISOString();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userAId, `${userAId}@example.com`, passHash, 'Webhook Tester', nowIso, nowIso);

    db.prepare(`
      INSERT INTO sessions (id, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).run(tokenA, userAId, expiresAt, nowIso);

    // Initial GET settings
    const initialRes = await client.get('/api/settings', {
      headers: { Cookie: `oss_session=${tokenA}` }
    });
    if (initialRes.status !== 200 || !initialRes.data.settings) {
      throw new Error(`Test 2 Failed: Expected 200 with default settings, got: ${JSON.stringify(initialRes.data)}`);
    }
    if (initialRes.data.settings.sync_cadence_minutes !== 30 || initialRes.data.settings.audio_chime_enabled !== true) {
      throw new Error(`Test 2 Failed: Default settings mismatch: ${JSON.stringify(initialRes.data.settings)}`);
    }
    console.log('✔ Test 2: Default settings initialized successfully on first retrieval.');

    // Test 3: Update settings with webhook configuration and secret
    const webhookSecret = 'super-secret-signing-key-xyz';
    const updateRes = await client.post('/api/settings', {
      audio_chime_enabled: false,
      sync_cadence_minutes: 15,
      webhook_url: sinkUrl,
      webhook_secret: webhookSecret,
      webhook_events: ['action_needed', 'merged']
    }, {
      headers: { Cookie: `oss_session=${tokenA}` }
    });

    if (updateRes.status !== 200 || !updateRes.data.success) {
      throw new Error(`Test 3 Failed: Settings update failed: ${JSON.stringify(updateRes.data)}`);
    }
    if (updateRes.data.settings.sync_cadence_minutes !== 15 || updateRes.data.settings.webhook_secret_set !== true) {
      throw new Error(`Test 3 Failed: Settings update values unexpected: ${JSON.stringify(updateRes.data.settings)}`);
    }
    console.log('✔ Test 3: Settings updated and webhook secret safely masked in response.');

    // Test 4: Webhook test ping with HMAC-SHA256 signature verification
    const pingRes = await client.post('/api/settings/webhook-test', {}, {
      headers: { Cookie: `oss_session=${tokenA}` }
    });

    if (pingRes.status !== 200 || !pingRes.data.success) {
      throw new Error(`Test 4 Failed: Webhook test ping failed: ${JSON.stringify(pingRes.data)}`);
    }
    if (pingRes.data.statusCode !== 200) {
      throw new Error(`Test 4 Failed: Webhook receiver status should be 200, got: ${pingRes.data.statusCode}`);
    }

    // Verify webhook sink received payload and signature
    if (!receivedWebhookBody || receivedWebhookBody.event !== 'ping') {
      throw new Error(`Test 4 Failed: Webhook sink received invalid payload: ${JSON.stringify(receivedWebhookBody)}`);
    }

    const signatureHeader = receivedWebhookHeaders['x-oss-signature'];
    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
      throw new Error(`Test 4 Failed: Missing or invalid X-OSS-Signature header: ${signatureHeader}`);
    }

    const rawSig = signatureHeader.replace('sha256=', '');
    const expectedSig = signPayload(JSON.stringify(receivedWebhookBody), webhookSecret);
    if (rawSig !== expectedSig) {
      throw new Error(`Test 4 Failed: Signature mismatch! Expected ${expectedSig}, got ${rawSig}`);
    }
    console.log('✔ Test 4: Webhook dispatched, received by sink, and HMAC-SHA256 signature verified.');

    // Test 5: Multi-tenant isolation: User B has independent settings
    const userBId = 'webhook_user_b_' + Date.now();
    const tokenB = generateSessionToken();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userBId, `${userBId}@example.com`, passHash, 'User B', nowIso, nowIso);
    db.prepare(`
      INSERT INTO sessions (id, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).run(tokenB, userBId, expiresAt, nowIso);

    const userBRes = await client.get('/api/settings', {
      headers: { Cookie: `oss_session=${tokenB}` }
    });

    if (userBRes.data.settings.webhook_url !== null || userBRes.data.settings.webhook_secret_set !== false) {
      throw new Error(`Test 5 Failed: User B leaked User A webhook settings: ${JSON.stringify(userBRes.data)}`);
    }
    console.log('✔ Test 5: Multi-tenant isolation confirmed (Zero leakage of webhook URLs or secrets).');

    console.log('\nALL SETTINGS & OUTBOUND WEBHOOK TESTS PASSED WITH 100% SUCCESS!\n');
  } finally {
    server.close();
    webhookSinkServer.close();
  }
}

run().catch((err) => {
  console.error('❌ Settings test failed:', err);
  process.exit(1);
});
