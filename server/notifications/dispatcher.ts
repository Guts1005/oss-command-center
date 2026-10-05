import axios from 'axios';
import { db, ContributionRecord } from '../db.js';
import { signPayload } from '../security/crypto.js';
import {
  NotificationPayloadOptions,
  buildDiscordPayload,
  buildSlackPayload,
} from './formatters.js';

export interface DispatchResult {
  dispatched: number;
  successes: number;
  errors: string[];
}

/**
 * Checks whether a given webhook URL targets Discord.
 */
export function isDiscordWebhook(url: string): boolean {
  return /discord(?:app)?\.com\/api\/webhooks/i.test(url);
}

/**
 * Checks whether a given webhook URL targets Slack.
 */
export function isSlackWebhook(url: string): boolean {
  return /hooks\.slack\.com/i.test(url);
}

/**
 * Centralized dispatcher that routes contribution alerts to configured user endpoints.
 * Supports native Slack blocks, Discord embeds, and HMAC-SHA256 signed generic payloads.
 */
export async function dispatchNotification(
  userId: string,
  options: NotificationPayloadOptions
): Promise<DispatchResult> {
  const result: DispatchResult = {
    dispatched: 0,
    successes: 0,
    errors: [],
  };

  try {
    const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId) as any;
    if (!settings) return result;

    let subscribedEvents: string[] = ['action_needed', 'review', 'merged'];
    try {
      if (settings.webhook_events) {
        subscribedEvents = JSON.parse(settings.webhook_events);
      }
    } catch {}

    // Allow 'ping' events through for testing; filter other events by subscription
    if (options.event !== 'ping' && !subscribedEvents.includes(options.event)) {
      return result;
    }

    const dispatchPromises: Array<Promise<void>> = [];

    // 1. Dispatch to dedicated Slack Webhook
    if (settings.slack_webhook_url && settings.slack_webhook_url.trim()) {
      const url = settings.slack_webhook_url.trim();
      result.dispatched++;
      dispatchPromises.push(
        (async () => {
          try {
            const payload = buildSlackPayload(options);
            const res = await axios.post(url, payload, {
              timeout: 5000,
              headers: { 'Content-Type': 'application/json' },
              validateStatus: () => true,
            });
            if (res.status >= 200 && res.status < 300) {
              result.successes++;
            } else {
              result.errors.push(`Slack webhook responded with status ${res.status}`);
            }
          } catch (err: any) {
            result.errors.push(`Slack webhook failed: ${err.message}`);
          }
        })()
      );
    }

    // 2. Dispatch to dedicated Discord Webhook
    if (settings.discord_webhook_url && settings.discord_webhook_url.trim()) {
      const url = settings.discord_webhook_url.trim();
      result.dispatched++;
      dispatchPromises.push(
        (async () => {
          try {
            const payload = buildDiscordPayload(options);
            const res = await axios.post(url, payload, {
              timeout: 5000,
              headers: { 'Content-Type': 'application/json' },
              validateStatus: () => true,
            });
            if (res.status >= 200 && res.status < 300) {
              result.successes++;
            } else {
              result.errors.push(`Discord webhook responded with status ${res.status}`);
            }
          } catch (err: any) {
            result.errors.push(`Discord webhook failed: ${err.message}`);
          }
        })()
      );
    }

    // 3. Dispatch to Generic Webhook (with auto-detection for Discord and Slack URLs)
    if (settings.webhook_url && settings.webhook_url.trim()) {
      const url = settings.webhook_url.trim();
      // Only dispatch if not identical to already configured Slack/Discord endpoints
      if (url !== settings.slack_webhook_url && url !== settings.discord_webhook_url) {
        result.dispatched++;
        dispatchPromises.push(
          (async () => {
            try {
              if (isDiscordWebhook(url)) {
                const payload = buildDiscordPayload(options);
                const res = await axios.post(url, payload, {
                  timeout: 5000,
                  headers: { 'Content-Type': 'application/json' },
                  validateStatus: () => true,
                });
                if (res.status >= 200 && res.status < 300) {
                  result.successes++;
                } else {
                  result.errors.push(`Discord target responded with status ${res.status}`);
                }
              } else if (isSlackWebhook(url)) {
                const payload = buildSlackPayload(options);
                const res = await axios.post(url, payload, {
                  timeout: 5000,
                  headers: { 'Content-Type': 'application/json' },
                  validateStatus: () => true,
                });
                if (res.status >= 200 && res.status < 300) {
                  result.successes++;
                } else {
                  result.errors.push(`Slack target responded with status ${res.status}`);
                }
              } else {
                // Standard Generic Webhook with HMAC-SHA256 signature
                const now = new Date().toISOString();
                const genericPayload = {
                  event: options.event,
                  timestamp: now,
                  contribution: options.contribution,
                  actor: options.actor,
                  message: options.message,
                  source: 'OSS Command Center',
                };
                const bodyStr = JSON.stringify(genericPayload);
                const headers: Record<string, string> = {
                  'Content-Type': 'application/json',
                  'User-Agent': 'OSS-Command-Center-Webhook/1.0',
                };

                if (settings.webhook_secret) {
                  const signature = signPayload(bodyStr, settings.webhook_secret);
                  headers['X-OSS-Signature'] = `sha256=${signature}`;
                }

                const res = await axios.post(url, genericPayload, {
                  timeout: 5000,
                  headers,
                  validateStatus: () => true,
                });

                if (res.status >= 200 && res.status < 300) {
                  result.successes++;
                } else {
                  result.errors.push(`Generic webhook responded with status ${res.status}`);
                }
              }
            } catch (err: any) {
              result.errors.push(`Generic webhook failed: ${err.message}`);
            }
          })()
        );
      }
    }

    await Promise.all(dispatchPromises);
  } catch (err: any) {
    result.errors.push(`Dispatcher error: ${err.message}`);
  }

  return result;
}
