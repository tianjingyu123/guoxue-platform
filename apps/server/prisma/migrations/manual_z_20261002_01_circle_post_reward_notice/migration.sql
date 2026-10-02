-- 只保存本版本新打赏的提交事实；不回填历史流水、不执行资金补偿。
CREATE TABLE "CirclePostRewardNotice" (
  "debitId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "circleId" TEXT NOT NULL,
  "message" VARCHAR(200),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CirclePostRewardNotice_pkey" PRIMARY KEY ("debitId"),
  CONSTRAINT "CirclePostRewardNotice_debitId_fkey" FOREIGN KEY ("debitId")
    REFERENCES "VirtualCoinTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CirclePostRewardNotice_createdAt_debitId_idx"
  ON "CirclePostRewardNotice"("createdAt", "debitId");
