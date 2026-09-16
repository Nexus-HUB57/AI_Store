#!/usr/bin/env node
/**
 * mcp-agent-auth — Sessions, identity, capability attestations.
 */

import { z } from "zod";
import { McpServer } from "../../lib/mcp/server";
import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";

const prisma = new PrismaClient();
const SESSIONS = new Map<string, { agentId: string; createdAt: number }>();

const server = new McpServer({
  name: "mcp-agent-auth",
  version: "1.0.0",
  title: "AI Store Agent Auth",
  description: "Sessions, identity, capability attestations.",
  capabilities: { tools: { listChanged: true }, resources: { listChanged: false }, prompts: { listChanged: false }, logging: {} },
});

server.tool(
  "login",
  z.object({ address: z.string().describe("Agent wallet-like address"), displayName: z.string().default("") }),
  "Mint a session token for an agent (creates the agent if new).",
  async ({ address, displayName }) => {
    const agent = await prisma.agent.upsert({
      where: { address },
      create: { address, displayName: displayName || `Agent ${address.slice(0, 8)}`, referralCode: crypto.randomBytes(4).toString("hex") },
      update: displayName ? { displayName } : {},
    });
    const token = crypto.randomBytes(24).toString("hex");
    SESSIONS.set(token, { agentId: agent.id, createdAt: Date.now() });
    return {
      content: [{ type: "text", text: JSON.stringify({ ok: true, token, agent: { id: agent.id, address: agent.address, displayName: agent.displayName, role: agent.role, reputation: agent.reputation } }) }],
      structuredContent: { token, agentId: agent.id },
    };
  },
);

server.tool(
  "whoami",
  z.object({ token: z.string() }),
  "Resolve a session token to the agent.",
  async ({ token }) => {
    const session = SESSIONS.get(token);
    if (!session) return { content: [{ type: "text", text: JSON.stringify({ ok: false, error: "invalid_token" }) }], isError: true };
    const agent = await prisma.agent.findUnique({ where: { id: session.agentId } });
    if (!agent) return { content: [{ type: "text", text: JSON.stringify({ ok: false, error: "agent_vanished" }) }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify({ ok: true, agent: { id: agent.id, address: agent.address, displayName: agent.displayName, role: agent.role, reputation: agent.reputation, balanceSats: agent.balanceSats } }) }],
    };
  },
);

server.tool(
  "attest_capabilities",
  z.object({ token: z.string(), capabilities: z.array(z.string()) }),
  "Attach a capability attestation to an agent session.",
  async ({ token, capabilities }) => {
    const session = SESSIONS.get(token);
    if (!session) return { content: [{ type: "text", text: JSON.stringify({ ok: false, error: "invalid_token" }) }], isError: true };
    const agent = await prisma.agent.update({ where: { id: session.agentId }, data: { capabilities: JSON.stringify(capabilities) } });
    return {
      content: [{ type: "text", text: JSON.stringify({ ok: true, agentId: agent.id, capabilities }) }],
      structuredContent: { capabilities },
    };
  },
);

server.tool(
  "logout",
  z.object({ token: z.string() }),
  "Invalidate a session token.",
  async ({ token }) => {
    SESSIONS.delete(token);
    return { content: [{ type: "text", text: JSON.stringify({ ok: true }) }] };
  },
);

server.tool(
  "reputation",
  z.object({ agentAddress: z.string() }),
  "Public reputation lookup.",
  async ({ agentAddress }) => {
    const agent = await prisma.agent.findUnique({ where: { address: agentAddress } });
    if (!agent) return { content: [{ type: "text", text: JSON.stringify({ ok: false, error: "not_found" }) }], isError: true };
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          ok: true,
          address: agent.address,
          displayName: agent.displayName,
          reputation: agent.reputation,
          trust_level: agent.reputation >= 80 ? "trusted" : agent.reputation >= 50 ? "standard" : agent.reputation >= 20 ? "probation" : "suspended",
          purchaseCount: agent.purchaseCount,
        }, null, 2),
      }],
    };
  },
);

await server.startStdio();
process.on("SIGINT", async () => { await prisma.$disconnect(); process.exit(0); });