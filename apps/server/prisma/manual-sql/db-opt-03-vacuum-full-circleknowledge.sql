-- P1 回收 CircleKnowledge 膨胀（2026-06-29 数据库优化）
-- 仅 12 行却占 808MB（embedding 反复 update，TOAST+索引膨胀，autovacuum 未回收）。
-- VACUUM FULL 重写主表+TOAST+全部索引，一并回收，无需额外 REINDEX。会短暂独占锁该表（12 行秒级）。
-- 不能在事务块内，单条独立执行。
VACUUM FULL "CircleKnowledge";
