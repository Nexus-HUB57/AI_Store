# API Health Audit — AI Store (25 set 2026)

**Alvo:** `https://www.mybait.org/aistore/`
**Branch atual:** `feat/mcp-portfolio-seeding` @ `223fb8c`

## Sumário

| Status | Endpoints | Detalhe |
|---|---|---|
| ✅ 200 | `/api/health`, `/api/products`, `/api/products?segmento=MCP`, `/api/pulsar` | Funcionando |
| ❌ 500 | `/api/mcp`, `/api/mcp/health`, `/api/mcp/catalog`, `/api/mcp/install`, `/api/mcp/[name]`, `/api/mcp/[name]/tools`, `/api/mcp/[name]/call`, `/api/mcp/acquire`, `/api/mcp/call` | Schema Prisma não migrado |
| ❓ 404 | `/api/discovery`, `/api/agents`, `/api/reputation`, `/api/transactions`, `/api/sdk-manifest` | Rotas existem no código mas podem estar fora do escopo do build |

## TL;DR — Causa raiz

A tabela `McpPackage` (e provavelmente `McpTool`) **nunca foi migrada no DB de produção**. As únicas migrations aplicadas são:
- `20260921222000_add_purchase_intents`
- `20260922190000_add_purchase_outbox`

Resultado: `prisma.mcpPackage.findMany()` / `findUnique()` / `count()` falham com erro genérico, capturado pelos handlers que retornam 500.

Adicionalmente, o health reporta `mcpTarget: 0` e `mcpServers: 0`, indicando que o deploy do MCP pipeline **nunca rolou em produção**.

## Evidência por endpoint

### `/api/mcp` (GET)

Resposta: `{"error":"Failed to list MCPs"}` (HTTP 500)

**Rota servidora:** `src/app/api/mcp/route.ts:47`

```ts
catch (error) {
  console.error('[/api/mcp GET]', error)
  return NextResponse.json({ error: 'Failed to list MCPs' }, { status: 500 })
}
```

**Causa raiz:** `db.mcpPackage.findMany()` falha → tabela não existe no DB.

### `/api/mcp` (POST action=stats)

Resposta: `{"error":"Failed to process MCP action"}` (HTTP 500)

Mesma rota (`src/app/api/mcp/route.ts:102`).

### `/api/mcp/health` (GET)

Resposta: `{"error":"Failed to get MCP package"}` (HTTP 500)

**Rota servidora (incorretamente):** `src/app/api/mcp/[slug]/route.ts:26`

**Causa raiz #1:** o matcher dinâmico `[slug]` está **sombreando** a rota estática `mcp/src/app/api/mcp/health/route.ts`. Next.js resolve `/api/mcp/health` como `slug="health"`.

**Causa raiz #2:** `src/app/api/mcp/[slug]/route.ts:14` faz `db.mcpPackage.findUnique({ where: { slug } })` — mas o **campo `slug` não existe** no schema `McpPackage` (model só tem `name @unique`, `displayName`, etc.). Mesmo com a tabela migrada, esse query falhará.

### `/api/mcp/catalog` (GET)

Mesma situação de `/api/mcp/health`. A rota estática `mcp/src/app/api/mcp/catalog/route.ts` está sendo engolida por `src/app/api/mcp/[slug]/route.ts`.

### `/api/mcp/install` (POST)

Mesma situação.

### `/api/mcp/[name]` (GET)

Resposta: `{"error":"Failed to get MCP package"}` (HTTP 500)

**Rota servidora:** `mcp/src/app/api/mcp/[name]/route.ts`

```ts
const prisma = new PrismaClient();
export async function GET(_req, { params }) {
  const pkg = await prisma.mcpPackage.findUnique({ where: { name: params.name } });
  ...
}
```

**Causa raiz:** `new PrismaClient()` local sem config global. Em produção standalone, `DATABASE_URL` provavelmente não é resolvido pelo cliente local (enquanto o `@/lib/db` singleton funciona). Mesmo problema de schema.

### `/api/health` (200 — health endpoint OK)

```json
{
  "status": "ok",
  "version": "2.0.0",
  "counts": {
    "products": 1504,
    "mcpServers": 0,
    "agents": 10,
    "transactions": 10
  },
  "sync": {
    "totalToolsTarget": 1504,
    "mcpTarget": 0,
    "mcpSynced": true,
    "completeness": "100%"
  }
}
```

⚠️ **Inconsistência**: `sync.completeness: "100%"` mas `mcpServers: 0` e `mcpTarget: 0`. O health reporta sincronizado porque **a meta MCP é zero** (config nunca foi atualizada para 1200+).

### `/api/products?segmento=MCP` (200 — mas com 0 produtos)

```json
{"products": []}
```

Os 1504 produtos estão em outros segmentos:
- `KNOWLEDGE_PACKS`: 5
- `PROMPT_HARNESS`: 4
- `IN_APP_PRODUCTS`: 4
- `EXECUTABLE_SKILLS`: 4
- `SYNTHETIC_INFRASTRUCTURE`: 4
- `AGENT_APPS`: 3

(somente 24 retornados por default — paginação)

O segmento `MCP` é alimentado pela tabela `McpPackage` — que está vazia.

### Endpoints 404 (existem no código, podem estar fora do escopo do build)

| Endpoint | Rota no código | Comentário |
|---|---|---|
| `/api/discovery` | ❌ Não existe `route.ts` em `src/app/api/discovery/` | Provavelmente foi removida em refactor |
| `/api/agents` | ❌ Não existe `src/app/api/agents/route.ts` | Existe `agent/dashboard`, `agent/metrics`, `agent/discover`, etc. |
| `/api/reputation` | ❌ Não existe `src/app/api/reputation/route.ts` | Existe `agent/reputation` |
| `/api/transactions` | ❌ Não existe `src/app/api/transactions/route.ts` | Lógica provavelmente em outro lugar |
| `/api/sdk-manifest` | ❌ Não existe `src/app/api/sdk-manifest/route.ts` | — |

Esses 404s indicam **rotas esperadas pelo frontend mas faltando no backend**.

## Bugs estruturais identificados no código

### Bug #1 — Tabela `McpPackage` sem campo `slug`

```ts
// src/app/api/mcp/[slug]/route.ts:14
const pkg = await db.mcpPackage.findUnique({
  where: { slug },  // ❌ McpPackage NÃO tem campo slug
  include: { tools: true },
})
```

**Schema atual** (`prisma/schema.prisma`):
```prisma
model McpPackage {
  name String @unique  // campo de lookup é 'name', não 'slug'
  ...
}
```

**Fix:** trocar `where: { slug }` por `where: { name: slug }` (slug == name neste design).

### Bug #2 — `new PrismaClient()` local em `mcp/src/app/api/`

```ts
// mcp/src/app/api/mcp/route.ts:9
const prisma = new PrismaClient();
```

Cria um cliente novo a cada import, sem singleton global. Em produção standalone, pode não resolver `DATABASE_URL` corretamente.

**Fix:** substituir por `import { db } from '@/lib/db'`.

### Bug #3 — Rota dinâmica `[slug]` sombreia rotas estáticas

Next.js resolve `/api/mcp/health` como `slug="health"` em vez de `mcp/src/app/api/mcp/health/route.ts`.

**Fix:** renomear `[slug]` para `[name]` (e atualizar `where: { name: slug }`), ou mover rotas estáticas para outro path (`/api/mcp-runtime/health`).

### Bug #4 — Schema Prisma nunca migrado em produção

Migrations aplicadas:
- `20260921222000_add_purchase_intents`
- `20260922190000_add_purchase_outbox`

Faltam tabelas: `McpPackage`, `McpTool` (e relações).

**Fix:** `npx prisma db push --skip-generate` no servidor.

### Bug #5 — `mcpTarget` nunca atualizado

```json
"sync": { "mcpTarget": 0, "mcpSynced": true, "completeness": "100%" }
```

A config de runtime espera 0 MCPs, mas a meta é 1200+.

**Fix:** atualizar env var / config file no servidor para `MCP_TARGET=1234`.

## Plano de ação para deploy em produção

### Passo 1 — Aplicar schema Prisma (resolve 90% dos 500s)

```bash
cd /home/<user>/<ai_store_dir>
git pull origin main
npx prisma db push --skip-generate
```

### Passo 2 — Popular seed (resolve `/api/products?segmento=MCP=0`)

```bash
bash scripts/mcp/install-portfolio.sh /path/to/baitcoin/repo
```

### Passo 3 — Atualizar config MCP_TARGET

```bash
# Editar config / env
MCP_TARGET=1234
```

### Passo 4 — Restart

```bash
systemctl --user restart ai_store
```

### Passo 5 — Smoke test

```bash
curl -s https://www.mybait.org/aistore/api/mcp?limit=3 | jq '.total'
# esperado: { "total": 1234 }

curl -s https://www.mybait.org/aistore/api/health | jq '.counts'
# esperado: { "mcpServers": 1234 }

curl -s 'https://www.mybait.org/aistore/api/products?segmento=MCP' | jq '.products | length'
# esperado: 1234
```

## Fixes de código recomendados (não-bloqueantes)

Se quiser que eu faça PRs pra resolver os bugs estruturais (Bug #1, #2, #3):

1. **PR `fix(mcp-api): use name field instead of slug in /api/mcp/[slug]`** — uma linha
2. **PR `refactor(mcp-api): migrate mcp/src/app/api/ to use @/lib/db singleton`** — 9 arquivos
3. **PR `fix(mcp-api): rename [slug] to [name] to avoid shadowing static routes`** — não-trivial, requer cuidado com [name]/route.ts existente em mcp/src/app/api/mcp/

## Arquivos relacionados

- `MCP_DEPLOY_RUNBOOK.md` — runbook operacional
- `AUDIT.md` — auditoria geral do MCP pipeline
- `prisma/schema.prisma` — schema (modelos McpPackage, McpTool)
- `prisma/migrations/` — migrations aplicadas em prod (faltam McpPackage)
- `src/app/api/mcp/` — rotas principais (30 rotas)
- `mcp/src/app/api/mcp/` — rotas adicionais (9 rotas) — **conflito de roteamento**
