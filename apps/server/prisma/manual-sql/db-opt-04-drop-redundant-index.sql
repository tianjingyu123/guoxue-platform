-- P2 删冗余索引（2026-06-29 数据库优化）
-- ClassicChapter_title_trgm_idx：46万行章节标题的 GIN trgm 全文索引，103MB 且 0 scans。
-- 全局确认代码无任何 ClassicChapter.title 搜索（搜索只针对 ClassicBook.title），纯冗余。
-- 该索引不在 schema.prisma（手工建），删除不造成 schema↔DB 漂移；将来需章节标题搜索再重建。
-- 普通 DROP INDEX 毫秒级元数据操作。
DROP INDEX IF EXISTS "ClassicChapter_title_trgm_idx";
