-- 初始化 PRD 要求的可配置参数（CommissionConfig）
-- 使用 ON CONFLICT DO NOTHING 防止重复插入

-- 站长标准价格
INSERT INTO "CommissionConfig" ("id", "configKey", "configName", "rateA", "rateB", "rateC", "description", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'station_master_price', '站长标准价格', 2999, 0, NULL, '分站加盟标准定价（元）', NOW(), NOW())
ON CONFLICT ("configKey") DO NOTHING;

-- 运营商各级价格/名额/管理奖比例
INSERT INTO "CommissionConfig" ("id", "configKey", "configName", "rateA", "rateB", "rateC", "description", "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'operator_SILVER', '银卡运营商', 4999, 10, 0.08, '价格¥4999/含10名额/管理奖8%', NOW(), NOW()),
(gen_random_uuid(), 'operator_GOLD', '金卡运营商', 9999, 30, 0.12, '价格¥9999/含30名额/管理奖12%', NOW(), NOW()),
(gen_random_uuid(), 'operator_DIAMOND', '钻石运营商', 19999, 100, 0.15, '价格¥19999/含100名额/管理奖15%', NOW(), NOW()),
(gen_random_uuid(), 'operator_BLACK_GOLD', '黑金运营商', 49999, 300, 0.20, '价格¥49999/含300名额/管理奖20%', NOW(), NOW())
ON CONFLICT ("configKey") DO NOTHING;

-- 运营商上级管理奖比例（用于上级从下级运营商直推佣金中抽取）
INSERT INTO "CommissionConfig" ("id", "configKey", "configName", "rateA", "rateB", "rateC", "description", "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'operator_upper_SILVER', '银卡上级管理奖', 0.02, 0, NULL, '上级抽取银卡运营商直推佣金的2%', NOW(), NOW()),
(gen_random_uuid(), 'operator_upper_GOLD', '金卡上级管理奖', 0.03, 0, NULL, '上级抽取金卡运营商直推佣金的3%', NOW(), NOW()),
(gen_random_uuid(), 'operator_upper_DIAMOND', '钻石上级管理奖', 0.04, 0, NULL, '上级抽取钻石运营商直推佣金的4%', NOW(), NOW()),
(gen_random_uuid(), 'operator_upper_BLACK_GOLD', '黑金上级管理奖', 0.05, 0, NULL, '上级抽取黑金运营商直推佣金的5%', NOW(), NOW())
ON CONFLICT ("configKey") DO NOTHING;

-- 驿站加盟门槛
INSERT INTO "CommissionConfig" ("id", "configKey", "configName", "rateA", "rateB", "rateC", "description", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'station_join_threshold', '驿站加盟门槛', 5000, 0, NULL, '月交易额门槛（元），达标方可申请驿站', NOW(), NOW())
ON CONFLICT ("configKey") DO NOTHING;

-- 智能体免费调用次数
INSERT INTO "CommissionConfig" ("id", "configKey", "configName", "rateA", "rateB", "rateC", "description", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'agent_free_quota', '智能体免费调用次数', 10, 0, NULL, '每个用户每天免费调用AI智能体次数', NOW(), NOW())
ON CONFLICT ("configKey") DO NOTHING;

-- 临时推荐有效期（小时）
INSERT INTO "CommissionConfig" ("id", "configKey", "configName", "rateA", "rateB", "rateC", "description", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'temp_referral', '临时推荐有效期', 24, 0, NULL, '临时推荐链接有效期（小时）', NOW(), NOW())
ON CONFLICT ("configKey") DO NOTHING;

-- 提现最低金额（确保存在，默认100元）
INSERT INTO "CommissionConfig" ("id", "configKey", "configName", "rateA", "rateB", "rateC", "description", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'withdrawal_min', '提现最低金额', 100, 0, NULL, '最低提现金额（元）', NOW(), NOW())
ON CONFLICT ("configKey") DO NOTHING;
