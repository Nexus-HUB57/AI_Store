# Devs PHD — Checklist Cirúrgico Integrado: AI Store Nexus + BAIT Ecosystem

> **Data:** 2026-09-23 | **Auditoria:** MyLink Fund PhD Audit + AI Store E2E v5.0.0  
> **Resultado E2E:** 41/41 PASSED (31s) | **Patches Aplicados:** 5  
> **Fonte:** `Auditoria_BAIT_22.09.txt` + E2E v5 suite

---

## PARTE A — AI Store Nexus: Correções Cirúrgicas Validadas E2E

### A.0 Pré-Operatório (Diagnóstico)

- [x] Identificar falhas na suite E2E v5 (41 testes, 6 fases)
- [x] Analisar causa raiz de cada falha
- [x] Classificar severidade (CRÍTICO / ALTO / MÉDIO)
- [x] Mapear impacto em cascata de cada falha
- [x] Definir estratégia de correção (off-by-one / schema / lógica / teste)
- [x] Verificar estado do repositório e divergências entre cópias

### A.1 P1 (CRÍTICO) — middleware.ts: verifySessionFormat Off-by-One

| Aspecto    | Detalhe                                                                                       |
| ---------- | --------------------------------------------------------------------------------------------- |
| Arquivo    | `src/middleware.ts:7`                                                                         |
| Causa Raiz | `parts[1].length === 44` rejeita HMAC-SHA256 base64url válido (32 bytes → 43 chars)           |
| Sintoma    | Todas as sessões válidas rejeitadas; `/dashboard`, `/publish` retornam 307 incondicionalmente |
| Correção   | `parts[1].length === 43                                                                       |     | parts[1].length === 44` |

- [x] Causa raiz confirmada (base64url padding confusion)
- [x] Correção aplicada (1 linha)
- [x] Backwards-compatibility verificada
- [x] Segurança não enfraquecida (verifySession HMAC ainda executa)
- [x] Persistência verificada no filesystem
- [x] E2E validado: S4.2 (Dashboard → 307 sem sessão), S4.3 (Publish → 307 sem sessão)

### A.2 P2 (CRÍTICO) — session.ts: verifySessionFormat Consistência

- [x] Mesma correção P1 aplicada para consistência middleware ↔ session.ts
- [x] Divergência de formato eliminada
- [x] E2E validado: E2.1 (signup), E2.3 (session cookie)

### A.3 P3 (ALTO) — schemas.ts: Campo `source` Ausente no Zod Schema

- [x] `source: z.enum(['local', 'daemon']).optional()` adicionado
- [x] Zod strip não mais remove o parâmetro
- [x] E2E validado: E2.4 (source=local), P3.1-P3.7

### A.4 P4 (ALTO) — products/route.ts: `source` como Filtro DB Incorreto

- [x] `where.source = source` removido (source = routing directive, não DB column)
- [x] Comentário documental adicionado
- [x] E2E validado: E2.4 (1504 produtos), E2.5 (count ≥ 1500)

### A.5 P5 (MÉDIO) — e2e-v5.sh: Cookie Jar State Leakage no Teste de Auth

- [x] curl sem cookie jar para S4.2 e S4.3
- [x] Falsos negativos eliminados
- [x] E2E validado: S4.2 (→ 307), S4.3 (→ 307)

### A.6 Pós-Operatório — E2E v5.0.0 Completa (41/41)

- [x] Phase 1: Smoke 9/9
- [x] Phase 2: E2E Flow 8/8 (Auth → Browse → Purchase → Verify)
- [x] Phase 3: Product Catalog 7/7 (Search, Filter, Sort, Pagination)
- [x] Phase 4: SSG Pages 5/5 (Render + Auth Guard)
- [x] Phase 5: Pulsar SSE 4/4 (Stream + Heartbeat < 16s)
- [x] Phase 6: Stress 8/8 (8 endpoints, 100% success rate)

---

## PARTE B — BAIT Ecosystem: Auditoria PhD — Ações Cirúrgicas

> Baseado na `Auditoria_BAIT_22.09.txt` — MyLink Fund PhD Audit

### B.0 P0 — Contenção Imediata e Saneamento

#### B.0.1 Saneamento OPSEC e Histórico

- [ ] **Backup Completo**: `git clone --mirror` antes de qualquer alteração estrutural
- [ ] **Branch de Contenção**: Criar `remediation/phase-0-containment`
- [ ] **Expurgo BFG**: Remover `.bak.*`, `deploy/keystores/*`, `reference_blockchain_com.json` do histórico
- [ ] **Expurgo de Senhas**: Substituir `Benjamin2020*1981$` e outras credenciais expostas via `git filter-repo --replace-expressions`
- [ ] **Rotação de Chaves**: Migrar fundos de keystores commitados para cold storage / multisig 3-de-5
- [ ] **GitHub Actions Secrets**: Mover DEPLOYER_PRIVATE_KEY, RPCs, LND exclusivamente para Secrets
- [ ] **Branch Protection Rules**: Ativar proteção na `main` (assinaturas obrigatórias, revisões, bloqueio de push direto)

#### B.0.2 Alinhamento Factual de Documentação & Marketing

- [ ] **Remoção da Marca CertiK**: Renomear `audits/` → `internal-static-analysis/`; remover badges/alegações
- [ ] **Sincronização zkML/PoUW**: Atualizar `binance/technical_summary.md` para refletir `zkml_engine.py` (hashes SHA-256, não zk-SNARK/STARK)
- [ ] **Reclassificação Howey**: Parecer automatizado → "Análise Heurística Regulatória Interna" (não substitui parecer formal)

### B.1 P1 — DevSecOps e Higiene de Repositório

#### B.1.1 Automação Pre-commit

- [ ] **gitleaks**: Integrar hook `gitleaks` no `.pre-commit-config.yaml`
- [ ] **trufflehog**: Integrar hook `trufflehog git file://. --since-commit HEAD`
- [ ] **detect-secrets**: Adicionar ao pipeline de CI

#### B.1.2 Estruturação e Governança Git

- [ ] **Modularização do Monólito**: Quebrar `main_daemon.py` (306 KB) em subpacotes `engine/`, `network/`, `storage/`, `telemetry/`
- [ ] **Consolidação de Identidades**: Unificar 33+ identidades via `.mailmap`
- [ ] **Assinaturas Digitais**: Exigir GPG/PGP em todos os commits
- [ ] **Separação Human vs Agent AI**: Sufixo `[AGENT-AI]` ou chaves PGP dedicadas para agentes autônomos
- [ ] **Human-in-the-Loop**: Revisão humana obrigatória em PRs que alteram `baitcoin_core/` ou `contracts/`

### B.2 P2 — Refatoração e Testes Formais dos Smart Contracts

#### B.2.1 BAITBridge.sol — Invariante On-Chain + EIP-712

- [ ] **Invariante On-Chain**: Garantir `totalMinted <= totalLocked` nativamente no bytecode
- [ ] **EIP-712 Domain Separator**: `chainId + nonce` único por endereço/transação (prevenção de replay attacks)
- [ ] **Circuit Breaker**: Limite de volume diário (`dailyVolumeLimit`) com reset a cada 24h
- [ ] **`processedHashes` mapping**: Prevenção de reutilização de hashes de mensagens
- [ ] **Teste Foundry**: `forge test --fuzz-runs 10000` para invariante

#### B.2.2 BAITToken.sol — Timelock no pause()

- [ ] **TimelockController (48h)**: Remover `pause()` unilateral; exigir passagem pelo Timelock
- [ ] **Multisig 3-de-5**: Controle multi-assinatura em funções administrativas

#### B.2.3 DeployBAIT.s.sol — Correção do Script

- [ ] **Bind WBAIT.bridgeLock**: Ajustar `DeployBAIT.s.sol:26` com inicialização correta
- [ ] **Teste em fork local**: Validar deploy contra mainnet fork

#### B.2.4 Bateria de Validação Estática

- [ ] **Slither**: `slither . --detect-reentrancy,arbitrary-send-eth,uninitialized-state`
- [ ] **Echidna**: `echidna-test contracts/BAITBridge.sol --config echidna.yaml`
- [ ] **Mythril**: Análise simbólica de contratos
- [ ] **CI Pipeline**: Zero alertas HIGH/CRITICAL para merge

#### B.2.5 Allowances Órfãs

- [ ] **Revogação Uniswap V3**: Remover allowances órfãs nos wrappers de liquidez
- [ ] **Revogação auto-confirmação**: Remover mecanismos de auto-confirmação de requisições

### B.3 P3 — Arquitetura Agêntica de Conformidade (A2A Compliance)

#### B.3.1 Orquestrador A2A Robustecido

- [ ] **Schema JSON Unificado**: `AgentAuditReport` (Pydantic) com `agent_id`, `timestamp`, `status`, `audit_score`, `findings`
- [ ] **Validação de Schema**: `validate_agent_schema()` antes da gravação
- [ ] **Hash SHA-256 Imutável**: `generate_sha256()` de cada relatório consolidado
- [ ] **Proof of Audit Compliance**: Log de hashes em `compliance_hashes.json`
- [ ] **Ancoragem IPFS/Arweave**: Registrar hashes on-chain a cada 72h (opcional)

#### B.3.2 Notificações e Webhooks

- [ ] **Webhook Discord/Telegram**: `send_alert()` em caso de falha de parsing ou não conformidade
- [ ] **Fallback de API**: Alerta crítico se API de LLM falhar (não apenas capturar exceção)

#### B.3.3 Agente Jurídico (Dr. DDK)

- [ ] **Cron Job 72h**: Auditoria contínua de jurisprudência SEC/CVM
- [ ] **Aviso Legal Obrigatório**: "Análise Heurística Regulatória Interna — não substitui parecer formal"
- [ ] **Persistência Imutável**: Hash SHA-256 do relatório registrado on-chain/IPFS

#### B.3.4 Agente Contábil (Dra. PWC)

- [ ] **Auditoria de Balanços**: Verificar tesouraria, conformidade fiscal, fluxo de tokens A2A
- [ ] **Validação de Invariantes**: Checar `totalMinted <= totalLocked` on-chain

#### B.3.5 Reestruturação do Vesting

- [ ] **Desativar founders_faucet_cron.sh**: Substituir por `FoundersVesting.sol` (OpenZeppelin)
- [ ] **VestingWallet On-Chain**: Período de cliff + liberação linear
- [ ] **Revogação de Permissões de Mint**: Revogar mint direto das carteiras antigas

### B.4 P4 — Governança e Matriz de Aceite E2E

#### B.4.1 On-Chain State Snapshot

- [ ] **Inventário de ProxyAdmins**: Mapear endereços e `owner()` atuais
- [ ] **Storage Slots**: Identificar variáveis imutáveis de contratos em produção
- [ ] **Allowances Órfãs Adicionais**: Além dos wrappers Uniswap V3

#### B.4.2 Integração Frontend

- [ ] **Centralizar Config**: `contracts.json` unificado com endereços, ABIs, RPCs
- [ ] **Padronizar API Calls**: `api.ts` com checagem de Chain ID
- [ ] **Sincronização CI/CD**: Auto-deploy de config quando contratos mudam

#### B.4.3 Canais Formais de Compliance

- [ ] **compliance@mybait.org**: Criar canal com chave PGP publicada
- [ ] **Bug Bounty**: Política pública de divulgação responsável de vulnerabilidades
- [ ] **Data Room**: Documentação técnica oficial para exchanges Tier-2/Tier-3

---

## PARTE C — Matriz de Aceite Final E2E

| #   | Item               | Critério de Aceite                        | Validação                   | Status       |
| --- | ------------------ | ----------------------------------------- | --------------------------- | ------------ |
| C1  | Segredos no Git    | Zero chaves/senhas no histórico           | `gitleaks detect --verbose` | PENDENTE     |
| C2  | Custódia de Ativos | Keystores desativados, fundos em multisig | Checagem de saldo RPC       | PENDENTE     |
| C3  | Remoção de Claims  | Zero menções CertiK/Howey fixo            | Inspeção de arquivos        | PENDENTE     |
| C4  | Paridade zkML      | `technical_summary.md` ≡ `zkml_engine.py` | Diff documentação vs código | PENDENTE     |
| C5  | Trava Timelock     | TimelockController 48h em `pause()`       | `forge test`                | PENDENTE     |
| C6  | Invariante Bridge  | `totalMinted <= totalLocked` on-chain     | Fuzzing Foundry             | PENDENTE     |
| C7  | Script Deploy      | Bind `WBAIT.bridgeLock` corrigido         | Teste em fork local         | PENDENTE     |
| C8  | Análise Estática   | Slither/Echidna sem HIGH/CRITICAL         | CI pipeline exit 0          | PENDENTE     |
| C9  | Canais Formais     | compliance@mybait.org ativo + PGP         | Envio de teste              | PENDENTE     |
| C10 | AI Store E2E       | 41/41 testes aprovados                    | `bash scripts/e2e-v5.sh`    | **APROVADO** |
| C11 | AI Store Patches   | 5 correções aplicadas e persistentes      | Verificação filesystem      | **APROVADO** |
| C12 | Session Format     | base64url 43/44 chars aceito              | E2E S4.2, S4.3              | **APROVADO** |
| C13 | Source Routing     | `source=local` retorna 1504 produtos      | E2E E2.4, E2.5              | **APROVADO** |

---

## PARTE D — Matriz de Rastreabilidade AI Store (Patch → Teste)

| Patch              | Testes Diretos                 | Testes Indiretos       |
| ------------------ | ------------------------------ | ---------------------- |
| P1 (middleware.ts) | S4.2, S4.3 (auth guard)        | E2.3 (session cookie)* |
| P2 (session.ts)    | E2.1, E2.3 (signup, session)   | S4.2, S4.3*            |
| P3 (schemas.ts)    | E2.4, P3.1-P3.7 (source param) | ST6.5, ST6.7*          |
| P4 (route.ts)      | E2.4, E2.5 (local products)    | P3.1-P3.7*             |
| P5 (e2e-v5.sh)     | S4.2, S4.3 (auth isolation)    | N/A                    |

---

## PARTE E — Verificação de Não-Regressão

- [x] Nenhum teste existente quebrado pelas correções AI Store
- [x] 171 testes unitários (vitest) não afetados
- [x] Build Next.js standalone sem erros
- [x] Middleware intercepta corretamente (auth + CSRF + rate limit)
- [x] Banco SQLite intacto (1504 produtos, 6 agentes)
- [x] Sessões HMAC-SHA256 geradas e verificadas
- [x] CSRF token ciclo completo (set → read → validate)
- [x] SSE Pulsar stream funcional (connected + heartbeat)
- [ ] Smart contracts BAIT sem alertas HIGH/CRITICAL (Slither/Echidna)
- [ ] Zero segredos expostos no histórico BAIT
- [ ] Documentação BAIT sincronizada com código

---

## Veredicto Consolidado

| Dimensão           | AI Store Nexus | BAIT Ecosystem                                 |
| ------------------ | -------------- | ---------------------------------------------- |
| Patches Cirúrgicos | 5/5 aplicados  | 0/20+ pendente                                 |
| E2E Validado       | 41/41 PASSED   | PENDENTE                                       |
| Linhas Alteradas   | 7 (cirúrgico)  | N/A                                            |
| Regressões         | 0              | N/A                                            |
| OPSEC              | Limpo          | CRÍTICO (crendenciais expostas)                |
| Smart Contracts    | N/A            | CRÍTICO (pause() monárquico, bridge off-chain) |
| Compliance         | N/A            | HIGH (CertiK claim, Howey, zkML divergência)   |

---

_Gerado por DevOps PHD — AI Store Nexus v2.0.0 + BAIT MyLink Fund Audit — 2026-09-23_
