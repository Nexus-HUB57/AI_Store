# Contributing to AI Store — Nexus AI-OS

Thank you for your interest in contributing! This guide covers the essentials.

## Prerequisites

- Node.js 20+
- npm or bun
- SQLite 3 (development)

## Setup

```bash
git clone https://github.com/Nexus-HUB57/AI_Store.git
cd AI_Store
npm install
npx prisma generate
cp .env.example .env  # Configure DATABASE_URL
npx prisma db push
npm run dev
```

## Architecture

```
src/
├── app/
│   ├── page.tsx          # Main marketplace (SPA with dialogs)
│   ├── error.tsx         # Global error boundary
│   ├── layout.tsx        # Root layout
│   ├── globals.css       # Theme + custom animations
│   └── api/              # API routes (REST)
│       ├── auth/         # Agent wallet auth
│       ├── cart/         # BAIT purchase settlement
│       ├── health/       # Health check
│       ├── products/     # Product catalog (faceted search)
│       ├── pulsar/       # SSE real-time Pulsar Energy
│       ├── referral/     # Referral system
│       ├── reviews/      # Product reviews
│       └── upload-aipkg/ # .aipkg package upload
├── components/
│   ├── auth/             # Login dialog
│   ├── product/          # Review form, star rating
│   ├── store/            # Cart panel, upload dialog
│   └── ui/               # shadcn/ui primitives (48)
├── hooks/                # use-pulsar-sse, use-mobile
├── lib/
│   ├── db.ts             # Prisma singleton
│   ├── auth-store.ts     # Zustand (agent state)
│   ├── cart-store.ts     # Zustand (cart state)
│   ├── pulsar-store.ts   # Zustand (SSE state)
│   ├── rate-limit.ts     # In-memory rate limiter
│   └── schemas.ts        # Zod validation schemas
└── middleware.ts          # Rate limiting + security headers
```

## Key Concepts

- **BAIT (b'AI'tcoin)**: 1 BAIT = 100 sats (precoSats field)
- **Pulsar Energy**: Real-time product quality metric (SSE, 3s cadence)
- **A2A-RPC/v1**: Agent-to-Agent communication protocol
- **.aipkg**: WASM32-WASI package format
- **Tiered pricing**: First 3 FREE, 4-50 at -50%, 51+ full price

## Coding Standards

- TypeScript with strict mode
- Zod schemas for all API input validation
- shadcn/ui components only
- Framer Motion for animations
- Portuguese (pt-BR) for user-facing strings
- English for code, comments, and commit messages

## Commit Convention

```
type(scope): description

feat(api): add Zod validation to cart endpoint
fix(auth): handle missing referral code gracefully
chore(deps): upgrade prisma to 6.x
```

## Testing

```bash
npm run build        # Type-check + production build
npm run lint         # ESLint
bash scripts/test_e2e.sh  # Browser E2E tests
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`feat/your-feature`)
3. Ensure `npm run build` passes with zero errors
4. Submit PR with clear description
5. Address review feedback

## License

MIT — Nexus AI-OS Project
