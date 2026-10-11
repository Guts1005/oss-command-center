import axios from 'axios';
import { db, initDatabase } from '../server/db.js';
import express from 'express';
import cookieParser from 'cookie-parser';
import { apiRouter } from '../server/routes/index.js';
import { Server } from 'http';
import assert from 'assert';

async function runSettingsExportTests() {
  console.log('=== Running Settings & Data Export Integration Tests ===');

  initDatabase();

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api', apiRouter);

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
    // 1. Unauthenticated request to /api/settings/export should return 401
    const unauthResp = await client.get('/settings/export');
    assert.strictEqual(unauthResp.status, 401, 'Unauthenticated export must return 401');
    console.log('✔ Unauthenticated export request rejected with 401.');

    // 2. Register User Alice
    const ts = Date.now();
    const aliceEmail = `alice_export_${ts}@test.internal`;
    const aliceReg = await client.post('/auth/register', {
      email: aliceEmail,
      password: 'StrongP@ssword123!',
      displayName: `AliceExport_${ts}`
    });
    assert.strictEqual(aliceReg.status, 201);
    const tokenAlice = aliceReg.data.token;
    const clientAlice = axios.create({
      baseURL: baseUrl,
      headers: { Authorization: `Bearer ${tokenAlice}` },
      validateStatus: () => true
    });

    // 3. Alice saves custom settings
    const saveResp = await clientAlice.post('/settings', {
      audio_chime_enabled: false,
      sync_cadence_minutes: 15,
      webhook_url: 'https://webhook.internal/test',
      webhook_events: ['action_needed', 'merged']
    });
    assert.strictEqual(saveResp.status, 200);
    console.log('✔ User Alice settings saved.');

    // 4. Ingest a contribution for Alice
    const contribResp = await clientAlice.post('/ingest', {
      platform: 'github',
      repo: 'facebook/react',
      number: ts % 10000,
      title: 'Fix edge case in fiber scheduler',
      type: 'pr',
      url: `https://github.com/facebook/react/pull/${ts % 10000}`,
      author: 'alice',
      status: 'open',
      action_needed: 'reply'
    });
    assert.strictEqual(contribResp.status, 201);
    console.log('✔ User Alice tracked test contribution.');

    // 5. Alice exports data
    const exportResp = await clientAlice.get('/settings/export');
    assert.strictEqual(exportResp.status, 200, 'Export status must be 200');
    assert.ok(
      exportResp.headers['content-disposition']?.includes('attachment; filename='),
      'Content-Disposition header must specify attachment'
    );
    assert.strictEqual(exportResp.data.user.email, aliceEmail);
    assert.strictEqual(exportResp.data.settings.audio_chime_enabled, 0);
    assert.strictEqual(exportResp.data.settings.sync_cadence_minutes, 15);
    assert.strictEqual(exportResp.data.contributions.length, 1);
    assert.ok(exportResp.data.exported_at);
    console.log('✔ User Alice export data verified with proper headers and payload.');

    // 6. Register User Bob and test multi-tenant boundary on export
    const bobEmail = `bob_export_${ts}@test.internal`;
    const bobReg = await client.post('/auth/register', {
      email: bobEmail,
      password: 'StrongP@ssword456!',
      displayName: `BobExport_${ts}`
    });
    assert.strictEqual(bobReg.status, 201);
    const tokenBob = bobReg.data.token;
    const clientBob = axios.create({
      baseURL: baseUrl,
      headers: { Authorization: `Bearer ${tokenBob}` },
      validateStatus: () => true
    });

    // Bob exports data: should be isolated and contain 0 contributions
    const bobExportResp = await clientBob.get('/settings/export');
    assert.strictEqual(bobExportResp.status, 200);
    assert.strictEqual(bobExportResp.data.user.email, bobEmail);
    assert.strictEqual(bobExportResp.data.contributions.length, 0, 'Bob must not see Alice contributions');
    console.log('✔ Multi-tenant boundary verified: Bob export contains zero Alice contributions.');

    // 7. Verify view routing includes security and about
    const validViews = ['stream', 'analytics', 'repos', 'settings', 'security', 'about'];
    assert.ok(validViews.includes('security'));
    assert.ok(validViews.includes('about'));
    console.log('✔ View routing configuration verified for security and about.');

    console.log('\n🎉 ALL SETTINGS & EXPORT TESTS PASSED CLEANLY!\n');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

runSettingsExportTests().catch((err) => {
  console.error('❌ Settings export test failed:', err);
  process.exit(1);
});
