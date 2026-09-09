export interface Contribution {
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
  difficulty?: 'easy' | 'medium' | 'hard';
  bounty_amount?: string | null;
  created_at: string;
  last_activity_at: string;
  last_viewed_at?: string | null;
  last_synced_at: string;
  unread: number;
  notes?: string | null;
}

export interface ActivityEvent {
  id: string;
  contribution_id: string;
  actor: string;
  actor_avatar?: string | null;
  type: 'comment' | 'review' | 'commit' | 'status-change';
  review_state?: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | null;
  body_excerpt?: string | null;
  created_at: string;
}

export interface Stats {
  total: number;
  actionNeeded: number;
  awaitingMaintainer: number;
  merged: number;
  unreadCount: number;
  lastSync: string | null;
}
