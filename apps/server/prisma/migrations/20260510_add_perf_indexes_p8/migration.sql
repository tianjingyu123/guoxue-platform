-- P7-5 性能审计：添加高频查询缺失索引
-- 2026-05-10

-- LiveRoom: 待播列表查询（status + startTime 排序）
CREATE INDEX "LiveRoom_status_startTime_idx" ON "LiveRoom"("status", "startTime");

-- Video: 视频列表查询（status + createdAt 排序/分页）
CREATE INDEX "Video_status_createdAt_idx" ON "Video"("status", "createdAt");

-- Product: 商品列表查询（status + createdAt 排序/分页）
CREATE INDEX "Product_status_createdAt_idx" ON "Product"("status", "createdAt");

-- Product: 圈子商品查询
CREATE INDEX "Product_circleId_idx" ON "Product"("circleId");

-- Order: 购买状态检查（高频：每次访问/购买都查）
CREATE INDEX "Order_userId_type_targetId_status_idx" ON "Order"("userId", "type", "targetId", "status");

-- Order: 删除冗余单列 status 索引（已被复合索引 [status, createdAt] 覆盖）
DROP INDEX "Order_status_idx";
