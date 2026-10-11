// tests/pr_actions.test.ts
// Automated validation for direct in-app PR actions: commenting, re-requesting reviews, and targeted single-item sync.

import { db, initDatabase } from '../server/db.js';
import { hashPassword, generateSessionToken, encryptSecret } from '../server/security/crypto.js';
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

// Mock server to intercept external GitHub API calls during tests
let githubCalls: { url: string; method: string; body: any; headers: any }[] = [];
const githubMockApp = express();
githubMockApp.use(express.json());

githubMockApp.post('/repos/:owner/:repo/issues/:number/comments', (req, res) => {
  githubCalls.push({ url: req.url, method: 'POST', body: req.body, headers: req.headers });
  res.status(201).json({ id: 101, body: req.body.body, created_at: new Date().toISOString() });
});

githubMockApp.post('/repos/:owner/:repo/pulls/:number/requested_reviewers', (req, res) => {
  githubCalls.push({ url: req.url, method: 'POST', body: req.body, headers: req.headers });
  res.status(201).json({ requested_reviewers: req.body.reviewers });
});

githubMockApp.get('/repos/:owner/:repo/pulls/:number', (req, res) => {
  githubCalls.push({ url: req.url, method: 'GET', body: null, headers: req.headers });
  res.status(200).json({
    number: parseInt(req.params.number, 10),
    title: 'Upstream PR Title Refreshed',
    state: 'open',
    merged: false,
    updated_at: new Date().toISOString(),
  });
});

const githubMockServer = http.createServer(githubMockApp);

async function run() {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  await new Promise<void>((resolve) => githubMockServer.listen(0, resolve));

  const port = (server.address() as any).port;
  const mockPort = (githubMockServer.address() as any).port;

  // Intercept external calls to api.github.com and redirect to local mock server
  const originalAxiosPost = axios.post;
  const originalAxiosGet = axios.get;

  axios.post = (async (url: string, data?: any, config?: any) => {
    if (typeof url === 'string' && url.startsWith('https://api.github.com/')) {
      const redirected = url.replace('https://api.github.com/', `http://127.0.0.1:${mockPort}/`);
      return originalAxiosPost(redirected, data, config);
    }
    return originalAxiosPost(url, data, config);
  }) as any;

  axios.get = (async (url: string, config?: any) => {
    if (typeof url === 'string' && url.startsWith('https://api.github.com/')) {
      const redirected = url.replace('https://api.github.com/', `http://127.0.0.1:${mockPort}/`);
      return originalAxiosGet(redirected, config);
    }
    return originalAxiosGet(url, config);
  }) as any;

  const client = axios.create({
    baseURL: `http://127.0.0.1:${port}`,
    validateStatus: () => true,
  });

  console.log('=== Running Direct In-App PR Actions Tests ===');

  try {
    const userId = 'pr_action_user_' + Date.now();
    const token = generateSessionToken();
    const passwordHash = await hashPassword('SecretPass123!');
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, `action_user_${Date.now()}@example.com`, passwordHash, 'Action Tester', now, now);

    db.prepare(`
      INSERT INTO sessions (id, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).run(token, userId, new Date(Date.now() + 86400000).toISOString(), now);

    const testRepo = 'facebook/react';
    const testPrNum = 301;
    const testContribId = `gh:${testRepo}#${testPrNum}`;

    db.prepare(`
      INSERT INTO contributions (
        user_id, id, platform, repo, number, title, type, url, author, status,
        action_needed, created_at, last_activity_at, last_synced_at, unread
      ) VALUES (?, ?, 'github', ?, ?, 'Suspense Stream Optimization', 'pull', ?, 'sharvin', 'open', 'reply', ?, ?, ?, 1)
    `).run(userId, testContribId, testRepo, testPrNum, `https://github.com/${testRepo}/pull/${testPrNum}`, now, now, now);

    // Test 1: Unauthenticated request rejected
    const unauthRes = await client.post(`/api/contributions/${encodeURIComponent(testContribId)}/actions/comment`, { comment: 'Hello' });
    if (unauthRes.status !== 401) {
      throw new Error(`Test 1 Failed: Expected 401 for unauthenticated caller, got: ${unauthRes.status}`);
    }
    console.log('✔ Test 1: Unauthenticated action request rejected with 401.');

    // Authenticated client helper
    const authHeaders = {
      Cookie: `oss_session=${token}`,
    };

    // Test 2: Reject empty comment
    const emptyCommentRes = await client.post(
      `/api/contributions/${encodeURIComponent(testContribId)}/actions/comment`,
      { comment: '   ' },
      { headers: authHeaders }
    );
    if (emptyCommentRes.status !== 400) {
      throw new Error(`Test 2 Failed: Expected 400 for empty comment, got: ${emptyCommentRes.status}`);
    }
    console.log('✔ Test 2: Empty comment rejected with 400.');

    // Test 3: Reject when no integration exists
    const noTokenRes = await client.post(
      `/api/contributions/${encodeURIComponent(testContribId)}/actions/comment`,
      { comment: 'Testing without token' },
      { headers: authHeaders }
    );
    if (noTokenRes.status !== 400) {
      throw new Error(`Test 3 Failed: Expected 400 for missing token, got: ${noTokenRes.status}`);
    }
    console.log('✔ Test 3: Missing integration token rejected with 400.');

    // Store encrypted GitHub token for user
    const pat = 'ghp_mock_personal_access_token_12345';
    const enc = encryptSecret(pat);
    db.prepare(`
      INSERT INTO user_integrations (
        id, user_id, platform, username, host, encrypted_token, token_iv, token_auth_tag,
        last_synced_at, sync_status, created_at
      ) VALUES (?, ?, 'github', 'sharvin', 'https://github.com', ?, ?, ?, ?, 'idle', ?)
    `).run('integ_' + Date.now(), userId, enc.ciphertext, enc.iv, enc.authTag, now, now);

    // Test 4: Successfully post comment to PR
    githubCalls = [];
    const validCommentRes = await client.post(
      `/api/contributions/${encodeURIComponent(testContribId)}/actions/comment`,
      { comment: 'Benchmarked with 10k items. Render latency reduced to 1.2ms.' },
      { headers: authHeaders }
    );
    if (validCommentRes.status !== 200 || !validCommentRes.data.success) {
      throw new Error(`Test 4 Failed: Expected 200 for valid comment, got: ${validCommentRes.status}`);
    }

    if (githubCalls.length === 0 || !githubCalls[0].url.includes(`/repos/${testRepo}/issues/${testPrNum}/comments`)) {
      throw new Error('Test 4 Failed: Upstream GitHub comment endpoint was not called');
    }

    // Verify database state: action_needed was reset to 'none' because author replied
    const contribAfterComment = db.prepare('SELECT * FROM contributions WHERE user_id = ? AND id = ?').get(userId, testContribId) as any;
    if (contribAfterComment.action_needed !== 'none') {
      throw new Error(`Test 4 Failed: Expected action_needed=none, got: ${contribAfterComment.action_needed}`);
    }

    // Verify activity event ledger contains the comment
    const events = db.prepare('SELECT * FROM activity_events WHERE user_id = ? AND contribution_id = ?').all(userId, testContribId) as any[];
    const commentEvent = events.find((e) => e.type === 'comment');
    if (!commentEvent || !commentEvent.body_excerpt.includes('Benchmarked with 10k items')) {
      throw new Error('Test 4 Failed: Activity event ledger did not record comment');
    }
    console.log('✔ Test 4: Successfully posted comment upstream and updated activity ledger.');

    // Test 5: Re-request review from maintainers
    githubCalls = [];
    const reviewReqRes = await client.post(
      `/api/contributions/${encodeURIComponent(testContribId)}/actions/request-review`,
      { reviewers: ['danabramov'] },
      { headers: authHeaders }
    );
    if (reviewReqRes.status !== 200 || !reviewReqRes.data.success) {
      throw new Error(`Test 5 Failed: Expected 200 for review request, got: ${reviewReqRes.status}`);
    }

    if (githubCalls.length === 0 || !githubCalls[0].url.includes(`/repos/${testRepo}/pulls/${testPrNum}/requested_reviewers`)) {
      throw new Error('Test 5 Failed: Upstream requested_reviewers endpoint was not called');
    }

    const contribAfterReviewReq = db.prepare('SELECT * FROM contributions WHERE user_id = ? AND id = ?').get(userId, testContribId) as any;
    if (contribAfterReviewReq.status !== 'awaiting-reply') {
      throw new Error(`Test 5 Failed: Expected status=awaiting-reply, got: ${contribAfterReviewReq.status}`);
    }
    console.log('✔ Test 5: Successfully re-requested maintainer review upstream.');

    // Test 6: Targeted single-item sync
    githubCalls = [];
    const syncRes = await client.post(
      `/api/contributions/${encodeURIComponent(testContribId)}/actions/sync`,
      {},
      { headers: authHeaders }
    );
    if (syncRes.status !== 200 || !syncRes.data.success) {
      throw new Error(`Test 6 Failed: Expected 200 for targeted sync, got: ${syncRes.status}`);
    }

    if (githubCalls.length === 0 || !githubCalls[0].url.includes(`/repos/${testRepo}/pulls/${testPrNum}`)) {
      throw new Error('Test 6 Failed: Upstream single PR fetch endpoint was not called');
    }

    const contribAfterSync = db.prepare('SELECT * FROM contributions WHERE user_id = ? AND id = ?').get(userId, testContribId) as any;
    if (contribAfterSync.title !== 'Upstream PR Title Refreshed') {
      throw new Error(`Test 6 Failed: Expected refreshed title, got: ${contribAfterSync.title}`);
    }
    console.log('✔ Test 6: Successfully performed targeted single-item sync from upstream.');

    console.log('\nALL DIRECT PR ACTIONS INTEGRATION TESTS PASSED WITH 100% SUCCESS!\n');
  } finally {
    // Restore original axios
    axios.post = originalAxiosPost;
    axios.get = originalAxiosGet;
    server.close();
    githubMockServer.close();
  }
}

run().catch((err) => {
  console.error('Direct PR Actions Test Failed:', err);
  process.exit(1);
});
