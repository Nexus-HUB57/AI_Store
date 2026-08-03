import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

interface PurchaseRequest {
  items: Array<{
    id: string
    nome: string
    precoSats: number
  }>
  totalSats: number
}

export async function POST(req: NextRequest) {
  try {
    const body: PurchaseRequest = await req.json()

    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: 'Carrinho vazio' }, { status: 400 })
    }

    const calculatedTotal = body.items.reduce((sum, item) => sum + item.precoSats, 0)
    if (calculatedTotal !== body.totalSats) {
      return NextResponse.json({ error: 'Total inconsistente' }, { status: 400 })
    }

    const txId = `bAI-${uuidv4().slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`
    const confirmations = Math.floor(Math.random() * 3) + 1

    return NextResponse.json({
      success: true,
      txId,
      totalSats: body.totalSats,
      items: body.items.length,
      confirmations,
      network: 'bAI-mainnet',
      blockHash: `0x${Buffer.from(txId).toString('hex').slice(0, 16)}...`,
      timestamp: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json({ error: 'Erro na transação' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    network: 'bAI-mainnet',
    blockHeight: 1847293,
    mempoolSize: 42,
    avgFee: 1,
    totalSupply: '21_000_000 bAI',
    circulating: '14_302_891 bAI',
  })
}
