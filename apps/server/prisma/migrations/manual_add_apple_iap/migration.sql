-- Apple 消耗型内购账本、通知幂等与退款冲正类型。
ALTER TYPE "CoinTransType"
  ADD VALUE IF NOT EXISTS 'CHARGEBACK';

ALTER TYPE "CoinScene"
  ADD VALUE IF NOT EXISTS 'APPLE_IAP_CHARGEBACK';

DO $$ BEGIN
  CREATE TYPE "AppleIapPurchaseStatus" AS ENUM ('VERIFIED', 'REFUNDED', 'REVOKED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "AppleIapPurchase" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "originalTransactionId" TEXT,
  "environment" TEXT NOT NULL,
  "amountCoin" INTEGER NOT NULL,
  "referenceRmb" DECIMAL(10,2) NOT NULL,
  "currency" TEXT,
  "priceMilliunits" INTEGER,
  "storefront" TEXT,
  "receiptHash" TEXT,
  "appAccountToken" TEXT,
  "status" "AppleIapPurchaseStatus" NOT NULL DEFAULT 'VERIFIED',
  "purchasedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "refundedAt" TIMESTAMP(3),
  "revocationReason" INTEGER,
  "signedTransactionInfo" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AppleIapPurchase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AppleIapPurchase_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "AppleIapPurchase_transactionId_key"
  ON "AppleIapPurchase"("transactionId");
CREATE INDEX IF NOT EXISTS "AppleIapPurchase_userId_createdAt_idx"
  ON "AppleIapPurchase"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "AppleIapPurchase_originalTransactionId_idx"
  ON "AppleIapPurchase"("originalTransactionId");
CREATE INDEX IF NOT EXISTS "AppleIapPurchase_status_createdAt_idx"
  ON "AppleIapPurchase"("status", "createdAt");

CREATE TABLE IF NOT EXISTS "AppleIapNotification" (
  "id" TEXT NOT NULL,
  "notificationUuid" TEXT NOT NULL,
  "notificationType" TEXT NOT NULL,
  "subtype" TEXT,
  "environment" TEXT,
  "transactionId" TEXT,
  "payloadHash" TEXT NOT NULL,
  "result" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppleIapNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AppleIapNotification_notificationUuid_key"
  ON "AppleIapNotification"("notificationUuid");
CREATE UNIQUE INDEX IF NOT EXISTS "AppleIapNotification_payloadHash_key"
  ON "AppleIapNotification"("payloadHash");
CREATE INDEX IF NOT EXISTS "AppleIapNotification_transactionId_idx"
  ON "AppleIapNotification"("transactionId");
CREATE INDEX IF NOT EXISTS "AppleIapNotification_notificationType_createdAt_idx"
  ON "AppleIapNotification"("notificationType", "createdAt");
