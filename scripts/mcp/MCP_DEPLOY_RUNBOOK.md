# MCP Portfolio — Runbook de Deploy para Produção

**Data:** 25 de setembro de 2026
**Target:** `https://www.mybait.org/aistore/` (HostGator CGI)
**Estado atual:** ❌ `/api/mcp/*` retorna **HTTP 500** — schema Prisma `McpPackage`/`McpTool` **não migrado em produção**

## TL;DR — Por que `/api/mcp` está 500

```
$ curl -s https://www.mybait.org/aistore/api/mcp
{"error":"Failed to list MCPs"}
$ curl -s https://www.mybait.org/aistore/api/mcp/health
{"error":"Failed to get MCP package"}
```

O `prisma.mcpPackage.findMany()` falha porque a tabela não existe no DB de produção. As únicas migrations aplicadas em prod são:
- `20260921222000_add_purchase_intents`
- `20260922190000_add_purchase_outbox`

Faltam as tabelas:
- `McpPackage` (1234 rows esperadas)
- `McpTool` (5709 rows esperadas)

Adicionalmente, o `health` reporta `mcpTarget: 0` — a config precisa ser atualizada para `1200`.

---

## Pipeline já validado em sandbox

| Etapa | Resultado |
|---|---|
| `node scripts/mcp/generate-seed.mjs --baitcoin-root /workspace/baitcoin` | ✅ 1234 packages + 5709 tools em `populate.sql` |
| `python3 scripts/mcp/test_e2e.py --aipkg-dir /workspace/baitcoin/mcp/dist` | ✅ 1234 / 5709 / 67 categories / 1228 .aipkg |
| `validate_baith.py` (BAITHex suite) | ✅ 21/21 tests |

---

## Passos exatos para deploy em produção

### 1. Pré-condições (servidor HostGator)

```bash
cd /home/<user>/<ai_store_dir>          # path do repo
git pull origin main                     # trazer MCP pipeline
```

### 2. Validar schema Prisma

```bash
npx prisma validate                      # schema.prisma OK?
npx prisma generate                      # regenera cliente
```

### 3. Aplicar schema (criar tabelas)

```bash
npx prisma db push --skip-generate       # NÃO usar migrate dev (SQLite prod)
```

Espera-se criar:
- `McpPackage`
- `McpTool`
- E qualquer relação FK entre elas

### 4. Aplicar seed (popular 1234 packages + 5709 tools)

```bash
bash scripts/mcp/install-portfolio.sh /path/to/baitcoin/repo
```

Esse script é idempotente (usa `INSERT OR IGNORE`). Se já houver dados, ele apenas insere o que falta.

Saída esperada:
```
✓ seed applied via sqlite3 — McpPackage rows: 1234
✓ McpPackage rows: 1234
✓ McpTool rows:    5709
```

### 5. Atualizar `mcpTarget` config

O servidor atualmente reporta `mcpTarget: 0` no `/api/health`. Atualizar a config de runtime:

```bash
# Editar config (caminho varia conforme deploy)
vi config/mcp-target.json    # ou env var MCP_TARGET=1200
```

Esperado após restart:
```json
"counts": { ..., "mcpServers": 1234 },
"sync": { ..., "mcpTarget": 1234, "completeness": "100%" }
```

### 6. Restart da aplicação

```bash
# CGI / systemd / pm2 — depende do setup
systemctl --user restart ai_store      # se systemd
# ou
pm2 restart ai_store                  # se pm2
```

### 7. Smoke tests

```bash
# Health
curl -s https://www.mybait.org/aistore/api/health | jq '.counts, .sync'

# MCP list
curl -s 'https://www.mybait.org/aistore/api/mcp?limit=3' | jq '.total, .items[].name'

# MCP catalog
curl -s 'https://www.mybait.org/aistore/api/mcp/catalog?limit=3' | jq '.items | length'

# MCP segment no legado
curl -s 'https://www.mybait.org/aistore/api/products?segmento=MCP' | jq '.products | length'
```

**Critérios de sucesso:**

| Endpoint | Antes | Depois esperado |
|---|---|---|
| `/api/mcp` | 500 | 200 com `total: 1234` |
| `/api/mcp/health` | 500 | 200 com `running: [...]` |
| `/api/mcp/catalog` | 500 | 200 com `items[]` |
| `/api/products?segmento=MCP` | 0 | 1234 |
| `/api/health` | `mcpServers: 0` | `mcpServers: 1234` |

---

## Rollback (se algo falhar)

```bash
# Remover seed (mantém schema)
sqlite3 db/custom.db "DELETE FROM McpTool; DELETE FROM McpPackage;"

# Remover schema (drástico)
npx prisma db push --skip-generate --accept-data-loss  # revert McpPackage/McpTool

# Restart
systemctl --user restart ai_store
```

---

## Arquivos relacionados

| Arquivo | Função |
|---|---|
| `scripts/mcp/generate-seed.mjs` | Lê `baitcoin/mcp/dist/portfolio.json` → produz `populate.sql` |
| `scripts/mcp/install-portfolio.sh` | Aplica `populate.sql` no SQLite (idempotente) |
| `scripts/mcp/test_e2e.py` | Valida portfolio localmente antes do deploy |
| `scripts/mcp/AUDIT.md` | Auditoria completa do MCP pipeline |
| `prisma/schema.prisma` | Schema (modelos McpPackage, McpTool) |
| `mcp/src/app/api/mcp/route.ts` | Endpoint GET/POST /api/mcp |

---

## Pendências pós-deploy

- [ ] Validar que `/api/products?segmento=MCP` agora retorna 1234 produtos
- [ ] Validar que o segmento MCP aparece na home da AI Store
- [ ] Confirmar contagem em `baitcoin/mcp/dist/portfolio.json` e regenerar se novos MCPs foram adicionados
- [ ] Smoke test E2E in-prod (instalar 1 MCP via `POST /api/mcp` e verificar que aparece no catálogo)
