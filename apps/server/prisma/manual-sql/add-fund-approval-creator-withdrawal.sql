-- 波3 业务大件建表（2026-06-29）：资金审批流 + 创作者真提现审批流
-- 资金审批通用表（model FundApproval @@map fund_approval）
CREATE TABLE IF NOT EXISTS "fund_approval" (
  "id"          TEXT PRIMARY KEY,
  "type"        TEXT NOT NULL,
  "payload"     JSONB NOT NULL,
  "amount"      DECIMAL(12,2),
  "summary"     TEXT NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'PENDING',
  "requestedBy" TEXT NOT NULL,
  "reviewedBy"  TEXT,
  "reviewNote"  TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "fund_approval_status_createdAt_idx" ON "fund_approval"("status", "createdAt");

-- 创作者提现申请表（model VideoCreatorWithdrawal）
CREATE TABLE IF NOT EXISTS "VideoCreatorWithdrawal" (
  "id"          TEXT PRIMARY KEY,
  "userId"      TEXT NOT NULL,
  "amountCoin"  INTEGER NOT NULL,
  "method"      VARCHAR(50) NOT NULL,
  "account"     VARCHAR(255) NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'PENDING',
  "reviewNote"  TEXT,
  "reviewedBy"  TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "VideoCreatorWithdrawal_userId_createdAt_idx" ON "VideoCreatorWithdrawal"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "VideoCreatorWithdrawal_status_createdAt_idx" ON "VideoCreatorWithdrawal"("status", "createdAt");
