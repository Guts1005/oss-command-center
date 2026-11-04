# OSS Command Center: Agent Operating Guidelines

## Project Architecture
- **Client**: React 18, Vite, Framer Motion, Tailwind CSS, Lucide Icons, Lenis smooth scrolling.
- **Server**: Node.js/Express, TypeScript (executed via tsx), better-sqlite3 with WAL mode, Litestream replication ready.
- **Security & Data Isolation**: AES-256-GCM encryption for user integration tokens, Scrypt password hashing, HMAC-SHA256 webhook signatures, strict multi-tenant boundary checks.

## ECC Integration & Agent Workflow
- **Installed Harness**: ECC Universal v2.2.3 full profile active in `.agents/`.
- **Specialized Agents**:
  - `planner`: Implementation specs, milestones, and architectural task decomposition.
  - `tdd-guide`: Test-driven development for all new API routes and components.
  - `code-reviewer`: Mandatory review after any client or server modifications.
  - `security-reviewer`: Mandatory audit for auth, webhook verification, and secret handling.
  - `database-reviewer`: Review SQLite indexing, concurrency, and WAL performance.

## Runtime & Verification
- **Node.js Compatibility**: The native `better-sqlite3` module is compiled for Node.js ABI 131 (Node v23). Ensure `E:\OPEN SOURCE AUTOMATION\node-v23.11.1-win-x64` is prioritized on PATH when executing tests.
- **Test Suite**: Run `npm test` or `tsx tests/run_all.ts` before committing.
- **Code Standards**: Maintain immutability, zero deep nesting, strict TypeScript types, and zero em-dashes across all code and documentation.
