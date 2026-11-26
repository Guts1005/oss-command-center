process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';

import assert from 'node:assert';
import http from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import axios from 'axios';
import { initDatabase, db } from '../server/db.js';
import { apiRouter } from '../server/routes/index.js';
import { syncGitHub } from '../server/sync/github.js';
import { syncUser } from '../server/sync/multi_engine.js';

async function runTests() {
  console.log('=== Running PR Tracking, Merged Pagination & Security Tests ===\n');
  initDatabase();

  let failTrackUrlWith403 = false;
  let lastAuthHeaderSeen: string | undefined;

  // Mock GitHub API Server
  const mockGh = http.createServer((req, res) => {
    lastAuthHeaderSeen = req.headers['authorization'];
    const url = req.url || '';
    res.setHeader('Content-Type', 'application/json');

    if (url === '/user') {
      const auth = req.headers['authorization'] || '';
      if (auth === 'Bearer ghp_alice_valid') {
        res.end(JSON.stringify({ login: 'alice-dev', id: 101 }));
        return;
      }
      if (auth === 'Bearer ghp_bob_valid') {
        res.end(JSON.stringify({ login: 'bob-dev', id: 102 }));
        return;
      }
      res.statusCode = 401;
      res.end(JSON.stringify({ message: 'Bad credentials' }));
      return;
    }

    if (url.startsWith('/search/issues?')) {
      const parsed = new URL(url, 'http://localhost');
      const q = parsed.searchParams.get('q') || '';
      if (q.includes('is:merged')) {
        res.end(
          JSON.stringify({
            total_count: 2,
            items: [
              {
                id: 9001,
                number: 2084,
                title: 'fix(image-redactor): fix duplicate entity sorting',
                body: 'Merged PR body',
                state: 'closed',
                created_at: '2026-06-01T00:00:00Z',
                updated_at: '2026-06-21T05:54:43Z',
                html_url: 'https://github.com/data-privacy-stack/presidio/pull/2084',
                repository_url: 'https://api.github.com/repos/data-privacy-stack/presidio',
                user: { login: 'alice-dev' },
                pull_request: { merged_at: '2026-06-21T05:54:43Z' },
                labels: [],
              },
              {
                id: 9002,
                number: 12109,
                title: 'contrib: add explanatory message',
                body: 'Older merged PR beyond top 30',
                state: 'closed',
                created_at: '2026-05-01T00:00:00Z',
                updated_at: '2026-05-15T10:00:00Z',
                html_url: 'https://github.com/org/repo/pull/12109',
                repository_url: 'https://api.github.com/repos/org/repo',
                user: { login: 'alice-dev' },
                pull_request: { merged_at: '2026-05-15T10:00:00Z' },
                labels: [],
              },
            ],
          })
        );
        return;
      }

      // Active search returns an open PR whose initial CHANGES_REQUESTED was later APPROVED
      res.end(
        JSON.stringify({
          total_count: 1,
          items: [
            {
              id: 9003,
              number: 50,
              title: 'feat: open PR after re-approval',
              body: 'PR body',
              state: 'open',
              created_at: '2026-11-20T00:00:00Z',
              updated_at: '2026-11-25T10:00:00Z',
              html_url: 'https://github.com/org/repo/pull/50',
              repository_url: 'https://api.github.com/repos/org/repo',
              user: { login: 'alice-dev' },
              pull_request: {},
              labels: [],
            },
          ],
        })
      );
      return;
    }

    if (url === '/repos/data-privacy-stack/presidio/pulls/2084') {
      if (failTrackUrlWith403) {
        res.statusCode = 403;
        res.end(JSON.stringify({ message: 'API rate limit exceeded' }));
        return;
      }
      res.end(
        JSON.stringify({
          id: 9901,
          number: 2084,
          title: 'fix(image-redactor): fix duplicate entity sorting',
          body: 'PR description for presidio 2084',
          state: 'closed',
          merged: true,
          merged_at: '2026-06-21T05:54:43Z',
          merged_by: { login: 'maintainer-one' },
          created_at: '2026-06-01T00:00:00Z',
          updated_at: '2026-06-21T05:54:43Z',
          html_url: 'https://github.com/data-privacy-stack/presidio/pull/2084',
          user: { login: 'friend-author' },
        })
      );
      return;
    }

    if (url.startsWith('/repos/data-privacy-stack/presidio/issues/2084/comments')) {
      res.end(
        JSON.stringify([
          {
            id: 7001,
            user: { login: 'reviewer-a' },
            body: 'Looks good after fixing the test.',
            created_at: '2026-06-10T12:00:00Z',
          },
        ])
      );
      return;
    }

    if (url.startsWith('/repos/data-privacy-stack/presidio/pulls/2084/reviews')) {
      res.end(
        JSON.stringify([
          {
            id: 8001,
            user: { login: 'maintainer-one' },
            state: 'APPROVED',
            body: 'LGTM, merging now',
            submitted_at: '2026-06-21T05:50:00Z',
          },
        ])
      );
      return;
    }

    if (url.startsWith('/repos/data-privacy-stack/presidio/pulls/2084/comments')) {
      res.end(
        JSON.stringify([
          {
            id: 7501,
            user: { login: 'reviewer-a' },
            body: 'Nit: rename variable',
            created_at: '2026-06-09T09:00:00Z',
          },
        ])
      );
      return;
    }

    if (url.startsWith('/repos/org/repo/pulls/50/reviews')) {
      res.end(
        JSON.stringify([
          {
            id: 8101,
            user: { login: 'reviewer-a' },
            state: 'CHANGES_REQUESTED',
            body: 'Fix bug',
            submitted_at: '2026-11-21T10:00:00Z',
          },
          {
            id: 8102,
            user: { login: 'reviewer-a' },
            state: 'APPROVED',
            body: 'Fixed cleanly',
            submitted_at: '2026-11-24T10:00:00Z',
          },
        ])
      );
      return;
    }

    if (url.includes('/comments') || url.includes('/reviews')) {
      res.end(JSON.stringify([]));
      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ message: 'Not Found' }));
  });

  await new Promise<void>((r) => mockGh.listen(0, '127.0.0.1', r));
  const ghAddr = mockGh.address() as any;
  process.env.GITHUB_API_BASE_URL = `http://127.0.0.1:${ghAddr.port}`;

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api', apiRouter);

  const server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const appAddr = server.address() as any;
  const client = axios.create({
    baseURL: `http://127.0.0.1:${appAddr.port}/api`,
    validateStatus: () => true,
  });

  try {
    // Register tenant
    const reg = await client.post('/auth/register', {
      email: 'alice_track@test.internal',
      password: 'StrongPassword123!',
      displayName: 'alice_track',
    });
    assert.strictEqual(reg.status, 201);
    const authHeaders = { Authorization: `Bearer ${reg.data.token}` };

    // 1. Reject tokenless integration
    const noTokenRes = await client.post(
      '/integrations',
      { platform: 'github', username: 'friend-account' },
      { headers: authHeaders }
    );
    assert.strictEqual(noTokenRes.status, 400, `Expected 400 for tokenless integration, got ${noTokenRes.status}`);
    console.log('✔ Test 1: Rejected tokenless username-only integration (400)');

    // 2. Reject SSRF internal host for GitLab
    const ssrfHostRes = await client.post(
      '/integrations',
      { platform: 'gitlab', username: 'alice', token: 'glpat_123', host: 'http://127.0.0.1:9999' },
      { headers: authHeaders }
    );
    assert.strictEqual(ssrfHostRes.status, 400, `Expected 400 for private/non-https host, got ${ssrfHostRes.status}`);
    console.log('✔ Test 2: Rejected unsafe/internal host URL on GitLab integration (400)');

    // 3. Reject mismatched PAT ownership (alice token claiming bob username)
    const mismatchRes = await client.post(
      '/integrations',
      { platform: 'github', username: 'bob-dev', token: 'ghp_alice_valid' },
      { headers: authHeaders }
    );
    assert.strictEqual(mismatchRes.status, 403, `Expected 403 for mismatched username ownership, got ${mismatchRes.status}`);
    console.log('✔ Test 3: Rejected mismatched token vs username ownership (403)');

    // 4. Reject invalid PAT
    const badPatRes = await client.post(
      '/integrations',
      { platform: 'github', username: 'alice-dev', token: 'ghp_invalid_token' },
      { headers: authHeaders }
    );
    assert.strictEqual(badPatRes.status, 401, `Expected 401 for invalid PAT, got ${badPatRes.status}`);
    console.log('✔ Test 4: Rejected invalid/expired PAT (401)');

    // 5. Accept verified matching PAT
    const okIntRes = await client.post(
      '/integrations',
      { platform: 'github', username: 'alice-dev', token: 'ghp_alice_valid' },
      { headers: authHeaders }
    );
    assert.strictEqual(okIntRes.status, 201);
    assert.strictEqual(okIntRes.data.integration.has_token, true);
    console.log('✔ Test 5: Verified matching PAT accepted and stored cleanly (201)');

    // 6. Track URL when GitHub returns 403 MUST NOT insert fake stub
    failTrackUrlWith403 = true;
    const failTrackRes = await client.post(
      '/track-url',
      { url: 'https://github.com/data-privacy-stack/presidio/pull/2084' },
      { headers: authHeaders }
    );
    assert(failTrackRes.status >= 400, `Expected 4xx/5xx when GitHub returns 403, got ${failTrackRes.status}`);
    const checkNoStub = await client.get('/contributions/gh:data-privacy-stack/presidio%232084', { headers: authHeaders });
    assert.strictEqual(checkNoStub.status, 404, 'Must not store fake open stub when upstream fails');
    console.log('✔ Test 6: Track URL rejects 403 upstream failure cleanly without inserting fake open stub');

    // 7. Track URL uses user PAT and hydrates merged status + full history
    failTrackUrlWith403 = false;
    lastAuthHeaderSeen = undefined;
    const okTrackRes = await client.post(
      '/track-url',
      { url: 'https://github.com/data-privacy-stack/presidio/pull/2084' },
      { headers: authHeaders }
    );
    assert.strictEqual(okTrackRes.status, 201, `Expected 201, got ${okTrackRes.status}: ${JSON.stringify(okTrackRes.data)}`);
    assert.strictEqual(lastAuthHeaderSeen, 'Bearer ghp_alice_valid', 'Track URL must use user decrypted PAT');
    assert.strictEqual(okTrackRes.data.item.status, 'merged');
    assert.strictEqual(okTrackRes.data.item.author, 'friend-author');

    const detailRes = await client.get(
      `/contributions/${encodeURIComponent('gh:data-privacy-stack/presidio#2084')}`,
      { headers: authHeaders }
    );
    assert.strictEqual(detailRes.status, 200);
    assert(
      detailRes.data.events.length >= 4,
      `Expected full history (init + comment + review + review comment + merged), got ${detailRes.data.events.length}`
    );
    assert(detailRes.data.events.some((e: any) => e.actor === 'maintainer-one' && e.review_state === 'APPROVED'));
    console.log('✔ Test 7: Track URL uses user PAT and hydrates merged state + full PR timeline');

    // 8. syncGitHub includes merged PRs query AND clears superseded CHANGES_REQUESTED
    await syncGitHub(reg.data.user.id, 'ghp_alice_valid', 'alice-dev');
    const statsRes = await client.get('/stats', { headers: authHeaders });
    assert.strictEqual(statsRes.data.merged, 2, `Expected 2 merged PRs synced, got ${statsRes.data.merged}`);
    const openPr50 = await client.get(
      `/contributions/${encodeURIComponent('gh:org/repo#50')}`,
      { headers: authHeaders }
    );
    assert.strictEqual(openPr50.data.item.action_needed, 'none', 'Superseded CHANGES_REQUESTED should clear after APPROVED');
    console.log('✔ Test 8: GitHub sync includes merged PRs and handles superseded reviews cleanly');

    // 9. syncUser refuses legacy token-less rows instead of falling back to global server token
    process.env.GITHUB_TOKEN = 'ghp_global_server_secret';
    db.prepare(
      `UPDATE user_integrations SET encrypted_token = NULL, token_iv = NULL, token_auth_tag = NULL WHERE user_id = ?`
    ).run(reg.data.user.id);
    const syncRes = await syncUser(reg.data.user.id);
    assert.strictEqual(syncRes.status, 'partial');
    assert(syncRes.errors && syncRes.errors.length > 0);
    console.log('✔ Test 9: syncUser refuses token-less integration instead of borrowing server GITHUB_TOKEN');

    // 10. Reject IPv4-mapped IPv6 SSRF & GitHub ? query-injection URL
    for (const badHost of [
      'https://[::ffff:127.0.0.1]',
      'https://[::ffff:169.254.169.254]',
      'https://[::ffff:7f00:1]',
    ]) {
      const ipv6Ssrf = await client.post(
        '/integrations',
        { platform: 'gitlab', username: 'alice', token: 'glpat_123', host: badHost },
        { headers: authHeaders }
      );
      assert.strictEqual(ipv6Ssrf.status, 400, `Expected 400 for IPv6-mapped SSRF ${badHost}, got ${ipv6Ssrf.status}`);
    }
    const querySpoofRes = await client.post(
      '/track-url',
      { url: 'https://github.com/facebook/react?foo=/pull/1' },
      { headers: authHeaders }
    );
    assert.strictEqual(querySpoofRes.status, 400, `Expected 400 for query-spoofed URL, got ${querySpoofRes.status}`);
    console.log('✔ Test 10: Rejected IPv4-mapped IPv6 SSRF hosts and query-injected GitHub URLs (400)');

    // 11. Cross-tenant activity_events isolation when Tenant B tracks the exact same PR #2084
    const regB = await client.post('/auth/register', {
      email: 'bob_track@test.internal',
      password: 'StrongPassword123!',
      displayName: 'bob_track',
    });
    assert.strictEqual(regB.status, 201);
    const authHeadersB = { Authorization: `Bearer ${regB.data.token}` };
    await client.post(
      '/integrations',
      { platform: 'github', username: 'bob-dev', token: 'ghp_bob_valid' },
      { headers: authHeadersB }
    );
    const bobTrackRes = await client.post(
      '/track-url',
      { url: 'https://github.com/data-privacy-stack/presidio/pull/2084' },
      { headers: authHeadersB }
    );
    assert.strictEqual(bobTrackRes.status, 201);
    const aliceDetailAfter = await client.get(
      `/contributions/${encodeURIComponent('gh:data-privacy-stack/presidio#2084')}`,
      { headers: authHeaders }
    );
    assert(
      aliceDetailAfter.data.events.length >= 4,
      `Tenant A activity_events were clobbered by Tenant B! Remaining: ${aliceDetailAfter.data.events.length}`
    );
    console.log('✔ Test 11: Multi-tenant activity_events preserved cleanly across shared tracked PRs');

    // 12. GitLab host isolation: gitlab.com integration must NOT leak token to arbitrary public host
    await client.post(
      '/integrations',
      { platform: 'gitlab', username: 'alice-gl', token: 'glpat_secret_for_gitlab_com' },
      { headers: authHeaders }
    );
    const wrongHostTrack = await client.post(
      '/track-url',
      { url: 'https://attacker.example/org/proj/-/merge_requests/1' },
      { headers: authHeaders }
    );
    assert.strictEqual(wrongHostTrack.status, 400, `Expected 400 when GitLab host has no linked token, got ${wrongHostTrack.status}`);
    console.log('✔ Test 12: GitLab PAT strictly host-scoped; never leaked to unlinked GitLab hosts');

    console.log('\n🎉 ALL PR TRACKING & SECURITY TESTS PASSED!');
  } finally {
    delete process.env.GITHUB_API_BASE_URL;
    delete process.env.GITHUB_TOKEN;
    server.close();
    mockGh.close();
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
