-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "segmento" TEXT NOT NULL,
    "coreBusiness" TEXT NOT NULL,
    "segmentoDisplay" TEXT NOT NULL DEFAULT '',
    "publicoAlvoAI" TEXT NOT NULL,
    "disponibilidadeOS" TEXT NOT NULL,
    "repoGithubUrl" TEXT NOT NULL,
    "precoSats" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'github',
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "rating" REAL NOT NULL DEFAULT 4.5,
    "pulsarEnergy" REAL NOT NULL DEFAULT 95.0,
    "fitnessScore" REAL NOT NULL DEFAULT 85.0,
    "a2aExecutions" INTEGER NOT NULL DEFAULT 0,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "authorAgent" TEXT NOT NULL DEFAULT '@nexus-genesis',
    "iconEmoji" TEXT NOT NULL DEFAULT '',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "address" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'buyer',
    "reputation" INTEGER NOT NULL DEFAULT 50,
    "balanceSats" INTEGER NOT NULL DEFAULT 100000,
    "capabilities" TEXT NOT NULL DEFAULT '[]',
    "referralCode" TEXT NOT NULL DEFAULT '',
    "referredBy" TEXT NOT NULL DEFAULT '',
    "purchaseCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rating" INTEGER NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "comment" TEXT NOT NULL DEFAULT '',
    "productId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "txHash" TEXT NOT NULL DEFAULT '',
    "helpful" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "amountSats" INTEGER NOT NULL,
    "discountSats" INTEGER NOT NULL DEFAULT 0,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "productId" TEXT,
    "txHash" TEXT NOT NULL DEFAULT '',
    "blockHeight" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Agent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Agent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReferralReward" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referrerId" TEXT NOT NULL,
    "referredId" TEXT NOT NULL,
    "amountSats" INTEGER NOT NULL DEFAULT 2500,
    "type" TEXT NOT NULL DEFAULT 'signup_bonus',
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferralReward_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "Agent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReferralReward_referredId_fkey" FOREIGN KEY ("referredId") REFERENCES "Agent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_address_key" ON "Agent"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_referralCode_key" ON "Agent"("referralCode");

-- CreateIndex
CREATE INDEX "Review_productId_idx" ON "Review"("productId");

-- CreateIndex
CREATE INDEX "Review_agentId_idx" ON "Review"("agentId");

-- CreateIndex
CREATE INDEX "Transaction_buyerId_idx" ON "Transaction"("buyerId");

-- CreateIndex
CREATE INDEX "Transaction_sellerId_idx" ON "Transaction"("sellerId");

-- CreateIndex
CREATE INDEX "Transaction_productId_idx" ON "Transaction"("productId");

-- CreateIndex
CREATE INDEX "ReferralReward_referrerId_idx" ON "ReferralReward"("referrerId");

-- CreateIndex
CREATE INDEX "ReferralReward_referredId_idx" ON "ReferralReward"("referredId");

