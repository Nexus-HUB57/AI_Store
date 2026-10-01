#!/usr/bin/env node
/**
 * experiential-sync.mjs — CLI para sincronizar traces e routers do experiential.
 *
 * Uso:
 *   node scripts/experiential-sync.mjs [--once] [--trigger=manual]
 *
 * Requer:
 *   - exp CLI instalado (pip install experiential==0.7.130) OU
 *   - artefatos locais em $EXP_ROOT (default: ~/.exp)
 *   - AISTORE_URL configurado (env) ou fallback http://localhost:3000
 */

const base = process.env.AISTORE_URL || 'http://localhost:3000'
const trigger = (process.argv.find(a => a.startsWith('--trigger=')) || '').split('=')[1] || 'manual'

async function sync() {
  const res = await fetch(`${base}/api/experiential/sync`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ trigger }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('✗ experiential sync falhou:', data)
    process.exit(1)
  }
  console.log(
    `✅ Experiential sync — fetched ${data.fetched}, inserted ${data.inserted}, ` +
    `updated ${data.updated}, errors ${data.errors}, skipped ${data.skipped} ` +
    `(${data.duration_ms}ms, exp ${data.exp_version || 'unavailable'}) from ${data.source}`,
  )
}

await sync()
