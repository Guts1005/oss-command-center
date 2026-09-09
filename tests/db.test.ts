import { initDatabase, db } from '../server/db.js';

console.log('=== Running Database Layer Tests ===');

initDatabase();

// 1. Test insertion
const testId = 'gh:test/repo#101';
db.prepare(`
  INSERT OR REPLACE INTO contributions (
    id, platform, repo, number, title, type, url, author, status,
    action_needed, difficulty, bounty_amount, created_at, last_activity_at,
    last_synced_at, unread, notes
  ) VALUES (
    ?, 'github', 'test/repo', 101, 'Fix buffer overflow in memory allocator',
    'pr', 'https://github.com/test/repo/pull/101', 'Guts1005', 'open',
    'reply', 'hard', '$300', '2026-09-09T00:00:00Z', '2026-09-09T01:00:00Z',
    '2026-09-09T01:05:00Z', 1, 'Initial triage note'
  )
`).run(testId);

const row = db.prepare('SELECT * FROM contributions WHERE id = ?').get(testId) as any;
if (!row || row.title !== 'Fix buffer overflow in memory allocator') {
  throw new Error('Assertion failed: Insertion not preserved');
}
console.log('✔ Contribution insertion passed');

// 2. Test event cascade
db.prepare(`
  INSERT OR REPLACE INTO activity_events (
    id, contribution_id, actor, type, body_excerpt, created_at
  ) VALUES (
    'ev_1', ?, 'maintainer_bob', 'review', 'Looks solid, please rebase', '2026-09-09T01:00:00Z'
  )
`).run(testId);

const event = db.prepare('SELECT * FROM activity_events WHERE contribution_id = ?').get(testId) as any;
if (!event || event.actor !== 'maintainer_bob') {
  throw new Error('Assertion failed: Event insertion failed');
}
console.log('✔ Activity event insertion passed');

// 3. Clean up test record
db.prepare('DELETE FROM contributions WHERE id = ?').run(testId);
const deleted = db.prepare('SELECT * FROM contributions WHERE id = ?').get(testId);
const cascadeEvents = db.prepare('SELECT * FROM activity_events WHERE contribution_id = ?').all(testId);

if (deleted || cascadeEvents.length > 0) {
  throw new Error('Assertion failed: Cascade deletion failed');
}
console.log('✔ Cascade deletion passed');

console.log('All DB unit tests passed successfully!\n');
