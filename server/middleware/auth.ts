import { Request, Response, NextFunction } from 'express';
import { db } from '../db.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  username: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Extracts and verifies the session token from HttpOnly cookies or Authorization header.
 * Attaches the verified user to `req.user`.
 * Rejects with 401 if unauthenticated or session expired.
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.['oss_session'] || 
    (req.headers['authorization']?.startsWith('Bearer ') 
      ? req.headers['authorization'].slice(7).trim() 
      : null);

  if (!sessionId) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const now = new Date().toISOString();
  const session = db.prepare(`
    SELECT s.id, s.user_id, s.expires_at, u.email, u.display_name
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.expires_at > ?
  `).get(sessionId, now) as any;

  if (!session) {
    // Clear stale cookie
    res.clearCookie('oss_session', { path: '/' });
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }

  const cleanName = session.display_name || session.email.split('@')[0];
  req.user = {
    id: session.user_id,
    email: session.email,
    displayName: cleanName,
    username: cleanName
  };

  next();
}

/**
 * Optional authentication: populates `req.user` if valid session exists, but allows request to continue if not.
 */
export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const sessionId = req.cookies?.['oss_session'] || 
    (req.headers['authorization']?.startsWith('Bearer ') 
      ? req.headers['authorization'].slice(7).trim() 
      : null);

  if (sessionId) {
    const now = new Date().toISOString();
    const session = db.prepare(`
      SELECT s.id, s.user_id, s.expires_at, u.email, u.display_name
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ? AND s.expires_at > ?
    `).get(sessionId, now) as any;

    if (session) {
      const cleanName = session.display_name || session.email.split('@')[0];
      req.user = {
        id: session.user_id,
        email: session.email,
        displayName: cleanName,
        username: cleanName
      };
    }
  }

  next();
}
