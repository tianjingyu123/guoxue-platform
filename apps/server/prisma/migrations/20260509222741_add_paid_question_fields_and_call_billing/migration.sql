-- PaidQuestion: 新增字段
ALTER TABLE "PaidQuestion" ADD COLUMN "questionTitle" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PaidQuestion" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "PaidQuestion" ADD COLUMN "timeoutHours" INTEGER NOT NULL DEFAULT 72;
ALTER TABLE "PaidQuestion" ADD COLUMN "answerAudioUrl" TEXT;

-- CircleMember: 新增达人配置字段
ALTER TABLE "CircleMember" ADD COLUMN "questionPriceCoin" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CircleMember" ADD COLUMN "questionTimeoutHours" INTEGER NOT NULL DEFAULT 72;
ALTER TABLE "CircleMember" ADD COLUMN "callPricePerMinuteCoin" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CircleMember" ADD COLUMN "callAvailableHours" JSONB;

-- AudioCallBilling: 新建扣费明细表
CREATE TABLE "AudioCallBilling" (
    "id" TEXT NOT NULL,
    "callRecordId" TEXT NOT NULL,
    "billingMinute" INTEGER NOT NULL,
    "coinDeducted" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AudioCallBilling_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AudioCallBilling_callRecordId_idx" ON "AudioCallBilling"("callRecordId");

ALTER TABLE "AudioCallBilling" ADD CONSTRAINT "AudioCallBilling_callRecordId_fkey" FOREIGN KEY ("callRecordId") REFERENCES "AudioCallRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AudioCallRecord: 新增状态索引
CREATE INDEX "AudioCallRecord_status_idx" ON "AudioCallRecord"("status");
