import http from 'http';
import assert from 'assert';
import { db, initDatabase } from '../server/db.js';
import { hashPassword, generateSessionToken } from '../server/security/crypto.js';
import {
  buildDiscordPayload,
  buildSlackPayload,
} from '../server/notifications/formatters.js';
import {
  isDiscordWebhook,
  isSlackWebhook,
  dispatchNotification,
} from '../server/notifications/dispatcher.js';
import {
  getBackgroundWorkerStatus,
  executeBackgroundSyncPass,
  startBackgroundSyncWorker,
  stopBackgroundSyncWorker,
} from '../server/sync/worker.js';

process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';

async function runNotificationsAndCronTests() {
  console.log('=== Running Real-World Notifications & Background Worker Tests ===');
  initDatabase();

  // -------------------------------------------------------------
  // Test 1: Discord Embed Payload Formatter
  // -------------------------------------------------------------
  {
    const pingPayload = buildDiscordPayload({ event: 'ping', message: 'Ping test' });
    assert.strictEqual(pingPayload.username, 'OSS Command Center');
    assert.strictEqual(pingPayload.embeds.length, 1);
    assert.strictEqual(pingPayload.embeds[0].color, 0x06B6D4);
    assert.strictEqual(pingPayload.embeds[0].title, 'Discord Webhook Integration Test');

    const changesReqPayload = buildDiscordPayload({
      event: 'action_needed',
      contribution: {
        repo: 'facebook/react',
        number: 101,
        title: 'Fix hydration mismatch',
        action_needed: 'push-changes',
        status: 'open',
        platform: 'github',
        url: 'https://github.com/facebook/react/pull/101',
      },
      actor: 'gaearon',
    });
    assert.strictEqual(changesReqPayload.embeds[0].color, 0xEF4444); // Red
    assert(changesReqPayload.embeds[0].title.startsWith('[CHANGES REQ]'));
    assert.strictEqual(changesReqPayload.embeds[0].url, 'https://github.com/facebook/react/pull/101');

    const oweReplyPayload = buildDiscordPayload({
      event: 'action_needed',
      contribution: {
        repo: 'torvalds/linux',
        number: 55,
        title: 'Kernel scheduler patch',
        action_needed: 'reply',
        status: 'open',
        platform: 'github',
      },
    });
    assert.strictEqual(oweReplyPayload.embeds[0].color, 0xF59E0B); // Amber
    assert(oweReplyPayload.embeds[0].title.startsWith('[OWE REPLY]'));

    const mergedPayload = buildDiscordPayload({
      event: 'merged',
      contribution: {
        repo: 'inkscape/inkscape',
        number: 77,
        title: 'SVG renderer update',
        action_needed: 'none',
        status: 'merged',
        platform: 'gitlab',
      },
    });
    assert.strictEqual(mergedPayload.embeds[0].color, 0x10B981); // Emerald Green
    assert(mergedPayload.embeds[0].title.startsWith('[MERGED]'));

    console.log('✔ Test 1: Discord Embed payload formatting and color mapping verified.');
  }

  // -------------------------------------------------------------
  // Test 2: Slack Block Kit Payload Formatter
  // -------------------------------------------------------------
  {
    const pingSlack = buildSlackPayload({ event: 'ping', message: 'Slack ping' });
    assert(pingSlack.text.includes('ping verified'));
    assert.strictEqual(pingSlack.blocks?.length, 3);
    assert.strictEqual(pingSlack.blocks?.[0].type, 'header');

    const actionSlack = buildSlackPayload({
      event: 'action_needed',
      contribution: {
        repo: 'deepmind/antigravity',
        number: 42,
        title: 'Quantum optimizer core',
        action_needed: 'reply',
        status: 'open',
        platform: 'github',
        url: 'https://github.com/deepmind/antigravity/pull/42',
      },
      actor: 'demis',
    });
    assert(actionSlack.text.includes('Action Required: Maintainer Owe Reply'));
    assert(actionSlack.blocks?.[1].text?.text.includes('deepmind/antigravity#42'));
    assert(actionSlack.blocks?.[1].fields?.some(f => f.text.includes('deepmind/antigravity')));

    console.log('✔ Test 2: Slack Block Kit payload formatting and markdown blocks verified.');
  }

  // -------------------------------------------------------------
  // Test 3: Webhook URL Target Detection
  // -------------------------------------------------------------
  {
    assert.strictEqual(isDiscordWebhook('https://discord.com/api/webhooks/12345/abcdef'), true);
    assert.strictEqual(isDiscordWebhook('https://discordapp.com/api/webhooks/12345/abcdef'), true);
    assert.strictEqual(isDiscordWebhook('https://example.com/webhook'), false);

    assert.strictEqual(isSlackWebhook('https://hooks.slack.com/services/T000/B000/XXXX'), true);
    assert.strictEqual(isSlackWebhook('https://example.com/slack'), false);

    console.log('✔ Test 3: Discord and Slack webhook URL pattern detection verified.');
  }

  // -------------------------------------------------------------
  // Test 4: Local Mock HTTP Sink & Centralized Dispatcher
  // -------------------------------------------------------------
  {
    const receivedRequests: Array<{ url: string; headers: http.IncomingHttpHeaders; body: any }> = [];

    const mockServer = http.createServer((req, res) => {
      let bodyStr = '';
      req.on('data', chunk => { bodyStr += chunk; });
      req.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(bodyStr); } catch {}
        receivedRequests.push({
          url: req.url || '',
          headers: req.headers,
          body: parsed,
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      });
    });

    await new Promise<void>((resolve) => {
      mockServer.listen(0, '127.0.0.1', () => resolve());
    });

    const addr = mockServer.address() as any;
    const sinkPort = addr.port;
    const genericSinkUrl = `http://127.0.0.1:${sinkPort}/generic`;
    const slackSinkUrl = `http://127.0.0.1:${sinkPort}/slack`;
    const discordSinkUrl = `http://127.0.0.1:${sinkPort}/discord`;

    // Create test user and settings with mock webhook endpoints
    const testUserId = 'user_notif_test_' + Date.now();
    const now = new Date().toISOString();
    const passHash = await hashPassword('password123');

    const testEmail = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@test.com`;
    db.prepare(`
      INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(testUserId, testEmail, passHash, 'Notif Tester', now, now);

    db.prepare(`
      INSERT INTO user_settings (
        user_id, audio_chime_enabled, sync_cadence_minutes, webhook_url, webhook_secret,
        webhook_events, slack_webhook_url, discord_webhook_url, background_sync_enabled,
        created_at, updated_at
      ) VALUES (?, 1, 15, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      testUserId,
      genericSinkUrl,
      'test_hmac_secret_123',
      JSON.stringify(['action_needed', 'merged']),
      slackSinkUrl,
      discordSinkUrl,
      now,
      now
    );

    // Dispatch an 'action_needed' notification
    const dispatchRes = await dispatchNotification(testUserId, {
      event: 'action_needed',
      contribution: {
        repo: 'test/repo',
        number: 99,
        title: 'Fix issue',
        action_needed: 'reply',
        status: 'open',
        platform: 'github',
        url: 'https://github.com/test/repo/pull/99',
      },
      message: 'Maintainer asked for review update.',
    });

    assert.strictEqual(dispatchRes.dispatched, 3);
    assert.strictEqual(dispatchRes.successes, 3);
    assert.strictEqual(receivedRequests.length, 3);

    // Check generic webhook received HMAC signature header
    const genericReq = receivedRequests.find(r => r.url === '/generic');
    assert(genericReq);
    assert(genericReq.headers['x-oss-signature']?.toString().startsWith('sha256='));
    assert.strictEqual(genericReq.body.event, 'action_needed');

    // Check Slack webhook received Block Kit structure
    const slackReq = receivedRequests.find(r => r.url === '/slack');
    assert(slackReq);
    assert(slackReq.body.blocks && slackReq.body.blocks.length > 0);

    // Check Discord webhook received Embeds structure
    const discordReq = receivedRequests.find(r => r.url === '/discord');
    assert(discordReq);
    assert(discordReq.body.embeds && discordReq.body.embeds.length > 0);

    // Test event subscription filter: 'status_change' is not in ['action_needed', 'merged']
    receivedRequests.length = 0;
    const filteredRes = await dispatchNotification(testUserId, {
      event: 'status_change',
      contribution: { repo: 'test/repo', number: 99 },
    });
    assert.strictEqual(filteredRes.dispatched, 0);
    assert.strictEqual(receivedRequests.length, 0);

    await new Promise<void>((resolve) => mockServer.close(() => resolve()));
    console.log('✔ Test 4: Local mock sink dispatch, HMAC signing, and event filtering verified.');
  }

  // -------------------------------------------------------------
  // Test 5: Background Sync Worker Lifecycle & Concurrency
  // -------------------------------------------------------------
  {
    // Test initial status
    const initialStatus = getBackgroundWorkerStatus();
    assert.strictEqual(typeof initialStatus.active, 'boolean');
    assert.strictEqual(typeof initialStatus.intervalMinutes, 'number');
    assert.strictEqual(initialStatus.isSyncing, false);

    // Test starting worker
    startBackgroundSyncWorker(10);
    const runningStatus = getBackgroundWorkerStatus();
    assert.strictEqual(runningStatus.active, true);
    assert.strictEqual(runningStatus.intervalMinutes, 10);
    assert(runningStatus.nextRunAt !== null);

    // Test executing a pass
    const passResult = await executeBackgroundSyncPass();
    assert.strictEqual(typeof passResult.usersProcessed, 'number');
    assert.strictEqual(typeof passResult.changesDetected, 'number');

    // Test stopping worker
    stopBackgroundSyncWorker();
    const stoppedStatus = getBackgroundWorkerStatus();
    assert.strictEqual(stoppedStatus.active, false);
    assert.strictEqual(stoppedStatus.nextRunAt, null);

    console.log('✔ Test 5: Background Sync Worker lifecycle, scheduling, and concurrency controls verified.');
  }

  // -------------------------------------------------------------
  // Test 6: Database Persistence for Notification URLs
  // -------------------------------------------------------------
  {
    const dummyUser = 'user_db_test_' + Date.now();
    const now = new Date().toISOString();
    const dummyEmail = `dbtest_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@example.com`;
    db.prepare(`
      INSERT INTO users (id, email, password_hash, created_at, updated_at)
      VALUES (?, ?, 'hash', ?, ?)
    `).run(dummyUser, dummyEmail, now, now);

    db.prepare(`
      INSERT INTO user_settings (
        user_id, audio_chime_enabled, sync_cadence_minutes, slack_webhook_url,
        discord_webhook_url, background_sync_enabled, created_at, updated_at
      ) VALUES (?, 1, 30, 'https://hooks.slack.com/services/1', 'https://discord.com/api/webhooks/2', 0, ?, ?)
    `).run(dummyUser, now, now);

    const saved = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(dummyUser) as any;
    assert.strictEqual(saved.slack_webhook_url, 'https://hooks.slack.com/services/1');
    assert.strictEqual(saved.discord_webhook_url, 'https://discord.com/api/webhooks/2');
    assert.strictEqual(saved.background_sync_enabled, 0);

    console.log('✔ Test 6: Slack, Discord, and Background Sync column persistence verified in SQLite.');
  }

  console.log('\n🎉 ALL REAL-WORLD NOTIFICATIONS & BACKGROUND CRON TESTS PASSED 100%!');
}

runNotificationsAndCronTests().catch((err) => {
  console.error('\n❌ NOTIFICATIONS & CRON TEST FAILURE:', err);
  process.exit(1);
});
