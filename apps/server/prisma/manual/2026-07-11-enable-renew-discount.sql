-- 董事长拍板 2026-07-11：圈子续费八折开通（第二年续费 8 折·两年档 7.5 折预留）
-- 幂等可重跑（ON CONFLICT 更新）
INSERT INTO "ConfigSystem" ("id","configKey","configValue","description","updatedAt")
VALUES (gen_random_uuid(), 'circle.renew_discount', '{"enabled":true,"renewRate":0.8,"twoYearRate":0.75}', '圈子续费老成员折扣（#34·董事长2026-07-11拍板开通）', now())
ON CONFLICT ("configKey") DO UPDATE SET "configValue" = EXCLUDED."configValue", "updatedAt" = now();
