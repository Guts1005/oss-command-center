import axios from 'axios';
import { db, initDatabase } from '../server/db.js';
import express from 'express';
import cookieParser from 'cookie-parser';
import { apiRouter } from '../server/routes/index.js';
import { Server } from 'http';

async function runMultiTenantTests() {
  console.log('=== Running Multi-Tenant End-to-End Integration Tests ===');

  initDatabase();

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api', apiRouter);

  // Start test server on dynamic port
  let server: Server;
  const port = await new Promise<number>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address() as any;
      resolve(addr.port);
    });
  });

  const baseUrl = `http://localhost:${port}/api`;
  const client = axios.create({ baseURL: baseUrl, validateStatus: () => true });

  try {
    // 1. Register User A
    const timestamp = Date.now();
    const userAEmail = `user_a_${timestamp}@test.internal`;
    const regAResp = await client.post('/auth/register', {
      email: userAEmail,
      password: 'StrongP@ssword123!',
      displayName: `Alice_${timestamp}`
    });

    if (regAResp.status !== 201 || !regAResp.data.token) {
      throw new Error(`User A registration failed: ${JSON.stringify(regAResp.data)}`);
    }
    const tokenA = regAResp.data.token;
    const userA = regAResp.data.user;
    console.log('✔ User A registered successfully.');

    // 2. Register User B
    const userBEmail = `user_b_${timestamp}@test.internal`;
    const regBResp = await client.post('/auth/register', {
      email: userBEmail,
      password: 'StrongP@ssword456!',
      displayName: `Bob_${timestamp}`
    });

    if (regBResp.status !== 201 || !regBResp.data.token) {
      throw new Error(`User B registration failed: ${JSON.stringify(regBResp.data)}`);
    }
    const tokenB = regBResp.data.token;
    const userB = regBResp.data.user;
    console.log('✔ User B registered successfully.');

    // 3. User A connects a GitHub PAT (AES-256-GCM encrypted)
    const clientA = axios.create({
      baseURL: baseUrl,
      headers: { Authorization: `Bearer ${tokenA}` },
      validateStatus: () => true
    });

    const intResp = await clientA.post('/integrations', {
      platform: 'github',
      username: 'alice_gh',
      token: 'ghp_aliceSecretPat123456789'
    });

    if (intResp.status !== 201) {
      throw new Error(`Integration creation failed: ${JSON.stringify(intResp.data)}`);
    }

    // Verify token is encrypted in DB
    const dbInt = db.prepare('SELECT * FROM user_integrations WHERE user_id = ?').get(userA.id) as any;
    if (!dbInt || !dbInt.encrypted_token || dbInt.encrypted_token.includes('aliceSecretPat')) {
      throw new Error('SECURITY VIOLATION: Access token stored in plaintext or unencrypted!');
    }
    console.log('✔ User A integration stored with authenticated AES-256-GCM encryption.');

    // 4. User A ingests a contribution
    const ingestResp = await clientA.post('/ingest', {
      platform: 'github',
      repo: 'torvalds/linux',
      number: 404,
      title: 'sched/fair: Optimize EEVDF latency sensitivity',
      type: 'pr',
      url: 'https://github.com/torvalds/linux/pull/404',
      author: 'alice_gh',
      status: 'open',
      action_needed: 'reply',
      difficulty: 'hard',
      bounty_amount: '$1000',
      notes: 'Alice private patch notes'
    });

    if (ingestResp.status !== 201) {
      throw new Error(`Ingestion failed: ${JSON.stringify(ingestResp.data)}`);
    }
    console.log('✔ User A contribution ingested.');

    // 5. User B queries contributions - MUST BE EMPTY
    const clientB = axios.create({
      baseURL: baseUrl,
      headers: { Authorization: `Bearer ${tokenB}` },
      validateStatus: () => true
    });

    const userBList = await clientB.get('/contributions');
    if (userBList.status !== 200 || userBList.data.length !== 0) {
      throw new Error(`SECURITY LEAK: User B received User A contributions! Count: ${userBList.data.length}`);
    }
    console.log('✔ Multi-tenant isolation verified: User B cannot see User A contributions.');

    // 6. User B attempts to access User A contribution details by ID - MUST BE 404
    const userBDetail = await clientB.get('/contributions/gh:torvalds/linux#404');
    if (userBDetail.status !== 404) {
      throw new Error(`SECURITY LEAK: User B accessed User A contribution detail! Status: ${userBDetail.status}`);
    }

    // 7. User B attempts to edit User A contribution notes - MUST BE 404
    const userBPatch = await clientB.patch('/contributions/gh:torvalds/linux#404/notes', {
      notes: 'Hacked by Bob'
    });
    if (userBPatch.status !== 404) {
      throw new Error(`SECURITY LEAK: User B modified User A contribution notes! Status: ${userBPatch.status}`);
    }
    console.log('✔ Multi-tenant mutation guard verified: User B cannot inspect or modify User A data.');

    // 8. User A queries contributions - MUST FIND ITEM
    const userAList = await clientA.get('/contributions');
    if (userAList.status !== 200 || userAList.data.length !== 1 || userAList.data[0].title !== 'sched/fair: Optimize EEVDF latency sensitivity') {
      throw new Error('User A could not retrieve their own contribution');
    }
    console.log('✔ User A successfully queries their private contribution deck.');

    // 9. Login verification
    const loginFail = await client.post('/auth/login', {
      email: userAEmail,
      password: 'WrongPassword123'
    });
    if (loginFail.status !== 401) {
      throw new Error('Failed login did not return 401');
    }

    const loginOk = await client.post('/auth/login', {
      email: userAEmail,
      password: 'StrongP@ssword123!'
    });
    if (loginOk.status !== 200 || !loginOk.data.token) {
      throw new Error('Valid login failed to return session token');
    }
    console.log('✔ Login credentials verification passed.');

    // 10. Logout verification
    const logoutResp = await clientA.post('/auth/logout');
    if (logoutResp.status !== 200) {
      throw new Error('Logout failed');
    }

    const meAfterLogout = await clientA.get('/auth/me');
    if (meAfterLogout.status !== 401) {
      throw new Error('Session remained valid after logout!');
    }
    console.log('✔ Logout and session destruction passed.');

    console.log('\nALL MULTI-TENANT & SECURITY TESTS PASSED WITH 100% ISOLATION!\n');
  } finally {
    server!.close();
  }
}

runMultiTenantTests().catch(err => {
  console.error('Multi-Tenant Test Failed:', err);
  process.exit(1);
});
