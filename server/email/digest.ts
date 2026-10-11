import { db } from '../db.js';

export interface DigestContribution {
  id: string;
  repo: string;
  number: number;
  title: string;
  status: string;
  action_needed: string;
  platform: string;
  url: string;
  last_activity_at: string;
}

export interface UserDigestSummary {
  user: {
    id: string;
    displayName: string;
    email: string;
  };
  cadence: 'daily' | 'weekly';
  generatedAt: string;
  actionNeeded: DigestContribution[];
  awaitingReview: DigestContribution[];
  recentlyMerged: DigestContribution[];
  staleItems: DigestContribution[];
  stats: {
    totalOpen: number;
    urgentActions: number;
    mergedThisPeriod: number;
  };
}

/**
 * Compiles a structured contribution digest for a specific user.
 */
export function compileUserDigest(userId: string, cadence: 'daily' | 'weekly' = 'weekly'): UserDigestSummary {
  const user = db.prepare('SELECT id, display_name, email FROM users WHERE id = ?').get(userId) as any;
  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  const daysBack = cadence === 'daily' ? 1 : 7;
  const cutoffIso = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
  const staleCutoffIso = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Fetch all open contributions
  const openRows = db.prepare(`
    SELECT id, repo, number, title, status, action_needed, platform, url, last_activity_at
    FROM contributions
    WHERE user_id = ? AND status = 'open'
    ORDER BY last_activity_at DESC
  `).all(userId) as DigestContribution[];

  const actionNeeded: DigestContribution[] = [];
  const awaitingReview: DigestContribution[] = [];
  const staleItems: DigestContribution[] = [];

  for (const item of openRows) {
    if (item.action_needed === 'push-changes' || item.action_needed === 'owe-reply') {
      actionNeeded.push(item);
    } else {
      awaitingReview.push(item);
    }

    if (item.last_activity_at && item.last_activity_at < staleCutoffIso) {
      staleItems.push(item);
    }
  }

  // 2. Fetch contributions merged within this cadence period
  const mergedRows = db.prepare(`
    SELECT DISTINCT c.id, c.repo, c.number, c.title, c.status, c.action_needed, c.platform, c.url, c.last_activity_at
    FROM contributions c
    WHERE c.user_id = ? AND c.status = 'merged' AND c.last_activity_at >= ?
    ORDER BY c.last_activity_at DESC
    LIMIT 20
  `).all(userId, cutoffIso) as DigestContribution[];

  return {
    user: {
      id: user.id,
      displayName: user.display_name || user.email.split('@')[0],
      email: user.email
    },
    cadence,
    generatedAt: new Date().toISOString(),
    actionNeeded,
    awaitingReview,
    recentlyMerged: mergedRows,
    staleItems,
    stats: {
      totalOpen: openRows.length,
      urgentActions: actionNeeded.length,
      mergedThisPeriod: mergedRows.length
    }
  };
}

/**
 * Renders an inline-styled, modern, responsive HTML digest email.
 */
export function renderDigestHtml(summary: UserDigestSummary, dashboardUrl: string = 'http://localhost:3100'): string {
  const { user, cadence, actionNeeded, awaitingReview, recentlyMerged, stats } = summary;
  const cadenceTitle = cadence === 'daily' ? 'Daily Contribution Digest' : 'Weekly Contribution Digest';

  const actionItemsHtml = actionNeeded.length > 0 ? actionNeeded.map(item => {
    const isChanges = item.action_needed === 'push-changes';
    const badgeColor = isChanges ? '#EF4444' : '#F59E0B';
    const badgeText = isChanges ? 'CHANGES REQUESTED' : 'REPLY NEEDED';
    return `
      <div style="background-color: #1E293B; border-left: 4px solid ${badgeColor}; border-radius: 6px; padding: 12px 16px; margin-bottom: 10px;">
        <div style="margin-bottom: 4px;">
          <span style="background-color: ${badgeColor}22; color: ${badgeColor}; font-size: 10px; font-family: monospace; font-weight: bold; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">
            ${badgeText}
          </span>
          <span style="color: #94A3B8; font-size: 11px; font-family: monospace; margin-left: 8px;">
            ${item.repo}#${item.number}
          </span>
        </div>
        <a href="${item.url || dashboardUrl}" style="color: #F8FAFC; font-size: 13px; font-weight: 600; text-decoration: none; line-height: 1.4;">
          ${escapeHtml(item.title)}
        </a>
      </div>
    `;
  }).join('') : `
    <div style="background-color: #1E293B; border-radius: 6px; padding: 14px; text-align: center; color: #94A3B8; font-size: 12px;">
      Zero pending maintainer review actions. You are completely caught up!
    </div>
  `;

  const reviewItemsHtml = awaitingReview.slice(0, 5).map(item => `
    <div style="padding: 10px 0; border-bottom: 1px solid #334155;">
      <div style="color: #64748B; font-size: 11px; font-family: monospace;">
        ${item.repo}#${item.number}
      </div>
      <a href="${item.url || dashboardUrl}" style="color: #E2E8F0; font-size: 13px; text-decoration: none; font-weight: 500;">
        ${escapeHtml(item.title)}
      </a>
    </div>
  `).join('');

  const mergedItemsHtml = recentlyMerged.length > 0 ? recentlyMerged.map(item => `
    <div style="background-color: #064E3B33; border: 1px solid #05966955; border-radius: 6px; padding: 10px 14px; margin-bottom: 8px;">
      <span style="color: #10B981; font-size: 10px; font-family: monospace; font-weight: bold; margin-right: 6px;">[MERGED]</span>
      <span style="color: #A7F3D0; font-size: 12px; font-weight: 600;">${escapeHtml(item.repo)}#${item.number}: ${escapeHtml(item.title)}</span>
    </div>
  `).join('') : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cadenceTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0F17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8FAFC;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0B0F17; padding: 24px 0;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #0F172A; border: 1px solid #1E293B; border-radius: 12px; overflow: hidden; margin: 0 auto;">
          <!-- Header Banner -->
          <tr>
            <td style="padding: 24px; border-bottom: 1px solid #1E293B; background: linear-gradient(180deg, #1E293B 0%, #0F172A 100%);">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-family: monospace; font-size: 10px; font-weight: bold; color: #38BDF8; letter-spacing: 1.5px; text-transform: uppercase;">
                      OSS COMMAND CENTER // TELEMETRY
                    </div>
                    <div style="font-size: 20px; font-weight: 800; color: #FFFFFF; margin-top: 4px;">
                      ${cadenceTitle}
                    </div>
                    <div style="font-size: 12px; color: #94A3B8; margin-top: 2px;">
                      Hello ${escapeHtml(user.displayName)}, here is your open-source contribution briefing.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Stat KPI Bar -->
          <tr>
            <td style="padding: 16px 24px; background-color: #111827; border-bottom: 1px solid #1E293B;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="width: 33.33%;">
                    <div style="font-size: 22px; font-weight: 800; color: ${stats.urgentActions > 0 ? '#F59E0B' : '#10B981'}; font-family: monospace;">
                      ${stats.urgentActions}
                    </div>
                    <div style="font-size: 10px; color: #94A3B8; text-transform: uppercase; font-family: monospace;">
                      Actions Required
                    </div>
                  </td>
                  <td align="center" style="width: 33.33%; border-left: 1px solid #1E293B; border-right: 1px solid #1E293B;">
                    <div style="font-size: 22px; font-weight: 800; color: #38BDF8; font-family: monospace;">
                      ${stats.totalOpen}
                    </div>
                    <div style="font-size: 10px; color: #94A3B8; text-transform: uppercase; font-family: monospace;">
                      Open PRs & Issues
                    </div>
                  </td>
                  <td align="center" style="width: 33.33%;">
                    <div style="font-size: 22px; font-weight: 800; color: #10B981; font-family: monospace;">
                      ${stats.mergedThisPeriod}
                    </div>
                    <div style="font-size: 10px; color: #94A3B8; text-transform: uppercase; font-family: monospace;">
                      Merged This Period
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Urgent Action Section -->
          <tr>
            <td style="padding: 24px;">
              <div style="font-size: 12px; font-family: monospace; font-weight: bold; color: #CBD5E1; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
                Action Items Awaiting Your Reply (${actionNeeded.length})
              </div>
              ${actionItemsHtml}
            </td>
          </tr>

          <!-- Recently Merged Section -->
          ${recentlyMerged.length > 0 ? `
          <tr>
            <td style="padding: 0 24px 24px 24px;">
              <div style="font-size: 12px; font-family: monospace; font-weight: bold; color: #10B981; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
                Recently Merged (${recentlyMerged.length})
              </div>
              ${mergedItemsHtml}
            </td>
          </tr>
          ` : ''}

          <!-- Awaiting Review Section -->
          ${awaitingReview.length > 0 ? `
          <tr>
            <td style="padding: 0 24px 24px 24px;">
              <div style="font-size: 12px; font-family: monospace; font-weight: bold; color: #CBD5E1; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                Awaiting Maintainer Review (${awaitingReview.length})
              </div>
              ${reviewItemsHtml}
            </td>
          </tr>
          ` : ''}

          <!-- Call to Action Button -->
          <tr>
            <td align="center" style="padding: 0 24px 28px 24px;">
              <a href="${dashboardUrl}" style="display: inline-block; background-color: #2563EB; color: #FFFFFF; font-size: 13px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                Open OSS Command Center
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 16px 24px; background-color: #0B0F17; border-top: 1px solid #1E293B; text-align: center; color: #64748B; font-size: 11px;">
              <div>Sent by OSS Command Center for ${escapeHtml(user.email)}.</div>
              <div style="margin-top: 4px;">To adjust cadence or mute email alerts, update your Notification Settings in the dashboard.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Renders a plain-text markdown fallback digest.
 */
export function renderDigestText(summary: UserDigestSummary, dashboardUrl: string = 'http://localhost:3100'): string {
  const { user, cadence, actionNeeded, awaitingReview, recentlyMerged, stats } = summary;
  const cadenceTitle = cadence === 'daily' ? 'DAILY CONTRIBUTION DIGEST' : 'WEEKLY CONTRIBUTION DIGEST';

  let text = `========================================================\n`;
  text += `OSS COMMAND CENTER // ${cadenceTitle}\n`;
  text += `========================================================\n\n`;
  text += `Hi ${user.displayName},\n\n`;
  text += `Summary:\n`;
  text += `- Actions Required: ${stats.urgentActions}\n`;
  text += `- Open PRs & Issues: ${stats.totalOpen}\n`;
  text += `- Merged This Period: ${stats.mergedThisPeriod}\n\n`;

  if (actionNeeded.length > 0) {
    text += `--------------------------------------------------------\n`;
    text += `URGENT ACTION ITEMS (${actionNeeded.length})\n`;
    text += `--------------------------------------------------------\n`;
    for (const item of actionNeeded) {
      text += `[${item.action_needed.toUpperCase()}] ${item.repo}#${item.number}: ${item.title}\n`;
      text += `URL: ${item.url || dashboardUrl}\n\n`;
    }
  }

  if (recentlyMerged.length > 0) {
    text += `--------------------------------------------------------\n`;
    text += `RECENTLY MERGED (${recentlyMerged.length})\n`;
    text += `--------------------------------------------------------\n`;
    for (const item of recentlyMerged) {
      text += `[MERGED] ${item.repo}#${item.number}: ${item.title}\n`;
      text += `URL: ${item.url || dashboardUrl}\n\n`;
    }
  }

  if (awaitingReview.length > 0) {
    text += `--------------------------------------------------------\n`;
    text += `AWAITING MAINTAINER REVIEW (${awaitingReview.length})\n`;
    text += `--------------------------------------------------------\n`;
    for (const item of awaitingReview.slice(0, 10)) {
      text += `${item.repo}#${item.number}: ${item.title}\n`;
    }
    text += `\n`;
  }

  text += `Open Command Center: ${dashboardUrl}\n`;
  text += `To change notification settings, visit Settings in the dashboard.\n`;

  return text;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
