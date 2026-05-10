-- ── Enums ──
CREATE TYPE "CoinTransType" AS ENUM ('RECHARGE', 'SPEND', 'REFUND', 'GRANT');
CREATE TYPE "CoinScene" AS ENUM ('RECHARGE', 'CIRCLE_JOIN', 'PAID_QUESTION', 'PEEK_ANSWER', 'AUDIO_CALL', 'LIVE_GIFT', 'BOT_CALL', 'REFUND', 'PLATFORM_GRANT');
CREATE TYPE "EarningScene" AS ENUM ('QUESTION', 'PEEK', 'AUDIO_CALL', 'LIVE_GIFT');

-- ── 商品评价 ──
CREATE TABLE "ProductReview" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "rating" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

-- ── 物流追踪 ──
CREATE TABLE "OrderLogistics" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "company" TEXT,
    "logisticsNo" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "province" TEXT,
    "city" TEXT,
    "district" TEXT,
    "address" TEXT,
    "zipCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "trackingData" JSONB,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderLogistics_pkey" PRIMARY KEY ("id")
);

-- ── 智能体对话日志 ──
CREATE TABLE "BotChatLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "botConfigId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "conversationId" TEXT,
    "chatId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotChatLog_pkey" PRIMARY KEY ("id")
);

-- ── 审计日志 ──
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "detail" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- ── 分佣配置 ──
CREATE TABLE "CommissionConfig" (
    "id" TEXT NOT NULL,
    "configKey" TEXT NOT NULL,
    "configName" TEXT NOT NULL,
    "rateA" DECIMAL(10,4) NOT NULL,
    "rateB" DECIMAL(10,4) NOT NULL,
    "rateC" DECIMAL(10,4),
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionConfig_pkey" PRIMARY KEY ("id")
);

-- ── 提现 ──
CREATE TABLE "Withdrawal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stationId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "bankHolder" TEXT,
    "alipayAccount" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "remark" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

-- ── 推荐链接 ──
CREATE TABLE "ReferralLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'DIRECT',
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralLink_pkey" PRIMARY KEY ("id")
);

-- ── 虚拟币账户 ──
CREATE TABLE "VirtualCoinAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "totalRecharged" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VirtualCoinAccount_pkey" PRIMARY KEY ("id")
);

-- ── 虚拟币流水 ──
CREATE TABLE "VirtualCoinTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CoinTransType" NOT NULL,
    "amountCoin" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "scene" "CoinScene" NOT NULL,
    "refId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VirtualCoinTransaction_pkey" PRIMARY KEY ("id")
);

-- ── 虚拟币充值 ──
CREATE TABLE "VirtualCoinRecharge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountRmb" DECIMAL(10,2) NOT NULL,
    "amountCoin" INTEGER NOT NULL,
    "payMethod" TEXT NOT NULL DEFAULT 'WECHAT',
    "orderNo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VirtualCoinRecharge_pkey" PRIMARY KEY ("id")
);

-- ── 付费问答 ──
CREATE TABLE "PaidQuestion" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "askerId" TEXT NOT NULL,
    "answererId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "answer" TEXT,
    "priceCoin" INTEGER NOT NULL,
    "peekPriceCoin" INTEGER NOT NULL DEFAULT 0,
    "peekCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaidQuestion_pkey" PRIMARY KEY ("id")
);

-- ── 音频连麦 ──
CREATE TABLE "AudioCallRecord" (
    "id" TEXT NOT NULL,
    "callerId" TEXT NOT NULL,
    "calleeId" TEXT NOT NULL,
    "circleId" TEXT,
    "pricePerMinuteCoin" INTEGER NOT NULL,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "totalCoin" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "roomId" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AudioCallRecord_pkey" PRIMARY KEY ("id")
);

-- ── 直播礼物 ──
CREATE TABLE "Gift" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "priceCoin" INTEGER NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'BASIC',
    "effectUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gift_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GiftRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "liveRoomId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "giftId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalCoin" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftRecord_pkey" PRIMARY KEY ("id")
);

-- ── 收益分账 ──
CREATE TABLE "UserEarning" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scene" "EarningScene" NOT NULL,
    "refId" TEXT NOT NULL,
    "amountCoin" INTEGER NOT NULL,
    "amountRmb" DECIMAL(10,2) NOT NULL,
    "rate" DECIMAL(5,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserEarning_pkey" PRIMARY KEY ("id")
);

-- ── 已有表补字段 ──
ALTER TABLE "Coupon" ADD COLUMN "name" TEXT,
    ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN "discountAmount" DECIMAL(10,2),
    ADD COLUMN "discountRate" DECIMAL(5,4);

ALTER TABLE "Station" ADD COLUMN "logo" TEXT,
    ADD COLUMN "themeColor" TEXT NOT NULL DEFAULT '#8B4513';

-- ── 已有表补索引 ──
CREATE INDEX "CircleMember_userId_idx" ON "CircleMember"("userId");
CREATE INDEX "Like_userId_createdAt_idx" ON "Like"("userId", "createdAt");
CREATE INDEX "Collect_targetType_targetId_idx" ON "Collect"("targetType", "targetId");
CREATE INDEX "Article_userId_createdAt_idx" ON "Article"("userId", "createdAt");

-- ── 新表索引 ──
CREATE INDEX "ProductReview_productId_createdAt_idx" ON "ProductReview"("productId", "createdAt");
CREATE INDEX "ProductReview_userId_idx" ON "ProductReview"("userId");

CREATE UNIQUE INDEX "OrderLogistics_orderId_key" ON "OrderLogistics"("orderId");

CREATE INDEX "BotChatLog_userId_idx" ON "BotChatLog"("userId");
CREATE INDEX "BotChatLog_botConfigId_idx" ON "BotChatLog"("botConfigId");
CREATE INDEX "BotChatLog_conversationId_idx" ON "BotChatLog"("conversationId");
CREATE INDEX "BotChatLog_createdAt_idx" ON "BotChatLog"("createdAt");

CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

CREATE UNIQUE INDEX "CommissionConfig_configKey_key" ON "CommissionConfig"("configKey");

CREATE INDEX "Withdrawal_userId_idx" ON "Withdrawal"("userId");
CREATE INDEX "Withdrawal_status_idx" ON "Withdrawal"("status");
CREATE INDEX "Withdrawal_stationId_idx" ON "Withdrawal"("stationId");

CREATE UNIQUE INDEX "ReferralLink_code_key" ON "ReferralLink"("code");
CREATE INDEX "ReferralLink_userId_createdAt_idx" ON "ReferralLink"("userId", "createdAt");
CREATE INDEX "ReferralLink_code_idx" ON "ReferralLink"("code");

CREATE UNIQUE INDEX "VirtualCoinAccount_userId_key" ON "VirtualCoinAccount"("userId");
CREATE INDEX "VirtualCoinAccount_userId_idx" ON "VirtualCoinAccount"("userId");

CREATE INDEX "VirtualCoinTransaction_userId_createdAt_idx" ON "VirtualCoinTransaction"("userId", "createdAt");
CREATE INDEX "VirtualCoinTransaction_refId_idx" ON "VirtualCoinTransaction"("refId");

CREATE INDEX "VirtualCoinRecharge_userId_createdAt_idx" ON "VirtualCoinRecharge"("userId", "createdAt");
CREATE UNIQUE INDEX "VirtualCoinRecharge_orderNo_key" ON "VirtualCoinRecharge"("orderNo");

CREATE INDEX "PaidQuestion_circleId_status_idx" ON "PaidQuestion"("circleId", "status");
CREATE INDEX "PaidQuestion_askerId_idx" ON "PaidQuestion"("askerId");
CREATE INDEX "PaidQuestion_answererId_idx" ON "PaidQuestion"("answererId");

CREATE INDEX "AudioCallRecord_callerId_createdAt_idx" ON "AudioCallRecord"("callerId", "createdAt");
CREATE INDEX "AudioCallRecord_calleeId_idx" ON "AudioCallRecord"("calleeId");

CREATE INDEX "GiftRecord_liveRoomId_createdAt_idx" ON "GiftRecord"("liveRoomId", "createdAt");
CREATE INDEX "GiftRecord_userId_idx" ON "GiftRecord"("userId");

CREATE INDEX "UserEarning_userId_createdAt_idx" ON "UserEarning"("userId", "createdAt");
CREATE INDEX "UserEarning_refId_idx" ON "UserEarning"("refId");

-- ── 新表外键 ──
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReferralLink" ADD CONSTRAINT "ReferralLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VirtualCoinAccount" ADD CONSTRAINT "VirtualCoinAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VirtualCoinTransaction" ADD CONSTRAINT "VirtualCoinTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VirtualCoinRecharge" ADD CONSTRAINT "VirtualCoinRecharge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaidQuestion" ADD CONSTRAINT "PaidQuestion_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaidQuestion" ADD CONSTRAINT "PaidQuestion_askerId_fkey" FOREIGN KEY ("askerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaidQuestion" ADD CONSTRAINT "PaidQuestion_answererId_fkey" FOREIGN KEY ("answererId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AudioCallRecord" ADD CONSTRAINT "AudioCallRecord_callerId_fkey" FOREIGN KEY ("callerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AudioCallRecord" ADD CONSTRAINT "AudioCallRecord_calleeId_fkey" FOREIGN KEY ("calleeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GiftRecord" ADD CONSTRAINT "GiftRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GiftRecord" ADD CONSTRAINT "GiftRecord_liveRoomId_fkey" FOREIGN KEY ("liveRoomId") REFERENCES "LiveRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GiftRecord" ADD CONSTRAINT "GiftRecord_giftId_fkey" FOREIGN KEY ("giftId") REFERENCES "Gift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
