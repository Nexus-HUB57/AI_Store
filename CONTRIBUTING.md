# Contributing to AI Store Nexus AI-OS

Thanks for your interest! This guide covers development setup, code conventions, and the PR submission flow.

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** 10+ or **Bun** 1.3+
- **Git** with GPG signing configured (optional)

## Quick Setup

```bash
git clone https://github.com/Nexus-HUB57/AI_Store.git
cd AI_Store
npm ci
cp .env.example .env  # configure DATABASE_URL
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts  # seed 1,504 products
npm run dev
```

Open `http://localhost:3000` — the SQLite database is created automatically at `./db/custom.db`.

For HTTPS development: `npm run https:certs && npm run https:dev` then open `https://localhost:3443`.

## Available Scripts

| Command                 | Description                                    |
| ----------------------- | ---------------------------------------------- |
| `npm run dev`           | Development server on port 3000 (Turbopack)    |
| `npm run build`         | Production build (standalone + static + SSG)   |
| `npm run start`         | Start production server (requires prior build) |
| `npm run test`          | Run Vitest unit tests (171 tests, verbose)     |
| `npm run test:watch`    | Tests in watch mode                            |
| `npm run test:coverage` | Tests with coverage report                     |
| `npm run e2e`           | Run Playwright E2E tests (4 specs)             |
| `npm run lint`          | ESLint check                                   |
| `npm run db:push`       | Push Prisma schema to database                 |
| `npm run db:generate`   | Generate Prisma Client                         |
| `npm run docker:build`  | Build Docker image                             |
| `npm run docker:up`     | Deploy with docker-compose (production)        |
| `npm run docker:down`   | Stop docker-compose                            |
| `npm run docker:logs`   | Tail production logs                           |
| `npm run deploy:check`  | Full pipeline: test + lint + build + docker    |
| `npm run smoke`         | Production smoke test suite                    |
| `npm run https:certs`   | Generate self-signed TLS certificates          |
| `npm run https:dev`     | Start Caddy HTTPS proxy (port 3443)            |

## Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # 23 API routes (Zod-validated)
│   ├── product/[slug]/     # ISR product pages (server+client split, revalidate: 3600s)
│   ├── dashboard/          # Agent dashboard (auth-guarded)
│   ├── publish/            # Seller portal (auth-guarded)
│   ├── admin/              # Admin analytics
│   ├── not-found.tsx       # Custom 404
│   └── global-error.tsx    # Custom 500 error boundary
├── components/
│   ├── ui/                 # 16 shadcn/ui primitives
│   ├── store/              # 12 store components (cart, upload, reputation, cards)
│   ├── product/            # Star rating, review form
│   └── auth/               # Login dialog
├── lib/
│   ├── wallet-sdk.ts       # BAITWalletSDK (transactions, signing, balance)
│   ├── product-queries.ts  # Shared DB queries for ISR
│   ├── auth-store.ts       # Zustand (agent identity)
│   ├── cart-store.ts       # Zustand (cart + balance)
│   ├── pulsar-store.ts     # Zustand (SSE updates)
│   ├── schemas.ts          # Zod validation schemas
│   ├── rate-limit.ts       # In-memory sliding window
│   ├── csrf.ts             # CSRF token (timingSafeEqual)
│   ├── env.ts              # Zod-validated env vars
│   ├── logger.ts           # Structured JSON logger
│   ├── reputation-engine.ts # 6-factor reputation (S/A/B/C/D/F)
│   ├── error-resolver.ts   # Contextual error suggestions
│   ├── event-tracker.ts    # Analytics event tracking
│   └── db.ts               # Singleton PrismaClient
├── hooks/
│   ├── use-pulsar-sse.ts   # SSE with exponential backoff
│   └── use-mobile.ts       # Responsive breakpoint hook
├── middleware.ts            # Auth guards, rate limiting, security headers
└── middleware-helpers/
    └── instrumented-handler.ts  # API route wrapper (X-Request-ID)
```

## Code Conventions

### TypeScript

- Strict mode enabled (`tsconfig.json`)
- Use `interface` for data shapes, `type` for unions/intersections
- Prefer `const` over `let`, avoid `var`

### React Components

- Functional components with hooks
- `'use client'` only when necessary (state, effects, event handlers)
- Server components by default (data fetching in `page.tsx`)
- Props destructured in function parameter
- Named exports (no default exports for internal components)

### Styling (Tailwind CSS 4)

- Dark theme: zinc-950 base, emerald/cyan accents
- oklch for gradients when needed
- Follow existing patterns: `bg-zinc-900/60`, `border-white/[0.05]`, `text-zinc-400`

### Naming

- Files: `kebab-case.tsx` for components, `kebab-case.ts` for libs
- Components: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- CSS classes: Tailwind utility classes (no custom CSS)

### APIs

- All POST/PUT/DELETE routes validate with Zod
- Return `{ error: string, details?: string }` for 400
- Return 401 for protected routes without cookie
- Use `db` singleton from `@/lib/db`, never `new PrismaClient()` directly
- Use `idempotencyKey` (SHA-256) for state-changing operations

### Testing

- Unit tests: `tests/*.test.ts` (Vitest, 171 tests)
- E2E tests: `e2e/*.spec.ts` (Playwright, 4 specs)
- Cover schemas, business logic, utilities
- All tests must pass before merge

## PR Submission

1. Fork + branch (`feat/...`, `fix/...`, `chore/...`)
2. `npm run test` — all 171 tests must pass
3. `npm run build` — 0 errors
4. `npm run lint` — no new warnings
5. Commit messages: conventional (`type: description`)
6. PR description: **What**, **Why**, **How to test**

## b'AI'tcoin (BAIT)

- 1 BAIT = 100 sats (internal denomination)
- Prices: 20-100 BAIT (2,000-10,000 sats)
- SDK: `src/lib/wallet-sdk.ts` — currently simulated
- Payments: `POST /api/cart` → atomic transaction → balance debit
- Economy: 100 BAIT signup bonus, 25 BAIT referral reward, tiered discounts

## Deploy

- **Docker**: `npm run docker:build` + `docker compose -f docker-compose.prod.yml up -d`
- **CI**: GitHub Actions 5-stage DAG (test → lint+typecheck → build → docker) on `main`
- **Health**: `GET /api/health`
- **Version**: `GET /api/version`
- **HTTPS**: Caddy (self-signed dev, auto-TLS production)

## License

Proprietary — Nexus AI-OS. All rights reserved.
