# Catálogo MCP: 17 canônicos e 1.183 entradas catalog-only

## Conclusão

O catálogo contém **1.200 entradas**, mas elas não têm o mesmo nível de execução. Os **17 MCPs canônicos** representam capacidades reconhecidas do ecossistema. Seis possuem servidor TypeScript store-side e são empacotáveis como `.aipkg` verificável. Os outros onze pertencem ao lado b'AI'tcoin e estão registrados como capacidades canônicas declaradas, mas não possuem servidor TypeScript local neste repositório.

As **1.183 entradas catalog-only** são listings sintéticos determinísticos para povoar o catálogo e testar descoberta, paginação, roteamento e carga. Elas não representam servidores instaláveis. Cada uma é marcada com `executionMode: "catalog-only"`, `source: "synthetic-catalog"` e `packagePath: null`. O loader Prisma preserva essa distinção e grava `verified: false` e `transport: "none"` para esses registros.

> Um listing catalog-only pode ser descoberto e classificado, mas não pode ser tratado como servidor executável até que exista um manifesto, uma implementação e um pacote validado.

## Os 17 MCPs canônicos

| MCP | Segmento | Origem | Estado neste repositório | Capacidade principal |
| --- | --- | --- | --- | --- |
| `mcp-catalog` | catalog | AI Store | Executável; `.aipkg` validado | Busca, produto, categorias, ranking e recomendação |
| `mcp-publisher` | publisher | AI Store | Executável; `.aipkg` validado | Upload, versionamento, depreciação e saúde de listing |
| `mcp-pulsar` | pulsar | AI Store | Executável; `.aipkg` validado | Snapshot e assinatura de telemetria Pulsar |
| `mcp-reviews` | reviews | AI Store | Executável; `.aipkg` validado | Reviews, ratings e sinais de qualidade |
| `mcp-referral` | referral | AI Store | Executável; `.aipkg` validado | Códigos, recompensas e leaderboard de referrals |
| `mcp-agent-auth` | agent-auth | AI Store | Executável; `.aipkg` validado | Login, identidade, capabilities e reputação |
| `mcp-oracle` | oracle | b'AI'tcoin | Declarado; sem servidor local correspondente | Feeds de preço, altura, hash rate e staking |
| `mcp-defi` | defi | b'AI'tcoin | Declarado; sem servidor local correspondente | Staking, lending, vaults e posições DeFi |
| `mcp-bridge` | bridge | b'AI'tcoin | Declarado; sem servidor local correspondente | Âncoras, provas, relay e rotas cross-chain |
| `mcp-faucet` | faucet | b'AI'tcoin | Declarado; sem servidor local correspondente | Operações de faucet em ambiente autorizado |
| `mcp-agent-registry` | agent-registry | b'AI'tcoin | Declarado; sem servidor local correspondente | Registro e descoberta de agentes |
| `mcp-marketplace` | marketplace | b'AI'tcoin | Declarado; sem servidor local correspondente | Marketplace e aquisição de capacidades |
| `mcp-telemetry` | telemetry | b'AI'tcoin | Declarado; sem servidor local correspondente | Métricas, alertas e dashboards |
| `mcp-rag-upgrader` | rag-upgrader | b'AI'tcoin | Declarado; sem servidor local correspondente | Feedback, patches e evolução RAG |
| `mcp-skill-evolver` | skill-evolver | b'AI'tcoin | Declarado; sem servidor local correspondente | Mutação, crossover e avaliação de skills |
| `mcp-self-heal` | self-heal | b'AI'tcoin | Declarado; sem servidor local correspondente | Health check, restart, backoff e escalonamento |
| `mcp-agentic-awareness` | agentic-awareness | b'AI'tcoin | Declarado; sem servidor local correspondente | Contexto operacional e consciência agentic |

## Critério de classificação

A classificação canônica é baseada no registro explícito do ecossistema e não significa que todo item seja executável neste checkout. O gerador lê manifests locais quando eles existem. Para os onze MCPs b'AI'tcoin sem implementação local, ele mantém o nome, a categoria e o estado `declared`, sem inventar ferramentas ou caminhos de execução.

Um pacote executável precisa atender simultaneamente a quatro condições: possuir manifesto válido; apontar para uma implementação; declarar ferramentas compatíveis com essa implementação; e passar pelo empacotador e pela inspeção estrutural do `.aipkg`. Os seis MCPs store-side atendem a esse critério. A simulação de carga verificou seis arquivos `.aipkg`, mas não iniciou servidores nem acessou produção.

Os listings catalog-only atendem a um critério menor. Eles precisam ter nome único, categoria, descrição, tags e modo de execução explícito. Podem participar de descoberta e roteamento de catálogo, mas não de aquisição executável, chamada de ferramenta ou promessa de liquidação.

## Validação reproduzível

O catálogo determinístico está em [`data/mcp-catalog-1200.json`](../data/mcp-catalog-1200.json). A geração pode ser repetida com:

```bash
npm run mcp:catalog:generate
```

A validação estrutural dos seis MCPs store-side e a simulação segura de carga podem ser executadas com:

```bash
npm run mcp:validate
npm run mcp:load
```

O loader Prisma é idempotente e usa `upsert`:

```bash
npm run mcp:catalog:seed
```

Esse último comando requer uma base configurada e não deve ser interpretado como execução de servidores catalog-only.

## Referências

[1]: ../data/mcp-catalog-1200.json "Catálogo determinístico com 1.200 entradas MCP"
[2]: ../scripts/generate-mcp-catalog-1200.mjs "Gerador do catálogo MCP"
[3]: ../scripts/validate-mcp-catalog.mjs "Validador dos manifests e pacotes MCP"
[4]: ../scripts/simulate-mcp-agent-load.mjs "Simulação segura de carga dos agentes"
[5]: ../mcp/README.md "Arquitetura de integração MCP da AI Store"
