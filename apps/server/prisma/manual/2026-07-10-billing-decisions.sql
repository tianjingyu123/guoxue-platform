-- 董事长拍板 2026-07-10 · 圈子计费口径（docs/progress/董事长拍板记录-20260710-圈子计费口径.md）
-- 幂等可重跑。注意：ALTER TYPE ADD VALUE 在部分 PG 版本不能与其它语句同事务，
-- 若整批执行报错，请把三条 ALTER TYPE 单独先跑一遍再跑其余。

-- ① 订单类型补「圈子续费」（续费改现金订单）
ALTER TYPE "OrderType" ADD VALUE IF NOT EXISTS 'CIRCLE_RENEW';

-- ② 金币流水补「收入」类型与「打赏分成收入」场景（打赏金币与消费通用）；收益场景补「围观提问者分成」
ALTER TYPE "CoinTransType" ADD VALUE IF NOT EXISTS 'INCOME';
ALTER TYPE "CoinScene" ADD VALUE IF NOT EXISTS 'LIVE_GIFT_INCOME';
ALTER TYPE "EarningScene" ADD VALUE IF NOT EXISTS 'PEEK_ASKER';

-- ③ 直播画质套餐重定价：720P 13元/时（130币/时）、1080P 28元/时（280币/时）
--    3a. 兜底种子（本地/新库无套餐时插入·已有同档同时长的跳过——生产已有行只走 3b 重定价）
INSERT INTO "LiveQualityPackage" ("id", "name", "quality", "minutes", "priceCoin", "priceYuan", "sortOrder", "status")
SELECT gen_random_uuid(), v.name, v.quality, v.minutes, v."priceCoin", v."priceYuan", v."sortOrder", 'ACTIVE'
FROM (VALUES
  ('高清 10 小时包', 'hd',  600,  1300, 130.00, 1),
  ('高清 30 小时包', 'hd',  1800, 3900, 390.00, 2),
  ('超清 10 小时包', 'uhd', 600,  2800, 280.00, 3),
  ('超清 30 小时包', 'uhd', 1800, 8400, 840.00, 4)
) AS v(name, quality, minutes, "priceCoin", "priceYuan", "sortOrder")
WHERE NOT EXISTS (
  SELECT 1 FROM "LiveQualityPackage" p WHERE p."quality" = v.quality AND p."minutes" = v.minutes
);

--    3b. 存量重定价：按 minutes 重新计价（幂等：由分钟数推导，不叠加）
UPDATE "LiveQualityPackage"
SET "priceCoin" = ("minutes" / 60) * 130,
    "priceYuan" = ("minutes" / 60) * 13,
    "name" = '高清 ' || ("minutes" / 60) || ' 小时包'
WHERE "quality" = 'hd';

UPDATE "LiveQualityPackage"
SET "priceCoin" = ("minutes" / 60) * 280,
    "priceYuan" = ("minutes" / 60) * 28,
    "name" = '超清 ' || ("minutes" / 60) || ' 小时包'
WHERE "quality" = 'uhd';

-- ④ 围观分成 40/30/30：停用存量 PEEK 结算规则（若有），使代码新默认值生效
--    （达人 30% 走 PEEK 默认、提问者 30% 走 PEEK_ASKER 默认、平台 40% 为余量；
--     如需后台重新配置 SettlementRule，PROVIDER 比例须按 0.30 配）
UPDATE "SettlementRule" SET "enabled" = false WHERE "scene" = 'PEEK';

-- ⑤ 连麦分成 50/50：停用存量 AUDIO_CALL 结算规则（若有），使代码新默认值 0.5 生效
UPDATE "SettlementRule" SET "enabled" = false WHERE "scene" = 'AUDIO_CALL';

-- ⑥ 充值档位改 100/200/500 元三档（自定义输入由前端支持）：
--    删除 ConfigSystem 旧档位配置（若有），回落到代码新默认值
DELETE FROM "ConfigSystem" WHERE "configKey" = 'coin_recharge_tiers';
