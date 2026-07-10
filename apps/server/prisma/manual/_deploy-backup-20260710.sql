-- 生产部署前目标表备份（2026-07-10·幂等）
CREATE TABLE IF NOT EXISTS "_bak_20260710_settlement" AS SELECT * FROM "SettlementRule";
CREATE TABLE IF NOT EXISTS "_bak_20260710_lqp" AS SELECT * FROM "LiveQualityPackage";
CREATE TABLE IF NOT EXISTS "_bak_20260710_cfg" AS SELECT * FROM "ConfigSystem" WHERE "configKey"='coin_recharge_tiers';
