-- Fase 5: outbox transacional e recuperação de intenções pendentes.
-- Migração aditiva: não remove, renomeia ou reescreve dados existentes.

ALTER TABLE "PurchaseIntent" ADD COLUMN "payloadJson" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "PurchaseIntent" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PurchaseIntent" ADD COLUMN "nextAttemptAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "PurchaseIntent" ADD COLUMN "lastError" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PurchaseIntent" ADD COLUMN "receiptJson" TEXT NOT NULL DEFAULT '';

CREATE TABLE "PurchaseOutbox" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "intentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'purchase_broadcast',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" DATETIME,
    "lastError" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PurchaseOutbox_intentId_fkey"
      FOREIGN KEY ("intentId") REFERENCES "PurchaseIntent" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PurchaseOutbox_intentId_key"
  ON "PurchaseOutbox"("intentId");

CREATE INDEX "PurchaseOutbox_status_availableAt_idx"
  ON "PurchaseOutbox"("status", "availableAt");
