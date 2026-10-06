import { Request, Response, NextFunction } from 'express';
import rateLimit, { Options } from 'express-rate-limit';

export interface SecurityAuditEvent {
  id: string;
  timestamp: string;
  event: 'RATE_LIMIT_BLOCKED' | 'SUSPICIOUS_PROBE' | 'AUTH_ANOMALY';
  tier: 'auth' | 'actions' | 'webhooks' | 'api' | 'custom';
  ip: string;
  path: string;
  method: string;
  userAgent: string;
  retryAfterSeconds: number;
  details?: Record<string, any>;
}

// In-memory security audit log ring buffer (retains last 200 security events)
const MAX_AUDIT_LOGS = 200;
const securityAuditLogs: SecurityAuditEvent[] = [];

/**
 * Logs a structured security event to the audit buffer and system logs.
 */
export function logSecurityEvent(event: Omit<SecurityAuditEvent, 'id' | 'timestamp'>): SecurityAuditEvent {
  const entry: SecurityAuditEvent = {
    id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date().toISOString(),
    ...event,
  };

  securityAuditLogs.unshift(entry);
  if (securityAuditLogs.length > MAX_AUDIT_LOGS) {
    securityAuditLogs.pop();
  }

  // Structured console telemetry
  console.warn(
    `[Security Defense] ${entry.event} [${entry.tier.toUpperCase()}] ` +
    `IP: ${entry.ip} -> ${entry.method} ${entry.path} (Retry-After: ${entry.retryAfterSeconds}s)`
  );

  return entry;
}

/**
 * Returns a read-only copy of recent security audit entries.
 */
export function getSecurityAuditLogs(): readonly SecurityAuditEvent[] {
  return [...securityAuditLogs];
}

/**
 * Clears the security audit log buffer (useful for test isolation).
 */
export function clearSecurityAuditLogs(): void {
  securityAuditLogs.length = 0;
}

export interface RateLimiterConfig {
  tier: 'auth' | 'actions' | 'webhooks' | 'api' | 'custom';
  windowMs: number;
  max: number;
  message: string;
  keyGenerator?: (req: Request) => string;
}

/**
 * Checks if a request targets infrastructure health probes that must remain immune.
 */
export function isHealthProbe(req: Request): boolean {
  const rawPath = req.originalUrl || req.url || '';
  const cleanPath = rawPath.split('?')[0];
  return (
    cleanPath === '/health' ||
    cleanPath === '/api/health' ||
    cleanPath === '/metrics' ||
    cleanPath.startsWith('/health/') ||
    cleanPath.startsWith('/api/health/')
  );
}

/**
 * Factory function to create hardened rate limiters with standardized RFC headers,
 * structured 429 JSON payloads, and security audit telemetry.
 */
export function createRateLimiter(config: RateLimiterConfig) {
  const retryAfterSeconds = Math.ceil(config.windowMs / 1000);

  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: true,
    legacyHeaders: false,
    validate: {
      keyGeneratorIpFallback: false,
      xForwardedForHeader: false,
    },
    skip: (req: Request) => {
      // Health check probes are strictly immune across all tiers
      if (isHealthProbe(req)) {
        return true;
      }

      // Explicit opt-in header for deterministic testing
      if (req.headers['x-test-rate-limit'] === 'true') {
        return false;
      }

      // Skip in automated test runner by default to avoid flakiness in other suites
      if (process.env.NODE_ENV === 'test') {
        return true;
      }

      return false;
    },
    keyGenerator: config.keyGenerator || ((req: Request) => {
      // Respect X-Forwarded-For only when behind a configured trusted proxy or running isolated tests
      const isTrustedProxy = Boolean(req.app?.get?.('trust proxy'));
      const isTestEnv = process.env.NODE_ENV === 'test';
      if ((isTrustedProxy || isTestEnv) && req.headers['x-forwarded-for']) {
        const forwarded = (req.headers['x-forwarded-for'] as string).split(',')[0].trim();
        if (forwarded) return forwarded;
      }
      return req.ip || req.socket.remoteAddress || '127.0.0.1';
    }),
    handler: (req: Request, res: Response) => {
      const isTrustedProxy = Boolean(req.app?.get?.('trust proxy'));
      const isTestEnv = process.env.NODE_ENV === 'test';
      let clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      if ((isTrustedProxy || isTestEnv) && req.headers['x-forwarded-for']) {
        const forwarded = (req.headers['x-forwarded-for'] as string).split(',')[0].trim();
        if (forwarded) clientIp = forwarded;
      }

      logSecurityEvent({
        event: 'RATE_LIMIT_BLOCKED',
        tier: config.tier,
        ip: clientIp,
        path: req.originalUrl || req.url,
        method: req.method,
        userAgent: req.headers['user-agent'] || 'unknown',
        retryAfterSeconds,
        details: {
          limit: config.max,
          windowMs: config.windowMs,
        },
      });

      res.setHeader('Retry-After', retryAfterSeconds.toString());

      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: config.message,
          tier: config.tier,
          retryAfterSeconds,
        },
      });
    },
  });
}

// -------------------------------------------------------------
// Enterprise Multi-Tier Rate Limiters
// -------------------------------------------------------------

/**
 * Tier 1: Authentication Rate Limiter
 * 15 requests per 15 minutes. Protects login and registration against credential stuffing.
 */
export const authLimiter = createRateLimiter({
  tier: 'auth',
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Too many authentication attempts. Please wait 15 minutes before retrying.',
});

/**
 * Tier 2: Action & Synchronization Mutation Rate Limiter
 * 30 requests per 1 minute. Protects against upstream GitHub/GitLab token exhaustion and spam.
 */
export const actionLimiter = createRateLimiter({
  tier: 'actions',
  windowMs: 60 * 1000,
  max: 30,
  message: 'Action mutation rate limit exceeded. Please wait 60 seconds before triggering new actions.',
});

/**
 * Tier 3: Inbound Webhook Rate Limiter
 * 600 requests per 15 minutes. Defends against webhook flooding while permitting burst events.
 */
export const webhookLimiter = createRateLimiter({
  tier: 'webhooks',
  windowMs: 15 * 60 * 1000,
  max: 600,
  message: 'Inbound webhook rate limit exceeded. Please throttle webhook delivery.',
});

/**
 * Tier 4: Global API Rate Limiter
 * 1200 requests per 15 minutes. Protects general perimeter against high-frequency scrapers and abuse.
 */
export const globalApiLimiter = createRateLimiter({
  tier: 'api',
  windowMs: 15 * 60 * 1000,
  max: 1200,
  message: 'Global API rate limit exceeded. Please throttle requests and try again later.',
});
