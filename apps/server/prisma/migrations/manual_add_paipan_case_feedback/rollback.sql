-- 回滚：排盘报告应验回访表（2026-09-19）
--
-- ⚠️ 会删除 PaipanCaseFeedback 的全部数据，执行前务必先备份。
-- 这张表里的东西是攒出来的——每一条都对应一次真实的排盘与一次回访，
-- 删掉之后无法从别处重建（报告还在，但「后来怎么样了」没有第二个出处）。
--
-- 建议先导出：
--   \copy "PaipanCaseFeedback" TO 'paipan-case-feedback-backup.csv' CSV HEADER

DROP TABLE IF EXISTS "PaipanCaseFeedback";
