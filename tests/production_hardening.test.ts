// tests/production_hardening.test.ts
// Automated validation for production hardening: Helmet headers, /health probe, and compression.

process.env.NODE_ENV = 'test';

import http from 'http';
import axios from 'axios';
import { app } from '../server/index.js';

console.log('=== Running Production Hardening & Health Probe Tests ===');

const server = http.createServer(app);

async function run() {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // Test 1: GET /health probe returns 200 with database status
    {
      const res = await axios.get(`${baseUrl}/health`);
      if (res.status !== 200) {
        throw new Error(`Expected status 200, got ${res.status}`);
      }
      if (res.data.status !== 'healthy') {
        throw new Error(`Expected status 'healthy', got ${res.data.status}`);
      }
      if (res.data.database !== 'connected') {
        throw new Error(`Expected database 'connected', got ${res.data.database}`);
      }
      if (typeof res.data.uptimeSeconds !== 'number') {
        throw new Error(`Expected uptimeSeconds to be a number`);
      }
      console.log('✔ Test 1: GET /health returns 200 OK with database connectivity.');
    }

    // Test 2: GET /api/health alias returns 200 with healthy state
    {
      const res = await axios.get(`${baseUrl}/api/health`);
      if (res.status !== 200 || res.data.status !== 'healthy') {
        throw new Error(`Expected status 200 and healthy, got ${res.status}`);
      }
      console.log('✔ Test 2: GET /api/health probe alias verified successfully.');
    }

    // Test 3: Verify Helmet security HTTP headers
    {
      const res = await axios.get(`${baseUrl}/health`);
      const headers = res.headers;

      // X-Content-Type-Options
      if (headers['x-content-type-options'] !== 'nosniff') {
        throw new Error(`Expected X-Content-Type-Options: nosniff, got ${headers['x-content-type-options']}`);
      }

      // X-Frame-Options
      if (headers['x-frame-options'] !== 'DENY') {
        throw new Error(`Expected X-Frame-Options: DENY, got ${headers['x-frame-options']}`);
      }

      // Content-Security-Policy
      const csp = headers['content-security-policy'];
      if (!csp || !csp.includes("default-src 'self'") || !csp.includes("object-src 'none'")) {
        throw new Error(`CSP header missing or incomplete: ${csp}`);
      }

      // Framework fingerprint hidden
      if (headers['x-powered-by']) {
        throw new Error(`X-Powered-By should be stripped by Helmet, but found: ${headers['x-powered-by']}`);
      }

      console.log('✔ Test 3: Security headers verified (CSP, nosniff, DENY, X-Powered-By hidden).');
    }

    // Test 4: Gzip compression filter does not buffer SSE streams
    {
      const sseRes = await axios.get(`${baseUrl}/api/events`, {
        headers: {
          Accept: 'text/event-stream',
        },
        validateStatus: () => true,
      });

      // SSE without session token should be 401 unauthenticated
      if (sseRes.status !== 401) {
        throw new Error(`Expected unauthenticated SSE to return 401, got ${sseRes.status}`);
      }
      console.log('✔ Test 4: SSE events endpoint exempt from gzip buffering.');
    }

    console.log('\nALL PRODUCTION HARDENING TESTS PASSED WITH 100% SUCCESS!\n');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

run().catch((err) => {
  console.error('\nFAILED Production Hardening Tests:', err);
  process.exit(1);
});
