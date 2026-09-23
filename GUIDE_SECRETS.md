# Guia de Segredos — AI Store (GitHub Actions → HostGator)

Deploy de produção usa **SSH** (não FTP). O job `publish-hostgator` em
`.github/workflows/deploy.yml` lê estes secrets.

---

## Secrets obrigatórios (Deploy SSH)

| Nome | Descrição | Exemplo |
|------|-----------|---------|
| `SSH_HOST` | Hostname ou IP do HostGator | `gatorXXXX.hostgator.com` ou IP |
| `SSH_USER` | Usuário cPanel / SSH | `usuario` |
| `SSH_PORT` | Porta SSH | `22` (ou a porta custom do plano) |
| `SSH_PRIVATE_KEY` | Chave **privada** OpenSSH (PEM) | ver abaixo |

## Secrets recomendados (app)

| Nome | Descrição |
|------|-----------|
| `SESSION_SECRET` | ≥16 chars aleatórios (runtime produção no servidor) |

> O workflow de CI também usa `DATABASE_URL` / `NEXT_PUBLIC_*` como env de **build**
> (valores de build, não substituem secrets de runtime no HostGator).

---

## 1. Gerar par de chaves (máquina local)

```bash
ssh-keygen -t ed25519 -C "github-actions-aistore-deploy" -f ./id_aistore_deploy -N ""
```

- `id_aistore_deploy.pub` → HostGator  
- `id_aistore_deploy` → secret `SSH_PRIVATE_KEY` no GitHub  

**Nunca** commite a chave privada no repositório.

---

## 2. Instalar a chave pública no HostGator

No servidor (Terminal cPanel, SSH ou *SSH Access*):

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
# cole UMA linha da chave pública:
echo 'ssh-ed25519 AAAA... github-actions-aistore-deploy' >> ~/.ssh/authorized_keys
```

Confirme no cPanel → **SSH Access** que SSH está habilitado para a conta.

Teste local (com a privada):

```bash
ssh -i ./id_aistore_deploy -p 22 USUARIO@HOST 'echo ok && hostname && whoami'
```

---

## 3. Gravar secrets no GitHub

1. Repo **AI_Store** → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** (ou Update) para cada nome da tabela
3. Em `SSH_PRIVATE_KEY`, cole o arquivo **inteiro**, incluindo:

```
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

Alternativa mais robusta (uma linha, sem quebra de linha no UI):

```bash
base64 -w0 id_aistore_deploy | pbcopy   # macOS
# ou: base64 -w0 id_aistore_deploy
```

Cole o base64 em `SSH_PRIVATE_KEY`. O workflow detecta e decodifica.

### Formato que quebra o parse (evitar)

- Aspas em volta da chave  
- Só a linha `ssh-ed25519 AAAA...` (isso é a **pública**)  
- CRLF / espaços no início de cada linha  
- Chave truncada (faltando BEGIN/END)

---

## 4. Validar e disparar deploy

```text
Actions → Deploy AI Store to HostGator → Run workflow
```

O step **Setup SSH** deve imprimir `Setup SSH OK` e o probe `remote-ok`.
Se aparecer `SSH_PRIVATE_KEY invalida ou corrompida`, regrave o secret
(PEM completo ou base64).

---

## Mapa antigo (FTP — legado)

`GUIDE_SECRETS` anterior listava `FTP_HOST` / `FTP_USER` / `FTP_PASS`.
O `deploy.yml` atual **não** usa FTP; use a tabela SSH acima.
Pode remover secrets FTP se não forem usados por outro workflow.

---

_Nexus AI-OS — AI Store_
