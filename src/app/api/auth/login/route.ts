import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { address, displayName } = await req.json()

    if (!address) {
      return NextResponse.json({ error: 'Endereço obrigatório' }, { status: 400 })
    }

    const agent = await db.agent.upsert({
      where: { address },
      update: { displayName: displayName || undefined },
      create: {
        address,
        displayName: displayName || address.slice(0, 12) + '...',
        role: 'buyer',
        reputation: 50,
        balanceSats: 100000,
        capabilities: JSON.stringify(['ML_INFERENCE', 'DATA_PROCESSING']),
      },
    })

    const caps = JSON.parse(agent.capabilities || '[]')

    return NextResponse.json({
      agent: {
        id: agent.id,
        address: agent.address,
        displayName: agent.displayName,
        role: agent.role,
        reputation: agent.reputation,
        balanceSats: agent.balanceSats,
        capabilities: caps,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Erro na autenticação' }, { status: 500 })
  }
}
