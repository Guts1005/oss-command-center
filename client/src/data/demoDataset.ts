import { Contribution, ActivityEvent, Stats } from '../types';

export interface DemoAnalyticsData {
  summary: {
    total: number;
    merged: number;
    closed: number;
    open: number;
    actionNeeded: number;
    acceptanceRate: number;
  };
  velocity: {
    medianTimeToMergeHours: number;
    avgTimeToMergeHours: number;
    medianFirstReviewHours: number;
    totalMergedEvaluated: number;
  };
  platformBreakdown: {
    github: number;
    gitlab: number;
  };
  scopeBreakdown: {
    external: number;
    own: number;
  };
  topRepositories: Array<{
    repo: string;
    platform: string;
    total: number;
    merged: number;
    actionNeeded: number;
  }>;
  heatmap: Array<{
    date: string;
    count: number;
    level: number;
  }>;
}

export interface DemoRepoItem {
  repo: string;
  platform: 'github' | 'gitlab' | string;
  url: string;
  totalContributions: number;
  openContributions: number;
  mergedContributions: number;
  closedContributions: number;
  actionNeededCount: number;
  acceptanceRate: number;
  medianFirstReviewHours: number | null;
  responsiveness: 'Fast' | 'Moderate' | 'Slow' | 'Pending';
  health: 'Healthy' | 'Attention Required' | 'Stale';
  lastActivityAt: string | null;
}

export const FALLBACK_DEMO_CONTRIBUTIONS: Contribution[] = [
  {
    id: 'gh:facebook/react#28492',
    platform: 'github',
    repo: 'facebook/react',
    number: 28492,
    title: 'Add selective hydration telemetry in Concurrent Root',
    type: 'pr',
    url: 'https://github.com/facebook/react/pull/28492',
    author: 'demo_contributor',
    status: 'open',
    action_needed: 'reply',
    difficulty: 'hard',
    bounty_amount: '$500',
    created_at: '2026-09-28T14:22:00.000Z',
    last_activity_at: '2026-10-06T18:10:00.000Z',
    last_synced_at: '2026-10-06T20:00:00.000Z',
    unread: 1,
    notes: 'Maintainer requested benchmark against React Server Components rendering pipeline.'
  },
  {
    id: 'gl:inkscape/inkscape!4810',
    platform: 'gitlab',
    repo: 'inkscape/inkscape',
    number: 4810,
    title: 'Fix SVG path clipping regression in node transform tool',
    type: 'pr',
    url: 'https://gitlab.com/inkscape/inkscape/-/merge_requests/4810',
    author: 'demo_contributor',
    status: 'in_review',
    action_needed: 'push-changes',
    difficulty: 'medium',
    bounty_amount: '$250',
    created_at: '2026-09-25T09:15:00.000Z',
    last_activity_at: '2026-10-05T21:40:00.000Z',
    last_synced_at: '2026-10-06T20:00:00.000Z',
    unread: 1,
    notes: 'CI lint pipeline passed. Need to rebase and apply requested clipping margin changes.'
  },
  {
    id: 'gh:torvalds/linux#9402',
    platform: 'github',
    repo: 'torvalds/linux',
    number: 9402,
    title: 'net/sched: sch_cake: avoid integer overflow in bandwidth rate limiting',
    type: 'pr',
    url: 'https://github.com/torvalds/linux/pull/9402',
    author: 'demo_contributor',
    status: 'submitted',
    action_needed: 'none',
    difficulty: 'hard',
    bounty_amount: null,
    created_at: '2026-09-22T11:00:00.000Z',
    last_activity_at: '2026-10-04T16:30:00.000Z',
    last_synced_at: '2026-10-06T20:00:00.000Z',
    unread: 0,
    notes: 'Under maintainer review by netdev subsystem team.'
  },
  {
    id: 'gh:vercel/next.js#64012',
    platform: 'github',
    repo: 'vercel/next.js',
    number: 64012,
    title: 'Optimize Turbopack route manifest compilation latency',
    type: 'pr',
    url: 'https://github.com/vercel/next.js/pull/64012',
    author: 'demo_contributor',
    status: 'merged',
    action_needed: 'none',
    difficulty: 'medium',
    bounty_amount: null,
    created_at: '2026-09-18T16:45:00.000Z',
    last_activity_at: '2026-10-02T12:00:00.000Z',
    last_synced_at: '2026-10-06T20:00:00.000Z',
    unread: 0,
    notes: 'Merged into canary branch and published in v15.2.0-canary.18.'
  },
  {
    id: 'gh:google-deepmind/antigravity#104',
    platform: 'github',
    repo: 'google-deepmind/antigravity',
    number: 104,
    title: 'Implement streaming agent verification pipeline with blast radius guards',
    type: 'pr',
    url: 'https://github.com/google-deepmind/antigravity/pull/104',
    author: 'demo_contributor',
    status: 'merged',
    action_needed: 'none',
    difficulty: 'hard',
    bounty_amount: '$1,000',
    created_at: '2026-09-10T10:00:00.000Z',
    last_activity_at: '2026-09-29T17:30:00.000Z',
    last_synced_at: '2026-10-06T20:00:00.000Z',
    unread: 0,
    notes: 'Bounty awarded for zero-regression streaming execution harness.'
  },
  {
    id: 'gh:kubernetes/kubernetes#124800',
    platform: 'github',
    repo: 'kubernetes/kubernetes',
    number: 124800,
    title: 'kubelet: mitigate goroutine leakage during rapid container teardown',
    type: 'pr',
    url: 'https://github.com/kubernetes/kubernetes/pull/124800',
    author: 'demo_contributor',
    status: 'closed',
    action_needed: 'none',
    difficulty: 'hard',
    bounty_amount: null,
    created_at: '2026-08-30T08:12:00.000Z',
    last_activity_at: '2026-09-20T19:00:00.000Z',
    last_synced_at: '2026-10-06T20:00:00.000Z',
    unread: 0,
    notes: 'Superseded by SIG Node architectural refactor #124950.'
  },
  {
    id: 'gh:astral-sh/uv#3210',
    platform: 'github',
    repo: 'astral-sh/uv',
    number: 3210,
    title: 'Add pre-compiled wheels resolution cache lock for concurrent CLI workers',
    type: 'pr',
    url: 'https://github.com/astral-sh/uv/pull/3210',
    author: 'demo_contributor',
    status: 'open',
    action_needed: 'reply',
    difficulty: 'medium',
    bounty_amount: null,
    created_at: '2026-10-01T15:20:00.000Z',
    last_activity_at: '2026-10-06T19:45:00.000Z',
    last_synced_at: '2026-10-06T20:00:00.000Z',
    unread: 1,
    notes: 'Reviewer asked for cross-platform lock testing on Windows and macOS runners.'
  }
];

export const FALLBACK_DEMO_EVENTS: ActivityEvent[] = [
  {
    id: 'demo_ev_react_1',
    contribution_id: 'gh:facebook/react#28492',
    actor: 'gaearon',
    actor_avatar: 'https://avatars.githubusercontent.com/u/810438',
    type: 'comment',
    review_state: null,
    body_excerpt: 'Could you run the React Server Components hydration benchmark with 10k nodes? We want to confirm there is zero regression in TTFB.',
    created_at: '2026-10-06T18:10:00.000Z'
  },
  {
    id: 'demo_ev_react_2',
    contribution_id: 'gh:facebook/react#28492',
    actor: 'acdlite',
    actor_avatar: 'https://avatars.githubusercontent.com/u/3624098',
    type: 'review',
    review_state: 'COMMENTED',
    body_excerpt: 'Looks very clean overall. Minor nit on the event dispatch scheduler priority handling.',
    created_at: '2026-10-05T14:30:00.000Z'
  },
  {
    id: 'demo_ev_ink_1',
    contribution_id: 'gl:inkscape/inkscape!4810',
    actor: 'doctormo',
    actor_avatar: 'https://gitlab.com/uploads/-/system/user/avatar/24050/avatar.png',
    type: 'review',
    review_state: 'CHANGES_REQUESTED',
    body_excerpt: 'The node transform tool crashes when clipping quadratic beziers at extreme coordinates. Please clamp coordinate bounds.',
    created_at: '2026-10-05T21:40:00.000Z'
  },
  {
    id: 'demo_ev_uv_1',
    contribution_id: 'gh:astral-sh/uv#3210',
    actor: 'charliermarsh',
    actor_avatar: 'https://avatars.githubusercontent.com/u/1309177',
    type: 'comment',
    review_state: null,
    body_excerpt: 'Thanks for this! Could you verify how this behaves when the cache directory is on a network-mounted filesystem (NFS)?',
    created_at: '2026-10-06T19:45:00.000Z'
  },
  {
    id: 'demo_ev_next_1',
    contribution_id: 'gh:vercel/next.js#64012',
    actor: 'timneutkens',
    actor_avatar: 'https://avatars.githubusercontent.com/u/63648',
    type: 'status-change',
    review_state: 'APPROVED',
    body_excerpt: 'Approved and merged into main! Benchmarks show 14% improvement in Turbopack route compilation.',
    created_at: '2026-10-02T12:00:00.000Z'
  },
  {
    id: 'demo_ev_antigravity_1',
    contribution_id: 'gh:google-deepmind/antigravity#104',
    actor: 'deepmind-lead',
    actor_avatar: 'https://avatars.githubusercontent.com/u/7992940',
    type: 'status-change',
    review_state: 'APPROVED',
    body_excerpt: 'Merged! The blast radius containment protocol verified against all 17 automated integration test suites.',
    created_at: '2026-09-29T17:30:00.000Z'
  }
];

export const FALLBACK_DEMO_STATS: Stats = {
  total: 7,
  actionNeeded: 3,
  awaitingMaintainer: 1,
  merged: 2,
  closed: 1,
  unreadCount: 3,
  lastSync: '2026-10-06T20:00:00.000Z'
};

export const FALLBACK_DEMO_ANALYTICS: DemoAnalyticsData = {
  summary: {
    total: 7,
    merged: 2,
    closed: 1,
    open: 4,
    actionNeeded: 3,
    acceptanceRate: 67
  },
  velocity: {
    medianTimeToMergeHours: 19.5,
    avgTimeToMergeHours: 23.4,
    medianFirstReviewHours: 4.8,
    totalMergedEvaluated: 2
  },
  platformBreakdown: {
    github: 6,
    gitlab: 1
  },
  scopeBreakdown: {
    external: 7,
    own: 0
  },
  topRepositories: [
    { repo: 'facebook/react', platform: 'github', total: 1, merged: 0, actionNeeded: 1 },
    { repo: 'inkscape/inkscape', platform: 'gitlab', total: 1, merged: 0, actionNeeded: 1 },
    { repo: 'astral-sh/uv', platform: 'github', total: 1, merged: 0, actionNeeded: 1 },
    { repo: 'vercel/next.js', platform: 'github', total: 1, merged: 1, actionNeeded: 0 },
    { repo: 'google-deepmind/antigravity', platform: 'github', total: 1, merged: 1, actionNeeded: 0 },
    { repo: 'torvalds/linux', platform: 'github', total: 1, merged: 0, actionNeeded: 0 }
  ],
  heatmap: Array.from({ length: 60 }).map((_, i) => {
    const d = new Date(Date.now() - (59 - i) * 86400000);
    const iso = d.toISOString().split('T')[0];
    const count = (i % 3 === 0) ? (i % 5 + 1) : 0;
    const level = count >= 4 ? 4 : count >= 3 ? 3 : count >= 2 ? 2 : count > 0 ? 1 : 0;
    return { date: iso, count, level };
  })
};

export const FALLBACK_DEMO_REPOSITORIES: DemoRepoItem[] = [
  {
    repo: 'facebook/react',
    platform: 'github',
    url: 'https://github.com/facebook/react',
    totalContributions: 1,
    openContributions: 1,
    mergedContributions: 0,
    closedContributions: 0,
    actionNeededCount: 1,
    acceptanceRate: 0,
    medianFirstReviewHours: 4.5,
    responsiveness: 'Fast',
    health: 'Attention Required',
    lastActivityAt: '2026-10-06T18:10:00.000Z'
  },
  {
    repo: 'inkscape/inkscape',
    platform: 'gitlab',
    url: 'https://gitlab.com/inkscape/inkscape',
    totalContributions: 1,
    openContributions: 1,
    mergedContributions: 0,
    closedContributions: 0,
    actionNeededCount: 1,
    acceptanceRate: 0,
    medianFirstReviewHours: 8.2,
    responsiveness: 'Fast',
    health: 'Attention Required',
    lastActivityAt: '2026-10-05T21:40:00.000Z'
  },
  {
    repo: 'vercel/next.js',
    platform: 'github',
    url: 'https://github.com/vercel/next.js',
    totalContributions: 1,
    openContributions: 0,
    mergedContributions: 1,
    closedContributions: 0,
    actionNeededCount: 0,
    acceptanceRate: 100,
    medianFirstReviewHours: 12.0,
    responsiveness: 'Fast',
    health: 'Healthy',
    lastActivityAt: '2026-10-02T12:00:00.000Z'
  },
  {
    repo: 'google-deepmind/antigravity',
    platform: 'github',
    url: 'https://github.com/google-deepmind/antigravity',
    totalContributions: 1,
    openContributions: 0,
    mergedContributions: 1,
    closedContributions: 0,
    actionNeededCount: 0,
    acceptanceRate: 100,
    medianFirstReviewHours: 3.2,
    responsiveness: 'Fast',
    health: 'Healthy',
    lastActivityAt: '2026-09-29T17:30:00.000Z'
  },
  {
    repo: 'torvalds/linux',
    platform: 'github',
    url: 'https://github.com/torvalds/linux',
    totalContributions: 1,
    openContributions: 1,
    mergedContributions: 0,
    closedContributions: 0,
    actionNeededCount: 0,
    acceptanceRate: 0,
    medianFirstReviewHours: 48.0,
    responsiveness: 'Moderate',
    health: 'Healthy',
    lastActivityAt: '2026-10-04T16:30:00.000Z'
  },
  {
    repo: 'astral-sh/uv',
    platform: 'github',
    url: 'https://github.com/astral-sh/uv',
    totalContributions: 1,
    openContributions: 1,
    mergedContributions: 0,
    closedContributions: 0,
    actionNeededCount: 1,
    acceptanceRate: 0,
    medianFirstReviewHours: 2.1,
    responsiveness: 'Fast',
    health: 'Attention Required',
    lastActivityAt: '2026-10-06T19:45:00.000Z'
  },
  {
    repo: 'kubernetes/kubernetes',
    platform: 'github',
    url: 'https://github.com/kubernetes/kubernetes',
    totalContributions: 1,
    openContributions: 0,
    mergedContributions: 0,
    closedContributions: 1,
    actionNeededCount: 0,
    acceptanceRate: 0,
    medianFirstReviewHours: 96.0,
    responsiveness: 'Slow',
    health: 'Stale',
    lastActivityAt: '2026-09-20T19:00:00.000Z'
  }
];
