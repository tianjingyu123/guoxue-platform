-- db-opt-13 软删除索引 partial 化(2026-06-29 数据库审计·第三轮)
-- 根因:ClassicChapter(46.5万行)/ClassicBook 的 deletedAt 全列 btree 索引,
--       几乎全部行 deletedAt IS NULL(古籍正文/书目极少软删)→ 索引了海量 NULL,
--       占空间且每次写入都要维护,而查"未删"(deletedAt IS NULL)planner 不会用它。
-- 优化:改 partial index(仅索引已软删行)→ 体积近 0,写入维护减少;
--       查"已删记录"仍走 partial 索引,查"未删"本就不用此索引,功能不变。
-- ⚠️ Prisma schema 无法表达 partial(@@index([deletedAt]) 仍声明全列);
--    因铁律禁 db push,不会被重建,安全。
DROP INDEX IF EXISTS "ClassicChapter_deletedAt_idx";
CREATE INDEX "ClassicChapter_deletedAt_idx" ON "ClassicChapter" ("deletedAt") WHERE "deletedAt" IS NOT NULL;

DROP INDEX IF EXISTS "ClassicBook_deletedAt_idx";
CREATE INDEX "ClassicBook_deletedAt_idx" ON "ClassicBook" ("deletedAt") WHERE "deletedAt" IS NOT NULL;
