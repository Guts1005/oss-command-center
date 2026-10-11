# Spec: Sprint 18 (Option C: GitHub & GitLab OAuth 2.0 Social Login)

## Objective
Equip OSS Command Center with production-grade OAuth 2.0 social login ("Sign in with GitHub" and "Sign in with GitLab"). 
New and returning contributors will be able to authenticate with a single click, automatically establishing an authenticated session and securely storing their encrypted OAuth access tokens into `user_integrations` for immediate contribution syncing.

## Target Audience & User Stories
- **New Contributor**: Arrives at OSS Command Center, clicks "Continue with GitHub", authorizes the app on GitHub, and lands directly on their personalized Contribution Stream with zero manual token configuration.
- **GitLab Maintainer**: Clicks "Continue with GitLab", authorizes their account, and immediately tracks their open merge requests.
- **Existing Password User**: Can sign in via GitHub or GitLab if their verified OAuth email matches their account, seamlessly linking their accounts.
- **Self-Hosted Administrator**: Configures `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITLAB_CLIENT_ID`, `GITLAB_CLIENT_SECRET`, and `APP_URL` in `.env`. If credentials are omitted, the system gracefully falls back to password authentication without runtime errors.

## Tech Stack & Commands
- **Runtime**: Node.js v20+, TypeScript (ESM), Express 4.x
- **Database**: SQLite (better-sqlite3) with WAL mode, foreign keys, and AES-256-GCM encryption for tokens
- **HTTP Client**: Axios / native fetch for upstream token exchange
- **Commands**:
  - Build: `npm run build`
  - Test: `npm test`
  - Dev: `npm run dev`

## Architecture & Data Flow

```
[User Browser]
      │
      │ 1. Click "Continue with GitHub"
      ▼
[GET /api/auth/github]
      │
      │ 2. Generate crypto state token, set HTTP-only cookie, redirect to GitHub
      ▼
[GitHub OAuth Authorize URL]
      │
      │ 3. User grants scopes (read:user, user:email, repo)
      ▼
[GET /api/auth/github/callback?code=...&state=...]
      │
      │ 4. Verify state cookie (CSRF check)
      │ 5. Exchange code for access_token with GitHub API
      │ 6. Fetch profile and verified primary email
      │ 7. Find or create user in SQLite
      │ 8. Store/update encrypted OAuth token in user_integrations
      │ 9. Issue session token cookie & redirect to /?view=stream&oauth=success
      ▼
[User Browser / Dashboard]
```

## Security & Boundary Defense
1. **CSRF State Verification**: State token generated with `crypto.randomBytes(32).toString('hex')` and verified against an HttpOnly cookie (`oss_oauth_state`) with 10-minute expiry.
2. **Token Encryption at Rest**: Upstream OAuth access tokens are encrypted using the existing AES-256-GCM encryption module (`server/security/crypto.ts`) before insertion into `user_integrations`.
3. **No Password Exposure**: For OAuth users created without a password, `password_hash` is initialized with an unmatchable cryptographically random lock string so traditional password login cannot be hijacked.
4. **Email Verification Gate**: Only verified emails returned by GitHub/GitLab profile endpoints are accepted for automatic account linking.

## API Endpoints Design
- `GET /api/auth/providers`: Returns `{ github: boolean, gitlab: boolean }` so frontend dynamically renders available social login buttons.
- `GET /api/auth/github`: Initiates GitHub OAuth flow, generates state token cookie, and redirects to GitHub.
- `GET /api/auth/github/callback`: Validates state, exchanges authorization code, establishes user session, and redirects to app.
- `GET /api/auth/gitlab`: Initiates GitLab OAuth flow with state cookie and redirects to GitLab.
- `GET /api/auth/gitlab/callback`: Validates state, exchanges authorization code, establishes user session, and redirects to app.

## Project Structure
- `server/auth/oauth.ts`: OAuth provider clients, authorization URL generators, token exchangers, and profile fetchers.
- `server/routes/auth.ts`: Mounts OAuth initiate and callback routes.
- `server/db.ts`: Add `github_id` and `gitlab_id` columns to `users` with automatic migration.
- `client/src/components/AuthModal.tsx`: Adds "Continue with GitHub" and "Continue with GitLab" buttons with brand icons and loading states.
- `tests/oauth.test.ts`: Automated test suite testing provider status, CSRF state verification, code exchange simulation, user account creation, integration storage, and error recovery.

## Success Criteria
1. `GET /api/auth/providers` correctly reflects presence of environment variables.
2. State token CSRF protection rejects mismatched or missing states with 400/403.
3. Successful OAuth exchange creates a new user or links to an existing user with matching verified email.
4. OAuth token is automatically encrypted at rest and stored in `user_integrations`.
5. Frontend AuthModal displays social login options cleanly matching Manus/Watermelon UI aesthetic.
6. All 15 test suites pass with 100% success rate.
7. Zero em-dashes across all code, tests, and documentation.
