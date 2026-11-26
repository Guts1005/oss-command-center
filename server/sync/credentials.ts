import axios from 'axios';
import dns from 'dns/promises';
import net from 'net';
import { db, UserIntegrationRecord } from '../db.js';
import { decryptSecret } from '../security/crypto.js';

export class HostValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HostValidationError';
  }
}

export class OwnershipVerificationError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'OwnershipVerificationError';
    this.statusCode = statusCode;
  }
}

export function getGitHubApiBase(): string {
  return (process.env.GITHUB_API_BASE_URL || 'https://api.github.com').replace(/\/+$/, '');
}

function isPrivateIPv4Parts(parts: number[]): boolean {
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true;
  }
  if (parts[0] === 127 || parts[0] === 10 || parts[0] === 0) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true; // CGNAT 100.64.0.0/10
  return false;
}

function extractMappedIPv4Parts(ipv6: string): number[] | null {
  const lower = ipv6.toLowerCase();
  if (!lower.startsWith('::ffff:')) return null;
  const suffix = lower.slice('::ffff:'.length);
  if (net.isIP(suffix) === 4) {
    return suffix.split('.').map(Number);
  }
  const hexMatch = suffix.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hexMatch) {
    const hi = parseInt(hexMatch[1], 16);
    const lo = parseInt(hexMatch[2], 16);
    return [(hi >> 8) & 0xff, hi & 0xff, (lo >> 8) & 0xff, lo & 0xff];
  }
  return null;
}

export function isPrivateOrLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    !host ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === '0.0.0.0' ||
    host === '::' ||
    host === '::1'
  ) {
    return true;
  }

  const ipType = net.isIP(host);
  if (ipType === 4) {
    return isPrivateIPv4Parts(host.split('.').map(Number));
  }
  if (ipType === 6) {
    const mapped = extractMappedIPv4Parts(host);
    if (mapped) {
      return isPrivateIPv4Parts(mapped);
    }
    if (/^f[cd][0-9a-f]{2}/i.test(host) || /^fe[89ab][0-9a-f]/i.test(host)) {
      return true;
    }
    if (host.startsWith('::ffff:')) {
      return true;
    }
  }

  return false;
}

/**
 * Validates and normalizes an external GitHub or GitLab host URL to defend against SSRF.
 */
export function validateExternalHost(rawHost: string | undefined, platform: 'github' | 'gitlab'): string {
  if (platform === 'github') {
    if (!rawHost || rawHost.trim() === '' || rawHost.replace(/\/+$/, '') === 'https://github.com') {
      return 'https://github.com';
    }
    throw new HostValidationError('Custom GitHub Enterprise host is not supported; use https://github.com.');
  }

  const candidate = (rawHost && rawHost.trim()) || 'https://gitlab.com';
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new HostValidationError('Invalid GitLab host URL.');
  }

  if (parsed.protocol !== 'https:') {
    throw new HostValidationError('GitLab host must use HTTPS.');
  }

  if (isPrivateOrLocalHostname(parsed.hostname)) {
    throw new HostValidationError('Private or local network GitLab hosts are not permitted.');
  }

  return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, '');
}

/**
 * Verifies DNS records for a custom HTTPS host do not resolve to private/loopback/link-local IPs.
 */
export async function assertPublicDnsResolution(hostUrl: string): Promise<void> {
  const hostname = new URL(hostUrl).hostname.replace(/^\[|\]$/g, '');
  if (isPrivateOrLocalHostname(hostname)) {
    throw new HostValidationError('Private or local network hosts are not permitted.');
  }
  if (net.isIP(hostname) !== 0) {
    return;
  }
  const records = await dns.lookup(hostname, { all: true });
  for (const rec of records) {
    if (isPrivateOrLocalHostname(rec.address)) {
      throw new HostValidationError('Target host resolved to a restricted internal IP address.');
    }
  }
}

/**
 * Decrypts a stored integration token record, returning null if no token is present.
 */
export function decryptIntegrationToken(
  record: Pick<UserIntegrationRecord, 'encrypted_token' | 'token_iv' | 'token_auth_tag'>
): string | null {
  if (!record.encrypted_token || !record.token_iv || !record.token_auth_tag) {
    return null;
  }
  return decryptSecret(record.encrypted_token, record.token_iv, record.token_auth_tag);
}

/**
 * Fetches and decrypts the authenticated user's platform integration credentials (scoped by host when provided).
 */
export function getDecryptedUserIntegration(
  userId: string,
  platform: 'github' | 'gitlab',
  host?: string
): { token: string; username: string; host: string } | null {
  const integration = (host
    ? db
        .prepare(
          `
          SELECT * FROM user_integrations
          WHERE user_id = ? AND platform = ? AND host = ?
        `
        )
        .get(userId, platform, host)
    : db
        .prepare(
          `
          SELECT * FROM user_integrations
          WHERE user_id = ? AND platform = ?
        `
        )
        .get(userId, platform)) as UserIntegrationRecord | undefined;

  if (!integration) {
    return null;
  }

  try {
    const token = decryptIntegrationToken(integration);
    if (!token) return null;
    return {
      token,
      username: integration.username,
      host: integration.host || (platform === 'gitlab' ? 'https://gitlab.com' : 'https://github.com'),
    };
  } catch (err) {
    console.error(`[Credentials] Failed to decrypt ${platform} token for user ${userId}:`, err);
    return null;
  }
}

/**
 * Verifies with the upstream API that the supplied PAT is valid and belongs to the claimed username.
 */
export async function verifyPlatformAccountOwnership(
  platform: 'github' | 'gitlab',
  host: string,
  username: string,
  token: string
): Promise<{ verifiedUsername: string }> {
  // Offline unit/integration suites without a mock upstream URL keep deterministic execution.
  if (
    process.env.NODE_ENV === 'test' &&
    ((platform === 'github' && !process.env.GITHUB_API_BASE_URL) ||
      (platform === 'gitlab' && !process.env.VERIFY_GITLAB_IN_TESTS))
  ) {
    return { verifiedUsername: username };
  }

  try {
    if (platform === 'github') {
      const resp = await axios.get(`${getGitHubApiBase()}/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'OSS-Command-Center',
        },
        timeout: 8000,
        maxRedirects: 0,
      });

      const actualLogin = resp.data?.login;
      if (!actualLogin || typeof actualLogin !== 'string') {
        throw new OwnershipVerificationError(401, 'Could not verify GitHub user identity from token.');
      }
      if (actualLogin.toLowerCase() !== username.toLowerCase()) {
        throw new OwnershipVerificationError(
          403,
          `Token belongs to GitHub user @${actualLogin}, not @${username}. You can only link accounts you own.`
        );
      }
      return { verifiedUsername: actualLogin };
    }

    await assertPublicDnsResolution(host);
    const resp = await axios.get(`${host}/api/v4/user`, {
      headers: {
        'PRIVATE-TOKEN': token,
        'User-Agent': 'OSS-Command-Center',
      },
      timeout: 8000,
      maxRedirects: 0,
    });

    const actualUsername = resp.data?.username;
    if (!actualUsername || typeof actualUsername !== 'string') {
      throw new OwnershipVerificationError(401, 'Could not verify GitLab user identity from token.');
    }
    if (actualUsername.toLowerCase() !== username.toLowerCase()) {
      throw new OwnershipVerificationError(
        403,
        `Token belongs to GitLab user @${actualUsername}, not @${username}. You can only link accounts you own.`
      );
    }
    return { verifiedUsername: actualUsername };
  } catch (err: any) {
    if (err instanceof OwnershipVerificationError || err instanceof HostValidationError) {
      throw err;
    }
    const status = err?.response?.status;
    if (status === 401 || status === 403) {
      throw new OwnershipVerificationError(
        401,
        `Invalid or expired ${platform === 'github' ? 'GitHub' : 'GitLab'} Personal Access Token.`
      );
    }
    throw new OwnershipVerificationError(
      502,
      `Could not verify ${platform === 'github' ? 'GitHub' : 'GitLab'} token ownership upstream (${err.message || 'network error'}).`
    );
  }
}
