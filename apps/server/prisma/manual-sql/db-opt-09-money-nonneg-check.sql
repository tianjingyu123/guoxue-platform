-- 约束完整性加固：资金列防负 CHECK（2026-06-29 数据库优化 · 排期 #1）
-- ============================================================================
-- 目的：防应用层 bug 写入负价格/负余额/负金额（Prisma 不原生生成 CHECK，DB 层兜底）。
-- 方法：MIN/negcnt 探测全库 ~130 个资金列 + 代码核查写入方向，仅对【明确单向】列加 >=0。
-- 幂等：DROP IF EXISTS + ADD，可重跑。加 CHECK 不进 schema、不影响 Prisma 与 schema↔DB 一致性。
--
-- ⚠️ 哨兵/有符号台账排除清单（绝不加 >=0，否则未来一条扣减/冲正记录即触发线上故障）：
--   · 代码证实写负值：
--       VirtualCoinTransaction.amountCoin   (coin.service.ts:138/464、video-creator:708 写 -amountCoin；现有数据已有 -10)
--       CircleRevenueRecord.amount          (circle-refund.service.ts:232 写 -paidAmount 冲正)
--       CommissionRecall.amount             (circle-refund.service.ts:238 写 -ownerRecalled 佣金召回)
--       TenantUsageRecord.changeAmount      (tenant.service.ts:262 写 -quotaUsed)
--   · 流水变动量（type 字段区分收/支方向，amount 语义有符号）：
--       PointsRecord.amount、GrowthRecord.amount、UserBalanceTransaction.amount
--   · 流水余额快照（跟随流水，非主账户余额，不作校验点）：
--       *.balanceAfter / *.balanceBefore（VirtualCoinTransaction / UserBalanceTransaction / CommissionRecall / AudioCallBilling）
--   · 收益/营收/结算/分红台账（同 CircleRevenueRecord，存在退款冲正负值风险，保守跳过）：
--       *Earning.amount、*Revenue.amount、InstituteDividend.amount、Station/Operator.totalEarning、
--       StationOrder.stationIncome、StationSettlement.totalIncome、PlatformFeeRecord.*、HuifuSettlement/HuifuSplitRecord.*、
--       ReconciliationRecord.*、SettlementOrder.amount、merchant_settlements.*、UserEarning.*、ActivityMetrics.revenue
--   · 成本统计/非资金误匹配：AiAnalysisRecord.cost、FortuneRecord.aiCost、TenantApiCall.cost、AiCollaboration.feedbackRating
-- 数据基线（探测时点）：上述纳入列现存数据 0 负值，CHECK 可直接建立。
-- ============================================================================

-- ===== 主账户余额（核心防负） =====
ALTER TABLE "UserWallet" DROP CONSTRAINT IF EXISTS "chk_userwallet_balance_nonneg";
ALTER TABLE "UserWallet" ADD CONSTRAINT "chk_userwallet_balance_nonneg" CHECK (balance >= 0);
ALTER TABLE "UserPoints" DROP CONSTRAINT IF EXISTS "chk_userpoints_balance_nonneg";
ALTER TABLE "UserPoints" ADD CONSTRAINT "chk_userpoints_balance_nonneg" CHECK (balance >= 0);
ALTER TABLE "VirtualCoinAccount" DROP CONSTRAINT IF EXISTS "chk_virtualcoinaccount_balance_nonneg";
ALTER TABLE "VirtualCoinAccount" ADD CONSTRAINT "chk_virtualcoinaccount_balance_nonneg" CHECK (balance >= 0);

-- ===== 价格 / 单价 =====
ALTER TABLE "BotConfig" DROP CONSTRAINT IF EXISTS "chk_botconfig_price_nonneg";
ALTER TABLE "BotConfig" ADD CONSTRAINT "chk_botconfig_price_nonneg" CHECK (price >= 0 AND ("monthlyPrice" IS NULL OR "monthlyPrice" >= 0));
ALTER TABLE "Circle" DROP CONSTRAINT IF EXISTS "chk_circle_price_nonneg";
ALTER TABLE "Circle" ADD CONSTRAINT "chk_circle_price_nonneg" CHECK (price >= 0 AND ("originalPrice" IS NULL OR "originalPrice" >= 0) AND "depositAmount" >= 0);
ALTER TABLE "Course" DROP CONSTRAINT IF EXISTS "chk_course_price_nonneg";
ALTER TABLE "Course" ADD CONSTRAINT "chk_course_price_nonneg" CHECK (price >= 0 AND ("originalPrice" IS NULL OR "originalPrice" >= 0));
ALTER TABLE "CourseBundle" DROP CONSTRAINT IF EXISTS "chk_coursebundle_price_nonneg";
ALTER TABLE "CourseBundle" ADD CONSTRAINT "chk_coursebundle_price_nonneg" CHECK (("sellPrice" IS NULL OR "sellPrice" >= 0) AND ("originalPrice" IS NULL OR "originalPrice" >= 0));
ALTER TABLE "Ebook" DROP CONSTRAINT IF EXISTS "chk_ebook_price_nonneg";
ALTER TABLE "Ebook" ADD CONSTRAINT "chk_ebook_price_nonneg" CHECK (price >= 0 AND ("originalPrice" IS NULL OR "originalPrice" >= 0));
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "chk_product_price_nonneg";
ALTER TABLE "Product" ADD CONSTRAINT "chk_product_price_nonneg" CHECK (price >= 0 AND ("originalPrice" IS NULL OR "originalPrice" >= 0));
ALTER TABLE "ProductSku" DROP CONSTRAINT IF EXISTS "chk_productsku_price_nonneg";
ALTER TABLE "ProductSku" ADD CONSTRAINT "chk_productsku_price_nonneg" CHECK (price >= 0);
ALTER TABLE "StationProduct" DROP CONSTRAINT IF EXISTS "chk_stationproduct_price_nonneg";
ALTER TABLE "StationProduct" ADD CONSTRAINT "chk_stationproduct_price_nonneg" CHECK (price >= 0);
ALTER TABLE "OfflineCourse" DROP CONSTRAINT IF EXISTS "chk_offlinecourse_price_nonneg";
ALTER TABLE "OfflineCourse" ADD CONSTRAINT "chk_offlinecourse_price_nonneg" CHECK (price >= 0);
ALTER TABLE "InstituteContent" DROP CONSTRAINT IF EXISTS "chk_institutecontent_price_nonneg";
ALTER TABLE "InstituteContent" ADD CONSTRAINT "chk_institutecontent_price_nonneg" CHECK (price >= 0);
ALTER TABLE "InstituteCourse" DROP CONSTRAINT IF EXISTS "chk_institutecourse_price_nonneg";
ALTER TABLE "InstituteCourse" ADD CONSTRAINT "chk_institutecourse_price_nonneg" CHECK (price >= 0);
ALTER TABLE "MemberConfig" DROP CONSTRAINT IF EXISTS "chk_memberconfig_price_nonneg";
ALTER TABLE "MemberConfig" ADD CONSTRAINT "chk_memberconfig_price_nonneg" CHECK (price >= 0 AND "coinBonus" >= 0);
ALTER TABLE "FlashSaleItem" DROP CONSTRAINT IF EXISTS "chk_flashsaleitem_price_nonneg";
ALTER TABLE "FlashSaleItem" ADD CONSTRAINT "chk_flashsaleitem_price_nonneg" CHECK ("flashPrice" >= 0);
ALTER TABLE "LiveFlashSale" DROP CONSTRAINT IF EXISTS "chk_liveflashsale_price_nonneg";
ALTER TABLE "LiveFlashSale" ADD CONSTRAINT "chk_liveflashsale_price_nonneg" CHECK ("flashPrice" >= 0);
ALTER TABLE "GroupBuy" DROP CONSTRAINT IF EXISTS "chk_groupbuy_price_nonneg";
ALTER TABLE "GroupBuy" ADD CONSTRAINT "chk_groupbuy_price_nonneg" CHECK ("groupPrice" >= 0);
ALTER TABLE "LiveRoom" DROP CONSTRAINT IF EXISTS "chk_liveroom_price_nonneg";
ALTER TABLE "LiveRoom" ADD CONSTRAINT "chk_liveroom_price_nonneg" CHECK ("chargePrice" IS NULL OR "chargePrice" >= 0);
ALTER TABLE "CompetitionArticle" DROP CONSTRAINT IF EXISTS "chk_competitionarticle_price_nonneg";
ALTER TABLE "CompetitionArticle" ADD CONSTRAINT "chk_competitionarticle_price_nonneg" CHECK ("unlockPrice" >= 0);
ALTER TABLE "PricingRule" DROP CONSTRAINT IF EXISTS "chk_pricingrule_price_nonneg";
ALTER TABLE "PricingRule" ADD CONSTRAINT "chk_pricingrule_price_nonneg" CHECK (("basePrice" IS NULL OR "basePrice" >= 0) AND ("minPrice" IS NULL OR "minPrice" >= 0) AND ("maxPrice" IS NULL OR "maxPrice" >= 0));
ALTER TABLE "AiCapability" DROP CONSTRAINT IF EXISTS "chk_aicapability_price_nonneg";
ALTER TABLE "AiCapability" ADD CONSTRAINT "chk_aicapability_price_nonneg" CHECK ("costPerCall" >= 0);
ALTER TABLE "StationTeacherBooking" DROP CONSTRAINT IF EXISTS "chk_stationteacherbooking_price_nonneg";
ALTER TABLE "StationTeacherBooking" ADD CONSTRAINT "chk_stationteacherbooking_price_nonneg" CHECK (price >= 0);
ALTER TABLE "Gift" DROP CONSTRAINT IF EXISTS "chk_gift_price_nonneg";
ALTER TABLE "Gift" ADD CONSTRAINT "chk_gift_price_nonneg" CHECK ("priceCoin" >= 0);
ALTER TABLE "PaidQuestion" DROP CONSTRAINT IF EXISTS "chk_paidquestion_price_nonneg";
ALTER TABLE "PaidQuestion" ADD CONSTRAINT "chk_paidquestion_price_nonneg" CHECK ("priceCoin" >= 0 AND "peekPriceCoin" >= 0);
ALTER TABLE "ConsultCall" DROP CONSTRAINT IF EXISTS "chk_consultcall_amount_nonneg";
ALTER TABLE "ConsultCall" ADD CONSTRAINT "chk_consultcall_amount_nonneg" CHECK ("pricePerMinute" >= 0 AND "prepaidCoin" >= 0 AND "settledCoin" >= 0 AND "refundedCoin" >= 0);
ALTER TABLE "AudioCallRecord" DROP CONSTRAINT IF EXISTS "chk_audiocallrecord_amount_nonneg";
ALTER TABLE "AudioCallRecord" ADD CONSTRAINT "chk_audiocallrecord_amount_nonneg" CHECK ("pricePerMinuteCoin" >= 0 AND "totalCoin" >= 0);
ALTER TABLE "CircleMember" DROP CONSTRAINT IF EXISTS "chk_circlemember_price_nonneg";
ALTER TABLE "CircleMember" ADD CONSTRAINT "chk_circlemember_price_nonneg" CHECK ("callPricePerMinuteCoin" >= 0 AND "questionPriceCoin" >= 0);
ALTER TABLE "BountyQuestion" DROP CONSTRAINT IF EXISTS "chk_bountyquestion_coin_nonneg";
ALTER TABLE "BountyQuestion" ADD CONSTRAINT "chk_bountyquestion_coin_nonneg" CHECK ("bountyCoin" >= 0);

-- ===== 押金 / 保证金 =====
ALTER TABLE "Merchant" DROP CONSTRAINT IF EXISTS "chk_merchant_deposit_nonneg";
ALTER TABLE "Merchant" ADD CONSTRAINT "chk_merchant_deposit_nonneg" CHECK (("depositAmount" IS NULL OR "depositAmount" >= 0) AND ("commissionRate" IS NULL OR "commissionRate" >= 0));
ALTER TABLE "StationOffline" DROP CONSTRAINT IF EXISTS "chk_stationoffline_deposit_nonneg";
ALTER TABLE "StationOffline" ADD CONSTRAINT "chk_stationoffline_deposit_nonneg" CHECK ("depositAmount" >= 0);
ALTER TABLE "InstituteMember" DROP CONSTRAINT IF EXISTS "chk_institutemember_deposit_nonneg";
ALTER TABLE "InstituteMember" ADD CONSTRAINT "chk_institutemember_deposit_nonneg" CHECK (deposit >= 0);

-- ===== 费率 / 费用配置 =====
ALTER TABLE "Competition" DROP CONSTRAINT IF EXISTS "chk_competition_fee_nonneg";
ALTER TABLE "Competition" ADD CONSTRAINT "chk_competition_fee_nonneg" CHECK ("entryFee" >= 0);
ALTER TABLE "FreightTemplate" DROP CONSTRAINT IF EXISTS "chk_freighttemplate_fee_nonneg";
ALTER TABLE "FreightTemplate" ADD CONSTRAINT "chk_freighttemplate_fee_nonneg" CHECK ("defaultFee" >= 0);
ALTER TABLE "TemporaryReferralConfig" DROP CONSTRAINT IF EXISTS "chk_tempreferral_rate_nonneg";
ALTER TABLE "TemporaryReferralConfig" ADD CONSTRAINT "chk_tempreferral_rate_nonneg" CHECK ("commissionRate" >= 0);
ALTER TABLE "Coupon" DROP CONSTRAINT IF EXISTS "chk_coupon_amount_nonneg";
ALTER TABLE "Coupon" ADD CONSTRAINT "chk_coupon_amount_nonneg" CHECK (("minAmount" IS NULL OR "minAmount" >= 0) AND ("discountAmount" IS NULL OR "discountAmount" >= 0));
ALTER TABLE "StationTeacherRequest" DROP CONSTRAINT IF EXISTS "chk_stationteacherrequest_fee_nonneg";
ALTER TABLE "StationTeacherRequest" ADD CONSTRAINT "chk_stationteacherrequest_fee_nonneg" CHECK ("proposedFee" IS NULL OR "proposedFee" >= 0);

-- ===== 用户付款 / 购买 / 充值金额 =====
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "chk_order_amount_nonneg";
ALTER TABLE "Order" ADD CONSTRAINT "chk_order_amount_nonneg" CHECK (amount >= 0 AND ("payAmount" IS NULL OR "payAmount" >= 0) AND ("originalAmount" IS NULL OR "originalAmount" >= 0) AND ("frozenAmount" IS NULL OR "frozenAmount" >= 0));
ALTER TABLE "StationOrder" DROP CONSTRAINT IF EXISTS "chk_stationorder_amount_nonneg";
ALTER TABLE "StationOrder" ADD CONSTRAINT "chk_stationorder_amount_nonneg" CHECK (amount >= 0);
ALTER TABLE "EbookPurchase" DROP CONSTRAINT IF EXISTS "chk_ebookpurchase_amount_nonneg";
ALTER TABLE "EbookPurchase" ADD CONSTRAINT "chk_ebookpurchase_amount_nonneg" CHECK (amount >= 0);
ALTER TABLE "MemberPurchase" DROP CONSTRAINT IF EXISTS "chk_memberpurchase_amount_nonneg";
ALTER TABLE "MemberPurchase" ADD CONSTRAINT "chk_memberpurchase_amount_nonneg" CHECK (amount >= 0);
ALTER TABLE "RenewalRecord" DROP CONSTRAINT IF EXISTS "chk_renewalrecord_amount_nonneg";
ALTER TABLE "RenewalRecord" ADD CONSTRAINT "chk_renewalrecord_amount_nonneg" CHECK (amount >= 0);
ALTER TABLE "ToolPayRecord" DROP CONSTRAINT IF EXISTS "chk_toolpayrecord_amount_nonneg";
ALTER TABLE "ToolPayRecord" ADD CONSTRAINT "chk_toolpayrecord_amount_nonneg" CHECK (amount >= 0);
ALTER TABLE "InstituteContentPurchase" DROP CONSTRAINT IF EXISTS "chk_institutecontentpurchase_price_nonneg";
ALTER TABLE "InstituteContentPurchase" ADD CONSTRAINT "chk_institutecontentpurchase_price_nonneg" CHECK (price >= 0);
ALTER TABLE "VirtualCoinRecharge" DROP CONSTRAINT IF EXISTS "chk_virtualcoinrecharge_amount_nonneg";
ALTER TABLE "VirtualCoinRecharge" ADD CONSTRAINT "chk_virtualcoinrecharge_amount_nonneg" CHECK ("amountCoin" >= 0 AND "amountRmb" >= 0);
ALTER TABLE "MerchantDepositRecord" DROP CONSTRAINT IF EXISTS "chk_merchantdepositrecord_amount_nonneg";
ALTER TABLE "MerchantDepositRecord" ADD CONSTRAINT "chk_merchantdepositrecord_amount_nonneg" CHECK (amount >= 0);
ALTER TABLE "CompetitionRegistration" DROP CONSTRAINT IF EXISTS "chk_competitionregistration_fee_nonneg";
ALTER TABLE "CompetitionRegistration" ADD CONSTRAINT "chk_competitionregistration_fee_nonneg" CHECK ("paidFee" >= 0);
ALTER TABLE "GiftRecord" DROP CONSTRAINT IF EXISTS "chk_giftrecord_coin_nonneg";
ALTER TABLE "GiftRecord" ADD CONSTRAINT "chk_giftrecord_coin_nonneg" CHECK ("totalCoin" >= 0);
ALTER TABLE "AudioCallBilling" DROP CONSTRAINT IF EXISTS "chk_audiocallbilling_deducted_nonneg";
ALTER TABLE "AudioCallBilling" ADD CONSTRAINT "chk_audiocallbilling_deducted_nonneg" CHECK ("coinDeducted" >= 0);
ALTER TABLE "LiveMinuteData" DROP CONSTRAINT IF EXISTS "chk_liveminutedata_gift_nonneg";
ALTER TABLE "LiveMinuteData" ADD CONSTRAINT "chk_liveminutedata_gift_nonneg" CHECK ("giftAmount" >= 0);
ALTER TABLE "AfterSale" DROP CONSTRAINT IF EXISTS "chk_aftersale_amount_nonneg";
ALTER TABLE "AfterSale" ADD CONSTRAINT "chk_aftersale_amount_nonneg" CHECK (amount IS NULL OR amount >= 0);
ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "chk_invoice_amount_nonneg";
ALTER TABLE "Invoice" ADD CONSTRAINT "chk_invoice_amount_nonneg" CHECK (amount >= 0);
ALTER TABLE "CompetitionInvitation" DROP CONSTRAINT IF EXISTS "chk_competitioninvitation_reward_nonneg";
ALTER TABLE "CompetitionInvitation" ADD CONSTRAINT "chk_competitioninvitation_reward_nonneg" CHECK ("rewardAmount" >= 0);
ALTER TABLE "CircleRefundRequest" DROP CONSTRAINT IF EXISTS "chk_circlerefundrequest_amount_nonneg";
ALTER TABLE "CircleRefundRequest" ADD CONSTRAINT "chk_circlerefundrequest_amount_nonneg" CHECK ("actualRefund" >= 0 AND "dailyCost" >= 0 AND "feeAmount" >= 0 AND "feeRate" >= 0 AND "paidAmount" >= 0 AND "refundBase" >= 0);

-- ===== 提现 / 冻结金额 =====
ALTER TABLE "Withdrawal" DROP CONSTRAINT IF EXISTS "chk_withdrawal_amount_nonneg";
ALTER TABLE "Withdrawal" ADD CONSTRAINT "chk_withdrawal_amount_nonneg" CHECK (amount >= 0);
ALTER TABLE "WithdrawalApplication" DROP CONSTRAINT IF EXISTS "chk_withdrawalapplication_amount_nonneg";
ALTER TABLE "WithdrawalApplication" ADD CONSTRAINT "chk_withdrawalapplication_amount_nonneg" CHECK (amount >= 0);
ALTER TABLE "VideoCreatorWithdrawal" DROP CONSTRAINT IF EXISTS "chk_videocreatorwithdrawal_amount_nonneg";
ALTER TABLE "VideoCreatorWithdrawal" ADD CONSTRAINT "chk_videocreatorwithdrawal_amount_nonneg" CHECK ("amountCoin" >= 0);
ALTER TABLE "VirtualCoinFrozen" DROP CONSTRAINT IF EXISTS "chk_virtualcoinfrozen_amount_nonneg";
ALTER TABLE "VirtualCoinFrozen" ADD CONSTRAINT "chk_virtualcoinfrozen_amount_nonneg" CHECK ("amountCoin" >= 0);
