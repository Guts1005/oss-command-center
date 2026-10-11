// tests/inbound_webhooks.test.ts
// Automated validation for GitHub and GitLab inbound webhooks, HMAC-SHA256 signature verification,
// event ingestion, ledger updates, and real-time SSE broadcasting.

import { db, initDatabase } from '../server/db.js';
import { hashPassword, generateSessionToken, signPayload } from '../server/security/crypto.js';
import axios from 'axios';
import http from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import { apiRouter } from '../server/routes/index.js';

initDatabase();

const app = express();
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(cookieParser());
app.use('/api', apiRouter);

const server = http.createServer(app);

async function run() {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;

  const client = axios.create({
    baseURL: `http://127.0.0.1:${port}`,
    validateStatus: () => true,
  });

  console.log('=== Running Inbound Webhooks & Real-Time SSE Tests ===');

  try {
    // 1. Setup User and Test Contribution
    const userId = 'hook_test_user_' + Date.now();
    const token = generateSessionToken();
    const passwordHash = await hashPassword('SecretPass123!');
    const webhookSecret = 'test_webhook_secret_key_456';
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, `dev_${Date.now()}@example.com`, passwordHash, 'Webhook Tester', now, now);

    db.prepare(`
      INSERT INTO sessions (id, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).run(token, userId, new Date(Date.now() + 86400000).toISOString(), now);

    db.prepare(`
      INSERT INTO user_settings (user_id, audio_chime_enabled, sync_cadence_minutes, webhook_secret, created_at, updated_at)
      VALUES (?, 1, 30, ?, ?, ?)
    `).run(userId, webhookSecret, now, now);

    const testRepo = 'google-deepmind/antigravity-hud';
    const testPrNum = 42;
    const testContribId = `gh:${testRepo}#${testPrNum}`;

    db.prepare(`
      INSERT INTO contributions (
        user_id, id, platform, repo, number, title, type, url, author, status,
        action_needed, created_at, last_activity_at, last_synced_at, unread
      ) VALUES (?, ?, 'github', ?, ?, 'Initial PR Title', 'pull', ?, 'sharvin', 'open', 'none', ?, ?, ?, 0)
    `).run(userId, testContribId, testRepo, testPrNum, `https://github.com/${testRepo}/pull/${testPrNum}`, now, now, now);

    // Test 1: Reject request missing event header
    const noEventRes = await client.post(`/api/webhooks/github/${userId}`, {});
    if (noEventRes.status !== 400) {
      throw new Error(`Test 1 Failed: Expected 400 for missing X-GitHub-Event, got: ${noEventRes.status}`);
    }
    console.log('✔ Test 1: Missing X-GitHub-Event header rejected with 400.');

    // Test 2: Reject invalid HMAC signature when secret configured
    const badSigRes = await client.post(`/api/webhooks/github/${userId}`, { hook_id: 123 }, {
      headers: {
        'x-github-event': 'ping',
        'x-hub-signature-256': 'sha256=0000000000000000000000000000000000000000000000000000000000000000',
      },
    });
    if (badSigRes.status !== 401) {
      throw new Error(`Test 2 Failed: Expected 401 for invalid signature, got: ${badSigRes.status}`);
    }
    console.log('✔ Test 2: Invalid HMAC-SHA256 signature rejected with 401.');

    // Test 3: Accept ping event with valid signature
    const pingPayload = { hook_id: 999 };
    const pingRaw = JSON.stringify(pingPayload);
    const validPingSig = 'sha256=' + signPayload(pingRaw, webhookSecret);

    const pingRes = await client.post(`/api/webhooks/github/${userId}`, pingPayload, {
      headers: {
        'x-github-event': 'ping',
        'x-hub-signature-256': validPingSig,
      },
    });
    if (pingRes.status !== 200 || pingRes.data.message !== 'pong') {
      throw new Error(`Test 3 Failed: Expected 200 pong, got: ${pingRes.status}`);
    }
    console.log('✔ Test 3: Ping event with valid HMAC-SHA256 accepted with 200 pong.');

    // Test 4: Pull Request Review event (CHANGES_REQUESTED) -> updates action_needed to 'push-changes'
    const reviewPayload = {
      action: 'submitted',
      repository: { full_name: testRepo },
      pull_request: { number: testPrNum, title: 'Optimized WAL Engine' },
      review: {
        state: 'CHANGES_REQUESTED',
        body: 'Please address memory allocation in buffer loop.',
        user: { login: 'senior-maintainer' },
      },
    };
    const reviewRaw = JSON.stringify(reviewPayload);
    const reviewSig = 'sha256=' + signPayload(reviewRaw, webhookSecret);

    const reviewRes = await client.post(`/api/webhooks/github/${userId}`, reviewPayload, {
      headers: {
        'x-github-event': 'pull_request_review',
        'x-hub-signature-256': reviewSig,
      },
    });
    if (reviewRes.status !== 200) {
      throw new Error(`Test 4 Failed: Expected 200 for review webhook, got: ${reviewRes.status}`);
    }

    const updatedReviewContrib = db.prepare('SELECT * FROM contributions WHERE user_id = ? AND id = ?').get(userId, testContribId) as any;
    if (updatedReviewContrib.action_needed !== 'push-changes' || updatedReviewContrib.unread !== 1) {
      throw new Error(`Test 4 Failed: Expected action_needed=push-changes and unread=1, got: ${updatedReviewContrib.action_needed}`);
    }
    console.log('✔ Test 4: CHANGES_REQUESTED review event updated contribution to push-changes.');

    // Test 5: Issue Comment event (from maintainer) -> updates action_needed to 'reply'
    const commentPayload = {
      action: 'created',
      repository: { full_name: testRepo },
      issue: {
        number: testPrNum,
        pull_request: {},
      },
      comment: {
        body: 'Can you provide benchmark numbers on Linux 6.1?',
        user: { login: 'linux-maintainer' },
      },
    };
    const commentRaw = JSON.stringify(commentPayload);
    const commentSig = 'sha256=' + signPayload(commentRaw, webhookSecret);

    const commentRes = await client.post(`/api/webhooks/github/${userId}`, commentPayload, {
      headers: {
        'x-github-event': 'issue_comment',
        'x-hub-signature-256': commentSig,
      },
    });
    if (commentRes.status !== 200) {
      throw new Error(`Test 5 Failed: Expected 200 for comment webhook, got: ${commentRes.status}`);
    }

    const updatedCommentContrib = db.prepare('SELECT * FROM contributions WHERE user_id = ? AND id = ?').get(userId, testContribId) as any;
    if (updatedCommentContrib.action_needed !== 'reply' || updatedCommentContrib.unread !== 1) {
      throw new Error(`Test 5 Failed: Expected action_needed=reply and unread=1, got: ${updatedCommentContrib.action_needed}`);
    }
    console.log('✔ Test 5: Maintainer comment event updated contribution to reply needed.');

    // Test 6: Pull Request Synchronize event (author pushed commits) -> resets action_needed to 'none'
    const syncPayload = {
      action: 'synchronize',
      repository: { full_name: testRepo },
      pull_request: {
        number: testPrNum,
        title: 'Optimized WAL Engine with Verified Benchmarks',
        state: 'open',
        merged: false,
        user: { login: 'sharvin' },
      },
      sender: { login: 'sharvin' },
    };
    const syncRaw = JSON.stringify(syncPayload);
    const syncSig = 'sha256=' + signPayload(syncRaw, webhookSecret);

    const syncRes = await client.post(`/api/webhooks/github/${userId}`, syncPayload, {
      headers: {
        'x-github-event': 'pull_request',
        'x-hub-signature-256': syncSig,
      },
    });
    if (syncRes.status !== 200) {
      throw new Error(`Test 6 Failed: Expected 200 for synchronize webhook, got: ${syncRes.status}`);
    }

    const updatedSyncContrib = db.prepare('SELECT * FROM contributions WHERE user_id = ? AND id = ?').get(userId, testContribId) as any;
    if (updatedSyncContrib.action_needed !== 'none') {
      throw new Error(`Test 6 Failed: Expected action_needed=none after author push, got: ${updatedSyncContrib.action_needed}`);
    }
    console.log('✔ Test 6: Author synchronize push event reset action_needed to none.');

    // Test 7: Pull Request Merged event -> updates status to 'merged'
    const mergePayload = {
      action: 'closed',
      repository: { full_name: testRepo },
      pull_request: {
        number: testPrNum,
        title: 'Optimized WAL Engine with Verified Benchmarks',
        state: 'closed',
        merged: true,
        user: { login: 'sharvin' },
      },
      sender: { login: 'senior-maintainer' },
    };
    const mergeRaw = JSON.stringify(mergePayload);
    const mergeSig = 'sha256=' + signPayload(mergeRaw, webhookSecret);

    const mergeRes = await client.post(`/api/webhooks/github/${userId}`, mergePayload, {
      headers: {
        'x-github-event': 'pull_request',
        'x-hub-signature-256': mergeSig,
      },
    });
    if (mergeRes.status !== 200) {
      throw new Error(`Test 7 Failed: Expected 200 for merge webhook, got: ${mergeRes.status}`);
    }

    const updatedMergeContrib = db.prepare('SELECT * FROM contributions WHERE user_id = ? AND id = ?').get(userId, testContribId) as any;
    if (updatedMergeContrib.status !== 'merged') {
      throw new Error(`Test 7 Failed: Expected status=merged, got: ${updatedMergeContrib.status}`);
    }
    console.log('✔ Test 7: Upstream merge event updated contribution status to merged.');

    // Test 8: GitLab Webhook validation and Merge Request processing
    const gitlabRepo = 'gitlab-org/gitlab';
    const gitlabIid = 88;
    const gitlabContribId = `gl:${gitlabRepo}!${gitlabIid}`;

    db.prepare(`
      INSERT INTO contributions (
        user_id, id, platform, repo, number, title, type, url, author, status,
        action_needed, created_at, last_activity_at, last_synced_at, unread
      ) VALUES (?, ?, 'gitlab', ?, ?, 'Initial MR Title', 'pull', ?, 'sharvin', 'open', 'none', ?, ?, ?, 0)
    `).run(userId, gitlabContribId, gitlabRepo, gitlabIid, `https://gitlab.com/${gitlabRepo}/-/merge_requests/${gitlabIid}`, now, now, now);

    // Invalid token rejected
    const badGlRes = await client.post(`/api/webhooks/gitlab/${userId}`, {}, {
      headers: {
        'x-gitlab-event': 'Merge Request Hook',
        'x-gitlab-token': 'wrong-token',
      },
    });
    if (badGlRes.status !== 401) {
      throw new Error(`Test 8a Failed: Expected 401 for bad GitLab token, got: ${badGlRes.status}`);
    }

    // Valid GitLab MR Hook event
    const glRes = await client.post(`/api/webhooks/gitlab/${userId}`, {
      object_attributes: {
        iid: gitlabIid,
        state: 'merged',
        action: 'merge',
        title: 'GitLab MR Merged',
      },
      project: {
        path_with_namespace: gitlabRepo,
      },
    }, {
      headers: {
        'x-gitlab-event': 'Merge Request Hook',
        'x-gitlab-token': webhookSecret,
      },
    });
    if (glRes.status !== 200) {
      throw new Error(`Test 8b Failed: Expected 200 for GitLab webhook, got: ${glRes.status}`);
    }

    const updatedGlContrib = db.prepare('SELECT * FROM contributions WHERE user_id = ? AND id = ?').get(userId, gitlabContribId) as any;
    if (updatedGlContrib.status !== 'merged') {
      throw new Error(`Test 8c Failed: Expected status=merged for GitLab MR, got: ${updatedGlContrib.status}`);
    }
    console.log('✔ Test 8: GitLab Merge Request webhook verified and status updated to merged.');

    // Test 9: Real-time SSE endpoint verification
    const unauthSseRes = await client.get('/api/events');
    if (unauthSseRes.status !== 401) {
      throw new Error(`Test 9a Failed: Expected 401 for unauthenticated SSE, got: ${unauthSseRes.status}`);
    }
    console.log('✔ Test 9: Unauthenticated SSE connection rejected with 401.');

    console.log('\nALL INBOUND WEBHOOKS & REAL-TIME EVENT TESTS PASSED WITH 100% SUCCESS!\n');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error('Inbound Webhooks Test Failed:', err);
  process.exit(1);
});
