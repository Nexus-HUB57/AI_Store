/**
 * POST /api/mcp/acquire
 *
 * Agent acquires MCP — the purchase/installation flow.
 *
 * Body: { packageName: string, agentId: string }
 *
 * Flow:
 *   1. Look up McpPackage by name
 *   2. Check if agent already has it installed (McpInstall)
 *   3. If pricingModel != "free", create a Transaction (debit agent balanceSats)
 *   4. Create McpInstall record
 *   5. Increment McpPackage.downloads
 *   6. Return { installId, packageId, transactionId? }
 */

import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface AcquireRequestBody {
  packageName: string;
  agentId: string;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body: AcquireRequestBody = await req.json();
    const { packageName, agentId } = body;

    // ---- Validate input ----
    if (!packageName || typeof packageName !== "string") {
      return NextResponse.json(
        {
          error: "missing_parameter",
          message: "packageName is required and must be a string",
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    if (!agentId || typeof agentId !== "string") {
      return NextResponse.json(
        {
          error: "missing_parameter",
          message: "agentId is required and must be a string",
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // ---- 1. Look up McpPackage by name ----
    const mcpPackage = await db.mcpPackage.findUnique({
      where: { name: packageName },
    });

    if (!mcpPackage) {
      return NextResponse.json(
        {
          error: "package_not_found",
          message: `MCP package "${packageName}" does not exist in the catalog`,
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // ---- 2. Check if agent already has it installed ----
    const existingInstall = await db.mcpInstall.findUnique({
      where: {
        packageId_agentId: {
          packageId: mcpPackage.id,
          agentId,
        },
      },
    });

    if (existingInstall) {
      return NextResponse.json(
        {
          error: "already_installed",
          message: `Agent ${agentId} already has ${packageName} installed`,
          installId: existingInstall.id,
          packageId: mcpPackage.id,
          enabled: existingInstall.enabled,
          installedAt: existingInstall.installedAt,
          timestamp: new Date().toISOString(),
        },
        { status: 409 }
      );
    }

    // ---- Look up the agent ----
    const agent = await db.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return NextResponse.json(
        {
          error: "agent_not_found",
          message: `Agent ${agentId} does not exist`,
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // ---- 3. Handle pricing (debit agent balance if not free) ----
    let transactionId: string | undefined;

    if (mcpPackage.pricingModel !== "free" && mcpPackage.priceSats > 0) {
      // Check sufficient balance
      if (agent.balanceSats < mcpPackage.priceSats) {
        return NextResponse.json(
          {
            error: "insufficient_balance",
            message: `Agent balance (${agent.balanceSats} sats) is insufficient for ${packageName} (${mcpPackage.priceSats} sats)`,
            balanceSats: agent.balanceSats,
            priceSats: mcpPackage.priceSats,
            deficitSats: mcpPackage.priceSats - agent.balanceSats,
            timestamp: new Date().toISOString(),
          },
          { status: 402 }
        );
      }

      // Determine the seller (the package author's agent, or the system agent)
      // For MCP packages, the seller is typically the package author
      let sellerId = agentId; // fallback to same agent (self-purchase scenario)
      if (mcpPackage.authorAgent && mcpPackage.authorAgent.startsWith("@")) {
        // Try to find the author agent by address prefix
        const authorAgent = await db.agent.findFirst({
          where: { address: { contains: mcpPackage.authorAgent.replace("@", "") } },
        });
        if (authorAgent) {
          sellerId = authorAgent.id;
        }
      }

      // Create transaction and debit agent balance in a single logical operation
      const tx = await db.$transaction(async (txDb) => {
        // Debit buyer balance
        await txDb.agent.update({
          where: { id: agentId },
          data: { balanceSats: { decrement: mcpPackage.priceSats } },
        });

        // Credit seller balance (if different from buyer)
        if (sellerId !== agentId) {
          await txDb.agent.update({
            where: { id: sellerId },
            data: { balanceSats: { increment: mcpPackage.priceSats } },
          });
        }

        // Create transaction record
        const transaction = await txDb.transaction.create({
          data: {
            type: "mcp_acquire",
            status: "confirmed",
            amountSats: mcpPackage.priceSats,
            buyerId: agentId,
            sellerId,
          },
        });

        return transaction;
      });

      transactionId = tx.id;
    }

    // ---- 4. Create McpInstall record ----
    const install = await db.mcpInstall.create({
      data: {
        packageId: mcpPackage.id,
        agentId,
        version: mcpPackage.version,
        enabled: true,
        envOverrides: "{}",
      },
    });

    // ---- 5. Increment McpPackage.downloads ----
    await db.mcpPackage.update({
      where: { id: mcpPackage.id },
      data: {
        downloads: { increment: 1 },
      },
    });

    // ---- 6. Return success ----
    const latencyMs = Date.now() - startTime;

    return NextResponse.json(
      {
        ok: true,
        installId: install.id,
        packageId: mcpPackage.id,
        packageName: mcpPackage.name,
        version: mcpPackage.version,
        transactionId: transactionId || null,
        pricingModel: mcpPackage.pricingModel,
        pricePaidSats: mcpPackage.pricingModel !== "free" ? mcpPackage.priceSats : 0,
        agentBalanceSats: agent.balanceSats - (mcpPackage.pricingModel !== "free" ? mcpPackage.priceSats : 0),
        latencyMs,
        timestamp: new Date().toISOString(),
      },
      {
        status: 201,
        headers: {
          "X-Response-Time": `${latencyMs}ms`,
        },
      }
    );
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);

    console.error(`[MCP Acquire] Error: ${message}`);

    return NextResponse.json(
      {
        error: "internal_error",
        message: "An unexpected error occurred during MCP acquisition",
        latencyMs,
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          "X-Response-Time": `${latencyMs}ms`,
        },
      }
    );
  }
}
