/**
 * MCP API: Acquire
 * POST /api/mcp/acquire — Purchase and install an MCP package (atomic acquire operation)
 */

import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { packageName, agentId, version } = body as {
      packageName: string
      agentId: string
      version?: string
    }

    if (!packageName || !agentId) {
      return NextResponse.json(
        { error: 'packageName and agentId are required' },
        { status: 400 }
      )
    }

    const { db } = await import('@/lib/db')

    // Look up the package
    const pkg = await db.mcpPackage.findUnique({ where: { name: packageName } })
    if (!pkg) {
      return NextResponse.json(
        { error: `Package "${packageName}" not found in catalog` },
        { status: 404 }
      )
    }

    // Check if already acquired
    const existing = await db.mcpInstall.findUnique({
      where: { agentId_packageId: { agentId, packageId: pkg.id } },
    })

    if (existing && existing.status === 'active') {
      return NextResponse.json({
        success: true,
        installId: existing.id,
        packageId: pkg.id,
        priceSats: 0, // already acquired
        message: 'Package already acquired',
      })
    }

    // Check agent balance
    const agent = await db.agent.findUnique({ where: { address: agentId } })
    if (!agent) {
      return NextResponse.json(
        { error: `Agent "${agentId}" not found` },
        { status: 404 }
      )
    }

    if (agent.balanceSats < pkg.priceSats) {
      return NextResponse.json(
        { error: `Insufficient balance. Need ${pkg.priceSats} sats, have ${agent.balanceSats}` },
        { status: 402 }
      )
    }

    // Atomic acquire: deduct balance + create install + create transaction
    const install = await db.$transaction(async (tx) => {
      // Deduct balance
      await tx.agent.update({
        where: { address: agentId },
        data: { balanceSats: { decrement: pkg.priceSats } },
      })

      // Create or reactivate install
      const inst = await tx.mcpInstall.upsert({
        where: { agentId_packageId: { agentId, packageId: pkg.id } },
        create: {
          agentId,
          packageId: pkg.id,
          version: version ?? pkg.version,
          status: 'active',
        },
        update: {
          status: 'active',
          version: version ?? pkg.version,
        },
      })

      // Record transaction if price > 0
      if (pkg.priceSats > 0) {
        await tx.transaction.create({
          data: {
            type: 'mcp_acquire',
            amountSats: pkg.priceSats,
            buyerId: agent.id,
            sellerId: agent.id, // self-referential for marketplace
            productId: undefined,
            status: 'confirmed',
          },
        })
      }

      // Increment download count
      await tx.mcpPackage.update({
        where: { id: pkg.id },
        data: { downloads: { increment: 1 } },
      })

      return inst
    })

    return NextResponse.json({
      success: true,
      installId: install.id,
      packageId: pkg.id,
      priceSats: pkg.priceSats,
      version: install.version,
      message: `Package "${packageName}" acquired successfully`,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
