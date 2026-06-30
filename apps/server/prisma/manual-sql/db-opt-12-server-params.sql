-- db-opt-12 参数调优(2026-06-29 数据库审计)
-- 现状:32GB RAM / 12 核,但 PG 全是默认最小值(shared_buffers 128MB、work_mem 8MB、
--       effective_cache_size 512MB)→ 大查询落盘、planner 低估缓存而误选全表扫。
-- 权限现实:连接用户 guoxue 非 superuser。只能用 ALTER DATABASE 设 user-context 参数
--           (库 owner 权限,写入 pg_db_role_setting,对该库【新连接】持久生效)。
--           superuser/重启类见文末,需管理员改 postgresql.conf。

-- ① 库级 user-context 参数(本脚本即生效,新连接起作用)────────────
-- 排序/哈希工作内存 8MB→32MB:古籍/诗词/列表大结果集排序不落盘
ALTER DATABASE guoxue SET work_mem = '32MB';
-- 维护内存 128MB→512MB:加速 VACUUM / CREATE INDEX / ANALYZE
ALTER DATABASE guoxue SET maintenance_work_mem = '512MB';
-- 缓存提示 512MB→16GB(仅 planner 估算,不占实际内存):引导优先走索引
ALTER DATABASE guoxue SET effective_cache_size = '16GB';
-- random_page_cost 已是 1.1(SSD 合理),保持不动

-- ② 需 superuser / 改 postgresql.conf + 重启(guoxue 无权,交管理员执行)──
--   shared_buffers = '4GB'              -- postmaster,需重启 PG ★最大单项收益
--   wal_compression = on                -- superuser,减少 WAL(批量插入受益)
--   max_wal_size = '4GB'                -- sighup superuser,减少 checkpoint 抖动
--   log_min_duration_statement = 500    -- superuser,开慢查询日志(可观测性)
--   (effective_io_concurrency 在 Windows 无效,保持 0)
