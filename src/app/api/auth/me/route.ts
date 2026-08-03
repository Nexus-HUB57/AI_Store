import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get('address')
    if (!address) {
      return NextResponse.json({ error: 'Endereço obrigatório' }, { status: 400 })
    }

    const agent = await db.agent.findUnique({ where: { address } })
    if (!agent) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

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
    return NextResponse.json({ error: 'Erro' }, { status: 500 })
  }
}
