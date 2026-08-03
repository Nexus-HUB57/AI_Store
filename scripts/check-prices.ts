import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function main() {
  const agg = await p.product.aggregate({
    _min: { precoSats: true },
    _max: { precoSats: true },
    _avg: { precoSats: true },
    _count: true,
  })
  console.log('Count:', agg._count)
  console.log('Min price (sats):', agg._min.precoSats)
  console.log('Max price (sats):', agg._max.precoSats)
  console.log('Avg price (sats):', Math.round(agg._avg.precoSats || 0))

  // Sample high and low
  const topExp = await p.product.findMany({
    take: 5, orderBy: { a2aExecutions: 'desc' },
    select: { nome: true, precoSats: true, downloads: true, pulsarEnergy: true, fitnessScore: true, rating: true, a2aExecutions: true },
  })
  console.log('\nTop 5 by A2A executions:')
  topExp.forEach(s => console.log(`  ${s.nome} | ${s.precoSats}s | ${s.downloads}dl | P:${s.pulsarEnergy}% F:${s.fitnessScore}% R:${s.rating} E:${s.a2aExecutions}`))

  const topDl = await p.product.findMany({
    take: 5, orderBy: { downloads: 'desc' },
    select: { nome: true, precoSats: true, downloads: true, pulsarEnergy: true, fitnessScore: true, rating: true, a2aExecutions: true },
  })
  console.log('\nTop 5 by downloads:')
  topDl.forEach(s => console.log(`  ${s.nome} | ${s.precoSats}s | ${s.downloads}dl | P:${s.pulsarEnergy}% F:${s.fitnessScore}% R:${s.rating} E:${s.a2aExecutions}`))

  await p.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
