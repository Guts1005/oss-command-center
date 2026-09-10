import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.resolve(process.cwd(), 'contributions.db');
export const db = new Database(DB_PATH);

// Enable WAL mode for high-concurrency read/write transactions
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  // 1. Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      avatar_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 2. User sessions table (HttpOnly cryptographically secure session store)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      ip_hash TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
  `);

  // 3. User Integrations table (Encrypted at rest with AES-256-GCM)
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_integrations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      platform TEXT NOT NULL,
      username TEXT NOT NULL,
      host TEXT NOT NULL DEFAULT 'https://gitlab.com',
      encrypted_token TEXT,
      token_iv TEXT,
      token_auth_tag TEXT,
      last_synced_at TEXT,
      sync_status TEXT DEFAULT 'idle',
      sync_error TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, platform, host)
    );
    CREATE INDEX IF NOT EXISTS idx_integrations_user ON user_integrations(user_id);
  `);

  // 4. Check if contributions table needs migration to multi-tenant
  const contribTableInfo = db.prepare("PRAGMA table_info(contributions)").all() as any[];
  const hasContribTable = contribTableInfo.length > 0;
  const hasUserIdColumn = contribTableInfo.some(col => col.name === 'user_id');

  if (hasContribTable && !hasUserIdColumn) {
    console.log('[DB Migration] Migrating legacy single-user contributions to multi-tenant schema...');
    
    // Ensure default local admin user exists for existing data
    const now = new Date().toISOString();
    const defaultUserId = 'default-local-user';
    db.prepare(`
      INSERT OR IGNORE INTO users (id, email, password_hash, display_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      defaultUserId,
      'admin@oss.local',
      'local_dev_only:migrated_unhashed',
      'Local Admin',
      now,
      now
    );

    // Disable foreign keys temporarily during schema recreation
    db.pragma('foreign_keys = OFF');

    // Create new multi-tenant contributions table
    db.exec(`
      CREATE TABLE contributions_new (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        id TEXT NOT NULL,
        platform TEXT NOT NULL,
        repo TEXT NOT NULL,
        number INTEGER NOT NULL,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        url TEXT NOT NULL,
        author TEXT NOT NULL,
        status TEXT NOT NULL,
        action_needed TEXT NOT NULL DEFAULT 'none',
        difficulty TEXT DEFAULT 'medium',
        bounty_amount TEXT,
        created_at TEXT NOT NULL,
        last_activity_at TEXT NOT NULL,
        last_viewed_at TEXT,
        last_synced_at TEXT NOT NULL,
        unread INTEGER NOT NULL DEFAULT 1,
        notes TEXT,
        PRIMARY KEY (user_id, id)
      );

      INSERT INTO contributions_new (
        user_id, id, platform, repo, number, title, type, url, author, status,
        action_needed, difficulty, bounty_amount, created_at, last_activity_at,
        last_viewed_at, last_synced_at, unread, notes
      )
      SELECT
        '${defaultUserId}', id, platform, repo, number, title, type, url, author, status,
        action_needed, difficulty, bounty_amount, created_at, last_activity_at,
        last_viewed_at, last_synced_at, unread, notes
      FROM contributions;

      DROP TABLE contributions;
      ALTER TABLE contributions_new RENAME TO contributions;

      CREATE TABLE activity_events_new (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        contribution_id TEXT NOT NULL,
        actor TEXT NOT NULL,
        actor_avatar TEXT,
        type TEXT NOT NULL,
        review_state TEXT,
        body_excerpt TEXT,
        created_at TEXT NOT NULL
      );

      INSERT INTO activity_events_new (
        id, user_id, contribution_id, actor, actor_avatar, type, review_state, body_excerpt, created_at
      )
      SELECT
        id, '${defaultUserId}', contribution_id, actor, actor_avatar, type, review_state, body_excerpt, created_at
      FROM activity_events;

      DROP TABLE activity_events;
      ALTER TABLE activity_events_new RENAME TO activity_events;
    `);

    db.pragma('foreign_keys = ON');
    console.log('[DB Migration] Successfully migrated all existing contributions to default-local-user.');
  } else if (!hasContribTable) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS contributions (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        id TEXT NOT NULL,
        platform TEXT NOT NULL,
        repo TEXT NOT NULL,
        number INTEGER NOT NULL,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        url TEXT NOT NULL,
        author TEXT NOT NULL,
        status TEXT NOT NULL,
        action_needed TEXT NOT NULL DEFAULT 'none',
        difficulty TEXT DEFAULT 'medium',
        bounty_amount TEXT,
        created_at TEXT NOT NULL,
        last_activity_at TEXT NOT NULL,
        last_viewed_at TEXT,
        last_synced_at TEXT NOT NULL,
        unread INTEGER NOT NULL DEFAULT 1,
        notes TEXT,
        PRIMARY KEY (user_id, id)
      );

      CREATE TABLE IF NOT EXISTS activity_events (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        contribution_id TEXT NOT NULL,
        actor TEXT NOT NULL,
        actor_avatar TEXT,
        type TEXT NOT NULL,
        review_state TEXT,
        body_excerpt TEXT,
        created_at TEXT NOT NULL
      );
    `);
  }

  // Multi-tenant indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_contrib_user_status ON contributions(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_contrib_user_action ON contributions(user_id, action_needed);
    CREATE INDEX IF NOT EXISTS idx_contrib_user_activity ON contributions(user_id, last_activity_at);
    CREATE INDEX IF NOT EXISTS idx_events_user_contrib ON activity_events(user_id, contribution_id);
    
    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Ensure default-local-user exists in all environments
  const now = new Date().toISOString();
  db.prepare(`
    INSERT OR IGNORE INTO users (id, email, password_hash, display_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    'default-local-user',
    'admin@oss.local',
    'local_dev_only:migrated_unhashed',
    'Local Admin',
    now,
    now
  );
}

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  display_name?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserIntegrationRecord {
  id: string;
  user_id: string;
  platform: 'github' | 'gitlab';
  username: string;
  host: string;
  encrypted_token?: string | null;
  token_iv?: string | null;
  token_auth_tag?: string | null;
  last_synced_at?: string | null;
  sync_status: 'idle' | 'syncing' | 'success' | 'failed';
  sync_error?: string | null;
  created_at: string;
}

export interface ContributionRecord {
  user_id: string;
  id: string;
  platform: 'github' | 'gitlab';
  repo: string;
  number: number;
  title: string;
  type: 'pr' | 'issue';
  url: string;
  author: string;
  status: string;
  action_needed: 'reply' | 'push-changes' | 'none';
  difficulty?: string;
  bounty_amount?: string;
  created_at: string;
  last_activity_at: string;
  last_viewed_at?: string | null;
  last_synced_at: string;
  unread: number;
  notes?: string | null;
}

export interface ActivityEventRecord {
  id: string;
  user_id: string;
  contribution_id: string;
  actor: string;
  actor_avatar?: string | null;
  type: 'comment' | 'review' | 'commit' | 'status-change';
  review_state?: string | null;
  body_excerpt?: string | null;
  created_at: string;
}
