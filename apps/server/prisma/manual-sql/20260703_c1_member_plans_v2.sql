-- C1 会员产品化 · 步骤2/2：书院会员档位 + 终身停售 + 分佣暂关（2026-07-03 董事长拍板）
-- 前置：先执行 20260703_c1_member_enum.sql
-- 档位：月卡19 / 季卡49 / 年卡168(主推) / 连续包年148；权益五项终版（去课程9折）
-- 执行：cd apps/server && npx prisma db execute --file prisma/manual-sql/20260703_c1_member_plans_v2.sql --schema prisma/schema.prisma
-- 幂等：按 level 冲突更新

INSERT INTO "MemberConfig" (id, level, name, price, "coinBonus", "monthlyPoints", sort, benefits, "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'MONTHLY', '书院会员·月卡', 19.00, 0, 100, 1,
   '["AI 伴读·白话对照不限量","付费精品电子书畅读","每月赠 100 积分与优惠券","会员专属标识","专属客服"]'::jsonb, true, NOW(), NOW()),
  (gen_random_uuid(), 'QUARTERLY', '书院会员·季卡', 49.00, 0, 120, 2,
   '["AI 伴读·白话对照不限量","付费精品电子书畅读","每月赠 120 积分与优惠券","会员专属标识","专属客服"]'::jsonb, true, NOW(), NOW()),
  (gen_random_uuid(), 'YEARLY', '书院会员·年卡', 168.00, 0, 150, 3,
   '["AI 伴读·白话对照不限量","付费精品电子书畅读","每月赠 150 积分与优惠券","会员专属标识","专属客服","折合每天不到 5 毛"]'::jsonb, true, NOW(), NOW()),
  (gen_random_uuid(), 'YEARLY_AUTO', '书院会员·连续包年', 148.00, 0, 150, 4,
   '["AI 伴读·白话对照不限量","付费精品电子书畅读","每月赠 150 积分与优惠券","会员专属标识","专属客服","到期按 ¥148 优惠价续费"]'::jsonb, true, NOW(), NOW())
ON CONFLICT (level) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  "coinBonus" = EXCLUDED."coinBonus",
  "monthlyPoints" = EXCLUDED."monthlyPoints",
  sort = EXCLUDED.sort,
  benefits = EXCLUDED.benefits,
  "isActive" = true,
  "updatedAt" = NOW();

-- 终身档停售（存量终身会员权益不受影响，只升不降逻辑保留）
UPDATE "MemberConfig" SET "isActive" = false, "updatedAt" = NOW() WHERE level = 'LIFETIME';

-- 会员购买分佣暂关（拍板 #3：会员产品正式上线后再开）
UPDATE "SettlementRule"
SET enabled = false, "updatedBy" = 'c1-member-productize-20260703', "updatedAt" = NOW()
WHERE scene = 'MEMBER_PURCHASE';
