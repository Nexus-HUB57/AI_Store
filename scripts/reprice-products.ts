/**
 * Reprice all products using a composite scoring algorithm.
 * Target: 20-100 BAIT (stored as 2000-10000 in precoSats, where BAIT = sats/100).
 * 
 * Scoring weights:
 *   - Downloads: 30% (demand signal)
 *   - Rating: 25% (quality signal)
 *   - Pulsar Energy: 25% (vitality signal)
 *   - Fitness Score: 15% (usability signal)
 *   - A2A Executions: 5% (engagement signal)
 * 
 * Price mapping: score 0-100 → 20-100 BAIT (non-linear, exponential curve)
 */

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const BAIT_PER_SAT = 100
const MIN_BAIT = 20
const MAX_BAIT = 100

// Find global min/max for normalization
async function getGlobalBounds() {
  const minDl = await prisma.product.aggregate({ _min: { downloads: true } })
  const maxDl = await prisma.product.aggregate({ _max: { downloads: true } })
  const minExec = await prisma.product.aggregate({ _min: { a2aExecutions: true } })
  const maxExec = await prisma.product.aggregate({ _max: { a2aExecutions: true } })
  
  return {
    downloads: { min: minDl._min.downloads || 0, max: maxDl._max.downloads || 1 },
    executions: { min: minExec._min.a2aExecutions || 0, max: maxExec._max.a2aExecutions || 1 },
    // Rating is always 0-5, Pulsar and Fitness 0-100
  }
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5
  return (value - min) / (max - min)
}

function computeScore(product: {
  downloads: number
  rating: number
  pulsarEnergy: number
  fitnessScore: number
  a2aExecutions: number
  featured: boolean
}, bounds: { downloads: { min: number; max: number }; executions: { min: number; max: number } }): number {
  // Normalize each metric to 0-1
  const dlNorm = normalize(product.downloads, bounds.downloads.min, bounds.downloads.max)
  const ratingNorm = product.rating / 5.0
  const pulsarNorm = product.pulsarEnergy / 100.0
  const fitnessNorm = product.fitnessScore / 100.0
  const execNorm = normalize(product.a2aExecutions, bounds.executions.min, bounds.executions.max)

  // Weighted composite score (0-1)
  let composite = 
    dlNorm * 0.30 +
    ratingNorm * 0.25 +
    pulsarNorm * 0.25 +
    fitnessNorm * 0.15 +
    execNorm * 0.05

  // Featured products get a small boost
  if (product.featured) composite = Math.min(1, composite + 0.05)

  return composite
}

/**
 * Non-linear mapping: score 0-1 → price 20-100 BAIT
 * Uses a power curve so that high-quality products command premium prices
 * while low-quality products cluster near the floor.
 * 
 * score 0.0 → 20 BAIT (floor)
 * score 0.5 → ~52 BAIT
 * score 1.0 → 100 BAIT (ceiling)
 */
function scoreToBait(score: number): number {
  // Power curve with exponent 1.3 for slight premium on high scores
  const curved = Math.pow(score, 1.3)
  const bait = MIN_BAIT + (MAX_BAIT - MIN_BAIT) * curved
  return Math.round(bait)
}

async function main() {
  console.log('🔍 Fetching global bounds...')
  const bounds = await getGlobalBounds()
  console.log(`  Downloads: ${bounds.downloads.min} - ${bounds.downloads.max}`)
  console.log(`  Executions: ${bounds.executions.min} - ${bounds.executions.max}`)

  console.log('📦 Fetching all products...')
  const products = await prisma.product.findMany({
    select: {
      id: true, nome: true, precoSats: true,
      downloads: true, rating: true, pulsarEnergy: true,
      fitnessScore: true, a2aExecutions: true, featured: true,
    },
  })

  console.log(`🔄 Repricing ${products.length} products...`)

  let updated = 0
  const batchSize = 100
  const updates: { id: string; newPriceSats: number; oldPriceSats: number; score: number }[] = []

  for (const product of products) {
    const score = computeScore(product, bounds)
    const baitPrice = scoreToBait(score)
    const newPriceSats = baitPrice * BAIT_PER_SAT

    updates.push({
      id: product.id,
      newPriceSats,
      oldPriceSats: product.precoSats,
      score,
    })
  }

  // Apply in batches
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize)
    await Promise.all(
      batch.map(u =>
        prisma.product.update({
          where: { id: u.id },
          data: { precoSats: u.newPriceSats },
        })
      )
    )
    updated += batch.length
    process.stdout.write(`\r  Updated ${updated}/${updates.length} products...`)
  }

  console.log(`\n✅ Done! ${updated} products repriced.`)

  // Verify
  const verify = await prisma.product.aggregate({
    _min: { precoSats: true },
    _max: { precoSats: true },
    _avg: { precoSats: true },
  })
  console.log(`\n📊 New price range: ${verify._min.precoSats / BAIT_PER_SAT} - ${verify._max.precoSats / BAIT_PER_SAT} BAIT (avg: ${Math.round((verify._avg.precoSats || 0) / BAIT_PER_SAT)} BAIT)`)

  // Show distribution
  const buckets = new Array(9).fill(0) // 20-30, 30-40, ..., 90-100
  for (const u of updates) {
    const bait = u.newPriceSats / BAIT_PER_SAT
    const bucket = Math.min(8, Math.max(0, Math.floor((bait - MIN_BAIT) / 10)))
    buckets[bucket]++
  }
  console.log('\n📈 Price distribution (BAIT):')
  for (let i = 0; i < 9; i++) {
    const range = `${MIN_BAIT + i * 10}-${MIN_BAIT + (i + 1) * 10}`
    const bar = '█'.repeat(Math.round(buckets[i] / updates.length * 40))
    console.log(`  ${range}: ${String(buckets[i]).padStart(4)} ${bar}`)
  }

  // Show top 5 most expensive and cheapest
  const sorted = [...updates].sort((a, b) => b.newPriceSats - a.newPriceSats)
  console.log('\n🏆 Top 5 most expensive:')
  for (const u of sorted.slice(0, 5)) {
    const p = products.find(pr => pr.id === u.id)
    console.log(`  ${p?.nome} → ${u.newPriceSats / BAIT_PER_SAT} BAIT (score: ${u.score.toFixed(3)})`)
  }
  console.log('\n🏷️ Top 5 cheapest:')
  for (const u of sorted.slice(-5)) {
    const p = products.find(pr => pr.id === u.id)
    console.log(`  ${p?.nome} → ${u.newPriceSats / BAIT_PER_SAT} BAIT (score: ${u.score.toFixed(3)})`)
  }

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
