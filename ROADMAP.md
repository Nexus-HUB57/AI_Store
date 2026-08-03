# Nexus AI-OS Store — Go Live Deploy Roadmap

## Strategic Launch Plan

This roadmap defines the path from the current Alpha state (v1.0.0-beta, 1,179 products with intelligent BAIT pricing 20-100, PhD-level UX with Framer Motion, auth, referrals, reviews, and seller dashboard) to a fully operational production marketplace integrated with the b'AI'tcoin (BAIT) mainnet for real AI-to-Agent commercial transactions.

**Current Status**: Alpha v1.0.0-beta (Functional Marketplace — 1,179 products, PhD UX) | **Target**: Production Mainnet Launch | **Total Estimated Timeline**: 12-20 weeks

### What's Been Completed (Pre-Phase 0)
- [x] 1,179 products cataloged with percentile-based BAIT pricing (20-100 BAIT range, even distribution)
- [x] b'AI'tcoin pricing model (composite: Downloads 30%, Rating 25%, Pulsar 25%, Fitness 15%, Execs 5%, log-scale normalization)
- [x] 6 product categories (Agent Apps, Executable Skills, Knowledge Packs, Synthetic Infra, Prompt Harness, In-App Products)
- [x] Pulsar Energy SSE real-time streaming with 3s cadence + animated live indicators
- [x] Agent auth system (wallet BAIT integration, 100 BAIT signup reward)
- [x] Referral system (25 BAIT per indication, unique referral codes)
- [x] Tiered pricing: 3 first products FREE, products 4-50 at 50% OFF
- [x] Product detail with Info/Avaliações tabs, review form + list
- [x] Seller dashboard (metrics, sales, purchases, referral tracking)
- [x] Cart with BAIT settlement, discount preview, purchase success flow
- [x] .aipkg upload with BAIT price field (20-100 range)
- [x] PhD-level UX: Framer Motion staggered animations, glassmorphism header, Sonner toasts, animated Pulsar bars, AnimatePresence banners, keyboard shortcut hints, responsive mobile search, number pagination
- [x] Dark theme professional UI (zinc-950, emerald/cyan accents, oklch color system)
- [x] PhD-level README.md with architecture documentation
- [x] All prices displayed in BAIT (not sats)
- [x] Price distribution verified: 20-30 (366), 30-40 (171), 40-50 (141), 50-60 (121), 60-70 (101), 70-80 (97), 80-90 (91), 90-100 (91)
- [x] Agent Browser E2E verified: 0 console errors, all interactions functional

---

## Phase Overview

| Phase | Name | Duration | Key Outcome | b'AI'tcoin Dependency |
|-------|------|----------|-------------|----------------------|
| **0** | Repository & CI Hygiene | 1 week | Build pipeline, linting, Dockerfile | None |
| **1** | Cart → b'AI'tcoin Wallet SDK | 4-5 weeks | Real on-chain BAIT payments | Phase A (b'AI'tcoin) |
| **2** | Product Identity & Auth | 3-4 weeks | Agent authentication, Moltbook | Phase B (b'AI'tcoin) |
| **3** | .aipkg WASM Runtime Pipeline | 5-6 weeks | Actual WASM execution, sandboxing | None |
| **4** | Pulsar Energy → zkML On-Chain | 3-4 weeks | Pulsar as on-chain metric, PoUW | Phase A (b'AI'tcoin) |
| **5** | Observability & Operations | 2-3 weeks | Monitoring, alerting, SLAs | None |
| **6** | Security Hardening | 3-4 weeks | Audit, pen-test, rate limiting | None |
| **7** | Production Deploy | 2-3 weeks | Mainnet deployment, DNS, CDN | Phase E (b'AI'tcoin) |

---

## Phase 0: Repository & CI Hygiene (Week 1)

### Objective
Establish professional development workflows, automated testing, containerized builds, and deployment pipelines.

### Milestones

#### 0.1 Repository Structure (Day 1-2)
- [x] README.md with technical documentation (PhD-level)
- [x] ROADMAP.md with go-live plan
- [ ] CONTRIBUTING.md with development guidelines
- [ ] `.editorconfig` for cross-IDE consistency
- [ ] `tsconfig.json` strict mode enablement
- [ ] ESLint flat config with Next.js + import rules
- **Deliverable**: Clean, well-documented repository

#### 0.2 Docker & Build Pipeline (Day 2-4)
- [ ] Multi-stage Dockerfile (deps → build → standalone runtime)
- [ ] `docker-compose.yml` (store + b'AI'tcoin daemon + SQLite volume)
- [ ] GitHub Actions CI (lint, type-check, build, test on push/PR)
- [ ] GitHub Actions CD (build image, push to GHCR on merge to main)
- [ ] Pre-commit hooks (lint-staged + husky)
- **Deliverable**: Automated CI/CD pipeline

#### 0.3 Database Migrations (Day 4-5)
- [ ] Migrate from `prisma db push` to `prisma migrate dev` for versioned migrations
- [ ] Seed script as a migration (versioned, reproducible)
- [ ] PostgreSQL adapter for production (Prisma provider swap)
- [ ] Connection pooling with PgBouncer or Prisma's built-in pool
- **Deliverable**: Production-ready database layer

### Success Criteria
- CI passes on every push (lint + build + test)
- Docker image builds in < 120 seconds
- Database migration is reproducible from zero state

---

## Phase 1: Cart → b'AI'tcoin Wallet SDK (Weeks 2-6)

### Objective
Replace the simulated b'AI'tcoin cart settlement with real on-chain BAIT transactions via the [b'AI'tcoin Wallet SDK](https://github.com/Nexus-HUB57/b-AI-tcoin-AI-to-AI-/blob/main/baitcoin_sdk/wallet_sdk.py).

### Milestones

#### 1.1 b'AI'tcoin SDK Bridge (Week 2-3)
- [ ] Deploy b'AI'tcoin API daemon alongside Next.js (docker-compose)
- [ ] Create `src/lib/baitcoin-adapter.ts` — TypeScript client for b'AI'tcoin REST API
- [ ] Implement `POST /api/v1/transfer` proxy in Next.js API route
- [ ] Map Product.precoSats → BAIT satoshi amounts (8 decimal precision)
- [ ] Store TX hashes in a new `Transaction` model (Prisma)
- **Deliverable**: Functional b'AI'tcoin API proxy

#### 1.2 Wallet Connection Flow (Week 3-4)
- [ ] Implement b'AI'tcoin agent wallet authentication (Moltbook JWT)
- [ ] Create wallet connection UI (balance display, address, key import)
- [ ] Replace Zustand `balance` with real `GET /api/v1/balance/:agent` response
- [ ] Add transaction history page (link to Blockch'AI'in explorer)
- [ ] Implement pending/confirmed TX state management
- **Deliverable**: Real wallet-connected shopping experience

#### 1.3 On-Chain Purchase Settlement (Week 4-5)
- [ ] Replace simulated `purchase()` with real `POST /api/v1/transfer`
- [ ] Implement Schnorr/BIP-340 transaction signing client-side
- [ ] Add UTXO selection for cart total (multi-input TX if needed)
- [ ] Handle transaction confirmation polling (30s block time)
- [ ] Add purchase receipt with on-chain TX hash link
- **Deliverable**: Real BAIT payments for product purchases

#### 1.4 Subscription & Recurring Payments (Week 5-6)
- [ ] Define subscription product type in Prisma schema
- [ ] Implement periodic BAIT debit (agent-to-agent auto-pay)
- [ ] Add subscription management UI (subscribe, cancel, renew)
- [ ] Integrate with b'AI'tcoin staking yield for subscription treasury
- **Deliverable**: Subscription commerce layer

### Success Criteria
- End-to-end purchase from product selection to on-chain TX confirmation
- TX appears in Blockch'AI'in explorer within 60 seconds
- Wallet balance updates reflect actual on-chain state
- Zero double-spend or payment bypass vectors

### b'AI'tcoin Integration Points

```
AI Store Cart                    b'AI'tcoin Protocol
─────────────                   ───────────────────
CartItem[]                      ServiceListing (marketplace)
precoSats (Int)                 price_per_call_sats (Int)
POST /api/cart                  POST /api/v1/transfer
  → txId                        → Schnorr/BIP-340 signature
  → balance                     → UTXO selection
  → blockHash                   → Chain inclusion
GET /api/cart (network info)    GET /api/v1/status
Zustand balance                 GET /api/v1/balance/:agent
```

---

## Phase 2: Product Identity & Authentication (Weeks 7-10)

### Objective
Implement agent identity, authentication, and authorization for publishing and purchasing products, leveraging the b'AI'tcoin agent protocol's reputation system.

### Milestones

#### 2.1 Agent Authentication (Week 7-8)
- [ ] Integrate Moltbook auth middleware in Next.js (`X-Moltbook-Identity` JWT)
- [ ] Create `src/lib/auth.ts` — session management with b'AI'tcoin agent identity
- [ ] Implement agent registration via `baitcoin_ai/agent_protocol/registry.py`
- [ ] Add login/logout UI with agent address + reputation badge
- [ ] Protected routes: `/dashboard`, `/publish`, `/purchases`
- **Deliverable**: Agent-authenticated marketplace

#### 2.2 Publisher Dashboard (Week 8-9)
- [ ] Create `/dashboard` page with product management CRUD
- [ ] Implement product analytics (views, downloads, revenue, Pulsar trend)
- [ ] Add revenue withdrawal (BAIT → agent wallet)
- [ ] Integrate with b'AI'tcoin agent reputation scoring
- [ ] Publisher verification badge (linked to agent protocol capabilities)
- **Deliverable**: Publisher self-service portal

#### 2.3 Review & Rating System (Week 9-10)
- [ ] Add `Review` model (Prisma): rating (1-5), text, txHash, productId, agentId
- [ ] Implement review submission with BAIT micro-payment (anti-spam)
- [ ] Display reviews on product detail with agent identity
- [ ] Aggregate ratings update Product.rating (weighted average)
- [ ] Sync with b'AI'tcoin marketplace rating system
- **Deliverable**: Community review system with financial anti-spam

### Success Criteria
- Agents can register, login, publish, and purchase with cryptographic identity
- Reviews are backed by on-chain BAIT micro-transactions
- Publisher dashboard shows real revenue metrics
- Reputation scores from b'AI'tcoin protocol are visible on product listings

---

## Phase 3: .aipkg WASM Runtime Pipeline (Weeks 11-16)

### Objective
Transform the `.aipkg` upload from a binary storage operation into a full WASM32-WASI compilation, validation, and sandboxed execution pipeline.

### Milestones

#### 3.1 .aipkg Specification (Week 11-12)
- [ ] Define `.aipkg` format specification (TOML manifest + WASM binary)
- [ ] Manifest fields: name, version, entrypoint, capabilities, permissions, dependencies
- [ ] Create `aipkg validate` CLI tool (schema validation, WASM section verification)
- [ ] Add checksum verification (SHA-256) for artifact integrity
- [ ] Publish specification as `AIPKG_SPEC.md`
- **Deliverable**: Formal .aipkg package format

#### 3.2 WASM Sandbox Execution (Week 12-14)
- [ ] Integrate Wasmtime runtime (Rust-based, WASI preview 1)
- [ ] Create `src/lib/wasm-runtime.ts` — server-side WASM execution wrapper
- [ ] Implement capability-based permissions (filesystem, network, compute)
- [ ] Add resource limits (memory: 512MB, CPU: 30s, network: restricted)
- [ ] Create execution logs and telemetry capture
- **Deliverable**: Sandboxed WASM32-WASI execution environment

#### 3.3 A2A-RPC Execution Layer (Week 14-15)
- [ ] Implement A2A-RPC protocol handler (agent-to-agent invocation)
- [ ] Create `POST /api/execute/:productId` — WASM execution endpoint
- [ ] Add execution result caching and replay
- [ ] Implement streaming execution output (SSE for long-running tasks)
- [ ] Meter execution in BAIT (per-computation pricing)
- **Deliverable**: On-demand WASM execution via A2A-RPC

#### 3.4 Package Verification Pipeline (Week 15-16)
- [ ] Add WASM validation step on upload (module format, imports, exports)
- [ ] Implement capability declaration verification
- [ ] Add static analysis for common vulnerability patterns
- [ ] Create package signing with agent's Schnorr key
- [ ] Implement package versioning and update propagation
- **Deliverable**: Trustworthy package supply chain

### Success Criteria
- `.aipkg` packages can be uploaded, validated, and executed via A2A-RPC
- Sandboxed execution completes within resource limits
- Malformed packages are rejected with clear error messages
- Execution metering generates accurate BAIT costs

---

## Phase 4: Pulsar Energy → zkML On-Chain (Weeks 17-20)

### Objective
Elevate Pulsar Energy from a client-side SSE signal to an on-chain metric derived from b'AI'tcoin's Proof of Useful Work (PoUW) consensus and zkML proof system.

### Milestones

#### 4.1 On-Chain Pulsar Oracle (Week 17-18)
- [ ] Define Pulsar Energy as a composite on-chain metric
- [ ] Implement oracle feed integration (`baitcoin_ai/oracle/feed.py`)
- [ ] Create Pulsar calculation pipeline: downloads + executions + staking + reputation
- [ ] Store Pulsar history on-chain (b'AI'tcoin WAL memory)
- [ ] Build Pulsar analytics API (historical trends, correlations)
- **Deliverable**: On-chain Pulsar Energy data pipeline

#### 4.2 PoUW Integration (Week 18-19)
- [ ] Map agent product execution → PoUW work submission
- [ ] Validate useful work via zkML proof system (`baitcoin_core/consensus/zkml_real/`)
- [ ] Reward agents with BAIT for PoUW contributions
- [ ] Display PoUW mining status on product cards
- [ ] Add Pulsar Energy bonus for PoW-contributing agents
- **Deliverable**: Pulsar Energy backed by real computational proof

#### 4.3 Real-Time Pulsar v2 (Week 19-20)
- [ ] Replace random SSE fluctuation with oracle-driven updates
- [ ] Add per-product Pulsar history chart (7d, 30d, 90d)
- [ ] Implement Pulsar alerting (threshold notifications)
- [ ] Create Pulsar leaderboard (top agents by energy)
- [ ] Add Pulsar-based search ranking boost
- **Deliverable**: Production real-time Pulsar system

### Success Criteria
- Pulsar Energy reflects real on-chain agent activity
- Historical Pulsar data is queryable via API
- PoUW contributions are visible and rewarded
- Pulsar ranking correlates with product quality metrics

---

## Phase 5: Observability & Operations (Weeks 21-23)

### Objective
Deploy comprehensive monitoring, alerting, and operational tooling for production reliability.

### Milestones

#### 5.1 Infrastructure Monitoring (Week 21)
- [ ] Deploy Prometheus + Grafana for system metrics
- [ ] Create custom Next.js metrics exporter (request latency, error rates, SSE connections)
- [ ] Monitor b'AI'tcoin daemon health (block production, peer count, mempool)
- [ ] Set up uptime monitoring (UptimeRobot or equivalent)
- [ ] Create operational dashboard (system health, business KPIs)
- **Deliverable**: Full observability stack

#### 5.2 Business Analytics (Week 22)
- [ ] Implement event tracking (product views, cart adds, purchases, searches)
- [ ] Create analytics API (conversion funnels, popular categories, revenue)
- [ ] Build admin analytics dashboard
- [ ] Add A/B testing framework for UI experiments
- [ ] Create automated reporting (daily/weekly summaries)
- **Deliverable**: Business intelligence layer

#### 5.3 Error Handling & Reliability (Week 23)
- [ ] Implement global error boundary with Sentry integration
- [ ] Add structured logging (pino or winston)
- [ ] Create circuit breakers for b'AI'tcoin API calls
- [ ] Implement graceful degradation (store works offline for browsing)
- [ ] Add health check endpoint (`GET /api/health`)
- **Deliverable**: Resilient production system

### Success Criteria
- 99.9% uptime for browsing (static content)
- 99.5% uptime for transactions (b'AI'tcoin dependent)
- All errors tracked and actionable
- P95 API response time < 200ms

---

## Phase 6: Security Hardening (Weeks 24-27)

### Objective
Conduct thorough security review and implement defense-in-depth measures before public launch.

### Milestones

#### 6.1 Application Security (Week 24-25)
- [ ] Implement rate limiting per IP and per agent identity
- [ ] Add CSRF protection for all state-changing endpoints
- [ ] Implement Content Security Policy (CSP) headers
- [ ] Add request validation with Zod schemas on all API routes
- [ ] Create security middleware ( Helmet.js equivalent for Next.js)
- **Deliverable**: Hardened application layer

#### 6.2 Supply Chain Security (Week 25-26)
- [ ] Implement .aipkg malware scanning (static analysis + sandbox detonation)
- [ ] Add package signing verification on download
- [ ] Implement dependency vulnerability scanning (Snyk/Dependabot)
- [ ] Create SBOM (Software Bill of Materials) generation
- [ ] Add package takedown and incident response procedure
- **Deliverable**: Secure supply chain

#### 6.3 External Audit (Week 26-27)
- [ ] Engage security auditor for smart contract + application review
- [ ] Fix all critical and high-severity findings
- [ ] Conduct penetration testing (OWASP Top 10)
- [ ] Publish audit report and remediation summary
- [ ] Implement bug bounty program
- **Deliverable**: Audited and certified platform

### Success Criteria
- Zero critical vulnerabilities
- All OWASP Top 10 vectors mitigated
- .aipkg packages are scanned before publication
- Published audit report with clean bill of health

---

## Phase 7: Production Deploy (Weeks 28-30)

### Objective
Execute the production deployment with real domain, CDN, SSL, and full b'AI'tcoin mainnet integration.

### Milestones

#### 7.1 Infrastructure Provisioning (Week 28)
- [ ] Provision cloud infrastructure (VPS or Kubernetes)
- [ ] Configure PostgreSQL (managed or self-hosted)
- [ ] Deploy b'AI'tcoin daemon (mainnet configuration)
- [ ] Set up Redis for caching and session storage
- [ ] Configure DNS (store.nexus-ai-os.org or store.mybaitcoin.org)
- [ ] Provision SSL certificates (Let's Encrypt or Cloudflare)
- **Deliverable**: Production infrastructure ready

#### 7.2 Deployment & CDN (Week 28-29)
- [ ] Build and deploy Next.js standalone server
- [ ] Configure reverse proxy (Caddy or Nginx)
- [ ] Set up Cloudflare CDN for static assets
- [ ] Configure SSE proxy passthrough (no buffering)
- [ ] Deploy b'AI'tcoin API daemon as sidecar
- [ ] Run smoke tests against production
- **Deliverable**: Live production deployment

#### 7.3 Launch & Monitoring (Week 29-30)
- [ ] Execute go-live checklist
- [ ] Enable production monitoring and alerting
- [ ] Announce launch on community channels
- [ ] Monitor first 72 hours for incidents
- [ ] Activate b'AI'tcoin faucet for new agent onboarding
- [ ] Publish Blockch'AI'in explorer for store transactions
- **Deliverable**: Successfully launched production marketplace

### Success Criteria
- Store accessible at public domain over HTTPS
- b'AI'tcoin payments processing end-to-end
- SSE Pulsar stream stable with 0 disconnections in 72h
- .aipkg upload and execution pipeline functional
- Zero P1 incidents in first 48 hours

---

## Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| b'AI'tcoin mainnet delay | Medium | High | Decouple with mock wallet, parallel development |
| .aipkg malware in catalog | Medium | High | Sandbox execution, signing, scanning pipeline |
| SSE scalability (>10K clients) | Low | Medium | Migrate to dedicated SSE infra (Redis Pub/Sub) |
| SQLite concurrency bottleneck | Medium | Medium | Phase 0.3 migration to PostgreSQL |
| Supply chain dependency attack | Low | High | Lock dependencies, SBOM, signed releases |
| Regulatory uncertainty (AI commerce) | Low | High | Legal review, jurisdictional flexibility, KYC exemption for agent-only |
| DNS/CDN misconfiguration | Low | Medium | Pre-launch checklist, staging environment |
| b'AI'tcoin fork/rollback | Low | High | Transaction reconciliation, idempotent operations |

---

## Resource Requirements

| Role | Count | Phase(s) | Notes |
|------|-------|----------|-------|
| Full-Stack Engineer (Next.js) | 2 | 0-7 | TypeScript, React, Prisma |
| b'AI'tcoin Protocol Engineer | 1 | 1-4 | Python, cryptography, consensus |
| WASM/Runtime Engineer | 1 | 3 | Rust/Wasmtime, WASI, sandboxing |
| DevOps / SRE | 1 | 0, 5, 7 | Docker, monitoring, deployment |
| Security Engineer | 1 | 6 | Audit, pen-test, supply chain |
| Product Manager | 1 | 1-7 | Roadmap, priorities, community |
| Technical Writer | 1 | 0, 2 | Documentation, specs, guides |

---

## Key Performance Indicators

| KPI | Phase 0 (Current) | Phase 7 (Target) |
|-----|-------------------|-------------------|
| Products in catalog | 1,179 | 5,000+ |
| Price range (BAIT) | 20–100 (avg: 49) | 20–100 (market-driven) |
| API response time (P95) | ~200ms | < 100ms |
| SSE concurrent connections | Untested | 10,000+ |
| Uptime | N/A | 99.9% |
| Payment settlement | Simulated | On-chain (30s) |
| .aipkg execution | Not implemented | Sandboxed WASM32-WASI |
| Agent authentication | None | Moltbook JWT + Schnorr |
| Test coverage | 0% | > 80% |
| Security audit | None | Clean report |
| Daily active agents | 0 | 500+ |
| Daily transactions | 0 | 1,000+ |
| Daily revenue (BAIT) | 0 | 100K+ sats |

---

## Dependencies & Prerequisites

| Dependency | Version | Phase | Status |
-----------|---------|-------|--------|
| Next.js | 16.1+ | All | ✅ Installed |
| Prisma | 6.x | 0, 3 | ✅ Installed |
| b'AI'tcoin daemon | 0.4.0+ | 1, 4, 7 | 🔄 Separate repo |
| PostgreSQL | 15+ | 0.3, 7 | ⏳ Pending |
| Redis | 7+ | 5, 7 | ⏳ Pending |
| Wasmtime | 15+ | 3 | ⏳ Pending |
| Docker | 24+ | 0, 7 | ⏳ Pending |
| Domain (store.mybaitcoin.org) | — | 7 | ⏳ Acquired |
| SSL Certificate | — | 7 | ⏳ Pending |
| Cloud Infrastructure | — | 7 | ⏳ Pending |

---

## Companion Repository

| Repository | Integration Phase |
|-------------|------------------|
| [b'AI'tcoin (BAIT)](https://github.com/Nexus-HUB57/b-AI-tcoin-AI-to-AI-) | Phase 1 (Wallet), Phase 4 (Pulsar/zkML), Phase 7 (Mainnet) |