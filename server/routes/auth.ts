import { Router, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { db } from '../db.js';
import { hashPassword, verifyPassword, generateSessionToken } from '../security/crypto.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rate_limit.js';
import {
  isGitHubOAuthConfigured,
  isGitLabOAuthConfigured,
  getAppBaseUrl,
  createOAuthState,
  validateAndConsumeOAuthState,
  getGitHubAuthorizeUrl,
  getGitLabAuthorizeUrl,
  exchangeGitHubCode,
  exchangeGitLabCode,
  fetchGitHubProfile,
  fetchGitLabProfile,
  findOrCreateOAuthUser
} from '../auth/oauth.js';

export const authRouter = Router();

const RegisterSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(50).trim().optional(),
  username: z.string().min(2, 'Username must be at least 2 characters').max(50).trim().optional()
});

const LoginSchema = z.object({
  email: z.string().trim().optional(),
  username: z.string().trim().optional(),
  usernameOrEmail: z.string().trim().optional(),
  password: z.string().min(1, 'Password is required')
});

const SESSION_DURATION_DAYS = 30;

function setSessionCookie(res: Response, token: string) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('oss_session', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000
  });
}

function setOAuthStateCookie(res: Response, state: string) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('oss_oauth_state', state, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60 * 1000
  });
}

// POST /api/auth/register
authRouter.post('/register', authLimiter, async (req, res) => {
  try {
    const parseResult = RegisterSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: parseResult.error.errors.map(e => e.message) 
      });
    }

    const { email, password, displayName, username } = parseResult.data;
    const cleanName = username || displayName || email.split('@')[0];

    // Check if user already exists by email or display_name
    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR display_name = ?').get(email, cleanName);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email or username already exists' });
    }

    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, email, passwordHash, cleanName, now, now);

    // Create session
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    
    db.prepare(`
      INSERT INTO sessions (id, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).run(sessionToken, userId, expiresAt, now);

    setSessionCookie(res, sessionToken);

    return res.status(201).json({
      user: {
        id: userId,
        email,
        username: cleanName,
        displayName: cleanName
      },
      token: sessionToken
    });
  } catch (err: any) {
    console.error('[Auth Register Error]:', err);
    return res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});

// POST /api/auth/login
authRouter.post('/login', authLimiter, async (req, res) => {
  try {
    const parseResult = LoginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: parseResult.error.errors.map(e => e.message) 
      });
    }

    const { password } = parseResult.data;
    const identifier = (parseResult.data.usernameOrEmail || parseResult.data.email || parseResult.data.username || '').toLowerCase().trim();

    if (!identifier) {
      return res.status(400).json({ error: 'Username or email is required' });
    }

    const user = db.prepare(`
      SELECT id, email, password_hash, display_name
      FROM users
      WHERE LOWER(email) = ? OR LOWER(display_name) = ?
    `).get(identifier, identifier) as any;

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const sessionToken = generateSessionToken();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO sessions (id, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).run(sessionToken, user.id, expiresAt, now);

    setSessionCookie(res, sessionToken);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.display_name || user.email.split('@')[0],
        displayName: user.display_name || user.email.split('@')[0]
      },
      token: sessionToken
    });
  } catch (err: any) {
    console.error('[Auth Login Error]:', err);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// POST /api/auth/logout
authRouter.post('/logout', (req, res) => {
  const sessionId = req.cookies?.['oss_session'] || 
    (req.headers['authorization']?.startsWith('Bearer ') 
      ? req.headers['authorization'].slice(7).trim() 
      : null);

  if (sessionId) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
  }

  res.clearCookie('oss_session', { path: '/' });
  return res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  
  // Fetch user's integrations with masked token indicators
  const integrations = db.prepare(`
    SELECT id, platform, username, host, last_synced_at, sync_status, sync_error, created_at,
           (encrypted_token IS NOT NULL) as has_token
    FROM user_integrations
    WHERE user_id = ?
    ORDER BY created_at ASC
  `).all(user.id) as any[];

  return res.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName
    },
    integrations: integrations.map(i => ({
      ...i,
      has_token: Boolean(i.has_token)
    }))
  });
});

// GET /api/auth/providers
authRouter.get('/providers', (req, res) => {
  return res.json({
    github: isGitHubOAuthConfigured(),
    gitlab: isGitLabOAuthConfigured()
  });
});

// GET /api/auth/github
authRouter.get('/github', (req, res) => {
  if (!isGitHubOAuthConfigured()) {
    return res.status(503).json({ error: 'GitHub OAuth is not configured on this server' });
  }

  const redirectPath = typeof req.query.redirect === 'string' ? req.query.redirect : '/?view=stream';
  const state = createOAuthState('github', redirectPath);
  setOAuthStateCookie(res, state);

  const redirectUri = `${getAppBaseUrl(req)}/api/auth/github/callback`;
  const authorizeUrl = getGitHubAuthorizeUrl(state, redirectUri);
  return res.redirect(authorizeUrl);
});

// GET /api/auth/github/callback
authRouter.get('/github/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      console.warn('[GitHub OAuth Error]:', error, error_description);
      return res.redirect(`/?error=oauth_denied&message=${encodeURIComponent(String(error_description || error))}`);
    }

    if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
      return res.status(400).redirect('/?error=invalid_oauth_request');
    }

    // Verify state token against database
    const stateValidation = validateAndConsumeOAuthState(state, 'github');
    if (!stateValidation.valid) {
      return res.status(403).redirect('/?error=invalid_or_expired_state');
    }

    res.clearCookie('oss_oauth_state', { path: '/' });

    const redirectUri = `${getAppBaseUrl(req)}/api/auth/github/callback`;
    const { accessToken } = await exchangeGitHubCode(code, redirectUri);
    const profile = await fetchGitHubProfile(accessToken);

    // Check if user is currently logged in to link integration
    const currentSessionId = req.cookies?.['oss_session'];
    let existingUserId: string | undefined;
    if (currentSessionId) {
      const sessionRow = db.prepare('SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?').get(
        currentSessionId,
        new Date().toISOString()
      ) as any;
      if (sessionRow) {
        existingUserId = sessionRow.user_id;
      }
    }

    const { user } = await findOrCreateOAuthUser('github', profile, accessToken, existingUserId);

    // Create session
    const sessionToken = generateSessionToken();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO sessions (id, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).run(sessionToken, user.id, expiresAt, now);

    setSessionCookie(res, sessionToken);

    const targetUrl = stateValidation.redirectUrl || '/?view=stream&oauth=success';
    return res.redirect(targetUrl);
  } catch (err: any) {
    console.error('[GitHub OAuth Callback Error]:', err);
    return res.redirect(`/?error=oauth_exchange_failed&message=${encodeURIComponent(err.message || 'Authentication failed')}`);
  }
});

// GET /api/auth/gitlab
authRouter.get('/gitlab', (req, res) => {
  if (!isGitLabOAuthConfigured()) {
    return res.status(503).json({ error: 'GitLab OAuth is not configured on this server' });
  }

  const redirectPath = typeof req.query.redirect === 'string' ? req.query.redirect : '/?view=stream';
  const state = createOAuthState('gitlab', redirectPath);
  setOAuthStateCookie(res, state);

  const redirectUri = `${getAppBaseUrl(req)}/api/auth/gitlab/callback`;
  const authorizeUrl = getGitLabAuthorizeUrl(state, redirectUri);
  return res.redirect(authorizeUrl);
});

// GET /api/auth/gitlab/callback
authRouter.get('/gitlab/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      console.warn('[GitLab OAuth Error]:', error, error_description);
      return res.redirect(`/?error=oauth_denied&message=${encodeURIComponent(String(error_description || error))}`);
    }

    if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
      return res.status(400).redirect('/?error=invalid_oauth_request');
    }

    // Verify state token against database
    const stateValidation = validateAndConsumeOAuthState(state, 'gitlab');
    if (!stateValidation.valid) {
      return res.status(403).redirect('/?error=invalid_or_expired_state');
    }

    res.clearCookie('oss_oauth_state', { path: '/' });

    const redirectUri = `${getAppBaseUrl(req)}/api/auth/gitlab/callback`;
    const { accessToken } = await exchangeGitLabCode(code, redirectUri);
    const profile = await fetchGitLabProfile(accessToken);

    // Check if user is currently logged in to link integration
    const currentSessionId = req.cookies?.['oss_session'];
    let existingUserId: string | undefined;
    if (currentSessionId) {
      const sessionRow = db.prepare('SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?').get(
        currentSessionId,
        new Date().toISOString()
      ) as any;
      if (sessionRow) {
        existingUserId = sessionRow.user_id;
      }
    }

    const { user } = await findOrCreateOAuthUser('gitlab', profile, accessToken, existingUserId);

    // Create session
    const sessionToken = generateSessionToken();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO sessions (id, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).run(sessionToken, user.id, expiresAt, now);

    setSessionCookie(res, sessionToken);

    const targetUrl = stateValidation.redirectUrl || '/?view=stream&oauth=success';
    return res.redirect(targetUrl);
  } catch (err: any) {
    console.error('[GitLab OAuth Callback Error]:', err);
    return res.redirect(`/?error=oauth_exchange_failed&message=${encodeURIComponent(err.message || 'Authentication failed')}`);
  }
});
