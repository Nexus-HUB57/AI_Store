/**
 * Reprice ALL products using weighted composite scoring.
 *
 * Weights:
 *   - Downloads: 30% (log-scale normalized)
 *   - Rating: 25%
 *   - Pulsar Energy: 25%
 *   - Fitness Score: 15%
 *   - A2A Executions: 5% (log-scale normalized)
 *
 * Price range: 20-100 BAIT  (precoSats = BAIT × 100)
 * Mapping: linear from min composite score → 20 BAIT, max → 100 BAIT
 */

// Connect via the project's Prisma client module
import { db } from '../src/lib/db'
import { PrismaClient } from '@prisma/client'

// Use a direct client without query logging (the db module has log:['query'] enabled)
const prisma = new PrismaClient()

const BAIT_PER_SAT = 100
const MIN_BAIT = 20
const MAX_BAIT = 100

function clamp(v: number, lo = 0, hi = 1): number {
  return Math.max(lo, Math.min(hi, v))
}

async function main() {
  console.log('═'.repeat(60))
  console.log('  AI Store Nexus — Full Product Repricing')
  console.log('═'.repeat(60))

  // ── 1. Fetch ALL products with scoring fields ────────────────────
  console.log('\n📦 Fetching all products...')
  const products = await prisma.product.findMany({
    select: {
      id: true,
      nome: true,
      slug: true,
      segmento: true,
      precoSats: true,
      downloads: true,
      rating: true,
      pulsarEnergy: true,
      fitnessScore: true,
      a2aExecutions: true,
      featured: true,
    },
  })
  console.log(`   Found ${products.length} products.`)

  // ── 2. Compute composite scores ──────────────────────────────────
  console.log('\n🔄 Computing composite scores...')

  // Find global min/max for log-scale fields
  const maxDownloads = Math.max(...products.map(p => p.downloads))
  const maxA2A = Math.max(...products.map(p => p.a2aExecutions))
  const minRating = Math.min(...products.map(p => p.rating))
  const maxRating = Math.max(...products.map(p => p.rating))
  const minPulsar = Math.min(...products.map(p => p.pulsarEnergy))
  const maxPulsar = Math.max(...products.map(p => p.pulsarEnergy))
  const minFitness = Math.min(...products.map(p => p.fitnessScore))
  const maxFitness = Math.max(...products.map(p => p.fitnessScore))

  console.log(`   Downloads range:   ${Math.min(...products.map(p => p.downloads))} — ${maxDownloads}`)
  console.log(`   Rating range:      ${minRating} — ${maxRating}`)
  console.log(`   Pulsar range:      ${minPulsar} — ${maxPulsar}`)
  console.log(`   Fitness range:     ${minFitness} — ${maxFitness}`)
  console.log(`   A2A Exec range:    ${Math.min(...products.map(p => p.a2aExecutions))} — ${maxA2A}`)

  const scored = products.map(p => {
    // Log-scale normalization for downloads
    const dlScore = clamp(Math.log10(p.downloads + 1) / Math.log10(maxDownloads + 1))

    // Linear normalization for rating
    const ratingScore = clamp(
      maxRating === minRating ? 0.5 : (p.rating - minRating) / (maxRating - minRating)
    )

    // Linear normalization for pulsar energy
    const pulsarScore = clamp(
      maxPulsar === minPulsar ? 0.5 : (p.pulsarEnergy - minPulsar) / (maxPulsar - minPulsar)
    )

    // Linear normalization for fitness score
    const fitnessScore = clamp(
      maxFitness === minFitness ? 0.5 : (p.fitnessScore - minFitness) / (maxFitness - minFitness)
    )

    // Log-scale normalization for A2A executions
    const a2aScore = clamp(Math.log10(p.a2aExecutions + 1) / Math.log10(maxA2A + 1))

    // Weighted composite score
    const composite =
      dlScore * 0.30 +
      ratingScore * 0.25 +
      pulsarScore * 0.25 +
      fitnessScore * 0.15 +
      a2aScore * 0.05

    return {
      ...p,
      scores: { dlScore, ratingScore, pulsarScore, fitnessScore, a2aScore },
      composite,
    }
  })

  // ── 3. Linear mapping from composite score to BAIT range ────────
  const minComposite = Math.min(...scored.map(s => s.composite))
  const maxComposite = Math.max(...scored.map(s => s.composite))
  const scoreRange = maxComposite - minComposite

  console.log(`\n   Composite score range: ${minComposite.toFixed(4)} — ${maxComposite.toFixed(4)}`)

  const priced = scored.map(p => {
    const normalized = scoreRange === 0 ? 0.5 : (p.composite - minComposite) / scoreRange
    const bait = MIN_BAIT + normalized * (MAX_BAIT - MIN_BAIT)
    const finalBait = Math.round(bait)
    const clampedBait = Math.max(MIN_BAIT, Math.min(MAX_BAIT, finalBait))
    const precoSats = clampedBait * BAIT_PER_SAT

    return { ...p, newBait: clampedBait, newPrecoSats: precoSats }
  })

  // ── 4. Update database in batches ────────────────────────────────
  console.log('\n💾 Updating prices in database...')
  const BATCH_SIZE = 100
  let updated = 0

  for (let i = 0; i < priced.length; i += BATCH_SIZE) {
    const batch = priced.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.map(p =>
        prisma.product.update({
          where: { id: p.id },
          data: { precoSats: p.newPrecoSats },
        })
      )
    )
    updated += batch.length
    process.stdout.write(`\r   Updated ${updated}/${priced.length} products...`)
  }

  console.log(`\n\n✅ Done! ${updated} products repriced.`)

  // ── 5. Statistics ────────────────────────────────────────────────
  const baitValues = priced.map(p => p.newBait)
  const minPrice = Math.min(...baitValues)
  const maxPrice = Math.max(...baitValues)
  const avgPrice = baitValues.reduce((a, b) => a + b, 0) / baitValues.length

  console.log('\n' + '─'.repeat(50))
  console.log('  STATISTICS')
  console.log('─'.repeat(50))
  console.log(`  Total products updated:  ${updated}`)
  console.log(`  Min price:               ${minPrice} BAIT (${minPrice * BAIT_PER_SAT} precoSats)`)
  console.log(`  Max price:               ${maxPrice} BAIT (${maxPrice * BAIT_PER_SAT} precoSats)`)
  console.log(`  Avg price:               ${avgPrice.toFixed(1)} BAIT (${Math.round(avgPrice * BAIT_PER_SAT)} precoSats)`)

  // Distribution across ranges
  const ranges = [
    { label: '20-30 BAIT', min: 20, max: 30 },
    { label: '30-40 BAIT', min: 30, max: 40 },
    { label: '40-50 BAIT', min: 40, max: 50 },
    { label: '50-60 BAIT', min: 50, max: 60 },
    { label: '60-70 BAIT', min: 60, max: 70 },
    { label: '70-80 BAIT', min: 70, max: 80 },
    { label: '80-90 BAIT', min: 80, max: 90 },
    { label: '90-100 BAIT', min: 90, max: 101 },
  ]

  console.log('\n  📈 Price distribution (BAIT):')
  console.log('  ' + '─'.repeat(44))
  for (const range of ranges) {
    const count = baitValues.filter(b => b >= range.min && b < range.max).length
    const pct = ((count / priced.length) * 100).toFixed(1)
    const bar = '█'.repeat(Math.round(count / priced.length * 40))
    console.log(`  ${range.label.padEnd(12)} ${String(count).padStart(4)} (${pct.padStart(5)}%)  ${bar}`)
  }

  // Top 5 and Bottom 5
  const sorted = [...priced].sort((a, b) => b.newBait - a.newBait)
  console.log('\n  🏆 Top 5 most expensive:')
  for (const p of sorted.slice(0, 5)) {
    console.log(
      `     ${p.nome.slice(0, 35).padEnd(35)} → ${String(p.newBait).padStart(3)} BAIT ` +
      `(score: ${p.composite.toFixed(3)}, dl: ${String(p.downloads).padStart(5)}, PE: ${p.pulsarEnergy}%, R: ${p.rating})`
    )
  }
  console.log('\n  🏷️  Top 5 cheapest:')
  for (const p of sorted.slice(-5)) {
    console.log(
      `     ${p.nome.slice(0, 35).padEnd(35)} → ${String(p.newBait).padStart(3)} BAIT ` +
      `(score: ${p.composite.toFixed(3)}, dl: ${String(p.downloads).padStart(5)}, PE: ${p.pulsarEnergy}%, R: ${p.rating})`
    )
  }

  console.log('\n' + '═'.repeat(60))
  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
