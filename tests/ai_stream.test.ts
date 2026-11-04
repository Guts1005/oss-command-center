import http from 'http';
import assert from 'assert';
import axios from 'axios';
import { app } from '../server/index.js';
import { initDatabase } from '../server/db.js';

process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';

async function runAIStreamTests() {
  console.log('=== Running AI Engine & SSE Streaming Tests ===');
  initDatabase();

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}`;

  try {
    // 1. GET /api/ai/status
    {
      const res = await axios.get(`${baseUrl}/api/ai/status`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(typeof res.data.available, 'boolean');
      assert.strictEqual(res.data.engine, 'OSS Neural Query Solver');
      console.log('✔ Test 1: GET /api/ai/status returns engine metadata.');
    }

    // 2. POST /api/ai/copilot with invalid payload
    {
      try {
        await axios.post(`${baseUrl}/api/ai/copilot`, {});
        assert.fail('Expected 400 for empty question');
      } catch (err: any) {
        assert.strictEqual(err.response?.status, 400);
      }
      console.log('✔ Test 2: POST /api/ai/copilot rejects invalid payload with 400.');
    }

    // 3. POST /api/ai/copilot greeting fast-path
    {
      const res = await axios.post(`${baseUrl}/api/ai/copilot`, {
        question: 'hello',
      });
      assert.strictEqual(res.status, 200);
      assert(typeof res.data.answer === 'string');
      assert(res.data.answer.includes('OSS Query Solver'));
      console.log('✔ Test 3: POST /api/ai/copilot handles greeting fast-path.');
    }

    // 4. POST /api/ai/copilot/stream SSE streaming endpoint
    {
      const res = await axios.post(
        `${baseUrl}/api/ai/copilot/stream`,
        { question: 'hi' },
        { responseType: 'text' }
      );
      assert.strictEqual(res.status, 200);
      assert(String(res.headers['content-type'] || '').includes('text/event-stream'));
      assert(res.data.includes('data: {"token":'));
      assert(res.data.includes('data: [DONE]'));
      console.log('✔ Test 4: POST /api/ai/copilot/stream delivers formatted SSE tokens and [DONE] marker.');
    }

    console.log('\n🎉 ALL AI ENGINE & STREAMING TESTS PASSED 100%!\n');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

runAIStreamTests().catch((err) => {
  console.error('❌ AI Stream test suite failed:', err);
  process.exit(1);
});
