// tests/repositories.test.ts
// Automated validation for GET /api/repositories ecosystem aggregation and multi-tenant isolation

import { db, initDatabase } from '../server/db.js';
import { hashPassword, generateSessionToken } from '../server/security/crypto.js';
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

async function run() {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const client = axios.create({
    baseURL: `http://127.0.0.1:${port}`,
    validateStatus: () => true
  });

  console.log('=== Running Repositories Ecosystem Endpoint Tests ===');

  try {
    // Test 1: Unauthenticated request safety
    const unauthRes = await client.get('/api/repositories');
    if (unauthRes.status !== 200 || !Array.isArray(unauthRes.data) || unauthRes.data.length !== 0) {
      throw new Error(`Test 1 Failed: Unauthenticated request must return empty array, got: ${JSON.stringify(unauthRes.data)}`);
    }
    console.log('✔ Test 1: Unauthenticated request safely returns empty list.');

    // Test 2: Set up test user with seeded contributions & events across two distinct repositories
    const userId = 'repo_test_user_' + Date.now();
    const token = generateSessionToken();
    const passHash = await hashPassword('RepoPass123!');
    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 3600000).toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const twoDaysAgo = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const threeDaysAgo = new Date(Date.now() - 72 * 3600 * 1000).toISOString();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, `${userId}@example.com`, passHash, 'Repo Dev', nowIso, nowIso);

    db.prepare(`
      INSERT INTO sessions (id, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).run(token, userId, expiresAt, nowIso);

    // Repo 1: facebook/react (GitHub) with 2 contributions
    // PR 1: merged, created 3 days ago, reviewed 2.5 hours later (Fast)
    const pr1Id = 'repo-pr-1-' + Date.now();
    db.prepare(`
      INSERT INTO contributions (
        user_id, id, platform, repo, number, title, type, url, author, status,
        action_needed, created_at, last_activity_at, last_synced_at, unread
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId, pr1Id, 'github', 'facebook/react', 1001, 'Fix hydration diff', 'pr',
      'https://github.com/facebook/react/pull/1001', 'repodev', 'merged',
      'none', threeDaysAgo, twoDaysAgo, nowIso, 0
    );

    const reviewTimePr1 = new Date(new Date(threeDaysAgo).getTime() + 2.5 * 3600 * 1000).toISOString();
    db.prepare(`
      INSERT INTO activity_events (
        id, user_id, contribution_id, actor, type, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'rev-1-' + Date.now(), userId, pr1Id, 'gaearon', 'review', reviewTimePr1
    );

    // PR 2: open, no action needed
    const pr2Id = 'repo-pr-2-' + Date.now();
    db.prepare(`
      INSERT INTO contributions (
        user_id, id, platform, repo, number, title, type, url, author, status,
        action_needed, created_at, last_activity_at, last_synced_at, unread
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId, pr2Id, 'github', 'facebook/react', 1002, 'Improve docs on transitions', 'pr',
      'https://github.com/facebook/react/pull/1002', 'repodev', 'open',
      'none', oneDayAgo, nowIso, nowIso, 0
    );

    // Repo 2: inkscape/inkscape (GitLab) with 1 contribution with action needed
    const pr3Id = 'repo-pr-3-' + Date.now();
    db.prepare(`
      INSERT INTO contributions (
        user_id, id, platform, repo, number, title, type, url, author, status,
        action_needed, created_at, last_activity_at, last_synced_at, unread
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId, pr3Id, 'gitlab', 'inkscape/inkscape', 505, 'Refactor path tool', 'pr',
      'https://gitlab.com/inkscape/inkscape/-/merge_requests/505', 'repodev', 'open',
      'push-changes', twoDaysAgo, nowIso, nowIso, 1
    );

    // Query repositories endpoint with auth
    const authRes = await client.get('/api/repositories', {
      headers: { Cookie: `oss_session=${token}` }
    });

    if (authRes.status !== 200) {
      throw new Error(`Test 2 Failed: Status ${authRes.status}, body: ${JSON.stringify(authRes.data)}`);
    }

    const repos = authRes.data;
    if (!Array.isArray(repos) || repos.length !== 2) {
      throw new Error(`Test 2 Failed: Expected 2 tracked repositories, got: ${JSON.stringify(repos)}`);
    }

    const reactRepo = repos.find((r: any) => r.repo === 'facebook/react');
    const inkscapeRepo = repos.find((r: any) => r.repo === 'inkscape/inkscape');

    if (!reactRepo || !inkscapeRepo) {
      throw new Error('Test 2 Failed: Missing expected repositories in response');
    }

    // Check facebook/react metrics
    if (reactRepo.totalContributions !== 2 || reactRepo.openContributions !== 1 || reactRepo.mergedContributions !== 1) {
      throw new Error(`Test 2 Failed: facebook/react counts unexpected: ${JSON.stringify(reactRepo)}`);
    }
    if (reactRepo.responsiveness !== 'Fast') {
      throw new Error(`Test 2 Failed: facebook/react responsiveness should be Fast (2.5h), got: ${reactRepo.responsiveness}`);
    }
    if (reactRepo.medianFirstReviewHours !== 2.5) {
      throw new Error(`Test 2 Failed: Expected medianFirstReviewHours 2.5, got: ${reactRepo.medianFirstReviewHours}`);
    }
    if (reactRepo.platform !== 'github' || reactRepo.url !== 'https://github.com/facebook/react') {
      throw new Error(`Test 2 Failed: URL or platform mismatch: ${reactRepo.url}`);
    }
    console.log('✔ Test 2: facebook/react metrics, responsiveness (Fast: 2.5h), and URL verified.');

    // Check inkscape/inkscape metrics
    if (inkscapeRepo.totalContributions !== 1 || inkscapeRepo.actionNeededCount !== 1) {
      throw new Error(`Test 3 Failed: inkscape/inkscape counts unexpected: ${JSON.stringify(inkscapeRepo)}`);
    }
    if (inkscapeRepo.health !== 'Attention Required') {
      throw new Error(`Test 3 Failed: inkscape/inkscape health should be Attention Required, got: ${inkscapeRepo.health}`);
    }
    if (inkscapeRepo.platform !== 'gitlab' || inkscapeRepo.url !== 'https://gitlab.com/inkscape/inkscape') {
      throw new Error(`Test 3 Failed: GitLab URL mismatch: ${inkscapeRepo.url}`);
    }
    console.log('✔ Test 3: inkscape/inkscape health (Attention Required) and GitLab platform verified.');

    // Test 4: Multi-tenant isolation (User B sees zero repositories)
    const userBId = 'repo_user_b_' + Date.now();
    const tokenB = generateSessionToken();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userBId, `${userBId}@example.com`, passHash, 'User B', nowIso, nowIso);
    db.prepare(`
      INSERT INTO sessions (id, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).run(tokenB, userBId, expiresAt, nowIso);

    const userBRes = await client.get('/api/repositories', {
      headers: { Cookie: `oss_session=${tokenB}` }
    });
    if (!Array.isArray(userBRes.data) || userBRes.data.length !== 0) {
      throw new Error(`Test 4 Failed: Multi-tenant breach! User B saw repositories: ${JSON.stringify(userBRes.data)}`);
    }
    console.log('✔ Test 4: Multi-tenant isolation verified (Zero repository data leakage).');

    console.log('\nALL REPOSITORY ENDPOINT TESTS PASSED WITH 100% ACCURACY AND ISOLATION!\n');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error('❌ Repository test failed:', err);
  process.exit(1);
});
