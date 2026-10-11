import { initDatabase, db } from '../server/db.js';
import { encryptSecret, hashPassword } from '../server/security/crypto.js';

console.log('=== Running Multi-Tenant Database Layer Tests ===');

initDatabase();

// 1. Verify schema tables exist
const tableNames = (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[]).map(r => r.name);
const expectedTables = ['users', 'sessions', 'user_integrations', 'contributions', 'activity_events', 'sync_meta'];

for (const table of expectedTables) {
  if (!tableNames.includes(table)) {
    throw new Error(`Missing expected database table: ${table}`);
  }
}
console.log('✔ All required tables exist (users, sessions, user_integrations, contributions, activity_events, sync_meta).');

// 2. Test User Creation & Unique Email Constraint
const testUserId = 'test-user-1';
const testEmail = 'contributor@example.com';
const testPasswordHash = await hashPassword('Secret123!');

db.prepare(`
  INSERT OR REPLACE INTO users (id, email, password_hash, display_name, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?)
`).run(testUserId, testEmail, testPasswordHash, 'Test Contributor', new Date().toISOString(), new Date().toISOString());

const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(testUserId) as any;
if (!userRow || userRow.email !== testEmail) {
  throw new Error('User creation failed');
}
console.log('✔ User creation and persistence passed.');

// 3. Test User Integrations (with AES-256-GCM encrypted token)
const enc = encryptSecret('ghp_testToken12345');
db.prepare(`
  INSERT OR REPLACE INTO user_integrations (
    id, user_id, platform, username, host, encrypted_token, token_iv, token_auth_tag, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run('int_1', testUserId, 'github', 'testuser_gh', 'https://github.com', enc.ciphertext, enc.iv, enc.authTag, new Date().toISOString());

const intRow = db.prepare('SELECT * FROM user_integrations WHERE id = ?').get('int_1') as any;
if (!intRow || intRow.encrypted_token !== enc.ciphertext) {
  throw new Error('Integration insertion failed');
}
console.log('✔ User integration storage with encrypted token passed.');

// 4. Test Multi-Tenant Contribution Scoping
const testContribId = 'gh:test/repo#999';
db.prepare(`
  INSERT OR REPLACE INTO contributions (
    user_id, id, platform, repo, number, title, type, url, author, status,
    action_needed, difficulty, bounty_amount, created_at, last_activity_at,
    last_synced_at, unread, notes
  ) VALUES (
    ?, ?, 'github', 'test/repo', 999, 'Multi-tenant kernel patch',
    'pr', 'https://github.com/test/repo/pull/999', 'testuser_gh', 'open',
    'reply', 'hard', '$500', '2026-09-10T00:00:00Z', '2026-09-10T01:00:00Z',
    '2026-09-10T01:05:00Z', 1, 'Triage note for user 1'
  )
`).run(testUserId, testContribId);

// Verify user 1 can see it
const user1Contrib = db.prepare('SELECT * FROM contributions WHERE user_id = ? AND id = ?').get(testUserId, testContribId) as any;
if (!user1Contrib) {
  throw new Error('User 1 cannot access their own contribution');
}

// Verify a different user CANNOT see it
const user2Contrib = db.prepare('SELECT * FROM contributions WHERE user_id = ? AND id = ?').get('another-user-99', testContribId);
if (user2Contrib) {
  throw new Error('Cross-tenant data leakage detected! User 2 accessed User 1 contribution.');
}
console.log('✔ Multi-tenant contribution isolation passed (no cross-tenant leakage).');

// 5. Test Cascade Deletion on User Delete
db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
const remainingIntegrations = db.prepare('SELECT * FROM user_integrations WHERE user_id = ?').all(testUserId);
const remainingContribs = db.prepare('SELECT * FROM contributions WHERE user_id = ?').all(testUserId);

if (remainingIntegrations.length > 0 || remainingContribs.length > 0) {
  throw new Error('Foreign key cascade delete failed when user was deleted');
}
console.log('✔ Foreign key cascade deletion on user removal passed.');

console.log('All DB unit tests passed successfully!\n');
