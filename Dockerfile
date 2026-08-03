# ─── Deps Stage ───
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* bun.lockb* ./
RUN npm ci --ignore-scripts 2>/dev/null || bun install --frozen-lockfile 2>/dev/null

# ─── Build Stage ───
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="file:/app/db/custom.db"
RUN npx prisma generate
RUN npm run build

# ─── Production Stage ───
FROM node:20-alpine AS runner
RUN apk add --no-cache wget postgresql-client tini
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV LOG_LEVEL=info

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Create data directory for SQLite
RUN mkdir -p /app/db && chown nextjs:nodejs /app/db

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma schema (for potential runtime migrations)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check: /api/health every 30s, start after 5s, fail after 3 retries
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Use tini as PID 1 for proper signal handling (graceful shutdown)
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
