import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const testDb = path.resolve(process.cwd(), 'test_isolated.db');

// Clean any leftover test db
for (const f of [testDb, `${testDb}-wal`, `${testDb}-shm`]) {
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

const env = { ...process.env, DB_PATH: 'test_isolated.db' };

const testFiles = [
  'tests/crypto.test.ts',
  'tests/db.test.ts',
  'tests/api_integration.test.ts',
  'tests/multi_tenant.test.ts'
];

let failed = false;

for (const file of testFiles) {
  console.log(`\n--- Running ${file} ---`);
  const result = spawnSync('npx', ['tsx', file], {
    env,
    stdio: 'inherit',
    shell: true
  });
  if (result.status !== 0) {
    console.error(`❌ Test failed: ${file}`);
    failed = true;
    break;
  }
}

// Clean up isolated test db
for (const f of [testDb, `${testDb}-wal`, `${testDb}-shm`]) {
  if (fs.existsSync(f)) {
    try { fs.unlinkSync(f); } catch {}
  }
}

if (failed) {
  process.exit(1);
} else {
  console.log('\n🎉 ALL TEST SUITES PASSED CLEANLY IN ISOLATION!');
}
