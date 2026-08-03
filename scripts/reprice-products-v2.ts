/**
 * Reprice v2: Percentile-based distribution for even spread across 20-100 BAIT.
 * Composite score → rank → percentile → BAIT price (non-linear mapping).
 */

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const BAIT_PER_SAT = 100
const MIN_BAIT = 20
const MAX_BAIT = 100

async function main() {
  console.log('📦 Fetching all products...')
  const products = await prisma.product.findMany({
    select: {
      id: true, nome: true, segmento: true, precoSats: true,
      downloads: true, rating: true, pulsarEnergy: true,
      fitnessScore: true, a2aExecutions: true, featured: true,
    },
  })

  console.log(`🔄 Computing composite scores for ${products.length} products...`)

  // Compute composite score for each product
  const scored = products.map(p => {
    // Use log-scale for downloads and executions (long-tail distributions)
    const dlScore = Math.log10(p.downloads + 1) / Math.log10(50066)
    const execScore = Math.log10(p.a2aExecutions + 1) / Math.log10(99846)
    const ratingScore = (p.rating - 3.0) / 2.0  // normalize 3.0-5.0 → 0-1
    const pulsarScore = (p.pulsarEnergy - 60) / 40  // normalize 60-100 → 0-1
    const fitnessScore = (p.fitnessScore - 60) / 40  // normalize 60-100 → 0-1

    // Clamp all to 0-1
    const clamp = (v: number) => Math.max(0, Math.min(1, v))

    const composite = 
      clamp(dlScore) * 0.30 +
      clamp(ratingScore) * 0.25 +
      clamp(pulsarScore) * 0.25 +
      clamp(fitnessScore) * 0.15 +
      clamp(execScore) * 0.05

    // Category premium: some categories command higher prices
    const categoryPremium: Record<string, number> = {
      AGENT_APPS: 0.03,
      SYNTHETIC_INFRASTRUCTURE: 0.02,
      KNOWLEDGE_PACKS: 0.01,
      EXECUTABLE_SKILLS: 0.02,
      PROMPT_HARNESS: -0.01,
      IN_APP_PRODUCTS: 0.0,
    }
    const premium = categoryPremium[p.segmento] || 0

    return { ...p, score: Math.max(0, Math.min(1, composite + premium)) }
  })

  // Sort by score ascending
  scored.sort((a, b) => a.score - b.score)

  // Map rank to percentile, then to BAIT price
  const n = scored.length
  const priceMap = scored.map((p, rank) => {
    // Percentile: 0 to 1
    const percentile = rank / (n - 1)
    
    // Non-linear mapping with power curve (2.0 exponent for wider spread at low end)
    // This creates more products in the 20-60 range and fewer at the top
    const curved = Math.pow(percentile, 1.8)
    
    // Add small random jitter (±2 BAIT) to avoid too many identical prices
    const jitter = (Math.random() - 0.5) * 4
    
    const bait = MIN_BAIT + (MAX_BAIT - MIN_BAIT) * curved + jitter
    const finalBait = Math.round(Math.max(MIN_BAIT, Math.min(MAX_BAIT, bait)))
    
    return { ...p, newBait: finalBait, newPriceSats: finalBait * BAIT_PER_SAT, percentile }
  })

  // Apply updates in batches
  console.log('💾 Applying prices to database...')
  const batchSize = 100
  let updated = 0

  for (let i = 0; i < priceMap.length; i += batchSize) {
    const batch = priceMap.slice(i, i + batchSize)
    await Promise.all(
      batch.map(u =>
        prisma.product.update({
          where: { id: u.id },
          data: { precoSats: u.newPriceSats },
        })
      )
    )
    updated += batch.length
    process.stdout.write(`\r  Updated ${updated}/${priceMap.length} products...`)
  }

  console.log(`\n✅ Done! ${updated} products repriced.`)

  // Verify
  const verify = await prisma.product.aggregate({
    _min: { precoSats: true },
    _max: { precoSats: true },
    _avg: { precoSats: true },
  })
  console.log(`\n📊 New price range: ${verify._min.precoSats / BAIT_PER_SAT} - ${verify._max.precoSats / BAIT_PER_SAT} BAIT (avg: ${Math.round((verify._avg.precoSats || 0) / BAIT_PER_SAT)} BAIT)`)

  // Distribution
  const buckets = new Array(8).fill(0)
  for (const u of priceMap) {
    const idx = Math.min(7, Math.max(0, Math.floor((u.newBait - MIN_BAIT) / 10)))
    buckets[idx]++
  }
  console.log('\n📈 Price distribution (BAIT):')
  for (let i = 0; i < 8; i++) {
    const range = `${MIN_BAIT + i * 10}-${MIN_BAIT + (i + 1) * 10}`
    const bar = '█'.repeat(Math.round(buckets[i] / priceMap.length * 50))
    console.log(`  ${range}: ${String(buckets[i]).padStart(4)} ${bar}`)
  }

  // Top/Bottom
  const sorted = [...priceMap].sort((a, b) => b.newBait - a.newBait)
  console.log('\n🏆 Top 5 most expensive:')
  sorted.slice(0, 5).forEach(u =>
    console.log(`  ${u.nome} → ${u.newBait} BAIT (score: ${u.score.toFixed(3)}, ${u.downloads}dl, ${u.pulsarEnergy}%P, ${u.rating}★)`)
  )
  console.log('\n🏷️ Top 5 cheapest:')
  sorted.slice(-5).forEach(u =>
    console.log(`  ${u.nome} → ${u.newBait} BAIT (score: ${u.score.toFixed(3)}, ${u.downloads}dl, ${u.pulsarEnergy}%P, ${u.rating}★)`)
  )

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
