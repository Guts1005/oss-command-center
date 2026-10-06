import http from 'http';
import assert from 'assert';
import crypto from 'crypto';
import express from 'express';
import cookieParser from 'cookie-parser';
import axios from 'axios';
import { db, initDatabase } from '../server/db.js';
import { hashPassword, generateSessionToken, signPayload } from '../server/security/crypto.js';
import { buildN8nPayload } from '../server/notifications/formatters.js';
import { dispatchNotification, isN8nWebhook } from '../server/notifications/dispatcher.js';
import { apiRouter } from '../server/routes/index.js';

process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';

export async function runN8nPipelineTests() {
  console.log('=== Running Outbound n8n Webhook Pipeline Integration Tests ===');
  initDatabase();

  const testSecret = 'n8n_super_secret_test_key_4096';

  // -------------------------------------------------------------
  // Test 1: n8n Payload Formatter & Semantic Workflow Intent
  // -------------------------------------------------------------
  {
    const pingPayload = buildN8nPayload({
      event: 'ping',
      message: 'Ping verification signal',
    });
    assert.strictEqual(pingPayload.event, 'ping');
    assert.strictEqual(pingPayload.source, 'OSS Command Center');
    assert.strictEqual(pingPayload.workflow_intent, 'system_health_check');
    assert.strictEqual(typeof pingPayload.delivery_id, 'string');
    assert.strictEqual(pingPayload.delivery_id.length, 36);

    const changesReqPayload = buildN8nPayload({
      event: 'action_needed',
      contribution: {
        id: 'contrib_101',
        repo: 'facebook/react',
        number: 28412,
        title: 'Fix hydration mismatch in server components',
        action_needed: 'push-changes',
        status: 'open',
        platform: 'github',
        url: 'https://github.com/facebook/react/pull/28412',
      },
      actor: 'gaearon',
    });
    assert.strictEqual(changesReqPayload.event, 'contribution.action_needed');
    assert.strictEqual(changesReqPayload.workflow_intent, 'ci_or_review_remediation');
    assert.strictEqual(changesReqPayload.contribution?.repo, 'facebook/react');
    assert.strictEqual(changesReqPayload.contribution?.number, 28412);
    assert.strictEqual(changesReqPayload.actor, 'gaearon');

    const oweReplyPayload = buildN8nPayload({
      event: 'action_needed',
      contribution: {
        repo: 'torvalds/linux',
        number: 77,
        title: 'Kernel scheduler update',
        action_needed: 'reply',
        status: 'open',
      },
    });
    assert.strictEqual(oweReplyPayload.workflow_intent, 'maintainer_communication');

    const mergedPayload = buildN8nPayload({
      event: 'merged',
      contribution: {
        repo: 'inkscape/inkscape',
        number: 404,
        title: 'Optimize SVG rasterizer cache',
        status: 'merged',
      },
    });
    assert.strictEqual(mergedPayload.event, 'contribution.merged');
    assert.strictEqual(mergedPayload.workflow_intent, 'milestone_celebration_and_portfolio_sync');

    assert.strictEqual(isN8nWebhook('https://n8n.example.com/webhook/oss-events'), true);
    assert.strictEqual(isN8nWebhook('http://localhost:5678/webhook-test/pipeline'), true);

    console.log('✔ Test 1: n8n payload formatting and workflow intent classification verified.');
  }

  // -------------------------------------------------------------
  // Test 2: Database Persistence & Column Migration
  // -------------------------------------------------------------
  const userId = `n8n_test_user_${Date.now()}`;
  const userEmail = `n8n_${Date.now()}@example.com`;
  {
    const passwordHash = await hashPassword('ValidPass123!');
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, userEmail, passwordHash, 'n8n Test Engineer', now, now);

    db.prepare(`
      INSERT INTO user_settings (
        user_id, audio_chime_enabled, sync_cadence_minutes,
        n8n_webhook_url, n8n_webhook_secret,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, 1, 30, 'http://127.0.0.1:9876/webhook/oss', testSecret, now, now);

    const saved = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId) as any;
    assert.strictEqual(saved.n8n_webhook_url, 'http://127.0.0.1:9876/webhook/oss');
    assert.strictEqual(saved.n8n_webhook_secret, testSecret);

    console.log('✔ Test 2: SQLite database persistence for n8n configuration verified.');
  }

  // -------------------------------------------------------------
  // Test 3: Local Mock n8n Receiver & End-to-End Webhook Dispatch
  // -------------------------------------------------------------
  let receivedRequests: Array<{
    headers: http.IncomingHttpHeaders;
    body: any;
    rawBody: string;
  }> = [];

  const mockN8nServer = http.createServer((req, res) => {
    let bodyStr = '';
    req.on('data', (chunk) => {
      bodyStr += chunk;
    });
    req.on('end', () => {
      let parsed = null;
      try {
        parsed = JSON.parse(bodyStr);
      } catch {}
      receivedRequests.push({
        headers: req.headers,
        body: parsed,
        rawBody: bodyStr,
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'workflow_triggered', executionId: 'exec_8831' }));
    });
  });

  await new Promise<void>((resolve) => {
    mockN8nServer.listen(0, '127.0.0.1', () => resolve());
  });

  const mockAddress = mockN8nServer.address() as any;
  const mockPort = mockAddress.port;
  const mockN8nUrl = `http://127.0.0.1:${mockPort}/webhook/oss-events`;

  // Update user setting with active mock n8n server URL
  db.prepare(`
    UPDATE user_settings
    SET n8n_webhook_url = ?, n8n_webhook_secret = ?
    WHERE user_id = ?
  `).run(mockN8nUrl, testSecret, userId);

  try {
    // -------------------------------------------------------------
    // Test 4: Ping Event Dispatch with HMAC Signature Verification
    // -------------------------------------------------------------
    {
      receivedRequests = [];
      const dispatchResult = await dispatchNotification(userId, {
        event: 'ping',
        message: 'Connection probe to n8n webhook engine',
      });

      assert.strictEqual(dispatchResult.dispatched, 1);
      assert.strictEqual(dispatchResult.successes, 1);
      assert.strictEqual(dispatchResult.errors.length, 0);

      assert.strictEqual(receivedRequests.length, 1);
      const req = receivedRequests[0];
      assert.strictEqual(req.headers['x-oss-event'], 'ping');
      assert(typeof req.headers['x-oss-delivery'] === 'string');
      assert(typeof req.headers['x-oss-signature'] === 'string');

      // Verify HMAC-SHA256 signature
      const signatureHeader = req.headers['x-oss-signature'] as string;
      assert(signatureHeader.startsWith('sha256='));
      const receivedHash = signatureHeader.replace('sha256=', '');
      const expectedHash = signPayload(req.rawBody, testSecret);
      assert.strictEqual(receivedHash, expectedHash);

      assert.strictEqual(req.body.event, 'ping');
      assert.strictEqual(req.body.workflow_intent, 'system_health_check');

      console.log('✔ Test 3: Live n8n webhook dispatch with HMAC-SHA256 signature verified.');
    }

    // -------------------------------------------------------------
    // Test 5: Cryptographic Tamper Resistance
    // -------------------------------------------------------------
    {
      const req = receivedRequests[0];
      const tamperedBody = req.rawBody + ' ';
      const tamperedHash = signPayload(tamperedBody, testSecret);
      const signatureHeader = req.headers['x-oss-signature'] as string;
      const originalHash = signatureHeader.replace('sha256=', '');

      assert.notStrictEqual(tamperedHash, originalHash);
      console.log('✔ Test 4: Cryptographic tamper resistance validated: altered payloads fail signature checks.');
    }

    // -------------------------------------------------------------
    // Test 6: Contribution Action Dispatch to n8n
    // -------------------------------------------------------------
    {
      receivedRequests = [];
      const dispatchResult = await dispatchNotification(userId, {
        event: 'action_needed',
        contribution: {
          id: 'c_9901',
          repo: 'deepmind/antigravity',
          number: 310,
          title: 'Asynchronous task scheduler optimization',
          action_needed: 'push-changes',
          status: 'open',
          platform: 'github',
          url: 'https://github.com/deepmind/antigravity/pull/310',
        },
        actor: 'demis-h',
      });

      assert.strictEqual(dispatchResult.dispatched, 1);
      assert.strictEqual(dispatchResult.successes, 1);
      assert.strictEqual(receivedRequests.length, 1);

      const req = receivedRequests[0];
      assert.strictEqual(req.headers['x-oss-event'], 'contribution.action_needed');
      assert.strictEqual(req.body.workflow_intent, 'ci_or_review_remediation');
      assert.strictEqual(req.body.contribution.repo, 'deepmind/antigravity');
      assert.strictEqual(req.body.contribution.action_needed, 'push-changes');
      assert.strictEqual(req.body.actor, 'demis-h');

      console.log('✔ Test 5: Action-needed contribution event dispatched to n8n with rich schema.');
    }

    // -------------------------------------------------------------
    // Test 6: Express Route POST /api/settings/n8n-test
    // -------------------------------------------------------------
    {
      const app = express();
      app.use(express.json());
      app.use(cookieParser());
      app.use('/api', apiRouter);

      const expressServer = http.createServer(app);
      await new Promise<void>((resolve) => expressServer.listen(0, '127.0.0.1', () => resolve()));
      const expressPort = (expressServer.address() as any).port;
      const apiClient = axios.create({ baseURL: `http://127.0.0.1:${expressPort}/api`, validateStatus: () => true });

      try {
        const token = generateSessionToken();
        const nowIso = new Date().toISOString();
        const expiresAt = new Date(Date.now() + 3600000).toISOString();
        db.prepare('INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(token, userId, expiresAt, nowIso);

        // 1. Missing URL test returns 400
        const badReq = await apiClient.post('/settings/n8n-test', { n8n_webhook_url: '' }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        assert.strictEqual(badReq.status, 400);

        // 2. Valid test dispatch returns 200 with latency and status
        const goodReq = await apiClient.post('/settings/n8n-test', {
          n8n_webhook_url: mockN8nUrl,
          n8n_webhook_secret: testSecret,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        assert.strictEqual(goodReq.status, 200);
        assert.strictEqual(goodReq.data.success, true);
        assert.strictEqual(goodReq.data.statusCode, 200);
        assert(typeof goodReq.data.latencyMs === 'number');
        assert(typeof goodReq.data.deliveryId === 'string');

        console.log('✔ Test 6: POST /api/settings/n8n-test API route validated end-to-end.');

        // -------------------------------------------------------------
        // Test 7: Express Route GET /api/settings/n8n-template
        // -------------------------------------------------------------
        const templateReq = await apiClient.get('/settings/n8n-template', {
          headers: { Authorization: `Bearer ${token}` },
        });
        assert.strictEqual(templateReq.status, 200);
        assert.strictEqual(typeof templateReq.data, 'object');
        assert.strictEqual(templateReq.data.name, 'OSS Command Center - Contributor Event Pipeline & AI Triage');
        assert(Array.isArray(templateReq.data.nodes));
        assert(templateReq.data.nodes.length >= 4);
        assert(templateReq.headers['content-disposition'].includes('oss-command-center-n8n-workflow.json'));

        console.log('✔ Test 7: GET /api/settings/n8n-template turnkey workflow download verified.');
      } finally {
        await new Promise<void>((resolve) => expressServer.close(() => resolve()));
      }
    }
  } finally {
    await new Promise<void>((resolve) => {
      mockN8nServer.close(() => resolve());
    });
  }

  console.log('\n🎉 ALL OUTBOUND N8N PIPELINE TESTS PASSED WITH 100% SUCCESS!\n');
}

// Allow direct CLI execution
if (process.argv[1]?.endsWith('n8n_pipeline.test.ts')) {
  runN8nPipelineTests().catch((err) => {
    console.error('Test failure:', err);
    process.exit(1);
  });
}
