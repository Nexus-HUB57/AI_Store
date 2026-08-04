# Go-Live Checklist — AI Store Nexus

## Pre-Deployment

### Infrastructure

- [ ] Cloud VPS provisioned (min 2 CPU, 4GB RAM, 20GB SSD)
- [ ] DNS configured (ai-store.nexus-os.io → VPS IP)
- [ ] SSL certificate active (Caddy auto-TLS or Let's Encrypt)
- [ ] Firewall rules: open 80, 443; close 3000, 3443, 5432
- [ ] SSH key authentication configured (no password login)
- [ ] Docker + Docker Compose installed on server

### Database

- [ ] SQLite DB with 1504 products copied to server
- [ ] OR PostgreSQL provisioned (if using --profile postgres)
- [ ] Database backup script configured (cron: every 6h)
- [ ] Connection pool tested under load

### Application

- [ ] Docker image built and pushed to GHCR
- [ ] Environment variables set in .env on server
- [ ] DATABASE_URL pointing to correct database
- [ ] NEXT_PUBLIC_BASE_URL set to production domain
- [ ] LOG_LEVEL=info (not debug)

## Post-Deployment

### Smoke Tests

- [ ] Run: `bash scripts/smoke-test.sh https://ai-store.nexus-os.io`
- [ ] Homepage loads with product grid
- [ ] Product detail page shows server-rendered content
- [ ] /api/health returns `{ status: "ok" }`
- [ ] /api/version returns correct version
- [ ] Pulsar SSE stream connects and updates
- [ ] Auth login creates agent and sets cookie
- [ ] Cart purchase flow completes (simulated)
- [ ] Review submission works
- [ ] Admin dashboard loads

### Security Verification

- [ ] CSP header present on all pages
- [ ] HSTS header active (max-age=31536000)
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] CSRF token set on page load
- [ ] CSRF validation blocks unauthenticated POST
- [ ] Rate limiting returns 429 when exceeded
- [ ] Auth guards redirect unauthenticated users
- [ ] No sensitive data in HTML source

### Performance

- [ ] Static pages serve in < 200ms (TTFB)
- [ ] API responses < 100ms (p95)
- [ ] Product SSG pages cached (Cache-Control present)
- [ ] No JS errors in browser console
- [ ] Lighthouse score > 80 (Performance)

### Monitoring

- [ ] Uptime monitoring configured
- [ ] Error tracking active
- [ ] Log rotation configured (Docker json-file, 10m x 3)
- [ ] Health check endpoint monitored
- [ ] Disk space alert (>80% usage)

## Rollback Plan

1. Tag current working image: `docker pull ghcr.io/nexus-hub57/ai-store:<commit-sha>`
2. Revert docker-compose to previous image tag
3. Restore database from last backup if needed
4. Verify smoke tests pass on rollback
5. Post-mortem within 24h if rollback was needed

## Post-Launch (First 72h)

- [ ] Monitor error rates (target: < 0.1%)
- [ ] Monitor P95 latency (target: < 200ms)
- [ ] Check SSE Pulsar stability
- [ ] Review first user sessions
- [ ] Verify all 1504 product pages accessible
- [ ] Test mobile responsiveness
- [ ] Test on Chrome, Firefox, Safari
- [ ] Community announcement posted
