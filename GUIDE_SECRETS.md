# Guia de Segredos — AI Store (GitHub Actions)

## Production (`main` → `deploy.yml`)

Deploy HostGator via **SSH** (chave) ou **FTP** (password, porta 21).

| Secret | Descrição |
|--------|-----------|
| `SSH_HOST` / `SSH_USER` / `SSH_PORT` / `SSH_PRIVATE_KEY` | Deploy SSH |
| `VPS_HOST` / `VPS_USER` / `VPS_PORT` / `VPS_SSH_KEY` | Alias VPS |
| `CREDENCIAIS_PLATAFORMA_BAIT` | JSON composto (ver abaixo) |
| `CREDENCIAIS_HOSTGATOR` | JSON FTP legado |

### JSON composto (FTP)

```json
{
  "host": "ftp.exemplo.com",
  "user": "cpanel_user",
  "password": "...",
  "port": 21
}
```

### JSON composto (SSH)

```json
{
  "host": "gator.exemplo.com",
  "user": "cpanel_user",
  "port": 22,
  "private_key": "-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----"
}
```

O workflow escolhe **FTP** se houver `password` e porta 21 (ou chave inválida);
**SSH** se a private key parsear com `ssh-keygen -y`.

---

## Staging (`staging` → `deploy-staging.yml`)

| Secret | Descrição |
|--------|-----------|
| Mesmos de produção | Reutilizados por default |
| `STAGING_SSH_HOST` / `STAGING_SSH_USER` / `STAGING_SSH_PORT` / `STAGING_SSH_PRIVATE_KEY` | Override opcional |
| `STAGING_FTP_PASS` | Override password FTP |

- **basePath:** `/aistore-staging`
- **URL:** https://www.mybait.org/aistore-staging/
- **Remote:** `public_html/aistore-staging-codebase.tar.gz` (não mistura com prod)
- **GitHub Environment:** `staging` (Settings → Environments)

Detalhes: [`docs/STAGING_CICD.md`](docs/STAGING_CICD.md)

---

## App runtime

| Secret / env | Uso |
|--------------|-----|
| `SESSION_SECRET` | ≥16 chars (produção no servidor) |
| `DATABASE_URL` | SQLite path (build CI usa `file:./db/custom.db`) |

---

## Como cadastrar

1. Repo → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** (ou secret no Environment `staging` / `production`)
3. Nunca commitar chaves/senhas no git

_Nexus AI-OS — AI Store_
