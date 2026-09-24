/**
 * MCP API: Call
 * POST /api/mcp/call — Execute an MCP tool call
 */

import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { packageName, toolName, input, callerAgent } = body as {
      packageName: string
      toolName: string
      input?: Record<string, unknown>
      callerAgent: string
    }

    if (!packageName || !toolName || !callerAgent) {
      return NextResponse.json(
        { error: 'packageName, toolName, and callerAgent are required' },
        { status: 400 }
      )
    }

    // Execute via runtime
    const { executeCall } = await import('../../lib/mcp/runtime')
    const result = await executeCall(packageName, toolName, input ?? {}, callerAgent)

    // Log call to DB (fire-and-forget)
    try {
      const { db } = await import('@/lib/db')
      const pkg = await db.mcpPackage.findUnique({ where: { name: packageName } })
      if (pkg) {
        const tool = await db.mcpTool.findFirst({
          where: { packageId: pkg.id, name: toolName },
        })
        if (tool) {
          await db.mcpCall.create({
            data: {
              toolId: tool.id,
              packageId: pkg.id,
              callerAgent,
              inputJson: JSON.stringify(input ?? {}),
              outputJson: JSON.stringify(result.output),
              status: result.success ? 'success' : 'error',
              latencyMs: result.latencyMs,
              error: result.error ?? '',
            },
          })
          // Update tool stats
          await db.mcpTool.update({
            where: { id: tool.id },
            data: {
              callCount: { increment: 1 },
              avgLatencyMs: result.latencyMs,
              errorRate: result.success ? 0 : 1,
            },
          })
        }
      }
    } catch {
      // DB logging is best-effort, don't fail the call
    }

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
