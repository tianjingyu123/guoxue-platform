-- 只新增预留流水；正式环境迁移必须在数据库快照、锁影响和两节点版本核验后单独执行。
CREATE TABLE "BotQuotaReservation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "botConfigId" TEXT NOT NULL,
    "charge" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),
    CONSTRAINT "BotQuotaReservation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BotQuotaReservation_status_createdAt_idx" ON "BotQuotaReservation"("status", "createdAt");
CREATE INDEX "BotQuotaReservation_userId_botConfigId_createdAt_idx" ON "BotQuotaReservation"("userId", "botConfigId", "createdAt");
