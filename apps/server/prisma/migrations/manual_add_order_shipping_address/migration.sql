-- 订单收货地址绑定（实物商城下单存收件信息）
-- addressId: 引用 ShippingAddress；shippingInfo: 下单时地址快照（地址表可改可删，订单存快照最可靠）
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "addressId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingInfo" JSONB;
