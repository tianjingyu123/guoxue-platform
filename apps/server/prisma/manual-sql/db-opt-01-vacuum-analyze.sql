-- P0 全库统计修复（2026-06-29 数据库优化）
-- 根因：全库 analyze_count=0，计划器在用空统计裸奔（ClassicChapter 实 46.5万行却显示 0）。
-- VACUUM (ANALYZE) 不能在事务块内，单条独立执行。重复跑安全、不改结构不删数据。
VACUUM (ANALYZE);
