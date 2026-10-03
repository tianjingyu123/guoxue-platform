-- 直播送礼消费保护：由用户主动设置单次/日累计限额，提醒默认开启。
CREATE TABLE "LiveGiftSpendingPreference" (
  "userId" TEXT NOT NULL,
  "singleLimitCoin" INTEGER NOT NULL,
  "dailyLimitCoin" INTEGER NOT NULL,
  "reminderEnabled" BOOLEAN NOT NULL DEFAULT true,
  "configuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LiveGiftSpendingPreference_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "LiveGiftSpendingPreference"
  ADD CONSTRAINT "LiveGiftSpendingPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
