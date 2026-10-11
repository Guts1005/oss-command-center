import assert from 'node:assert';
import express from 'express';
import cookieParser from 'cookie-parser';
import { apiRouter } from '../server/routes/index.js';
import { initDatabase } from '../server/db.js';
import { Server } from 'http';

async function testApi() {
  console.log('🧪 Running OSS Command Center End-to-End API Integration Suite...\n');

  initDatabase();

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api', apiRouter);

  let server: Server;
  const port = await new Promise<number>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address() as any;
      resolve(addr.port);
    });
  });

  const BASE_URL = `http://localhost:${port}`;

  try {
    // Test 1: Unauthenticated visitor checks (Zero data leak)
    console.log('Test 1: Unauthenticated visitor safety check');
    const guestStatsRes = await fetch(`${BASE_URL}/api/stats`);
    assert.strictEqual(guestStatsRes.status, 200);
    const guestStats = await guestStatsRes.json();
    assert.strictEqual(guestStats.total, 0);
    assert.strictEqual(guestStats.actionNeeded, 0);

    const guestContribRes = await fetch(`${BASE_URL}/api/contributions`);
    assert.strictEqual(guestContribRes.status, 200);
    const guestContribs = await guestContribRes.json();
    assert(Array.isArray(guestContribs));
    assert.strictEqual(guestContribs.length, 0);

    const guestIngestRes = await fetch(`${BASE_URL}/api/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo: 'test/repo', number: 1 })
    });
    assert.strictEqual(guestIngestRes.status, 401);
    console.log('  ✓ Unauthenticated requests return zeroed metrics, empty lists, and 401 on mutations');

    // Test 2: Register & authenticate tenant session
    console.log('\nTest 2: Register & authenticate tenant session');
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'e2e_tester@domain.test',
        password: 'ValidPassword123!',
        displayName: 'E2ETester'
      })
    });
    assert.strictEqual(regRes.status, 201);
    const regData = await regRes.json();
    assert(regData.token, 'Expected token in register response');
    const authToken = regData.token;
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    };
    console.log('  ✓ Registered test tenant and obtained cryptographic session token');

    // Test 3: Ingest a contribution under authenticated tenant
    console.log('\nTest 3: POST /api/ingest with authentication');
    const ingestPayload = {
      platform: 'github',
      repo: 'google-deepmind/antigravity',
      number: 101,
      title: 'feat: add streaming execution kernel hooks',
      type: 'pr',
      url: 'https://github.com/google-deepmind/antigravity/pull/101',
      author: 'e2e_tester',
      status: 'open',
      action_needed: 'reply',
      difficulty: 'hard',
      bounty_amount: '$250',
      notes: 'Awaiting maintainer benchmark review'
    };

    const ingestRes = await fetch(`${BASE_URL}/api/ingest`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(ingestPayload)
    });
    assert.strictEqual(ingestRes.status, 201);
    const ingestData = await ingestRes.json();
    assert.strictEqual(ingestData.success, true);
    assert.strictEqual(ingestData.id, 'gh:google-deepmind/antigravity#101');
    console.log('  ✓ Ingested contribution gh:google-deepmind/antigravity#101 successfully');

    // Test 4: Query with search & filter as authenticated user
    console.log('\nTest 4: GET /api/contributions with filters');
    const queryRes = await fetch(`${BASE_URL}/api/contributions?search=antigravity&platform=github`, {
      headers: authHeaders
    });
    assert.strictEqual(queryRes.status, 200);
    const queryItems = await queryRes.json();
    assert(Array.isArray(queryItems));
    const found = queryItems.find((it: any) => it.id === 'gh:google-deepmind/antigravity#101');
    assert(found, 'Ingested contribution not found in query');
    assert.strictEqual(found.action_needed, 'reply');
    assert.strictEqual(found.bounty_amount, '$250');
    assert.strictEqual(found.unread, 1);
    console.log('  ✓ Found contribution with correct action_needed, bounty, and unread=1');

    // Test 5: Detail fetch & unread clearance
    console.log('\nTest 5: GET /api/contributions/:id marks read');
    const detailRes = await fetch(`${BASE_URL}/api/contributions/${encodeURIComponent('gh:google-deepmind/antigravity#101')}`, {
      headers: authHeaders
    });
    assert.strictEqual(detailRes.status, 200);
    const detailData = await detailRes.json();
    assert.strictEqual(detailData.item.id, 'gh:google-deepmind/antigravity#101');
    assert.strictEqual(detailData.item.unread, 0);
    assert(detailData.item.last_viewed_at !== null);
    console.log('  ✓ Detail fetched and unread automatically cleared (unread=0)');

    // Test 6: Update notes & triage action state
    console.log('\nTest 6: PATCH /api/contributions/:id/notes');
    const patchRes = await fetch(`${BASE_URL}/api/contributions/${encodeURIComponent('gh:google-deepmind/antigravity#101')}/notes`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        notes: 'Reviewed benchmark logs. Ready to push commit addressing review comments.',
        action_needed: 'push-changes'
      })
    });
    assert.strictEqual(patchRes.status, 200);
    const patchData = await patchRes.json();
    assert.strictEqual(patchData.item.action_needed, 'push-changes');
    assert.strictEqual(patchData.item.notes, 'Reviewed benchmark logs. Ready to push commit addressing review comments.');
    console.log('  ✓ Updated triage notes and changed action_needed to push-changes');

    // Test 7: Verify Zod schema validation reject invalid ingest
    console.log('\nTest 7: POST /api/ingest with invalid payload');
    const invalidRes = await fetch(`${BASE_URL}/api/ingest`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ repo: 'invalid' }) // missing required fields
    });
    assert.strictEqual(invalidRes.status, 400);
    console.log('  ✓ Invalid payload rejected with 400 Bad Request');

    console.log('\n🎉 ALL 7 END-TO-END INTEGRATION TESTS PASSED CLEANLY!\n');
  } finally {
    if (server!) {
      server.close();
    }
  }
}

testApi().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
