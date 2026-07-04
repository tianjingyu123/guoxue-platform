-- 供-P2 白标贺卡（商城供应链重构 B2B2C·docs/design/商城供应链重构-B2B2C设计-20260704.md §五/§六/§八）
-- Order 增量列 giftCardMeta：归因订单贺卡任务 {fromName 从业者署名, blessing 祝语·可选, qrRef 名片码内容}
-- 链路：下单归因到分销者（tempReferrerId/referrerId）→ 自动组装贺卡 meta → 商家/供应商发货视图露出贺卡任务 → admin 打印模板页 A6 打印随包裹放入
-- 增量安全：只增不删·IF NOT EXISTS / ON CONFLICT DO NOTHING 可重复执行·历史订单 giftCardMeta 为 NULL（无贺卡任务）
-- 执行：pm2 stop guoxue-api → npx prisma generate → npx prisma db execute --file 本文件 → nest build → pm2 restart guoxue-api --update-env

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "giftCardMeta" JSONB;

-- 全局开关（默认开·后台把 configValue 改为 'false' 即全平台关闭贺卡生成；个人级开关见 shop.service TODO）
INSERT INTO "ConfigSystem" ("id", "configKey", "configValue", "description", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'shop.gift_card.enabled',
  'true',
  '白标贺卡全局开关（供-P2）：归因订单自动生成贺卡任务（从业者署名+祝语+名片二维码）；false=关闭',
  NOW(),
  NOW()
)
ON CONFLICT ("configKey") DO NOTHING;
