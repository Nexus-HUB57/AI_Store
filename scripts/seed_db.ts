import { db } from '@/lib/db'
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

const SEGMENT_ICONS: Record<string, string> = {
  AGENT_APPS: '🤖',
  EXECUTABLE_SKILLS: '⚙️',
  KNOWLEDGE_PACKS: '📚',
  SYNTHETIC_INFRASTRUCTURE: '🏗️',
  PROMPT_HARNESS: '🧠',
  IN_APP_PRODUCTS: '💎',
}

const SEGMENT_DISPLAY: Record<string, string> = {
  AGENT_APPS: 'Agent Apps & Suítes',
  EXECUTABLE_SKILLS: 'Algoritmos & Skills WASM',
  KNOWLEDGE_PACKS: 'Conhecimento Cognitivo & RAG',
  SYNTHETIC_INFRASTRUCTURE: 'Infraestrutura Sintética',
  PROMPT_HARNESS: 'Harnesses de Prompt',
  IN_APP_PRODUCTS: 'Produtos Digitais A2A',
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

async function main() {
  console.log('🌱 Seeding AI Store with 1000 products...')
  
  const dataPath = path.join(process.cwd(), 'output', 'ai_store_1000_products.json')
  const rawData = fs.readFileSync(dataPath, 'utf-8')
  const products: Array<{
    id: string
    nome: string
    segmento: string
    coreBusiness: string
    publicoAlvoAI: string
    disponibilidadeOS: string | string[]
    repoGithubUrl: string
    preçoSats: number
    source: string
  }> = JSON.parse(rawData)

  // Clear existing
  await prisma.product.deleteMany()

  // Batch insert
  const BATCH_SIZE = 100
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE)
    const createMany = batch.map((p, idx) => {
      const globalIdx = i + idx
      const pulsar = 70 + Math.random() * 30
      const fitness = 60 + Math.random() * 40
      const downloads = Math.floor(Math.random() * 50000) + 100
      const rating = 3.5 + Math.random() * 1.5
      const executions = Math.floor(Math.random() * 100000)
      const isFeatured = globalIdx < 12

      return {
        nome: p.nome,
        slug: slugify(p.nome) + '-' + (globalIdx + 1),
        segmento: p.segmento,
        segmentoDisplay: SEGMENT_DISPLAY[p.segmento] || p.segmento,
        coreBusiness: p.coreBusiness,
        publicoAlvoAI: p.publicoAlvoAI,
        disponibilidadeOS: Array.isArray(p.disponibilidadeOS) ? (p.disponibilidadeOS as string[]).join(', ') : p.disponibilidadeOS,
        repoGithubUrl: p.repoGithubUrl,
        precoSats: p.preçoSats,
        source: p.source,
        downloads,
        rating: Math.round(rating * 10) / 10,
        pulsarEnergy: Math.round(pulsar * 10) / 10,
        fitnessScore: Math.round(fitness * 10) / 10,
        a2aExecutions: executions,
        version: `${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 20)}`,
        authorAgent: `@agent-${Math.floor(Math.random() * 50) + 1}`,
        iconEmoji: SEGMENT_ICONS[p.segmento] || '📦',
        featured: isFeatured,
      }
    })

    await prisma.product.createMany({ data: createMany })
    console.log(`  Inserted ${i + batch.length} / ${products.length}`)
  }

  const total = await prisma.product.count()
  console.log(`\n✅ Done! ${total} products in the AI Store.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
