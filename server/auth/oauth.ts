import crypto from 'crypto';
import axios from 'axios';
import { db } from '../db.js';
import { encryptSecret, hashPassword } from '../security/crypto.js';

export interface OAuthUserProfile {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
}

export function isGitHubOAuthConfigured(): boolean {
  return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
}

export function isGitLabOAuthConfigured(): boolean {
  return Boolean(process.env.GITLAB_CLIENT_ID && process.env.GITLAB_CLIENT_SECRET);
}

export function getAppBaseUrl(req?: any): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  if (req) {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3100';
    return `${protocol}://${host}`;
  }
  return 'http://localhost:3100';
}

/**
 * Prunes expired OAuth state tokens from the database.
 */
export function pruneExpiredOAuthStates(): void {
  const now = new Date().toISOString();
  db.prepare('DELETE FROM oauth_states WHERE expires_at < ?').run(now);
}

/**
 * Creates a cryptographically secure random state token with 10-minute expiry.
 */
export function createOAuthState(provider: 'github' | 'gitlab', redirectUrl?: string): string {
  pruneExpiredOAuthStates();

  const state = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO oauth_states (state, provider, redirect_url, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(state, provider, redirectUrl || null, now.toISOString(), expiresAt);

  return state;
}

/**
 * Validates and atomically consumes a one-time OAuth state token.
 */
export function validateAndConsumeOAuthState(state: string, provider: 'github' | 'gitlab'): { valid: boolean; redirectUrl?: string } {
  if (!state || typeof state !== 'string') {
    return { valid: false };
  }

  const now = new Date().toISOString();
  const row = db.prepare(`
    SELECT state, redirect_url
    FROM oauth_states
    WHERE state = ? AND provider = ? AND expires_at >= ?
  `).get(state, provider, now) as { state: string; redirect_url: string | null } | undefined;

  if (!row) {
    return { valid: false };
  }

  // Atomically delete consumed state
  db.prepare('DELETE FROM oauth_states WHERE state = ?').run(state);

  return {
    valid: true,
    redirectUrl: row.redirect_url || undefined
  };
}

/**
 * Builds the GitHub OAuth authorization URL.
 */
export function getGitHubAuthorizeUrl(state: string, redirectUri: string): string {
  const clientId = process.env.GITHUB_CLIENT_ID || '';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:user,user:email,repo',
    state
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

/**
 * Builds the GitLab OAuth authorization URL.
 */
export function getGitLabAuthorizeUrl(state: string, redirectUri: string): string {
  const clientId = process.env.GITLAB_CLIENT_ID || '';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'read_user api',
    state
  });
  return `https://gitlab.com/oauth/authorize?${params.toString()}`;
}

/**
 * Exchanges authorization code for GitHub access token.
 */
export async function exchangeGitHubCode(code: string, redirectUri: string): Promise<{ accessToken: string }> {
  const clientId = process.env.GITHUB_CLIENT_ID || '';
  const clientSecret = process.env.GITHUB_CLIENT_SECRET || '';

  const response = await axios.post(
    'https://github.com/login/oauth/access_token',
    {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri
    },
    {
      headers: {
        Accept: 'application/json'
      },
      timeout: 10000
    }
  );

  if (response.data?.error) {
    throw new Error(response.data.error_description || response.data.error);
  }

  const accessToken = response.data?.access_token;
  if (!accessToken) {
    throw new Error('No access_token returned by GitHub OAuth token endpoint');
  }

  return { accessToken };
}

/**
 * Exchanges authorization code for GitLab access token.
 */
export async function exchangeGitLabCode(code: string, redirectUri: string): Promise<{ accessToken: string }> {
  const clientId = process.env.GITLAB_CLIENT_ID || '';
  const clientSecret = process.env.GITLAB_CLIENT_SECRET || '';

  const response = await axios.post(
    'https://gitlab.com/oauth/token',
    {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    },
    {
      headers: {
        Accept: 'application/json'
      },
      timeout: 10000
    }
  );

  if (response.data?.error) {
    throw new Error(response.data.error_description || response.data.error);
  }

  const accessToken = response.data?.access_token;
  if (!accessToken) {
    throw new Error('No access_token returned by GitLab OAuth token endpoint');
  }

  return { accessToken };
}

/**
 * Fetches user profile from GitHub API, falling back to emails endpoint if primary email is hidden.
 */
export async function fetchGitHubProfile(accessToken: string): Promise<OAuthUserProfile> {
  const userRes = await axios.get('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'OSS-Command-Center'
    },
    timeout: 10000
  });

  const userData = userRes.data;
  let email = userData.email;

  // If email is not public in primary profile, query /user/emails
  if (!email) {
    try {
      const emailsRes = await axios.get('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'OSS-Command-Center'
        },
        timeout: 10000
      });

      if (Array.isArray(emailsRes.data)) {
        const primary = emailsRes.data.find((e: any) => e.primary && e.verified);
        const verified = emailsRes.data.find((e: any) => e.verified);
        email = primary?.email || verified?.email || emailsRes.data[0]?.email;
      }
    } catch (emailErr) {
      console.warn('[GitHub OAuth] Could not fetch private emails list:', emailErr);
    }
  }

  if (!email) {
    email = `${userData.login}@users.noreply.github.com`;
  }

  return {
    id: String(userData.id),
    username: userData.login,
    displayName: userData.name || userData.login,
    email: email.toLowerCase().trim(),
    avatarUrl: userData.avatar_url
  };
}

/**
 * Fetches user profile from GitLab API.
 */
export async function fetchGitLabProfile(accessToken: string): Promise<OAuthUserProfile> {
  const userRes = await axios.get('https://gitlab.com/api/v4/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    timeout: 10000
  });

  const userData = userRes.data;
  const email = userData.email || `${userData.username}@users.noreply.gitlab.com`;

  return {
    id: String(userData.id),
    username: userData.username,
    displayName: userData.name || userData.username,
    email: email.toLowerCase().trim(),
    avatarUrl: userData.avatar_url
  };
}

/**
 * Resolves or creates a user account from OAuth identity and saves encrypted integration tokens.
 */
export async function findOrCreateOAuthUser(
  provider: 'github' | 'gitlab',
  profile: OAuthUserProfile,
  accessToken: string,
  existingUserId?: string
): Promise<{ user: any; isNew: boolean }> {
  const now = new Date().toISOString();

  let user: any = null;
  let isNew = false;

  // Case 1: Active authenticated session linking a provider
  if (existingUserId) {
    user = db.prepare('SELECT id, email, display_name, avatar_url, github_id, gitlab_id FROM users WHERE id = ?').get(existingUserId);
    if (user) {
      if (provider === 'github' && !user.github_id) {
        db.prepare('UPDATE users SET github_id = ?, updated_at = ? WHERE id = ?').run(profile.id, now, user.id);
      } else if (provider === 'gitlab' && !user.gitlab_id) {
        db.prepare('UPDATE users SET gitlab_id = ?, updated_at = ? WHERE id = ?').run(profile.id, now, user.id);
      }
    }
  }

  // Case 2: Query by provider ID
  if (!user) {
    const colName = provider === 'github' ? 'github_id' : 'gitlab_id';
    user = db.prepare(`SELECT id, email, display_name, avatar_url, github_id, gitlab_id FROM users WHERE ${colName} = ?`).get(profile.id);
  }

  // Case 3: Match by verified primary email
  if (!user && profile.email) {
    user = db.prepare('SELECT id, email, display_name, avatar_url, github_id, gitlab_id FROM users WHERE LOWER(email) = ?').get(profile.email.toLowerCase());
    if (user) {
      // Link provider ID to existing matched email user
      if (provider === 'github') {
        db.prepare('UPDATE users SET github_id = ?, updated_at = ? WHERE id = ?').run(profile.id, now, user.id);
      } else {
        db.prepare('UPDATE users SET gitlab_id = ?, updated_at = ? WHERE id = ?').run(profile.id, now, user.id);
      }
    }
  }

  // Case 4: Provision new user
  if (!user) {
    isNew = true;
    const userId = crypto.randomUUID();
    // High-entropy random locked password hash prevents unauthorized password sign-in
    const lockedSecret = crypto.randomBytes(32).toString('hex');
    const passwordHash = await hashPassword(lockedSecret);

    const displayName = profile.displayName || profile.username;
    const githubId = provider === 'github' ? profile.id : null;
    const gitlabId = provider === 'gitlab' ? profile.id : null;

    db.prepare(`
      INSERT INTO users (id, email, password_hash, display_name, avatar_url, github_id, gitlab_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, profile.email, passwordHash, displayName, profile.avatarUrl || null, githubId, gitlabId, now, now);

    // Initialize default user_settings
    db.prepare(`
      INSERT INTO user_settings (user_id, audio_chime_enabled, sync_cadence_minutes, webhook_events, background_sync_enabled, created_at, updated_at)
      VALUES (?, 1, 30, '["action_needed","review","merged"]', 1, ?, ?)
    `).run(userId, now, now);

    user = {
      id: userId,
      email: profile.email,
      display_name: displayName,
      avatar_url: profile.avatarUrl,
      github_id: githubId,
      gitlab_id: gitlabId
    };
  }

  // Store or update encrypted integration token
  try {
    const encrypted = encryptSecret(accessToken);
    const host = provider === 'gitlab' ? 'https://gitlab.com' : 'https://github.com';

    db.prepare(`
      INSERT INTO user_integrations (
        id, user_id, platform, username, host, encrypted_token, token_iv, token_auth_tag, sync_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'idle', ?)
      ON CONFLICT(user_id, platform, host) DO UPDATE SET
        username = excluded.username,
        encrypted_token = excluded.encrypted_token,
        token_iv = excluded.token_iv,
        token_auth_tag = excluded.token_auth_tag,
        sync_status = 'idle'
    `).run(
      crypto.randomUUID(),
      user.id,
      provider,
      profile.username,
      host,
      encrypted.ciphertext,
      encrypted.iv,
      encrypted.authTag,
      now
    );
  } catch (tokenErr) {
    console.error(`[OAuth Sync] Failed to store encrypted integration token for user ${user.id}:`, tokenErr);
  }

  return { user, isNew };
}
