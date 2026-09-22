// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * POST /api/mcp/[slug]/acquire — Acquire (purchase) an MCP package
 *
 * Records the acquisition and increments download count.
 * In production, this would involve a BAIT/sats transaction.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await req.json()
    const { agentId } = body

    if (!agentId) {
      return NextResponse.json({ error: 'agentId is required' }, { status: 400 })
    }

    const pkg = await db.mcpPackage.findUnique({
      where: { slug },
      include: { tools: true },
    })

    if (!pkg) {
      return NextResponse.json({ error: 'MCP package not found' }, { status: 404 })
    }

    if (pkg.deprecated) {
      return NextResponse.json({ error: 'Package is deprecated' }, { status: 410 })
    }

    // Check agent balance
    const agent = await db.agent.findUnique({ where: { id: agentId } })
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    if (agent.balanceSats < pkg.priceSats) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 402 })
    }

    // Process acquisition (atomic transaction)
    const result = await db.$transaction(async (tx) => {
      // Deduct balance
      await tx.agent.update({
        where: { id: agentId },
        data: {
          balanceSats: { decrement: pkg.priceSats },
          purchaseCount: { increment: 1 },
        },
      })

      // Increment downloads
      const updated = await tx.mcpPackage.update({
        where: { slug },
        data: { downloads: { increment: 1 } },
        include: { tools: true },
      })

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          type: 'mcp_acquire',
          status: 'confirmed',
          amountSats: pkg.priceSats,
          buyerId: agentId,
          sellerId: 'system',
          productId: pkg.id,
        },
      })

      return { package: updated, transaction }
    })

    return NextResponse.json({
      success: true,
      package: result.package,
      transaction: result.transaction,
      message: `Acquired ${pkg.name} for ${pkg.priceSats} sats`,
    })
  } catch (error) {
    console.error('[/api/mcp/[slug]/acquire POST]', error)
    return NextResponse.json({ error: 'Failed to acquire MCP package' }, { status: 500 })
  }
}
