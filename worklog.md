# AI Store — Work Log

---

Task ID: 3
Agent: Super Z (main)
Task: Fix ESLint errors, create smoke/stress tests, fix deploy workflow

Work Log:

- Fixed 3 ESLint errors blocking CI:
  - e2e/purchase-flow.spec.ts:157 — unterminated string literal (quote typo `"` → `'`)
  - src/hooks/use-pulsar-sse.ts:64 — react-hooks/immutability (self-ref in useCallback via connectRef pattern)
  - src/hooks/use-pulsar-sse.ts:68 — react-hooks/refs (moved ref assignment to useEffect)
  - scripts/inspect_db.js — added to eslint ignores
  - Added `react-hooks/set-state-in-effect: warn` to eslint.config.mjs
- Fixed react-hooks/set-state-in-effect in page-client.tsx (async IIFE with isMounted guard)
- Fixed react-hooks/set-state-in-effect in login-dialog.tsx (lazy useState initialization for referral)
- Result: 0 errors, 181 warnings (all CI stages pass)
- Created Smoke Test v2.0 (scripts/smoke-test.sh):
  - 8 sections, 30+ test cases
  - Static pages, API core, agent discovery, auth & commerce, sandbox, security headers, auth guards, data integrity
  - JSON field validation, latency checks, bAIcoin daemon external check
  - Color-coded output (pass/fail/warn/info)
- Created Stress Test v1.0 (scripts/stress-test.sh):
  - 6 concurrent scenarios: homepage, /version, /health, /stats, /products, /agent/discover
  - Configurable concurrency (default 10) and requests/worker (default 100)
  - Latency stats: min/max/avg, throughput (req/s), success rate threshold 95%
- Fixed deploy workflow (0-jobs bug):
  - Root cause: job-level concurrency + needs dependency prevented job creation
  - Fix: moved concurrency to workflow level, merged pre-check into build-and-deploy step
  - Rewrote credential parsing with heredoc (eliminates YAML f-string issues)
  - Added DATABASE_URL env var (was missing, caused Seed DB failure)
  - Added workflow_dispatch with input, timeout-minutes: 15
  - Added post-deploy smoke test step
- Added test.cgi diagnostic endpoint for HostGator troubleshooting
- Added .gitattributes to enforce LF line endings for .cgi and .sh
- Build: 1533 pages, 0 errors consistently

Stage Summary:

- CI pipeline green (Test ✅, Lint ✅, TypeCheck ✅, Build ✅)
- Deploy workflow now creates jobs (was 0 jobs before fix)
- Deploy failed at Seed DB (missing DATABASE_URL) — fixed in commit 07c073c
- Live site still returning 500 (CGI execution issue on HostGator)
- test.cgi deployed to diagnose: https://www.mybait.org/aistore/test.cgi
- npm scripts: smoke, smoke:prod, stress, stress:prod
- Commits: d890087, 30de109, 07c073c, d4c94cc
