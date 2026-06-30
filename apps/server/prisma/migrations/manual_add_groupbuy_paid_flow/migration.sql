-- 付费拼团状态机：拼团订单关联团ID、参与者关联订单
-- Order.groupId: promotionType=GROUP_BUY 时标识具体拼团组（支付成功后据此创建参与者）
-- GroupBuyParticipant.orderId: 关联的拼团订单（支付成功后创建，故参与者恒为已付）
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "groupId" TEXT;
ALTER TABLE "GroupBuyParticipant" ADD COLUMN IF NOT EXISTS "orderId" TEXT;
