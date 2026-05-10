-- 性能优化：添加高频查询字段索引
-- 2026-05-09

-- 优惠券按状态筛选 + 有效期范围查询
CREATE INDEX "Coupon_status_idx" ON "Coupon"("status");
CREATE INDEX "Coupon_validStart_validEnd_idx" ON "Coupon"("validStart", "validEnd");

-- 直播间按主播用户查询
CREATE INDEX "LiveRoom_userId_idx" ON "LiveRoom"("userId");

-- Bot 按状态+类型筛选
CREATE INDEX "BotConfig_status_type_idx" ON "BotConfig"("status", "type");

-- 驿站商品/订单按分站查询
CREATE INDEX "StationProduct_stationId_idx" ON "StationProduct"("stationId");
CREATE INDEX "StationOrder_stationId_idx" ON "StationOrder"("stationId");

-- 驿站教师预约按分站和教师查询
CREATE INDEX "StationTeacherBooking_stationId_idx" ON "StationTeacherBooking"("stationId");
CREATE INDEX "StationTeacherBooking_teacherId_idx" ON "StationTeacherBooking"("teacherId");
