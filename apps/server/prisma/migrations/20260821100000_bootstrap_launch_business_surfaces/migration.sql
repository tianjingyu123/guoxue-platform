-- 发现页业务入口上线兜底：补齐分站、运营商和研究院的最小启动数据。
-- 仅在配置不存在时插入，避免覆盖后台已审批生效的正式配置。

INSERT INTO "CommissionConfig" (
  "id", "configKey", "configName", "rateA", "rateB", "rateC", "description", "createdAt", "updatedAt"
)
SELECT gen_random_uuid(), 'station_master_price', '分站年租', 999, 0, NULL,
       '分站系统租赁费（元/年）·协议文案口径', NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "CommissionConfig" WHERE "configKey" = 'station_master_price'
);

INSERT INTO "CommissionConfig" (
  "id", "configKey", "configName", "rateA", "rateB", "rateC", "description", "createdAt", "updatedAt"
)
SELECT gen_random_uuid(), 'operator_SILVER', '银卡运营商', 4999, 6, NULL,
       '价格¥4999/含6名额（1自用+5可售）（rateC已废止·管理奖走channelType默认）', NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "CommissionConfig" WHERE "configKey" = 'operator_SILVER'
);

INSERT INTO "ConfigSystem" (
  "id", "configKey", "configValue", "description", "createdAt", "updatedAt"
)
SELECT gen_random_uuid(), 'station.billing_period_months', '12',
       '分站/运营商加盟费计费周期（月）', NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "ConfigSystem" WHERE "configKey" = 'station.billing_period_months'
);

-- 研究院相关公开接口依赖一个 ACTIVE 主体；首个超级管理员作为初始管理人。
-- 若环境尚未创建超级管理员则安全跳过，避免产生无主研究院。
INSERT INTO "Institute" (
  "id", "name", "intro", "adminUserId", "status", "createdAt", "updatedAt"
)
SELECT gen_random_uuid(), '书院研究院',
       '平台精英师资筛选培养体系——从付费会员中遴选签约讲师，输送线下驿站授课。',
       admin_role."userId", 'ACTIVE', NOW(), NOW()
FROM (
  SELECT "userId"
  FROM "UserRole"
  WHERE "roleType" = 'SUPER_ADMIN'
  ORDER BY "createdAt" ASC, "id" ASC
  LIMIT 1
) AS admin_role
WHERE NOT EXISTS (
  SELECT 1 FROM "Institute" WHERE "status" = 'ACTIVE'
);
