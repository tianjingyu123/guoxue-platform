-- 会员定价与权益（2026-07-03 用户拍板）：月199 / 年999 / 终身3949
-- 权益：会员专属精品课程免费学习 + 全部智能体免费使用 + 古籍/诗词/电子书 AI 伴读免费
-- 执行：cd apps/server && npx prisma db execute --file prisma/manual-sql/20260703_member_plans.sql --schema prisma/schema.prisma
-- 幂等：按 level 冲突更新

INSERT INTO "MemberConfig" (id, level, name, price, "coinBonus", benefits, "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'MONTHLY', '月度会员', 199.00, 0,
   '["会员专属精品课程免费学习","全部智能体免费使用","古籍·诗词·电子书 AI 伴读免费"]'::jsonb, true, NOW(), NOW()),
  (gen_random_uuid(), 'YEARLY', '年度会员', 999.00, 0,
   '["会员专属精品课程免费学习","全部智能体免费使用","古籍·诗词·电子书 AI 伴读免费","年付立省 1389 元"]'::jsonb, true, NOW(), NOW()),
  (gen_random_uuid(), 'LIFETIME', '终身会员', 3949.00, 0,
   '["会员专属精品课程免费学习","全部智能体免费使用","古籍·诗词·电子书 AI 伴读免费","一次开通，终身同修"]'::jsonb, true, NOW(), NOW())
ON CONFLICT (level) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  benefits = EXCLUDED.benefits,
  "isActive" = true,
  "updatedAt" = NOW();

-- 会员推广分佣启用（此前拍板 20%·引擎影子记账；实付走 CommissionConfig station_member）
UPDATE "SettlementRule"
SET enabled = true, "updatedBy" = 'user-pricing-20260703', "updatedAt" = NOW()
WHERE scene = 'MEMBER_PURCHASE';
