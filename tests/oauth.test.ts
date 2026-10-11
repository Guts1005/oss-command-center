import http from 'http';
import assert from 'assert';
import axios from 'axios';
import { db, initDatabase } from '../server/db.js';
import { app } from '../server/index.js';
import {
  isGitHubOAuthConfigured,
  isGitLabOAuthConfigured,
  createOAuthState,
  validateAndConsumeOAuthState,
  findOrCreateOAuthUser,
  getGitHubAuthorizeUrl,
  getGitLabAuthorizeUrl
} from '../server/auth/oauth.js';
import { decryptSecret } from '../server/security/crypto.js';

process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';

async function runOAuthTests() {
  console.log('=== Running OAuth 2.0 Social Login Tests ===');
  initDatabase();

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}`;

  try {
    // -------------------------------------------------------------
    // Test 1: Capability Providers Check
    // -------------------------------------------------------------
    {
      const res = await axios.get(`${baseUrl}/api/auth/providers`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(typeof res.data.github, 'boolean');
      assert.strictEqual(typeof res.data.gitlab, 'boolean');
      console.log('✔ Test 1: GET /api/auth/providers returns boolean capability flags.');
    }

    // -------------------------------------------------------------
    // Test 2: Unconfigured Provider Rejection
    // -------------------------------------------------------------
    {
      delete process.env.GITHUB_CLIENT_ID;
      delete process.env.GITHUB_CLIENT_SECRET;

      assert.strictEqual(isGitHubOAuthConfigured(), false);

      try {
        await axios.get(`${baseUrl}/api/auth/github`, { maxRedirects: 0 });
        assert.fail('Expected 503 for unconfigured GitHub OAuth');
      } catch (err: any) {
        assert.strictEqual(err.response?.status, 503);
        assert(err.response?.data?.error?.includes('not configured'));
      }
      console.log('✔ Test 2: Unconfigured OAuth provider safely returns 503.');
    }

    // -------------------------------------------------------------
    // Test 3: OAuth State Token Generation & CSRF Protection
    // -------------------------------------------------------------
    {
      const state = createOAuthState('github', '/?view=analytics');
      assert.strictEqual(typeof state, 'string');
      assert.strictEqual(state.length, 64); // 32 bytes hex

      // Validation 1: First check succeeds and returns redirectUrl
      const firstCheck = validateAndConsumeOAuthState(state, 'github');
      assert.strictEqual(firstCheck.valid, true);
      assert.strictEqual(firstCheck.redirectUrl, '/?view=analytics');

      // Validation 2: Replay attack fails (atomically consumed)
      const replayCheck = validateAndConsumeOAuthState(state, 'github');
      assert.strictEqual(replayCheck.valid, false);

      // Validation 3: Non-existent or provider mismatched state fails
      const invalidState = createOAuthState('gitlab');
      const wrongProvider = validateAndConsumeOAuthState(invalidState, 'github');
      assert.strictEqual(wrongProvider.valid, false);

      console.log('✔ Test 3: OAuth state creation, single-use consumption, and CSRF defense verified.');
    }

    // -------------------------------------------------------------
    // Test 4: Authorization URL Generation
    // -------------------------------------------------------------
    {
      process.env.GITHUB_CLIENT_ID = 'test_gh_client_123';
      process.env.GITLAB_CLIENT_ID = 'test_gl_client_456';

      const ghUrl = getGitHubAuthorizeUrl('state_test_xyz', 'http://localhost:3100/callback');
      assert(ghUrl.includes('client_id=test_gh_client_123'));
      assert(ghUrl.includes('state=state_test_xyz'));
      assert(ghUrl.includes('read%3Auser'));

      const glUrl = getGitLabAuthorizeUrl('state_test_abc', 'http://localhost:3100/gl-callback');
      assert(glUrl.includes('client_id=test_gl_client_456'));
      assert(glUrl.includes('state=state_test_abc'));
      assert(glUrl.includes('read_user'));

      console.log('✔ Test 4: Authorization URL generation includes required scopes and state.');
    }

    // -------------------------------------------------------------
    // Test 5: Provision Brand New User via GitHub OAuth Identity
    // -------------------------------------------------------------
    {
      const mockProfile = {
        id: 'gh_user_998877',
        username: 'octo_tester',
        displayName: 'Octo Developer',
        email: 'octo.tester@github.com',
        avatarUrl: 'https://avatars.githubusercontent.com/u/998877'
      };
      const mockAccessToken = 'gho_secretAccessToken1234567890';

      const { user, isNew } = await findOrCreateOAuthUser('github', mockProfile, mockAccessToken);
      assert.strictEqual(isNew, true);
      assert.strictEqual(user.email, 'octo.tester@github.com');
      assert.strictEqual(user.display_name, 'Octo Developer');
      assert.strictEqual(user.github_id, 'gh_user_998877');

      // Verify user exists in SQLite
      const dbUser = db.prepare('SELECT id, email, password_hash, github_id FROM users WHERE id = ?').get(user.id) as any;
      assert(dbUser);
      assert.strictEqual(dbUser.github_id, 'gh_user_998877');
      assert(dbUser.password_hash);

      // Verify user_settings created automatically
      const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(user.id) as any;
      assert(settings);
      assert.strictEqual(settings.audio_chime_enabled, 1);

      // Verify integration created with AES-256-GCM encrypted token
      const integration = db.prepare('SELECT * FROM user_integrations WHERE user_id = ? AND platform = ?').get(user.id, 'github') as any;
      assert(integration);
      assert.strictEqual(integration.username, 'octo_tester');
      assert(integration.encrypted_token);
      assert(integration.token_iv);
      assert(integration.token_auth_tag);

      // Verify decrypted token matches original
      const decrypted = decryptSecret(integration.encrypted_token, integration.token_iv, integration.token_auth_tag);
      assert.strictEqual(decrypted, mockAccessToken);

      console.log('✔ Test 5: New user provisioning with encrypted token integration verified.');
    }

    // -------------------------------------------------------------
    // Test 6: Existing User with Matching Verified Email Linked
    // -------------------------------------------------------------
    {
      // 1. Create a user via standard registration
      const regRes = await axios.post(`${baseUrl}/api/auth/register`, {
        username: 'email_linked_dev',
        email: 'linkme@example.org',
        password: 'SuperSecretPassword123!'
      });
      assert.strictEqual(regRes.status, 201);
      const existingUserId = regRes.data.user.id;

      // 2. Simulate GitLab OAuth profile with the same verified email
      const mockGitLabProfile = {
        id: 'gl_user_554433',
        username: 'gitlab_dev',
        displayName: 'GitLab Developer',
        email: 'linkme@example.org'
      };
      const mockGitLabToken = 'glpat_testAccessToken987654';

      const { user, isNew } = await findOrCreateOAuthUser('gitlab', mockGitLabProfile, mockGitLabToken);
      assert.strictEqual(isNew, false);
      assert.strictEqual(user.id, existingUserId);

      // Verify gitlab_id was linked in database
      const dbUser = db.prepare('SELECT id, email, gitlab_id FROM users WHERE id = ?').get(existingUserId) as any;
      assert.strictEqual(dbUser.gitlab_id, 'gl_user_554433');

      // Verify integration stored
      const integration = db.prepare('SELECT * FROM user_integrations WHERE user_id = ? AND platform = ?').get(existingUserId, 'gitlab') as any;
      assert(integration);
      const decrypted = decryptSecret(integration.encrypted_token, integration.token_iv, integration.token_auth_tag);
      assert.strictEqual(decrypted, mockGitLabToken);

      console.log('✔ Test 6: Existing user with matching verified email successfully linked.');
    }

    // -------------------------------------------------------------
    // Test 7: Callback Rejection on Invalid State
    // -------------------------------------------------------------
    {
      try {
        await axios.get(`${baseUrl}/api/auth/github/callback?code=mock_code&state=non_existent_state`, {
          maxRedirects: 0
        });
        assert.fail('Expected callback to reject invalid state');
      } catch (err: any) {
        assert(err.response?.status === 403 || err.response?.status === 302);
      }
      console.log('✔ Test 7: Callback endpoint strictly rejects invalid state.');
    }

    console.log('\n🎉 ALL OAUTH 2.0 SOCIAL LOGIN TESTS PASSED 100%!\n');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

runOAuthTests().catch((err) => {
  console.error('❌ OAuth Test suite failed:', err);
  process.exit(1);
});
