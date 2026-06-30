-- P0 续：高频表 autovacuum/analyze 表级调优（2026-06-29 数据库优化）
-- 根因：全库 analyze_count 历史为 0，开发期数据量未达默认阈值(analyze: 50行+10%)致统计长期陈旧。
-- 对高写入/曾膨胀表下调 scale_factor，让 autovacuum/analyze 在放量后更早触发，防统计再次陈旧、防 TOAST 膨胀。
-- 纯参数设置，不锁表不改数据，安全可重跑。
ALTER TABLE "TrackEvent"        SET (autovacuum_vacuum_scale_factor=0.05, autovacuum_analyze_scale_factor=0.02);
ALTER TABLE "Order"             SET (autovacuum_vacuum_scale_factor=0.05, autovacuum_analyze_scale_factor=0.02);
ALTER TABLE "PaipanRecord"      SET (autovacuum_vacuum_scale_factor=0.05, autovacuum_analyze_scale_factor=0.02);
ALTER TABLE "AuditLog"          SET (autovacuum_vacuum_scale_factor=0.05, autovacuum_analyze_scale_factor=0.02);
ALTER TABLE "Post"              SET (autovacuum_vacuum_scale_factor=0.05, autovacuum_analyze_scale_factor=0.02);
ALTER TABLE "Content"           SET (autovacuum_vacuum_scale_factor=0.05, autovacuum_analyze_scale_factor=0.02);
ALTER TABLE "AiAnalysisRecord"  SET (autovacuum_vacuum_scale_factor=0.05, autovacuum_analyze_scale_factor=0.02);
-- CircleKnowledge：曾因 embedding 反复 update 膨胀 808MB，额外收紧主表+TOAST。
ALTER TABLE "CircleKnowledge"   SET (autovacuum_vacuum_scale_factor=0.05, autovacuum_analyze_scale_factor=0.02, toast.autovacuum_vacuum_scale_factor=0.05);
