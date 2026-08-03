# Contribuindo ao AI Store Nexus AI-OS

Obrigado pelo interesse em contribuir! Este guia cobre o setup de desenvolvimento, convenções de código e o fluxo de envio de PRs.

## Pré-requisitos

- **Node.js** 20+ (LTS recomendado)
- **npm** 10+ ou **Bun** 1.3+
- **Git** com GPG signing configurado (opcional)

## Setup Rápido

```bash
git clone https://github.com/Nexus-HUB57/AI_Store.git
cd AI_Store
npm ci
npx prisma generate
npx prisma db push
cp .env.example .env  # configure DATABASE_URL
npm run dev
```

Acesse `http://localhost:3000` — o banco SQLite será criado automaticamente em `./db/custom.db`.

## Scripts Disponíveis

| Comando | Descrição |
|---------|------------|
| `npm run dev` | Servidor de desenvolvimento na porta 3000 |
| `npm run build` | Build de produção (standalone + static) |
| `npm run start` | Iniciar produção (requer build prévio) |
| `npm run test` | Rodar testes Vitest (verbose) |
| `npm run test:watch` | Testes em modo watch |
| `npm run test:coverage` | Testes com cobertura |
| `npm run lint` | ESLint |
| `npm run db:push` | Push do schema Prisma ao banco |
| `npm run db:generate` | Gerar Prisma Client |
| `npm run docker:build` | Build da imagem Docker |
| `npm run docker:up` | Deploy com docker-compose (PostgreSQL) |
| `npm run deploy:check` | Pipeline completo: test → build → docker |

## Arquitetura

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # API routes (Zod-validated)
│   ├── product/[slug]/     # ISR product pages (revalidate: 3600s)
│   ├── dashboard/          # Agent dashboard (auth-guarded)
│   ├── publish/            # Seller portal (auth-guarded)
│   └── page.tsx            # Main marketplace (~1300 LOC)
├── components/
│   ├── ui/                 # 16 shadcn/ui primitives
│   ├── auth/               # Login dialog
│   ├── product/            # Review form, star rating
│   └── store/              # Cart panel, upload .aipkg
├── lib/
│   ├── wallet-sdk.ts       # b'AI'tcoin Wallet SDK
│   ├── product-queries.ts  # Shared DB queries for ISR
│   ├── auth-store.ts       # Zustand (agent identity)
│   ├── cart-store.ts       # Zustand (cart + balance)
│   ├── pulsar-store.ts     # Zustand (SSE updates)
│   ├── schemas.ts          # Zod validation schemas
│   ├── rate-limit.ts       # In-memory sliding window
│   ├── csrf.ts             # CSRF token utilities
│   ├── env.ts              # Zod-validated env vars
│   ├── logger.ts           # Structured JSON logger
│   └── db.ts               # Singleton PrismaClient
├── hooks/
│   └── use-pulsar-sse.ts   # SSE with exponential backoff
├── middleware.ts            # Auth guards, rate limiting, security headers
└── middleware-helpers/
    └── instrumented-handler.ts  # API route wrapper
```

## Convenções de Código

### TypeScript
- Strict mode habilitado (`tsconfig.json`)
- Usar `interface` para tipos de dados, `type` para unions/intersections
- Preferir `const` sobre `let`, evitar `var`

### Componentes React
- Functional components com hooks
- `'use client'` apenas quando necessário (state, effects, event handlers)
- Props desctructuradas no parâmetro da função
- Named exports (não default exports para componentes internos)

### Estilo (Tailwind CSS 4)
- Dark theme: zinc-950 base, emerald/cyan accents
- oklch para gradientes when needed
- Seguir padrão existente: `bg-zinc-900/60`, `border-white/[0.05]`, `text-zinc-400`

### Nomenclatura
- Arquivos: `kebab-case.tsx` para componentes, `kebab-case.ts` para libs
- Componentes: `PascalCase`
- Funções/variáveis: `camelCase`
- Constantes: `UPPER_SNAKE_CASE`
- CSS classes: Tailwind utility classes (não custom CSS)

### APIs
- Todas as rotas POST/PUT/DELETE validam com Zod (`validate()` helper)
- Retornar `{ error: string, details?: string }` para 400
- Retornar 401 para rotas protegidas sem cookie
- Usar `db` singleton de `@/lib/db`, nunca `new PrismaClient()` direto

### Testes
- Arquivos: `tests/*.test.ts`
- Framework: Vitest
- Cobrir schemas, lógica de negócio (discounts), utilitários
- Testes de API routes requerem setup de banco (futuro)

## Envio de PRs

1. Fork + branch (`feat/...`, `fix/...`, `chore/...`)
2. `npm run test` — todos os testes devem passar
3. `npm run build` — 0 errors
4. `npm run lint` — sem warnings novos
5. Commit messages em português ou inglês (convention: `type: descrição`)
6. PR description com: **O que**, **Por quê**, **Como testar**

## b'AI'tcoin (BAIT)

- 1 BAIT = 100 sats (denominação interna)
- Preços: 20-100 BAIT (2000-10000 sats)
- SDK: `src/lib/wallet-sdk.ts` — currently simulated
- Pagamentos: `/api/cart` POST → cria transação → debita saldo

## Deploy

- **Docker**: `npm run docker:build` + `docker compose -f docker-compose.prod.yml up -d`
- **CI**: GitHub Actions (test → build → docker) no branch `main`
- **Health**: `GET /api/health`
- **Version**: `GET /api/version`

## Licença

Proprietário — Nexus AI-OS. Todos os direitos reservados.
