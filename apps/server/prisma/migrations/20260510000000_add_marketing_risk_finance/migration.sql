-- CreateTable
CREATE TABLE "FlashSale" (
    "id" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "warmupMinutes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashSaleItem" (
    "id" TEXT NOT NULL,
    "flashSaleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "skuId" TEXT,
    "flashPrice" DECIMAL(10,2) NOT NULL,
    "limitCount" INTEGER NOT NULL DEFAULT 1,
    "stock" INTEGER NOT NULL,
    "sold" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FlashSaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupBuy" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "skuId" TEXT,
    "groupPrice" DECIMAL(10,2) NOT NULL,
    "minMembers" INTEGER NOT NULL DEFAULT 2,
    "expireMinutes" INTEGER NOT NULL DEFAULT 1440,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "autoComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupBuy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupBuyParticipant" (
    "id" TEXT NOT NULL,
    "groupBuyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "isLeader" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupBuyParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "faceValue" DECIMAL(10,2) NOT NULL,
    "threshold" DECIMAL(10,2),
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "claimedCount" INTEGER NOT NULL DEFAULT 0,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "validDays" INTEGER NOT NULL DEFAULT 7,
    "scope" JSONB,
    "aiPrecision" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CouponTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponRecord" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNUSED',
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "CouponRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountActivity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discountPct" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "productIds" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingPage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingPageComponent" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "config" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "audience" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingPageComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "pageId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityMetrics" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "pv" INTEGER NOT NULL DEFAULT 0,
    "uv" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "action" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAlert" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT,
    "type" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'WARN',
    "title" TEXT NOT NULL,
    "detail" JSONB,
    "targetType" TEXT,
    "targetId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "handledBy" TEXT,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraudDetection" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "confidence" DECIMAL(3,2) NOT NULL,
    "evidence" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FraudDetection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBehaviorLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "meta" JSONB,
    "ip" TEXT,
    "deviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBehaviorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppealRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppealRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceFingerprint" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "platform" TEXT,
    "userAgent" TEXT,
    "ip" TEXT,
    "isTrusted" BOOLEAN NOT NULL DEFAULT true,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceFingerprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationRecord" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "billDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "matchAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "diffCount" INTEGER NOT NULL DEFAULT 0,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReconciliationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "orderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "taxNo" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invoiceUrl" TEXT,
    "expressNo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "detail" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SettlementOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WithdrawalApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payMethod" TEXT NOT NULL,
    "accountInfo" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "level" INTEGER NOT NULL DEFAULT 1,
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WithdrawalApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialReport" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "generatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageContentConfig" (
    "id" TEXT NOT NULL,
    "pageRoute" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageContentConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteNotice" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteNotice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigVersion" (
    "id" TEXT NOT NULL,
    "configKey" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "changedBy" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfigVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberConfig" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "coinBonus" INTEGER NOT NULL DEFAULT 0,
    "benefits" JSONB,
    "maxBorrowDays" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FlashSale_status_startTime_idx" ON "FlashSale"("status", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "FlashSaleItem_flashSaleId_productId_key" ON "FlashSaleItem"("flashSaleId", "productId");

-- CreateIndex
CREATE INDEX "GroupBuy_status_idx" ON "GroupBuy"("status");

-- CreateIndex
CREATE INDEX "GroupBuyParticipant_groupId_idx" ON "GroupBuyParticipant"("groupId");

-- CreateIndex
CREATE INDEX "GroupBuyParticipant_userId_idx" ON "GroupBuyParticipant"("userId");

-- CreateIndex
CREATE INDEX "CouponTemplate_status_endTime_idx" ON "CouponTemplate"("status", "endTime");

-- CreateIndex
CREATE INDEX "CouponRecord_userId_idx" ON "CouponRecord"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CouponRecord_couponId_userId_status_key" ON "CouponRecord"("couponId", "userId", "status");

-- CreateIndex
CREATE INDEX "DiscountActivity_status_startTime_idx" ON "DiscountActivity"("status", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingPage_route_key" ON "MarketingPage"("route");

-- CreateIndex
CREATE INDEX "MarketingPageComponent_pageId_sortOrder_idx" ON "MarketingPageComponent"("pageId", "sortOrder");

-- CreateIndex
CREATE INDEX "Activity_status_startTime_idx" ON "Activity"("status", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityMetrics_activityId_key" ON "ActivityMetrics"("activityId");

-- CreateIndex
CREATE INDEX "RiskRule_type_enabled_idx" ON "RiskRule"("type", "enabled");

-- CreateIndex
CREATE INDEX "RiskAlert_status_level_createdAt_idx" ON "RiskAlert"("status", "level", "createdAt");

-- CreateIndex
CREATE INDEX "RiskAlert_type_createdAt_idx" ON "RiskAlert"("type", "createdAt");

-- CreateIndex
CREATE INDEX "FraudDetection_status_createdAt_idx" ON "FraudDetection"("status", "createdAt");

-- CreateIndex
CREATE INDEX "FraudDetection_userId_idx" ON "FraudDetection"("userId");

-- CreateIndex
CREATE INDEX "UserBehaviorLog_userId_createdAt_idx" ON "UserBehaviorLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserBehaviorLog_action_createdAt_idx" ON "UserBehaviorLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "UserBehaviorLog_deviceId_idx" ON "UserBehaviorLog"("deviceId");

-- CreateIndex
CREATE INDEX "AppealRecord_userId_status_idx" ON "AppealRecord"("userId", "status");

-- CreateIndex
CREATE INDEX "AppealRecord_status_createdAt_idx" ON "AppealRecord"("status", "createdAt");

-- CreateIndex
CREATE INDEX "DeviceFingerprint_deviceId_idx" ON "DeviceFingerprint"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceFingerprint_userId_deviceId_key" ON "DeviceFingerprint"("userId", "deviceId");

-- CreateIndex
CREATE INDEX "ReconciliationRecord_source_billDate_idx" ON "ReconciliationRecord"("source", "billDate");

-- CreateIndex
CREATE INDEX "ReconciliationRecord_status_idx" ON "ReconciliationRecord"("status");

-- CreateIndex
CREATE INDEX "Invoice_userId_idx" ON "Invoice"("userId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "SettlementOrder_userId_period_idx" ON "SettlementOrder"("userId", "period");

-- CreateIndex
CREATE INDEX "SettlementOrder_status_idx" ON "SettlementOrder"("status");

-- CreateIndex
CREATE INDEX "WithdrawalApplication_userId_status_idx" ON "WithdrawalApplication"("userId", "status");

-- CreateIndex
CREATE INDEX "WithdrawalApplication_status_createdAt_idx" ON "WithdrawalApplication"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialReport_type_period_key" ON "FinancialReport"("type", "period");

-- CreateIndex
CREATE UNIQUE INDEX "PageContentConfig_pageRoute_fieldKey_key" ON "PageContentConfig"("pageRoute", "fieldKey");

-- CreateIndex
CREATE INDEX "SiteNotice_isActive_idx" ON "SiteNotice"("isActive");

-- CreateIndex
CREATE INDEX "ConfigVersion_configKey_version_idx" ON "ConfigVersion"("configKey", "version");

-- CreateIndex
CREATE UNIQUE INDEX "MemberConfig_level_key" ON "MemberConfig"("level");

-- CreateIndex
CREATE INDEX "AiAnalysisRecord_createdAt_idx" ON "AiAnalysisRecord"("createdAt");

-- CreateIndex
CREATE INDEX "Content_status_viewCount_idx" ON "Content"("status", "viewCount");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PaipanRecord_createdAt_idx" ON "PaipanRecord"("createdAt");

-- AddForeignKey
ALTER TABLE "FlashSaleItem" ADD CONSTRAINT "FlashSaleItem_flashSaleId_fkey" FOREIGN KEY ("flashSaleId") REFERENCES "FlashSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupBuyParticipant" ADD CONSTRAINT "GroupBuyParticipant_groupBuyId_fkey" FOREIGN KEY ("groupBuyId") REFERENCES "GroupBuy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRecord" ADD CONSTRAINT "CouponRecord_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "CouponTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingPageComponent" ADD CONSTRAINT "MarketingPageComponent_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "MarketingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityMetrics" ADD CONSTRAINT "ActivityMetrics_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

