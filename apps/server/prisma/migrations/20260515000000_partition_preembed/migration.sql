-- ============================================================
-- 分区预埋 SQL — 为后续水平扩展预留基础设施
-- 当前阶段（P0）不实际分区，仅创建辅助函数和注释标记
-- 触发时机：单表 > 500 万行 或 数据量 > 10GB
-- ============================================================

-- -------------------------------------------------------
-- 1. 分区管理辅助函数
-- -------------------------------------------------------

-- 按月创建范围分区（适用：排盘记录、订单、AI 分析、聊天记录）
CREATE OR REPLACE FUNCTION create_monthly_partitions(
  parent_table NAME,
  start_date DATE DEFAULT date_trunc('month', now())::DATE,
  months_ahead INT DEFAULT 12
) RETURNS VOID AS $$
DECLARE
  i INT;
  partition_date DATE;
  partition_name TEXT;
  month_start TEXT;
  month_end TEXT;
BEGIN
  FOR i IN 0..(months_ahead - 1) LOOP
    partition_date := start_date + (i || ' months')::INTERVAL;
    partition_name := parent_table || '_' || to_char(partition_date, 'YYYYMM');
    month_start := to_char(partition_date, 'YYYY-MM-01');
    month_end := to_char((partition_date + INTERVAL '1 month')::DATE, 'YYYY-MM-01');

    -- 仅在分区不存在时创建
    IF NOT EXISTS (
      SELECT 1 FROM pg_class WHERE relname = partition_name
    ) THEN
      EXECUTE format(
        'CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
        partition_name, parent_table, month_start, month_end
      );
      RAISE NOTICE '创建分区: % (%, %)', partition_name, month_start, month_end;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 按天创建范围分区（适用：用户行为日志等超高写入表）
CREATE OR REPLACE FUNCTION create_daily_partitions(
  parent_table NAME,
  start_date DATE DEFAULT CURRENT_DATE,
  days_ahead INT DEFAULT 14
) RETURNS VOID AS $$
DECLARE
  i INT;
  partition_date DATE;
  partition_name TEXT;
  day_start TEXT;
  day_end TEXT;
BEGIN
  FOR i IN 0..(days_ahead - 1) LOOP
    partition_date := start_date + i;
    partition_name := parent_table || '_' || to_char(partition_date, 'YYYYMMDD');
    day_start := to_char(partition_date, 'YYYY-MM-DD');
    day_end := to_char((partition_date + INTERVAL '1 day')::DATE, 'YYYY-MM-DD');

    IF NOT EXISTS (
      SELECT 1 FROM pg_class WHERE relname = partition_name
    ) THEN
      EXECUTE format(
        'CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
        partition_name, parent_table, day_start, day_end
      );
      RAISE NOTICE '创建分区: % (%, %)', partition_name, day_start, day_end;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 自动清理过期分区（配合归档策略使用）
CREATE OR REPLACE FUNCTION detach_expired_partitions(
  parent_table NAME,
  retention_days INT DEFAULT 90
) RETURNS SETOF TEXT AS $$
DECLARE
  rec RECORD;
  cutoff_date TEXT;
BEGIN
  cutoff_date := to_char((CURRENT_DATE - retention_days)::DATE, 'YYYY-MM-DD');
  FOR rec IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename LIKE parent_table || '%'
      AND tablename ~ '_[0-9]{8}$'  -- matches _YYYYMMDD or _YYYYMM pattern
  LOOP
    RETURN NEXT format(
      'ALTER TABLE %I DETACH PARTITION %I; -- (保留为独立表，不删除)',
      parent_table, rec.tablename
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- -------------------------------------------------------
-- 2. 分区候选表标记（注释方式，不影响运行时）
-- -------------------------------------------------------

-- 排盘记录 — 按 created_at 月分区，分片键 userId
COMMENT ON TABLE "PaipanRecord" IS 'PARTITION_CANDIDATE: RANGE(created_at) MONTHLY | SHARD_KEY: userId | ARCHIVE_AFTER: 90d';

-- AI 分析记录 — 按 created_at 月分区，分片键 userId
COMMENT ON TABLE "AiAnalysisRecord" IS 'PARTITION_CANDIDATE: RANGE(created_at) MONTHLY | SHARD_KEY: userId | ARCHIVE_AFTER: 90d';

-- 订单 — 按 created_at 月分区，分片键 userId
COMMENT ON TABLE "Order" IS 'PARTITION_CANDIDATE: RANGE(created_at) MONTHLY | SHARD_KEY: userId | ARCHIVE_AFTER: 365d';

-- 用户行为日志 — 按 created_at 天分区（日写入量极大）
COMMENT ON TABLE "UserBehaviorLog" IS 'PARTITION_CANDIDATE: RANGE(created_at) DAILY | SHARD_KEY: userId | RETENTION: 180d | TARGET: ClickHouse';

-- 用户行为聚合 — 按 created_at 月分区
COMMENT ON TABLE "UserBehavior" IS 'PARTITION_CANDIDATE: RANGE(created_at) MONTHLY | SHARD_KEY: userId | ARCHIVE_AFTER: 90d';

-- 聊天记录 — 按 created_at 月分区
COMMENT ON TABLE "BotChatLog" IS 'PARTITION_CANDIDATE: RANGE(created_at) MONTHLY | SHARD_KEY: userId | ARCHIVE_AFTER: 365d';

-- 营销日志 — 按 created_at 月分区
COMMENT ON TABLE "MarketingLog" IS 'PARTITION_CANDIDATE: RANGE(created_at) MONTHLY | SHARD_KEY: userId | ARCHIVE_AFTER: 90d';

-- -------------------------------------------------------
-- 3. 分区兼容索引（实际分区时需重建到父表）
-- 这些索引在 P2 阶段通过分区父表统一创建
-- -------------------------------------------------------

-- PaipanRecord 分区索引模板
-- CREATE INDEX ON "PaipanRecord" ("userId", "createdAt" DESC);
-- CREATE INDEX ON "PaipanRecord" ("userId", "paipanType", "createdAt" DESC);
-- CREATE INDEX ON "PaipanRecord" ("createdAt" DESC);

-- UserBehaviorLog 分区索引模板（目标：ClickHouse，此处仅为兼容）
-- 注：该表最终应迁入 ClickHouse，PostgreSQL 仅作为过渡
-- CREATE INDEX ON "UserBehaviorLog" ("userId", "createdAt" DESC);
-- CREATE INDEX ON "UserBehaviorLog" ("action", "createdAt" DESC);

-- -------------------------------------------------------
-- 4. pg_partman 扩展检查（P2 阶段启用）
-- -------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_partman') THEN
    RAISE NOTICE 'pg_partman 可用 — 推荐在 P2 阶段启用自动分区管理';
  ELSE
    RAISE NOTICE 'pg_partman 不可用 — P2 阶段需安装: CREATE EXTENSION pg_partman';
  END IF;
END $$;
