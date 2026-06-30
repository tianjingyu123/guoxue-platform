-- db-opt-11 ClassicChapter 正文列压缩优化(2026-06-29 数据库审计)
-- 实验结论(content 列 3 万行采样):lz4 vs pglz = 305MB vs 326MB,lz4 省 6.4% 且解压快 2-3x。
-- 决策:SET COMPRESSION lz4 让未来新增章节受益(零锁、仅改 catalog,立即完成);
--       存量 46.5 万行/3GB 全表重写收益有限(~190MB)、需停机 + 峰值约 2x 磁盘 → 列为可选(见文末)。
ALTER TABLE "ClassicChapter" ALTER COLUMN content SET COMPRESSION lz4;
ALTER TABLE "ClassicChapter" ALTER COLUMN translation SET COMPRESSION lz4;
ALTER TABLE "ClassicChapter" ALTER COLUMN annotation SET COMPRESSION lz4;
ALTER TABLE "ClassicChapter" ALTER COLUMN "contentEn" SET COMPRESSION lz4;
ALTER TABLE "ClassicChapter" ALTER COLUMN "translationEn" SET COMPRESSION lz4;
-- 库级默认:未来新建表/列默认走 lz4(解压更快)
ALTER DATABASE guoxue SET default_toast_compression = 'lz4';
-- 清理压缩对照实验临时表
DROP TABLE IF EXISTS "_comp_pglz";
DROP TABLE IF EXISTS "_comp_lz4";
-- 清理探针表(若残留)
DROP TABLE IF EXISTS "_lz4_probe";

-- ───────── 可选·存量重写(需停机窗口 + 峰值约 2x 磁盘) ─────────
-- 完成后 content 存量转 lz4,空间降约 190MB 且读解压加速。在低峰停机执行:
--   UPDATE "ClassicChapter" SET content = content WHERE content IS NOT NULL;
--   VACUUM FULL "ClassicChapter";
