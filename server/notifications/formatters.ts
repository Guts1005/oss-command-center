import { ContributionRecord } from '../db.js';

export interface NotificationPayloadOptions {
  event: 'action_needed' | 'review' | 'merged' | 'status_change' | 'ping';
  contribution?: Partial<ContributionRecord>;
  message?: string;
  actor?: string;
  reviewState?: string;
}

export interface DiscordEmbed {
  title: string;
  url?: string;
  description: string;
  color: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  timestamp: string;
  footer?: { text: string };
}

export interface DiscordPayload {
  username?: string;
  avatar_url?: string;
  embeds: DiscordEmbed[];
}

export interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  fields?: Array<{ type: string; text: string }>;
  elements?: any[];
}

export interface SlackPayload {
  text: string;
  blocks?: SlackBlock[];
}

/**
 * Maps contribution event and status to appropriate Discord embed color.
 */
function resolveDiscordColor(event: string, actionNeeded?: string): number {
  if (event === 'ping') return 0x06B6D4; // Cyan
  if (event === 'merged') return 0x10B981; // Emerald Green
  if (actionNeeded === 'push-changes') return 0xEF4444; // Coral Red
  if (actionNeeded === 'reply') return 0xF59E0B; // Amber
  return 0x3B82F6; // Sapphire Blue
}

/**
 * Builds formatted Discord Webhook payload with rich embeds.
 */
export function buildDiscordPayload(options: NotificationPayloadOptions): DiscordPayload {
  const now = new Date().toISOString();
  const { event, contribution, message, actor } = options;

  if (event === 'ping') {
    return {
      username: 'OSS Command Center',
      embeds: [
        {
          title: 'Discord Webhook Integration Test',
          description: message || 'Test dispatch signal from OSS Command Center. Webhook connectivity verified.',
          color: resolveDiscordColor('ping'),
          timestamp: now,
          footer: { text: 'OSS Command Center • Real-Time Alert Engine' },
        },
      ],
    };
  }

  const titlePrefix = contribution?.action_needed === 'push-changes'
    ? '[CHANGES REQ]'
    : contribution?.action_needed === 'reply'
    ? '[OWE REPLY]'
    : event === 'merged'
    ? '[MERGED]'
    : '[UPDATE]';

  const title = `${titlePrefix} ${contribution?.repo || 'Repo'}#${contribution?.number || 0}: ${contribution?.title || 'Contribution'}`;
  const color = resolveDiscordColor(event, contribution?.action_needed);

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    { name: 'Repository', value: `\`${contribution?.repo || 'unknown'}\``, inline: true },
    { name: 'Platform', value: (contribution?.platform || 'github').toUpperCase(), inline: true },
    { name: 'Status', value: (contribution?.status || 'open').toUpperCase(), inline: true },
  ];

  if (contribution?.action_needed && contribution.action_needed !== 'none') {
    fields.push({
      name: 'Action Needed',
      value: contribution.action_needed === 'reply' ? 'Reply Needed' : 'Push Changes',
      inline: true,
    });
  }

  if (actor) {
    fields.push({ name: 'Latest Actor', value: `@${actor}`, inline: true });
  }

  if (contribution?.bounty_amount) {
    fields.push({ name: 'Bounty Target', value: contribution.bounty_amount, inline: true });
  }

  return {
    username: 'OSS Command Center',
    embeds: [
      {
        title,
        url: contribution?.url || undefined,
        description: message || `Activity detected on ${contribution?.platform || 'git'} contribution.`,
        color,
        fields,
        timestamp: now,
        footer: { text: 'OSS Command Center • Triage Signal' },
      },
    ],
  };
}

/**
 * Builds formatted Slack Incoming Webhook payload using Slack Block Kit.
 */
export function buildSlackPayload(options: NotificationPayloadOptions): SlackPayload {
  const { event, contribution, message, actor } = options;

  if (event === 'ping') {
    return {
      text: 'OSS Command Center: Test dispatch ping verified.',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📡 OSS Command Center Test Signal',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: message || 'Slack Incoming Webhook verified successfully. Outbound alerts are active.',
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `OSS Command Center • Verified at ${new Date().toISOString()}`,
            },
          ],
        },
      ],
    };
  }

  const actionEmoji = contribution?.action_needed === 'push-changes'
    ? '🚨'
    : contribution?.action_needed === 'reply'
    ? '⚠️'
    : event === 'merged'
    ? '🎉'
    : 'ℹ️';

  const actionText = contribution?.action_needed === 'push-changes'
    ? 'Action Required: Changes Requested'
    : contribution?.action_needed === 'reply'
    ? 'Action Required: Maintainer Owe Reply'
    : event === 'merged'
    ? 'Contribution Merged Upstream'
    : 'Contribution Update';

  const linkText = contribution?.url
    ? `<${contribution.url}|*${contribution.repo}#${contribution.number}: ${contribution.title}*>`
    : `*${contribution?.repo}#${contribution?.number}: ${contribution?.title}*`;

  const fallbackText = `${actionEmoji} ${actionText}: ${contribution?.repo}#${contribution?.number}`;

  const fields: Array<{ type: string; text: string }> = [
    { type: 'mrkdwn', text: `*Repository:*\n\`${contribution?.repo}\`` },
    { type: 'mrkdwn', text: `*Status:*\n\`${contribution?.status?.toUpperCase()}\`` },
  ];

  if (contribution?.action_needed && contribution.action_needed !== 'none') {
    fields.push({
      type: 'mrkdwn',
      text: `*Action:*\n*${contribution.action_needed === 'reply' ? 'Owe Reply' : 'Push Changes'}*`,
    });
  }

  if (actor) {
    fields.push({ type: 'mrkdwn', text: `*Actor:*\n@${actor}` });
  }

  return {
    text: fallbackText,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${actionEmoji} ${actionText}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${linkText}\n${message || 'New activity detected on contribution.'}`,
        },
        fields,
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Platform: *${(contribution?.platform || 'github').toUpperCase()}* • OSS Command Center • ${new Date().toISOString()}`,
          },
        ],
      },
    ],
  };
}
