-- ============================================================================
-- MCP Tables — additive migration
-- Adiciona as 6 tabelas MCP definidas em schema.prisma ao DB existente.
-- Não toca em nenhuma tabela pre-existente (Product/Agent/Review/Transaction/
-- ReferralReward) — os 1504 produtos originais sao preservados.
-- ============================================================================

-- CreateTable
CREATE TABLE "McpPackage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "iconEmoji" TEXT NOT NULL DEFAULT '🧩',
    "authorAgent" TEXT NOT NULL,
    "repoUrl" TEXT NOT NULL DEFAULT '',
    "homepage" TEXT NOT NULL DEFAULT '',
    "license" TEXT NOT NULL DEFAULT 'MIT',
    "transport" TEXT NOT NULL DEFAULT 'stdio',
    "command" TEXT NOT NULL,
    "args" TEXT NOT NULL DEFAULT '[]',
    "envSchema" TEXT NOT NULL DEFAULT '{}',
    "capabilities" TEXT NOT NULL DEFAULT '{"tools":true,"resources":false,"prompts":false,"logging":true,"sampling":false}',
    "manifestJson" TEXT NOT NULL,
    "toolsJson" TEXT NOT NULL DEFAULT '[]',
    "pricingModel" TEXT NOT NULL DEFAULT 'free',
    "priceSats" INTEGER NOT NULL DEFAULT 0,
    "pricePerCallSats" INTEGER NOT NULL DEFAULT 0,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "rating" REAL NOT NULL DEFAULT 4.5,
    "pulsarEnergy" REAL NOT NULL DEFAULT 95.0,
    "fitnessScore" REAL NOT NULL DEFAULT 85.0,
    "verified" BOOLEAN NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "McpInstall" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "agentId" TEXT,
    "version" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT 1,
    "envOverrides" TEXT NOT NULL DEFAULT '{}',
    "installedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "McpInstall_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "McpPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "McpTool" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "inputSchema" TEXT NOT NULL DEFAULT '{}',
    "callCount" INTEGER NOT NULL DEFAULT 0,
    "okCount" INTEGER NOT NULL DEFAULT 0,
    "errCount" INTEGER NOT NULL DEFAULT 0,
    "avgDurationMs" INTEGER NOT NULL DEFAULT 0,
    "discoveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "McpTool_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "McpPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "McpCall" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "agentId" TEXT,
    "ok" BOOLEAN NOT NULL,
    "errorMsg" TEXT NOT NULL DEFAULT '',
    "durationMs" INTEGER NOT NULL,
    "payloadHash" TEXT NOT NULL DEFAULT '',
    "ts" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "McpCall_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "McpPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "McpSelfHealEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageName" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "backoffMs" INTEGER NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "succeeded" BOOLEAN NOT NULL DEFAULT 0,
    "ts" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "McpRagFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "signal" TEXT NOT NULL,
    "weight" REAL NOT NULL DEFAULT 1.0,
    "context" TEXT NOT NULL DEFAULT '{}',
    "resolved" BOOLEAN NOT NULL DEFAULT 0,
    "ts" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "McpRagFeedback_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "McpPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "McpPackage_name_key" ON "McpPackage"("name");
CREATE INDEX "McpPackage_category_idx" ON "McpPackage"("category");
CREATE INDEX "McpPackage_authorAgent_idx" ON "McpPackage"("authorAgent");

CREATE UNIQUE INDEX "McpInstall_packageId_agentId_key" ON "McpInstall"("packageId", "agentId");
CREATE INDEX "McpInstall_agentId_idx" ON "McpInstall"("agentId");

CREATE UNIQUE INDEX "McpTool_packageId_name_key" ON "McpTool"("packageId", "name");
CREATE INDEX "McpTool_category_idx" ON "McpTool"("category");

CREATE INDEX "McpCall_packageId_ts_idx" ON "McpCall"("packageId", "ts");
CREATE INDEX "McpCall_toolName_idx" ON "McpCall"("toolName");
CREATE INDEX "McpCall_agentId_idx" ON "McpCall"("agentId");

CREATE INDEX "McpSelfHealEvent_packageName_ts_idx" ON "McpSelfHealEvent"("packageName", "ts");

CREATE INDEX "McpRagFeedback_packageId_signal_idx" ON "McpRagFeedback"("packageId", "signal");
CREATE INDEX "McpRagFeedback_resolved_idx" ON "McpRagFeedback"("resolved");
