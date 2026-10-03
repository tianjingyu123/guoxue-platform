-- 会员中心上线兜底：仅补齐缺失的基础套餐，不覆盖后台已经审批生效的价格或权益。
-- 套餐价格沿用 2026-07-03 已确认口径；权益只保留当前系统可以兑现的内容。

INSERT INTO "MemberConfig" (
  "id", "level", "name", "price", "coinBonus", "monthlyPoints", "sort", "benefits", "isActive", "createdAt", "updatedAt"
)
VALUES
  (gen_random_uuid(), 'MONTHLY', '书院会员·月卡', 19.00, 0, 100, 1,
   '["AI 伴读·白话对照不限量","每月赠 100 积分","会员专属标识","专属客服"]'::jsonb, true, NOW(), NOW()),
  (gen_random_uuid(), 'QUARTERLY', '书院会员·季卡', 49.00, 0, 120, 2,
   '["AI 伴读·白话对照不限量","每月赠 120 积分","会员专属标识","专属客服"]'::jsonb, true, NOW(), NOW()),
  (gen_random_uuid(), 'YEARLY', '书院会员·年卡', 168.00, 0, 150, 3,
   '["AI 伴读·白话对照不限量","每月赠 150 积分","会员专属标识","专属客服"]'::jsonb, true, NOW(), NOW()),
  (gen_random_uuid(), 'YEARLY_AUTO', '书院会员·连续包年', 148.00, 0, 150, 4,
   '["AI 伴读·白话对照不限量","每月赠 150 积分","会员专属标识","专属客服"]'::jsonb, true, NOW(), NOW())
ON CONFLICT ("level") DO NOTHING;
