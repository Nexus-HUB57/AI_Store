import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const [total, segments, avgPulsar, totalDownloads, totalExecutions, featuredCount] =
      await Promise.all([
        db.product.count(),
        db.product.groupBy({ by: ['segmento'], _count: true }),
        db.product.aggregate({ _avg: { pulsarEnergy: true } }),
        db.product.aggregate({ _sum: { downloads: true } }),
        db.product.aggregate({ _sum: { a2aExecutions: true } }),
        db.product.count({ where: { featured: true } }),
      ])

    const categoryMap: Record<string, { nome: string; icon: string; count: number }> = {
      AGENT_APPS: { nome: 'Agent Apps & Suítes', icon: '🤖', count: 0 },
      EXECUTABLE_SKILLS: { nome: 'Algoritmos & Skills WASM', icon: '⚙️', count: 0 },
      KNOWLEDGE_PACKS: { nome: 'Conhecimento Cognitivo & RAG', icon: '📚', count: 0 },
      SYNTHETIC_INFRASTRUCTURE: { nome: 'Infraestrutura Sintética', icon: '🏗️', count: 0 },
      PROMPT_HARNESS: { nome: 'Harnesses de Prompt', icon: '🧠', count: 0 },
      IN_APP_PRODUCTS: { nome: 'Produtos Digitais A2A', icon: '💎', count: 0 },
    }

    for (const seg of segments) {
      const key = seg.segmento as string
      if (categoryMap[key]) {
        categoryMap[key].count = seg._count
      }
    }

    return NextResponse.json({
      total,
      categories: Object.entries(categoryMap).map(([key, val]) => ({
        key,
        ...val,
      })),
      avgPulsarEnergy: Math.round((avgPulsar._avg.pulsarEnergy || 0) * 10) / 10,
      totalDownloads: totalDownloads._sum.downloads || 0,
      totalExecutions: totalExecutions._sum.a2aExecutions || 0,
      featuredCount,
    })
  } catch (error) {
    console.error('stats API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
