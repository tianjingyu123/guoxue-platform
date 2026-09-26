-- 只新增购包请求幂等流水；需与对应服务端版本一同发布，正式库迁移另行审批。
CREATE TABLE "BotQuotaPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "botConfigId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "amountCoin" INTEGER NOT NULL,
    "purchased" INTEGER NOT NULL DEFAULT 10,
    "paidRemainingAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BotQuotaPurchase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BotQuotaPurchase_userId_botConfigId_requestId_key" ON "BotQuotaPurchase"("userId", "botConfigId", "requestId");
CREATE INDEX "BotQuotaPurchase_userId_createdAt_idx" ON "BotQuotaPurchase"("userId", "createdAt");
