-- 添加缺失的外键索引，避免高并发下全表扫描

-- GiftRecord: 按礼物类型统计、按接收主播查询
CREATE INDEX IF NOT EXISTS "GiftRecord_giftId_idx" ON "GiftRecord"("giftId");
CREATE INDEX IF NOT EXISTS "GiftRecord_toUserId_idx" ON "GiftRecord"("toUserId");

-- OfflineCourseRegistration: 查询用户报名记录
CREATE INDEX IF NOT EXISTS "OfflineCourseRegistration_userId_idx" ON "OfflineCourseRegistration"("userId");

-- CircleBot: 按 Bot 配置查圈子绑定
CREATE INDEX IF NOT EXISTS "CircleBot_botConfigId_idx" ON "CircleBot"("botConfigId");

-- LiveProduct: 按直播查商品、按商品查直播
CREATE INDEX IF NOT EXISTS "LiveProduct_liveId_idx" ON "LiveProduct"("liveId");
CREATE INDEX IF NOT EXISTS "LiveProduct_productId_idx" ON "LiveProduct"("productId");

-- FlashSaleItem: 按秒杀活动过滤商品
CREATE INDEX IF NOT EXISTS "FlashSaleItem_flashSaleId_idx" ON "FlashSaleItem"("flashSaleId");

-- GroupBuyParticipant: 按团购查参与者
CREATE INDEX IF NOT EXISTS "GroupBuyParticipant_groupBuyId_idx" ON "GroupBuyParticipant"("groupBuyId");
