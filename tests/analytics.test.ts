// tests/analytics.test.ts
// Automated validation for GET /api/analytics velocity computations and multi-tenant isolation

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

  console.log('=== Running Analytics Velocity & Telemetry Tests ===');

  try {
    // Test 1: Unauthenticated request safety
    const unauthRes = await client.get('/api/analytics');
    if (unauthRes.status !== 200 || unauthRes.data.summary.total !== 0) {
      throw new Error(`Test 1 Failed: Unauthenticated request must return zeroed metrics, got: ${JSON.stringify(unauthRes.data)}`);
    }
    console.log('✔ Test 1: Unauthenticated request safely returns zeroed analytics.');

    // Test 2: Set up test user with seeded contributions & events
    const userId = 'analytics_test_user_' + Date.now();
    const token = generateSessionToken();
    const passHash = await hashPassword('TestPass123!');
    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 3600000).toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const twoDaysAgo = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const threeDaysAgo = new Date(Date.now() - 72 * 3600 * 1000).toISOString();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, `${userId}@example.com`, passHash, 'Analytics Dev', nowIso, nowIso);

    db.prepare(`
      INSERT INTO sessions (id, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).run(token, userId, expiresAt, nowIso);

    const prMergedId = 'pr-merged-' + Date.now();
    const prActiveId = 'pr-active-' + Date.now();
    const eventId = 'event-' + Date.now();

    // Seed 1 merged PR: took 48 hours to merge (3 days ago to 1 day ago)
    db.prepare(`
      INSERT INTO contributions (
        user_id, id, platform, repo, number, title, type, url, author, status,
        action_needed, created_at, last_activity_at, last_synced_at, unread
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId, prMergedId, 'github', 'octocat/Hello-World', 42, 'Add fast allocator', 'pr',
      'https://github.com/octocat/Hello-World/pull/42', 'testdev', 'merged',
      'none', threeDaysAgo, oneDayAgo, nowIso, 0
    );

    // Seed 1 review event on that merged PR: occurred 24 hours after creation (2 days ago)
    db.prepare(`
      INSERT INTO activity_events (
        id, user_id, contribution_id, actor, type, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      eventId, userId, prMergedId, 'senior-maintainer', 'review', twoDaysAgo
    );

    // Seed 1 active PR with changes requested
    db.prepare(`
      INSERT INTO contributions (
        user_id, id, platform, repo, number, title, type, url, author, status,
        action_needed, created_at, last_activity_at, last_synced_at, unread
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId, prActiveId, 'gitlab', 'inkscape/inkscape', 101, 'Fix canvas memory leak', 'pr',
      'https://gitlab.com/inkscape/inkscape/-/merge_requests/101', 'testdev', 'open',
      'push-changes', oneDayAgo, nowIso, nowIso, 1
    );

    // Query analytics with auth cookie
    const authRes = await client.get('/api/analytics', {
      headers: { Cookie: `oss_session=${token}` }
    });

    if (authRes.status !== 200) {
      throw new Error(`Test 2 Failed: Status ${authRes.status}, body: ${JSON.stringify(authRes.data)}`);
    }

    const { summary, velocity, platformBreakdown, topRepositories, heatmap } = authRes.data;

    // Verify summary
    if (summary.total !== 2 || summary.merged !== 1 || summary.actionNeeded !== 1) {
      throw new Error(`Test 2 Failed: Summary counts unexpected: ${JSON.stringify(summary)}`);
    }
    if (summary.acceptanceRate !== 100) {
      throw new Error(`Test 2 Failed: Acceptance rate should be 100% (1 merged, 0 closed), got: ${summary.acceptanceRate}`);
    }
    console.log('✔ Test 2: Summary metrics (total, merged, actionNeeded, acceptanceRate) calculated accurately.');

    // Verify velocity (48h merge time, 24h first review)
    if (velocity.medianTimeToMergeHours < 47 || velocity.medianTimeToMergeHours > 49) {
      throw new Error(`Test 2 Failed: Expected ~48h median merge time, got: ${velocity.medianTimeToMergeHours}`);
    }
    if (velocity.medianFirstReviewHours < 23 || velocity.medianFirstReviewHours > 25) {
      throw new Error(`Test 2 Failed: Expected ~24h first review turnaround, got: ${velocity.medianFirstReviewHours}`);
    }
    console.log(`✔ Test 3: Velocity metrics verified (Median merge: ${velocity.medianTimeToMergeHours}h, First review: ${velocity.medianFirstReviewHours}h).`);

    // Verify platform breakdown
    if (platformBreakdown.github !== 1 || platformBreakdown.gitlab !== 1) {
      throw new Error(`Test 4 Failed: Platform breakdown mismatch: ${JSON.stringify(platformBreakdown)}`);
    }
    console.log('✔ Test 4: Platform breakdown correctly attributes GitHub and GitLab PRs.');

    // Verify heatmap
    if (!Array.isArray(heatmap) || heatmap.length !== 365) {
      throw new Error(`Test 5 Failed: Heatmap array must contain 365 day entries, got: ${heatmap.length}`);
    }
    console.log('✔ Test 5: 365-day activity heatmap generated cleanly.');

    // Verify multi-tenant isolation (User B sees zero)
    const userBId = 'analytics_user_b_' + Date.now();
    const tokenB = generateSessionToken();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userBId, `${userBId}@example.com`, passHash, 'User B', nowIso, nowIso);
    db.prepare(`
      INSERT INTO sessions (id, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).run(tokenB, userBId, expiresAt, nowIso);

    const userBRes = await client.get('/api/analytics', {
      headers: { Cookie: `oss_session=${tokenB}` }
    });
    if (userBRes.data.summary.total !== 0 || userBRes.data.velocity.totalMergedEvaluated !== 0) {
      throw new Error(`Test 6 Failed: User B leaked User A analytics: ${JSON.stringify(userBRes.data)}`);
    }
    console.log('✔ Test 6: Multi-tenant isolation verified (User B has 0 metrics).');

    console.log('\nALL ANALYTICS TESTS PASSED WITH 100% ACCURACY AND SECURITY!\n');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error('❌ Analytics test failed:', err);
  process.exit(1);
});
