-- 分站/运营商计费引擎 · 定价对齐（2026-07-13 董事长拍板）
-- 背景：定价此前三方不一致——前端协议文案 999/年、SQL seed 2999、后端代码零引用。
-- 拍板：分站 999 元/年、一级运营商（SILVER）4999 元。以已上线的协议文案为准。
-- 口径：沿用既有 CommissionConfig 约定（价格塞 rateA、名额塞 rateB），与 withdrawal_min 同款，
--       不引入第二套配置源；改价受 FundApproval 资金审批流保护。

-- ① 分站年租：2999 → 999（对齐 agreement-station 协议文案「系统租赁费 999 元/年」）
UPDATE "CommissionConfig"
SET "rateA" = 999, "configName" = '分站年租', "description" = '分站系统租赁费（元/年）·协议文案口径', "updatedAt" = NOW()
WHERE "configKey" = 'station_master_price';

-- 兜底：若该行不存在（新库未跑过 20260521 seed）则插入
INSERT INTO "CommissionConfig" ("id", "configKey", "configName", "rateA", "rateB", "rateC", "description", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'station_master_price', '分站年租', 999, 0, NULL, '分站系统租赁费（元/年）·协议文案口径', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "CommissionConfig" WHERE "configKey" = 'station_master_price');

-- ② 运营商各档：仅补兜底插入。
--    ⚠️ rateC（旧分级管理奖 8%/12%/15%/20%）为【已废止】字段，现行管理奖按 Operator.channelType
--    默认（ONLINE 0.10 / OFFLINE 0.20）计算，见 commission.service.ts MGMT_RATE_DEFAULTS。
--    开通运营商时 mgmtRate 一律留空以走 channelType 默认，禁止读取 rateC。
INSERT INTO "CommissionConfig" ("id", "configKey", "configName", "rateA", "rateB", "rateC", "description", "createdAt", "updatedAt")
SELECT * FROM (VALUES
  (gen_random_uuid(), 'operator_SILVER',     '银卡运营商',   4999::numeric,   6::numeric, NULL::numeric, '价格¥4999/含6名额（1自用+5可售）（rateC已废止·管理奖走channelType默认）', NOW(), NOW()),
  (gen_random_uuid(), 'operator_GOLD',       '金卡运营商',   9999::numeric,  30::numeric, NULL::numeric, '价格¥9999/含30名额（暂不对外销售）（rateC已废止·管理奖走channelType默认）', NOW(), NOW()),
  (gen_random_uuid(), 'operator_DIAMOND',    '钻石运营商',  19999::numeric, 100::numeric, NULL::numeric, '价格¥19999/含100名额（暂不对外销售）（rateC已废止·管理奖走channelType默认）', NOW(), NOW()),
  (gen_random_uuid(), 'operator_BLACK_GOLD', '黑金运营商',  49999::numeric, 300::numeric, NULL::numeric, '价格¥49999/含300名额（暂不对外销售）（rateC已废止·管理奖走channelType默认）', NOW(), NOW())
) AS v("id", "configKey", "configName", "rateA", "rateB", "rateC", "description", "createdAt", "updatedAt")
WHERE NOT EXISTS (SELECT 1 FROM "CommissionConfig" c WHERE c."configKey" = v."configKey");

-- ②b 名额口径对齐已上线合规文案（2026-07-13 董事长确认：实际名额 = 1 自用 + 5 可售 = 6）。
--     join-operator 页标注「合规红线·文案逐字照 mockup-C1」，用户看到的承诺即 1+5，DB 必须与之一致。
--     20260521 seed 的 10 为旧口径，此处纠正（仅 SILVER 是对外唯一档位，其余档不对外销售，不动）。
UPDATE "CommissionConfig"
SET "rateB" = 6, "description" = '价格¥4999/含6名额（1自用+5可售）（rateC已废止·管理奖走channelType默认）', "updatedAt" = NOW()
WHERE "configKey" = 'operator_SILVER';

-- ③ 订阅期长（月）：分站/运营商均按年计费；抽成配置化以便日后调整
INSERT INTO "ConfigSystem" ("id", "configKey", "configValue", "description", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'station.billing_period_months', '12', '分站/运营商加盟费计费周期（月）', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "ConfigSystem" WHERE "configKey" = 'station.billing_period_months');
