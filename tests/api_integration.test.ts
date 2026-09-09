import assert from 'node:assert';

const BASE_URL = 'http://localhost:3100';

async function testApi() {
  console.log('🧪 Running OSS Command Center End-to-End API Integration Suite...\n');

  // Test 1: GET /api/stats
  console.log('Test 1: GET /api/stats');
  const statsRes = await fetch(`${BASE_URL}/api/stats`);
  assert.strictEqual(statsRes.status, 200);
  const stats = await statsRes.json();
  assert.strictEqual(typeof stats.total, 'number');
  assert.strictEqual(typeof stats.actionNeeded, 'number');
  assert.strictEqual(typeof stats.unreadCount, 'number');
  console.log('  ✓ /api/stats returned valid operational metrics');

  // Test 2: Ingest a contribution
  console.log('\nTest 2: POST /api/ingest');
  const ingestPayload = {
    platform: 'github',
    repo: 'google-deepmind/antigravity',
    number: 101,
    title: 'feat: add streaming execution kernel hooks',
    type: 'pr',
    url: 'https://github.com/google-deepmind/antigravity/pull/101',
    author: 'Guts1005',
    status: 'open',
    action_needed: 'reply',
    difficulty: 'hard',
    bounty_amount: '$250',
    notes: 'Awaiting maintainer benchmark review'
  };

  const ingestRes = await fetch(`${BASE_URL}/api/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ingestPayload)
  });
  assert.strictEqual(ingestRes.status, 201);
  const ingestData = await ingestRes.json();
  assert.strictEqual(ingestData.success, true);
  assert.strictEqual(ingestData.id, 'gh:google-deepmind/antigravity#101');
  console.log('  ✓ Ingested contribution gh:google-deepmind/antigravity#101 successfully');

  // Test 3: Query with search & filter
  console.log('\nTest 3: GET /api/contributions with filters');
  const queryRes = await fetch(`${BASE_URL}/api/contributions?search=antigravity&platform=github`);
  assert.strictEqual(queryRes.status, 200);
  const queryItems = await queryRes.json();
  assert(Array.isArray(queryItems));
  const found = queryItems.find((it: any) => it.id === 'gh:google-deepmind/antigravity#101');
  assert(found, 'Ingested contribution not found in query');
  assert.strictEqual(found.action_needed, 'reply');
  assert.strictEqual(found.bounty_amount, '$250');
  assert.strictEqual(found.unread, 1);
  console.log('  ✓ Found contribution with correct action_needed, bounty, and unread=1');

  // Test 4: Detail fetch & unread clearance
  console.log('\nTest 4: GET /api/contributions/:id marks read');
  const detailRes = await fetch(`${BASE_URL}/api/contributions/${encodeURIComponent('gh:google-deepmind/antigravity#101')}`);
  assert.strictEqual(detailRes.status, 200);
  const detailData = await detailRes.json();
  assert.strictEqual(detailData.item.id, 'gh:google-deepmind/antigravity#101');
  assert.strictEqual(detailData.item.unread, 0);
  assert(detailData.item.last_viewed_at !== null);
  console.log('  ✓ Detail fetched and unread automatically cleared (unread=0)');

  // Test 5: Update notes & triage action state
  console.log('\nTest 5: PATCH /api/contributions/:id/notes');
  const patchRes = await fetch(`${BASE_URL}/api/contributions/${encodeURIComponent('gh:google-deepmind/antigravity#101')}/notes`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
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

  // Test 6: Verify Zod schema validation reject invalid ingest
  console.log('\nTest 6: POST /api/ingest with invalid payload');
  const invalidRes = await fetch(`${BASE_URL}/api/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo: 'invalid' }) // missing required fields
  });
  assert.strictEqual(invalidRes.status, 400);
  console.log('  ✓ Invalid payload rejected with 400 Bad Request');

  console.log('\n🎉 ALL 6 END-TO-END INTEGRATION TESTS PASSED CLEANLY!\n');
}

testApi().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
