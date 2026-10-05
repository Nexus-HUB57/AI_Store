# SSH no GitHub Actions (AI Store → HostGator)

FTP a partir dos runners do GitHub **falha com timeout** na porta 21. O caminho suportado é **SSH (porta 22)**.

## Secrets (Settings → Secrets and variables → Actions)

| Secret | Obrigatório | Exemplo / notas |
|--------|-------------|-----------------|
| `SSH_HOST` | sim* | `gatorXXXX.hostgator.com` ou IP |
| `SSH_USER` | sim* | utilizador cPanel |
| `SSH_PRIVATE_KEY` | sim* | PEM completo `-----BEGIN ... KEY-----` |
| `SSH_PORT` | não | default `22` |
| `SESSION_SECRET` | recomendado | ≥16 chars (runtime Node) |
| `CREDENCIAIS_PLATAFORMA_BAIT` | alt | JSON com `host`,`user`,`private_key` ou `ssh_key` |
| `CREDENCIAIS_HOSTGATOR` | alt | idem |

\* Ou equivalentes `VPS_HOST` / `VPS_USER` / `VPS_SSH_KEY`.

### Formato da chave

```bash
# Gerar par (local)
ssh-keygen -t ed25519 -C "gha-aistore-deploy" -f ~/.ssh/aistore_gha -N ""

# Colar a PÚBLICA no cPanel → SSH Access → Manage SSH Keys → Authorize
cat ~/.ssh/aistore_gha.pub

# Secret SSH_PRIVATE_KEY = conteúdo íntegro de:
cat ~/.ssh/aistore_gha
```

Multiline no GitHub Secrets: colar o PEM com newlines reais (não `\n` escapado).

### JSON opcional (`CREDENCIAIS_*`)

```json
{
  "host": "gatorXXXX.hostgator.com",
  "user": "cpaneluser",
  "ssh_port": 22,
  "private_key": "-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----\n"
}
```

## Workflows

1. **SSH Probe** — `ssh-probe.yml` (só testa login, ~1 min)  
   Actions → SSH Probe (HostGator / VPS) → Run workflow

2. **Deploy** — `deploy.yml`  
   - Se `ssh-keygen -y` validar a chave → **mode=ssh**, porta **22**  
   - Senão → FTP fail-fast (timeout 25s × 2 retries)

## Checklist HostGator

1. cPanel → **SSH Access** activado  
2. Chave pública autorizada  
3. Firewall / IP allowlist não bloqueia GitHub-hosted runners  
4. Após primeiro deploy: `bash ~/public_html/deploy-manual.sh` se o extract não correr sozinho

## Verificação pós-deploy

```bash
curl -sS https://www.mybait.org/aistore/api/stats | head
# Browser Network: apenas /aistore/api/* (nunca mybait.org/api/stats)
```
