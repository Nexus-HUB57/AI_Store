-- Fases 3 e 4: intenção financeira e idempotência transacional.
-- Esta migração somente cria a tabela e seus índices. Ela não debita saldo,
-- transmite fundos nem altera registros existentes.

CREATE TABLE "PurchaseIntent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buyerId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "currencyUnit" TEXT NOT NULL DEFAULT 'sats',
    "originalAmountSats" INTEGER NOT NULL,
    "discountAmountSats" INTEGER NOT NULL DEFAULT 0,
    "chargedAmountSats" INTEGER NOT NULL,
    "externalTxId" TEXT,
    "failureCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PurchaseIntent_buyerId_fkey"
      FOREIGN KEY ("buyerId") REFERENCES "Agent" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PurchaseIntent_buyerId_idempotencyKey_key"
  ON "PurchaseIntent"("buyerId", "idempotencyKey");

CREATE UNIQUE INDEX "PurchaseIntent_externalTxId_key"
  ON "PurchaseIntent"("externalTxId");

CREATE INDEX "PurchaseIntent_status_updatedAt_idx"
  ON "PurchaseIntent"("status", "updatedAt");

CREATE INDEX "PurchaseIntent_buyerId_createdAt_idx"
  ON "PurchaseIntent"("buyerId", "createdAt");
