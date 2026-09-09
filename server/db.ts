import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.resolve(process.cwd(), 'contributions.db');
export const db = new Database(DB_PATH);

// Enable WAL mode for ultra-fast, concurrent read/write transactions
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS contributions (
      id TEXT PRIMARY KEY,
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
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS activity_events (
      id TEXT PRIMARY KEY,
      contribution_id TEXT NOT NULL,
      actor TEXT NOT NULL,
      actor_avatar TEXT,
      type TEXT NOT NULL,
      review_state TEXT,
      body_excerpt TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (contribution_id) REFERENCES contributions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_contrib_status ON contributions(status);
    CREATE INDEX IF NOT EXISTS idx_contrib_action ON contributions(action_needed);
    CREATE INDEX IF NOT EXISTS idx_contrib_activity ON contributions(last_activity_at);
    CREATE INDEX IF NOT EXISTS idx_events_contrib ON activity_events(contribution_id);
  `);
}

export interface ContributionRecord {
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
  contribution_id: string;
  actor: string;
  actor_avatar?: string | null;
  type: 'comment' | 'review' | 'commit' | 'status-change';
  review_state?: string | null;
  body_excerpt?: string | null;
  created_at: string;
}
