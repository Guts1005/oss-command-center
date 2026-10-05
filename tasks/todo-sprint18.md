# Tasks: Sprint 18 (Option C: GitHub & GitLab OAuth 2.0 Social Login)

- [x] Task 1: Expand database schema in server/db.ts with migration
  - Acceptance: users table includes github_id and gitlab_id with migration checks
  - Verify: Migration runs safely on existing database without data loss
  - Files: server/db.ts

- [x] Task 2: Implement OAuth service in server/auth/oauth.ts
  - Acceptance: State generation, CSRF validation, token exchange, and user profile retrieval for GitHub and GitLab
  - Verify: Unit functions return correct authorization URLs and parse profiles
  - Files: server/auth/oauth.ts

- [x] Task 3: Expose OAuth routes in server/routes/auth.ts
  - Acceptance: /api/auth/providers, /api/auth/github, /api/auth/github/callback, /api/auth/gitlab, /api/auth/gitlab/callback
  - Verify: Unconfigured providers return false in providers endpoint; missing state rejected with 403
  - Files: server/routes/auth.ts

- [x] Task 4: Build automated test suite for OAuth
  - Acceptance: Comprehensive coverage for CSRF checks, new user creation, existing user linking, token encryption, and provider detection
  - Verify: npx tsx tests/oauth.test.ts passes cleanly
  - Files: tests/oauth.test.ts, tests/run_all.ts

- [x] Task 5: Update frontend AuthModal.tsx with OAuth social buttons
  - Acceptance: Social login buttons rendered with brand icons, disabled when provider unconfigured, triggers OAuth redirect
  - Verify: UI builds with 0 errors via npm run build
  - Files: client/src/components/AuthModal.tsx

- [x] Task 6: Final verification and deployment
  - Acceptance: All 15 test suites pass, build succeeds, zero em-dash compliance verified, changes committed and pushed
  - Verify: npm test && npm run build
  - Files: All modified files
