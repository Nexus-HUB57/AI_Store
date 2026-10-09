# CREDENCIAIS_AI_STORE

Secret do repositorio usado pelo workflow `Deploy AI Store to HostGator`.

## Formato recomendado (JSON)

Cole **exatamente** um objeto JSON em:
`Settings → Secrets and variables → Actions → CREDENCIAIS_AI_STORE`

```json
{
  "host": "gatorXXXX.hostgator.com",
  "user": "usuario_cpanel",
  "ssh_port": 22,
  "ftp_host": "ftp.mybait.org",
  "ftp_user": "usuario_cpanel",
  "ftp_pass": "SENHA_FTP",
  "password": "SENHA_FTP",
  "ssh_passphrase": "PASSPHRASE_DA_CHAVE_SSH",
  "vnc_host": "",
  "vnc_port": 5900
}
```

### Nested (tambem valido)

```json
{
  "ssh": {
    "host": "gatorXXXX.hostgator.com",
    "user": "usuario_cpanel",
    "port": 22,
    "passphrase": "PASSPHRASE_DA_CHAVE_SSH"
  },
  "ftp": {
    "host": "ftp.mybait.org",
    "user": "usuario_cpanel",
    "password": "SENHA_FTP"
  },
  "vnc": {
    "host": "",
    "port": 5900
  }
}
```

### Alternativa KEY=VALUE (aceita pelo parser)

```
host=gatorXXXX.hostgator.com
user=usuario_cpanel
ssh_port=22
ftp_host=ftp.mybait.org
ftp_user=usuario_cpanel
ftp_pass=SENHA_FTP
password=SENHA_FTP
ssh_passphrase=PASSPHRASE_DA_CHAVE_SSH
```

## Notas

- `SSH_PRIVATE_KEY` e `SSH_KEY_PASSPHRASE` continuam secrets separados (prioridade na passphrase).
- `CREDENCIAIS_HOSTGATOR` legado ainda e lido como fallback.
- Nao coloque aspas extras em volta do JSON inteiro no campo do secret.
- Nao use Markdown/code fences dentro do valor do secret — so o JSON puro.
