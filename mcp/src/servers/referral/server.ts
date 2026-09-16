#!/usr/bin/env node
/**
 * mcp-referral — Referral program and BAIT rewards.
 */

import { z } from "zod";
import { McpServer } from "../../lib/mcp/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const server = new McpServer({
  name: "mcp-referral",
  version: "1.0.0",
  title: "AI Store Referral",
  description: "Referral program and BAIT rewards.",
  capabilities: { tools: { listChanged: true }, resources: { listChanged: false }, prompts: { listChanged: false }, logging: {} },
});

server.tool(
  "lookup_by_code",
  z.object({ code: z.string() }),
  "Lookup an agent by referral code.",
  async ({ code }) => {
    const agent = await prisma.agent.findUnique({ where: { referralCode: code } });
    if (!agent) return { content: [{ type: "text", text: JSON.stringify({ ok: false, error: "not_found" }) }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify({ ok: true, agent: { id: agent.id, displayName: agent.displayName, address: agent.address, reputation: agent.reputation } }) }] };
  },
);

server.tool(
  "claim_reward",
  z.object({ referralId: z.string() }),
  "Mark a referral reward as claimed.",
  async ({ referralId }) => {
    const r = await prisma.referralReward.update({ where: { id: referralId }, data: { claimed: true } });
    return { content: [{ type: "text", text: JSON.stringify({ ok: true, claimed: r.claimed, amountSats: r.amountSats }) }] };
  },
);

server.tool(
  "pending_rewards",
  z.object({ agentAddress: z.string() }),
  "List unclaimed referral rewards for an agent.",
  async ({ agentAddress }) => {
    const agent = await prisma.agent.findUnique({ where: { address: agentAddress } });
    if (!agent) return { content: [{ type: "text", text: JSON.stringify({ ok: false, error: "agent_not_found" }) }], isError: true };
    const rewards = await prisma.referralReward.findMany({
      where: { referrerId: agent.id, claimed: false },
      orderBy: { createdAt: "desc" },
    });
    const total = rewards.reduce((s, r) => s + r.amountSats, 0);
    return {
      content: [{ type: "text", text: JSON.stringify({ ok: true, count: rewards.length, totalSats: total, rewards }, null, 2) }],
      structuredContent: { count: rewards.length, totalSats: total },
    };
  },
);

server.tool(
  "register_referral",
  z.object({ referrerCode: z.string(), referredAddress: z.string() }),
  "Bind a new agent to a referrer.",
  async ({ referrerCode, referredAddress }) => {
    const referrer = await prisma.agent.findUnique({ where: { referralCode: referrerCode } });
    if (!referrer) return { content: [{ type: "text", text: JSON.stringify({ ok: false, error: "referrer_not_found" }) }], isError: true };
    const referred = await prisma.agent.upsert({
      where: { address: referredAddress },
      create: {
        address: referredAddress,
        displayName: `Agent ${referredAddress.slice(0, 8)}`,
        referredBy: referrerCode,
        referralCode: "",
      },
      update: { referredBy: referrerCode },
    });
    const reward = await prisma.referralReward.create({
      data: { referrerId: referrer.id, referredId: referred.id, amountSats: 2500, type: "signup_bonus" },
    });
    return { content: [{ type: "text", text: JSON.stringify({ ok: true, rewardId: reward.id, amountSats: reward.amountSats }) }] };
  },
);

server.tool(
  "leaderboard",
  z.object({ limit: z.number().int().positive().max(50).default(10) }),
  "Top referrers by total rewards earned.",
  async ({ limit }) => {
    const grouped = await prisma.referralReward.groupBy({
      by: ["referrerId"],
      _sum: { amountSats: true },
      _count: { referrerId: true },
      orderBy: { _sum: { amountSats: "desc" } },
      take: limit,
    });
    const agents = await prisma.agent.findMany({
      where: { id: { in: grouped.map((g) => g.referrerId) } },
      select: { id: true, displayName: true, address: true },
    });
    const byId = new Map(agents.map((a) => [a.id, a]));
    const rows = grouped.map((g) => ({
      agent: byId.get(g.referrerId),
      totalSats: g._sum.amountSats ?? 0,
      referrals: g._count.referrerId,
    }));
    return { content: [{ type: "text", text: JSON.stringify({ leaderboard: rows }, null, 2) }] };
  },
);

await server.startStdio();
process.on("SIGINT", async () => { await prisma.$disconnect(); process.exit(0); });