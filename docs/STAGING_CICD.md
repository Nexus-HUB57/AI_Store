# CI/CD Staging — AI Store

## Overview

| Ambiente | Branch | basePath | URL | Workflow |
|----------|--------|----------|-----|----------|
| **Production** | `main` | `/aistore` | https://www.mybait.org/aistore/ | `deploy.yml` |
| **Staging** | `staging` | `/aistore-staging` | https://www.mybait.org/aistore-staging/ | `deploy-staging.yml` |

Staging **não sobrescreve** produção: artefato e path remotos são distintos
(`aistore-staging-codebase.tar.gz`, `public_html/aistore-staging/`).

## Fluxo

```
feature/* ──PR──► staging ──deploy-staging──► HostGator /aistore-staging
                      │
                      └──PR──► main ──deploy.yml──► /aistore (prod)
```

1. Push ou merge na branch **`staging`**
2. Jobs: **Test → Build (basePath staging) → Publish**
3. Publish usa GitHub Environment **`staging`** (proteções opcionais)
4. Credenciais: mesmas de prod (`CREDENCIAIS_HOSTGATOR` / SSH_*) ou overrides `STAGING_*`

## Secrets

Reutiliza produção **ou** define no Environment `staging`:

| Secret | Uso |
|--------|-----|
| `CREDENCIAIS_HOSTGATOR` / `CREDENCIAIS_PLATAFORMA_BAIT` | JSON FTP `{host,user,password,port}` |
| `SSH_HOST` / `SSH_USER` / `SSH_PORT` / `SSH_PRIVATE_KEY` | Deploy SSH |
| `STAGING_SSH_*` / `STAGING_FTP_PASS` | Overrides só staging (opcional) |

## Criar branch staging

```bash
git fetch origin
git checkout main
git pull
git checkout -b staging
git push -u origin staging
```

No GitHub: **Settings → Environments → New environment → `staging`**
(opcional: required reviewers antes do publish).

## Local

```bash
cp .env.staging.example .env.staging
npm run build   # com NEXT_PUBLIC_BASE_PATH=/aistore-staging
# ou
docker compose -f docker-compose.staging.yml up --build
# → http://localhost:3100/aistore-staging
```

## Pós-upload no HostGator

FTP só deposita o tarball. Para extrair/reiniciar (se não houver auto-deploy):

```bash
# ajustar paths no deploy-manual se necessário
export TARBALL=~/public_html/aistore-staging-codebase.tar.gz
export INSTALL_DIR=~/aistore-staging-api
bash ~/public_html/deploy-manual-staging.sh
```

## Manual dispatch

Actions → **Deploy Staging (AI Store)** → Run workflow  
`skip_deploy=true` = só test+build (sem publish).
