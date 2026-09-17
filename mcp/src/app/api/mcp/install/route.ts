/**
 * MCP API: Install
 * POST /api/mcp/install — Install an MCP package for an agent
 */

import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { packageName, agentId, version, config } = body as {
      packageName: string
      agentId: string
      version?: string
      config?: Record<string, unknown>
    }

    if (!packageName || !agentId) {
      return NextResponse.json(
        { error: 'packageName and agentId are required' },
        { status: 400 }
      )
    }

    // Dynamic import to avoid bundling DB at build time
    const { db } = await import('@/lib/db')

    // Check if already installed
    const existing = await db.mcpInstall.findUnique({
      where: { agentId_packageId: { agentId, packageId: packageName } },
    })

    if (existing) {
      return NextResponse.json({
        success: true,
        installId: existing.id,
        message: 'Package already installed',
        status: existing.status,
      })
    }

    // Look up the package
    const pkg = await db.mcpPackage.findUnique({ where: { name: packageName } })
    if (!pkg) {
      return NextResponse.json(
        { error: `Package "${packageName}" not found` },
        { status: 404 }
      )
    }

    // Create install record
    const install = await db.mcpInstall.create({
      data: {
        agentId,
        packageId: pkg.id,
        version: version ?? pkg.version,
        configJson: JSON.stringify(config ?? {}),
      },
    })

    // Increment download count
    await db.mcpPackage.update({
      where: { id: pkg.id },
      data: { downloads: { increment: 1 } },
    })

    return NextResponse.json({
      success: true,
      installId: install.id,
      packageId: pkg.id,
      version: install.version,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
