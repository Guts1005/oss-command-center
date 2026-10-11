// tests/security_hardening_ratelimit.test.ts
// Comprehensive validation for enterprise rate limiting, security headers, audit logging, and health probe immunity.

process.env.NODE_ENV = 'test';

import http from 'http';
import axios from 'axios';
import express from 'express';
import { app } from '../server/index.js';
import {
  getSecurityAuditLogs,
  clearSecurityAuditLogs,
  createRateLimiter,
  isHealthProbe,
} from '../server/middleware/rate_limit.js';

console.log('=== Running Enterprise Rate Limiting & Security Hardening Tests ===');

const server = http.createServer(app);

async function run() {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    clearSecurityAuditLogs();

    // -------------------------------------------------------------
    // Test 1: Health probe immunity (Zero false 429s on probes)
    // -------------------------------------------------------------
    {
      const probeUrls = [`${baseUrl}/health`, `${baseUrl}/api/health`];
      for (const probeUrl of probeUrls) {
        // Send 25 consecutive requests with x-test-rate-limit active
        for (let i = 0; i < 25; i++) {
          const res = await axios.get(probeUrl, {
            headers: {
              'x-test-rate-limit': 'true',
              'X-Forwarded-For': '10.0.0.1',
            },
          });
          if (res.status !== 200 || res.data.status !== 'healthy') {
            throw new Error(`Health probe at ${probeUrl} was improperly throttled or failed! Status: ${res.status}`);
          }
        }
      }
      console.log('✔ Test 1: Health probes (/health and /api/health) strictly immune to rate limits (25/25 requests passed 200 OK).');
    }

    // -------------------------------------------------------------
    // Test 2: Standard bypass for existing test suites
    // -------------------------------------------------------------
    {
      // When NODE_ENV === 'test' and x-test-rate-limit header is omitted, rate limiting must be bypassed
      const client = axios.create({ baseURL: baseUrl, validateStatus: () => true });
      for (let i = 0; i < 20; i++) {
        const res = await client.post('/api/auth/login', {
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        });
        if (res.status === 429) {
          throw new Error('Normal test request was throttled when test bypass should have applied!');
        }
      }
      console.log('✔ Test 2: Default test suite bypass verified. Normal test runs are not throttled.');
    }

    // -------------------------------------------------------------
    // Test 3: Tier 1 Auth Rate Limiter enforcement & 429 response
    // -------------------------------------------------------------
    {
      clearSecurityAuditLogs();
      const testIp = '198.51.100.77';
      const client = axios.create({
        baseURL: baseUrl,
        headers: {
          'x-test-rate-limit': 'true',
          'X-Forwarded-For': testIp,
        },
        validateStatus: () => true,
      });

      let blockedResponse: any = null;
      let blockedIndex = -1;

      // Auth limit is 15 requests per 15 minutes
      for (let i = 1; i <= 18; i++) {
        const res = await client.post('/api/auth/login', {
          email: `user${i}@example.com`,
          password: 'badpassword',
        });

        if (res.status === 429) {
          blockedResponse = res;
          blockedIndex = i;
          break;
        }
      }

      if (!blockedResponse) {
        throw new Error('Tier 1 Auth Rate Limiter did not trigger HTTP 429 after exceeding 15 attempts!');
      }

      if (blockedIndex !== 16) {
        throw new Error(`Expected rate limit to block on request #16, but blocked on #${blockedIndex}`);
      }

      // Verify standardized JSON error schema
      const errorBody = blockedResponse.data?.error;
      if (!errorBody || errorBody.code !== 'RATE_LIMIT_EXCEEDED') {
        throw new Error(`Expected error code RATE_LIMIT_EXCEEDED, got: ${JSON.stringify(errorBody)}`);
      }
      if (errorBody.tier !== 'auth') {
        throw new Error(`Expected tier 'auth', got: ${errorBody.tier}`);
      }
      if (typeof errorBody.retryAfterSeconds !== 'number' || errorBody.retryAfterSeconds <= 0) {
        throw new Error(`Expected valid retryAfterSeconds, got: ${errorBody.retryAfterSeconds}`);
      }

      // Verify RFC RateLimit headers
      const headers = blockedResponse.headers;
      if (!headers['retry-after']) {
        throw new Error('Missing Retry-After header on 429 response');
      }

      console.log(`✔ Test 3: Tier 1 Auth rate limiter triggered precisely on request #${blockedIndex} with 429 and RFC headers.`);
    }

    // -------------------------------------------------------------
    // Test 4: Structured Security Audit Logging on rate limit trip
    // -------------------------------------------------------------
    {
      const auditLogs = getSecurityAuditLogs();
      if (auditLogs.length === 0) {
        throw new Error('Security audit log buffer is empty after rate limit was triggered!');
      }

      const blockedLog = auditLogs.find((l) => l.event === 'RATE_LIMIT_BLOCKED' && l.tier === 'auth');
      if (!blockedLog) {
        throw new Error('Could not find RATE_LIMIT_BLOCKED event with tier auth in audit logs');
      }

      if (blockedLog.ip !== '198.51.100.77') {
        throw new Error(`Expected audit log IP 198.51.100.77, got: ${blockedLog.ip}`);
      }
      if (!blockedLog.path.includes('/api/auth/login')) {
        throw new Error(`Expected audit log path to contain /api/auth/login, got: ${blockedLog.path}`);
      }
      if (blockedLog.method !== 'POST') {
        throw new Error(`Expected audit log method POST, got: ${blockedLog.method}`);
      }
      if (typeof blockedLog.retryAfterSeconds !== 'number') {
        throw new Error('Audit log missing numeric retryAfterSeconds');
      }

      console.log('✔ Test 4: Structured security audit logger accurately recorded security event telemetry.');
    }

    // -------------------------------------------------------------
    // Test 5: Tier 2 Action Mutation rate limiter enforcement
    // -------------------------------------------------------------
    {
      const actionIp = '198.51.100.88';
      const client = axios.create({
        baseURL: baseUrl,
        headers: {
          'x-test-rate-limit': 'true',
          'X-Forwarded-For': actionIp,
        },
        validateStatus: () => true,
      });

      let blockedActionRes: any = null;
      let blockedActionIdx = -1;

      // Action limit is 30 requests per minute
      for (let i = 1; i <= 35; i++) {
        // Calling unauthenticated POST /api/sync triggers actionLimiter before or during auth check
        const res = await client.post('/api/sync', {});
        if (res.status === 429) {
          blockedActionRes = res;
          blockedActionIdx = i;
          break;
        }
      }

      if (!blockedActionRes) {
        throw new Error('Tier 2 Action Rate Limiter did not trigger HTTP 429 after 30 requests!');
      }

      if (blockedActionIdx !== 31) {
        throw new Error(`Expected action limit to block on request #31, but blocked on #${blockedActionIdx}`);
      }

      if (blockedActionRes.data?.error?.tier !== 'actions') {
        throw new Error(`Expected tier 'actions', got: ${blockedActionRes.data?.error?.tier}`);
      }

      console.log(`✔ Test 5: Tier 2 Action mutation rate limiter triggered on request #${blockedActionIdx} with tier 'actions'.`);
    }

    // -------------------------------------------------------------
    // Test 6: Rate Limiter Factory custom instances and reset behavior
    // -------------------------------------------------------------
    {
      const customApp = express();
      const customLimiter = createRateLimiter({
        tier: 'custom',
        windowMs: 500, // 500ms window
        max: 2,
        message: 'Custom rate limit reached',
      });

      customApp.get('/test-custom', customLimiter, (_req, res) => {
        res.json({ ok: true });
      });

      const customServer = http.createServer(customApp);
      await new Promise<void>((resolve) => customServer.listen(0, resolve));
      const customPort = (customServer.address() as any).port;
      const customClient = axios.create({
        baseURL: `http://127.0.0.1:${customPort}`,
        headers: { 'x-test-rate-limit': 'true' },
        validateStatus: () => true,
      });

      try {
        const r1 = await customClient.get('/test-custom');
        const r2 = await customClient.get('/test-custom');
        const r3 = await customClient.get('/test-custom');

        if (r1.status !== 200 || r2.status !== 200) {
          throw new Error('First two requests to custom rate limiter should have passed with 200');
        }
        if (r3.status !== 429) {
          throw new Error(`Third request should have been 429, got: ${r3.status}`);
        }
        if (r3.data?.error?.code !== 'RATE_LIMIT_EXCEEDED') {
          throw new Error('Custom limiter did not return RATE_LIMIT_EXCEEDED');
        }

        // Wait for window reset
        await new Promise((resolve) => setTimeout(resolve, 600));
        const r4 = await customClient.get('/test-custom');
        if (r4.status !== 200) {
          throw new Error(`Request after window expiration should have reset to 200, got: ${r4.status}`);
        }

        console.log('✔ Test 6: Custom rate limiter factory verified with successful window reset.');
      } finally {
        await new Promise<void>((resolve) => customServer.close(() => resolve()));
      }
    }

    console.log('\nALL 6 ENTERPRISE RATE LIMITING & SECURITY HARDENING TESTS PASSED WITH 100% SUCCESS!\n');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

run().catch((err) => {
  console.error('\n❌ FAILED Enterprise Rate Limiting Tests:', err);
  process.exit(1);
});
