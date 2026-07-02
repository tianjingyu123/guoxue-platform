-- 站长自购立减（2026-07-02 拍板）：Order 增加 selfDiscount 列
-- 执行：cd apps/server && npx prisma db execute --file prisma/manual-sql/20260702_order_self_discount.sql --schema prisma/schema.prisma
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "selfDiscount" DECIMAL(10,2);
