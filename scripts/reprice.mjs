import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const BAIT_SAT_RATIO = 100 // 1 BAIT = 100 sats

async function analyze() {
  const products = await db.product.findMany({
    where: { id: { not: '' } },
    select: { id: true, nome: true, precoSats: true, pulsarEnergy: true, downloads: true, rating: true, fitnessScore: true, a2aExecutions: true, segmento: true, featured: true }
  })

  console.log('=== ANÁLISE PRÉ-REPRICING ===')
  console.log('Total produtos:', products.length)

  const prices = products.map(p => p.precoSats)
  console.log('Preço atual - min:', Math.min(...prices), 'max:', Math.max(...prices),
    'avg:', Math.round(prices.reduce((a, b) => a + b, 0) / prices.length))

  // Normalize each metric to 0-1
  const allPulsar = products.map(p => p.pulsarEnergy)
  const allDl = products.map(p => p.downloads)
  const allRating = products.map(p => p.rating)
  const allFitness = products.map(p => p.fitnessScore)
  const allExec = products.map(p => p.a2aExecutions)

  const min = (arr) => Math.min(...arr)
  const max = (arr) => Math.max(...arr)
  const norm = (val, lo, hi) => hi === lo ? 0.5 : (val - lo) / (hi - lo)

  // Pricing formula: weighted composite score → 20-100 BAIT
  // Weights: Pulsar 25%, Downloads 30%, Rating 25%, Fitness 15%, Execs 5%
  const WEIGHTS = { pulsar: 0.25, downloads: 0.30, rating: 0.25, fitness: 0.15, execs: 0.05 }

  // Featured products get +15% premium
  // Segment multiplier: KNOWLEDGE_PACKS +10%, AGENT_APPS +5%
  const SEG_MULT = {
    KNOWLEDGE_PACKS: 1.10,
    AGENT_APPS: 1.05,
    SYNTHETIC_INFRASTRUCTURE: 1.08,
    EXECUTABLE_SKILLS: 1.02,
    PROMPT_HARNESS: 0.95,
    IN_APP_PRODUCTS: 0.98,
  }

  // First pass: compute raw scores
  const rawScores = []
  for (const p of products) {
    const pN = norm(p.pulsarEnergy, min(allPulsar), max(allPulsar))
    const dN = norm(p.downloads, min(allDl), max(allDl))
    const rN = norm(p.rating, min(allRating), max(allRating))
    const fN = norm(p.fitnessScore, min(allFitness), max(allFitness))
    const eN = norm(p.a2aExecutions, min(allExec), max(allExec))
    const score = pN * WEIGHTS.pulsar + dN * WEIGHTS.downloads + rN * WEIGHTS.rating
      + fN * WEIGHTS.fitness + eN * WEIGHTS.execs
    let segMult = SEG_MULT[p.segmento] || 1.0
    let featMult = p.featured ? 1.15 : 1.0
    const adjustedScore = Math.pow(score, 0.75) * segMult * featMult
    rawScores.push(adjustedScore)
  }

  const minScore = Math.min(...rawScores)
  const maxScore = Math.max(...rawScores)
  const scoreRange = maxScore - minScore || 1

  const priceMap = []
  let tierCount = { budget: 0, mid: 0, premium: 0, elite: 0 }

  for (let i = 0; i < products.length; i++) {
    const p = products[i]
    // Normalize to 0-1 using actual data range, then map to 20-100 BAIT
    const normalizedScore = (rawScores[i] - minScore) / scoreRange
    const baitPrice = Math.round(20 + normalizedScore * 80)
    const clampedBait = Math.max(20, Math.min(100, baitPrice))
    const satsPrice = clampedBait * BAIT_SAT_RATIO

    priceMap.push({ id: p.id, nome: p.nome, oldSats: p.precoSats, newBait: clampedBait, newSats: satsPrice, score: normalizedScore })

    if (clampedBait <= 35) tierCount.budget++
    else if (clampedBait <= 60) tierCount.mid++
    else if (clampedBait <= 80) tierCount.premium++
    else tierCount.elite++
  }

  // Filter out invalid entries
  const valid = priceMap.filter(p => p.id && p.id.length > 0)
  console.log('\nProdutos válidos:', valid.length, '/', priceMap.length)

  console.log('\n=== NOVA DISTRIBUIÇÃO DE PREÇOS (BAIT) ===')
  console.log('Budget (20-35 BAIT):', tierCount.budget, 'produtos')
  console.log('Mid (36-60 BAIT):', tierCount.mid, 'produtos')
  console.log('Premium (61-80 BAIT):', tierCount.premium, 'produtos')
  console.log('Elite (81-100 BAIT):', tierCount.elite, 'produtos')

  // Show top 10 most expensive and top 10 cheapest
  const sorted = [...valid].sort((a, b) => b.newBait - a.newBait)
  console.log('\n--- Top 10 Mais Caros ---')
  for (const p of sorted.slice(0, 10)) {
    console.log(`  ${p.newBait} BAIT (${p.newSats} sats) | score:${p.score.toFixed(3)} | ${(p.nome||'').slice(0, 50)}`)
  }
  console.log('\n--- Top 10 Mais Baratos ---')
  for (const p of sorted.slice(-10)) {
    console.log(`  ${p.newBait} BAIT (${p.newSats} sats) | score:${p.score.toFixed(3)} | ${(p.nome||'').slice(0, 50)}`)
  }

  // Apply prices in batch
  console.log('\n=== APLICANDO PREÇOS ===')
  const BATCH_SIZE = 100
  for (let i = 0; i < valid.length; i += BATCH_SIZE) {
    const batch = valid.slice(i, i + BATCH_SIZE)
    await Promise.all(batch.map(p =>
      db.product.update({ where: { id: p.id }, data: { precoSats: p.newSats } })
    ))
    process.stdout.write(`\r  Progresso: ${Math.min(i + BATCH_SIZE, valid.length)}/${valid.length}`)
  }
  console.log('\n\n✅ Repricing concluído!', valid.length, 'produtos atualizados')

  // Verify
  const after = await db.product.findMany({ select: { precoSats: true } })
  const afterPrices = after.map(p => p.precoSats)
  console.log('Pós - min:', Math.min(...afterPrices), 'max:', Math.max(...afterPrices),
    'avg:', Math.round(afterPrices.reduce((a, b) => a + b, 0) / afterPrices.length), 'sats')
  console.log('Em BAIT - min:', Math.min(...afterPrices) / 100, 'max:', Math.max(...afterPrices) / 100)
}

analyze().catch(console.error).finally(() => db.$disconnect())
