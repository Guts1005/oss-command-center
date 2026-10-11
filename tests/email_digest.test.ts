import http from 'http';
import assert from 'assert';
import axios from 'axios';
import crypto from 'crypto';
import { db, initDatabase } from '../server/db.js';
import { app } from '../server/index.js';
import { hashPassword, generateSessionToken } from '../server/security/crypto.js';
import {
  compileUserDigest,
  renderDigestHtml,
  renderDigestText
} from '../server/email/digest.js';
import {
  sendEmail,
  getActiveEmailProvider,
  getMockEmails,
  clearMockEmails
} from '../server/email/transporter.js';
import { executeBackgroundSyncPass } from '../server/sync/worker.js';

process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';

async function runEmailDigestTests() {
  console.log('=== Running Email Digest Engine Tests ===');
  initDatabase();

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}`;

  let testUserId = '';

  try {
    // -------------------------------------------------------------
    // Setup Test User and Test Contributions
    // -------------------------------------------------------------
    testUserId = crypto.randomUUID();
    const testEmail = `digest.${Date.now()}.${crypto.randomUUID().slice(0, 8)}@example.com`;
    const sessionToken = generateSessionToken();
    const now = new Date().toISOString();
    const oldDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
    const recentMergeDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(testUserId, testEmail, await hashPassword('TestPassword123!'), 'DigestDev', now, now);

    db.prepare(`
      INSERT INTO sessions (id, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).run(sessionToken, testUserId, new Date(Date.now() + 86400000).toISOString(), now);

    db.prepare(`
      INSERT INTO user_settings (
        user_id, audio_chime_enabled, sync_cadence_minutes, background_sync_enabled,
        email_digest_enabled, email_digest_cadence, email_digest_address, created_at, updated_at
      ) VALUES (?, 1, 30, 1, 1, 'weekly', 'custom.digest@example.org', ?, ?)
    `).run(testUserId, now, now);

    // Ingest Test Contributions:
    // 1. Action Needed (push-changes)
    db.prepare(`
      INSERT INTO contributions (
        user_id, id, platform, repo, number, title, type, url, author, status,
        action_needed, created_at, last_activity_at, last_synced_at, unread
      ) VALUES (?, ?, 'github', 'facebook/react', 101, 'Fix async scheduling bug', 'pr',
        'https://github.com/facebook/react/pull/101', 'testauthor', 'open',
        'push-changes', ?, ?, ?, 1)
    `).run(testUserId, crypto.randomUUID(), now, now, now);

    // 2. Action Needed (owe-reply)
    db.prepare(`
      INSERT INTO contributions (
        user_id, id, platform, repo, number, title, type, url, author, status,
        action_needed, created_at, last_activity_at, last_synced_at, unread
      ) VALUES (?, ?, 'gitlab', 'inkscape/inkscape', 45, 'Refactor bezier curve handles', 'mr',
        'https://gitlab.com/inkscape/inkscape/-/merge_requests/45', 'testauthor', 'open',
        'owe-reply', ?, ?, ?, 1)
    `).run(testUserId, crypto.randomUUID(), now, now, now);

    // 3. Awaiting Review (action_needed = none, stale > 14 days)
    db.prepare(`
      INSERT INTO contributions (
        user_id, id, platform, repo, number, title, type, url, author, status,
        action_needed, created_at, last_activity_at, last_synced_at, unread
      ) VALUES (?, ?, 'github', 'torvalds/linux', 789, 'eBPF verifier performance enhancement', 'pr',
        'https://github.com/torvalds/linux/pull/789', 'testauthor', 'open',
        'none', ?, ?, ?, 0)
    `).run(testUserId, crypto.randomUUID(), oldDate, oldDate, now);

    // 4. Recently Merged (within last 7 days)
    db.prepare(`
      INSERT INTO contributions (
        user_id, id, platform, repo, number, title, type, url, author, status,
        action_needed, created_at, last_activity_at, last_synced_at, unread
      ) VALUES (?, ?, 'github', 'google-deepmind/antigravity', 99, 'Add multi-agent routing telemetry', 'pr',
        'https://github.com/google-deepmind/antigravity/pull/99', 'testauthor', 'merged',
        'none', ?, ?, ?, 0)
    `).run(testUserId, crypto.randomUUID(), recentMergeDate, recentMergeDate, now);

    const authHeaders = {
      Cookie: `oss_session=${sessionToken}`,
      Authorization: `Bearer ${sessionToken}`
    };

    // -------------------------------------------------------------
    // Test 1: Compile Digest Data Aggregation
    // -------------------------------------------------------------
    {
      const summary = compileUserDigest(testUserId, 'weekly');
      assert.strictEqual(summary.user.id, testUserId);
      assert.strictEqual(summary.user.displayName, 'DigestDev');
      assert.strictEqual(summary.actionNeeded.length, 2);
      assert.strictEqual(summary.awaitingReview.length, 1);
      assert.strictEqual(summary.recentlyMerged.length, 1);
      assert.strictEqual(summary.staleItems.length, 1);
      assert.strictEqual(summary.stats.urgentActions, 2);
      assert.strictEqual(summary.stats.totalOpen, 3);
      assert.strictEqual(summary.stats.mergedThisPeriod, 1);

      console.log('✔ Test 1: Contribution digest data aggregation & grouping verified.');
    }

    // -------------------------------------------------------------
    // Test 2: HTML & Plain-Text Digest Template Rendering
    // -------------------------------------------------------------
    {
      const summary = compileUserDigest(testUserId, 'weekly');
      const html = renderDigestHtml(summary, 'http://localhost:3100');
      const text = renderDigestText(summary, 'http://localhost:3100');

      assert(html.includes('Weekly Contribution Digest'));
      assert(html.includes('DigestDev'));
      assert(html.includes('Fix async scheduling bug'));
      assert(html.includes('CHANGES REQUESTED'));
      assert(html.includes('REPLY NEEDED'));
      assert(html.includes('[MERGED]'));
      assert(html.includes('eBPF verifier performance enhancement'));

      assert(text.includes('WEEKLY CONTRIBUTION DIGEST'));
      assert(text.includes('URGENT ACTION ITEMS (2)'));
      assert(text.includes('[PUSH-CHANGES] facebook/react#101'));
      assert(text.includes('[MERGED] google-deepmind/antigravity#99'));

      console.log('✔ Test 2: HTML & Plain-Text email template rendering verified.');
    }

    // -------------------------------------------------------------
    // Test 3: Multi-Provider Email Transporter & Mock Sink
    // -------------------------------------------------------------
    {
      clearMockEmails();
      assert.strictEqual(getActiveEmailProvider(), 'mock');

      const res = await sendEmail({
        to: 'recipient@example.com',
        subject: 'Weekly Telemetry Report',
        html: '<strong>Digest Content</strong>',
        text: 'Digest Content'
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.provider, 'mock');
      assert(res.messageId?.startsWith('mock_'));

      const inbox = getMockEmails();
      assert.strictEqual(inbox.length, 1);
      assert.strictEqual(inbox[0].to, 'recipient@example.com');
      assert.strictEqual(inbox[0].subject, 'Weekly Telemetry Report');

      clearMockEmails();
      assert.strictEqual(getMockEmails().length, 0);

      console.log('✔ Test 3: Multi-provider transporter & dev mock sink verified.');
    }

    // -------------------------------------------------------------
    // Test 4: API Endpoint GET /api/digest/preview
    // -------------------------------------------------------------
    {
      // Unauthenticated access rejected
      try {
        await axios.get(`${baseUrl}/api/digest/preview`);
        assert.fail('Expected 401');
      } catch (err: any) {
        assert.strictEqual(err.response?.status, 401);
      }

      // Authenticated JSON preview
      const jsonRes = await axios.get(`${baseUrl}/api/digest/preview?cadence=weekly`, { headers: authHeaders });
      assert.strictEqual(jsonRes.status, 200);
      assert(jsonRes.data.summary);
      assert(jsonRes.data.html.includes('Weekly Contribution Digest'));
      assert(jsonRes.data.text.includes('WEEKLY CONTRIBUTION DIGEST'));

      // Authenticated HTML raw preview
      const htmlRes = await axios.get(`${baseUrl}/api/digest/preview?format=html`, { headers: authHeaders });
      assert.strictEqual(htmlRes.status, 200);
      assert(String(htmlRes.headers['content-type'] || '').includes('text/html'));
      assert(htmlRes.data.includes('<!DOCTYPE html>'));

      console.log('✔ Test 4: GET /api/digest/preview verified in JSON and raw HTML modes.');
    }

    // -------------------------------------------------------------
    // Test 5: API Endpoint POST /api/digest/test
    // -------------------------------------------------------------
    {
      clearMockEmails();

      const testSendRes = await axios.post(
        `${baseUrl}/api/digest/test`,
        { cadence: 'weekly', email: 'verified.test@example.com' },
        { headers: authHeaders }
      );

      assert.strictEqual(testSendRes.status, 200);
      assert.strictEqual(testSendRes.data.success, true);
      assert.strictEqual(testSendRes.data.targetEmail, 'verified.test@example.com');

      const mockInbox = getMockEmails();
      assert.strictEqual(mockInbox.length, 1);
      assert.strictEqual(mockInbox[0].to, 'verified.test@example.com');
      assert(mockInbox[0].subject.includes('[TEST]'));

      console.log('✔ Test 5: POST /api/digest/test successfully dispatched to mock sink.');
    }

    // -------------------------------------------------------------
    // Test 6: Settings Persistence for Email Digest Configuration
    // -------------------------------------------------------------
    {
      const updateRes = await axios.post(
        `${baseUrl}/api/settings`,
        {
          email_digest_enabled: true,
          email_digest_cadence: 'daily',
          email_digest_address: 'custom.destination@example.com'
        },
        { headers: authHeaders }
      );

      assert.strictEqual(updateRes.status, 200);
      assert.strictEqual(updateRes.data.settings.email_digest_enabled, true);
      assert.strictEqual(updateRes.data.settings.email_digest_cadence, 'daily');
      assert.strictEqual(updateRes.data.settings.email_digest_address, 'custom.destination@example.com');

      const getRes = await axios.get(`${baseUrl}/api/settings`, { headers: authHeaders });
      assert.strictEqual(getRes.data.settings.email_digest_enabled, true);
      assert.strictEqual(getRes.data.settings.email_digest_cadence, 'daily');
      assert.strictEqual(getRes.data.settings.email_digest_address, 'custom.destination@example.com');

      console.log('✔ Test 6: Email digest settings persistence verified in SQLite.');
    }

    // -------------------------------------------------------------
    // Test 7: Autonomous Cron Worker Due Digest Dispatch
    // -------------------------------------------------------------
    {
      clearMockEmails();

      // Set user's last_email_digest_at to 10 days ago (due for weekly digest)
      const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      db.prepare(`
        UPDATE user_settings
        SET email_digest_enabled = 1,
            email_digest_cadence = 'weekly',
            last_email_digest_at = ?
        WHERE user_id = ?
      `).run(pastDate, testUserId);

      // Execute background sync cycle
      await executeBackgroundSyncPass();

      // Check if email was dispatched by background worker
      const inbox = getMockEmails();
      const dispatchedRecord = inbox.find((e) => e.to === 'custom.destination@example.com');
      assert(dispatchedRecord, 'Expected test user to receive email digest from background worker');
      assert(dispatchedRecord.subject.includes('Weekly Contribution Briefing'));

      // Check that user_settings.last_email_digest_at was updated to now
      const updatedSettings = db.prepare('SELECT last_email_digest_at FROM user_settings WHERE user_id = ?').get(testUserId) as any;
      assert(updatedSettings.last_email_digest_at > pastDate);

      console.log('✔ Test 7: Background Sync Worker autonomous email digest trigger verified.');
    }

    console.log('\n🎉 ALL EMAIL DIGEST ENGINE TESTS PASSED 100%!\n');
  } finally {
    try {
      db.prepare('DELETE FROM contributions WHERE user_id = ?').run(testUserId);
      db.prepare('DELETE FROM user_settings WHERE user_id = ?').run(testUserId);
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(testUserId);
      db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
    } catch {
      // Ignore cleanup error
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

runEmailDigestTests().catch((err) => {
  console.error('❌ Email Digest Test suite failed:', err);
  process.exit(1);
});
