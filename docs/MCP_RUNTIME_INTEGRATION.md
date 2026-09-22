# Integração do runtime MCP

Este documento descreve a validação dos MCPs canônicos do AI Store a partir dos artefatos `.aipkg` e do orquestrador de runtime.

## Teste local

O teste é executado com:

```bash
npm run mcp:integration:test
```

O comando usa `mcp/tests/canonical-runtime.mjs`. Para cada um dos seis MCPs canônicos TypeScript do AI Store, o teste verifica o arquivo `.aipkg` correspondente, lê o manifesto, instala o manifesto no `McpOrchestrator`, inicia o servidor por stdio, executa `tools/list`, realiza uma chamada de ferramenta e encerra o processo.

Os servidores TypeScript usam Bun nos manifests de produção. Como Bun não está instalado no ambiente de CI/sandbox, o teste local usa `tsx` e mantém o mesmo protocolo MCP, transporte stdio e código de servidor. O submódulo `mcp/` declara ESM em `mcp/package.json` para suportar top-level await, e o Prisma Client é gerado antes dos testes com `npm run db:generate`.

O teste usa `db/custom.db` apenas para consultas locais e um fixture HTTP efêmero para o MCP Pulsar. Não publica, compra, altera contas nem envia dados para serviços externos. Em um banco vazio, `listing_health`, `rating_summary` e `reputation` retornam `not_found`; essas respostas de negócio são esperadas e distintas de uma falha de transporte ou handshake.

O teste E2E básico do catálogo pode ser executado separadamente:

```bash
npm run mcp:test
```

## Validação do catálogo `.aipkg`

A integridade dos 1.200 artefatos continua sendo validada por:

```bash
npm run mcp:catalog:aipkg:validate
```

A validação atual confirma 17 pacotes canônicos e 1.183 pacotes catalog-only.

## Superfície pública mybait.org

A verificação pública confirmou que `https://mybait.org/` e `https://mybait.org/aistore/` respondem com HTTP 200. A API pública de status também respondeu em `https://mybait.org/api/api/v1/status`.

As rotas MCP tentadas — `/mcp` e `/api/mcp` — retornaram HTTP 404. Assim, o runtime MCP foi validado localmente contra os mesmos servidores e artefatos versionados, enquanto a integração pública de produção permanece bloqueada pela ausência de uma rota MCP publicada no domínio. Nenhuma alteração foi feita na plataforma pública.
