-- db-opt-15: Order 加 quantity 列（修复取消订单库存恢复硬编码 +1 bug）
-- 背景：下单按 qty 扣库存（shop.service decrement: qty），取消却硬编码 increment: 1
--       → 多件订单取消后库存永久丢失。
-- 配套：schema Order 加 quantity Int @default(1)；createOrder 存 quantity=qty；
--       cancelOrder 按 order.quantity 恢复。
-- 历史订单：default 1（多为单件，历史真实数量已不可考，与 B5-1 同理）。
-- 执行（停机，用户终端/dangerouslyDisableSandbox 连 5433）：
--   pm2 stop → generate → 本文件 → nest build → pm2 restart → 验证。

ALTER TABLE "Order" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;
