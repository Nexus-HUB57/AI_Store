# CI/CD — AI Store + b'AI'tcoin

## AI_Store (Nexus-HUB57/AI_Store)

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **CI** (`ci.yml`) | push/PR `main`,`staging` | validate-env → test → lint → typecheck → build → docker (main) |
| **Deploy production** (`deploy.yml`) | push `main` + `workflow_dispatch` | build standalone → FTP/SSH HostGator → smoke API |
| **Deploy staging** (`deploy-staging.yml`) | push `staging` | basePath `/aistore-staging` |
| **Smoke production** (`smoke-production.yml`) | after deploy success, cron 6h, manual | live BAIT + Store + basePath gate |
| Cron A2A / MCP | schedule | catalog health |

### Production flow

```
push main
  → validate secrets
  → vitest
  → prisma db push + next build (NEXT_PUBLIC_BASE_PATH=/aistore)
  → artifact aistore-standalone.tar.gz
  → resolve CREDENCIAIS_* → FTP (port 21) or SSH
  → upload public_html/aistore-codebase.tar.gz
  → smoke: /aistore/api/stats == 200 && total > 0
```

### Secrets (repo or Environment `production`)

| Secret | Use |
|--------|-----|
| `CREDENCIAIS_PLATAFORMA_BAIT` | JSON host/user/password or key |
| `CREDENCIAIS_HOSTGATOR` | fallback JSON |
| `SSH_HOST` / `SSH_USER` / `SSH_PRIVATE_KEY` / `SSH_PORT` | SSH path |
| `SESSION_SECRET` | runtime auth on host (≥16 chars) |

### Manual deploy

```
Actions → Deploy AI Store to HostGator → Run workflow
  skip_tests: false
  skip_hostgator: false
```

If FTP uploads but UI stays on old JS:

```bash
# cPanel Terminal
bash ~/public_html/deploy-manual.sh
# or extract aistore-codebase.tar.gz into the Node standalone dir and restart
```

### basePath gate (Erro Inesperado)

- Correct: `https://www.mybait.org/aistore/api/stats`
- Wrong: `https://www.mybait.org/api/stats` (must be 404)
- Client: early `<head>` script + `apiUrl()` + `BasePathPatch`

## b-AI-tcoin-AI-to-AI-

| Area | Workflows |
|------|-----------|
| CI | `ci.yml` (Python / Node / Foundry / Slither) |
| Mainnet | `deploy-mainnet.yml`, `deploy-mybait.yml`, `go-live.yml` |
| AA / Paymaster | `deploy-paymaster.yml`, `aa-prod-secrets-check.yml` |
| L3 pool | `verify-public-pool.yml` — **NO-GO until BAIT+BTC+parity** |
| Security | `security-guard.yml`, `approval-gate-security.yml` |

Economic rule: BAIT primary; BTC/ETH = reserve only; public pool requires L3 evidence.
