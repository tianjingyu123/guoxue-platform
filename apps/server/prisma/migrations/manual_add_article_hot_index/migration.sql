-- Migration: manual_add_article_hot_index
-- 目的：为首页 smart-feed 的热门文章查询补复合索引。
--   smart-feed.service.ts 多处： where auditStatus='APPROVED' order by viewCount desc
--   （getNewUserFeed / getAdvancedFeed / getBroadFeed / getCategoryFeed('article')）
--   570 万文章量级下，缺该索引会退化为「按 auditStatus 过滤 + viewCount filesort（全表排序）」。
-- 对标已有范式：Course[auditStatus,studentCount] / ClassicBook[status,viewCount] / Product[status,salesCount]。
-- 性质：additive（仅新增索引，无 DROP、无类型变更）。
-- 生产执行建议：CONCURRENTLY 避免锁表（见下方注释；Prisma migrate 不支持 CONCURRENTLY，
--   如需零锁上线请单独用 psql 执行 CONCURRENTLY 版本，再 `prisma migrate resolve --applied` 标记本迁移）。

-- 标准版（Prisma migrate / 事务内可执行；会短暂持有该表写锁）
CREATE INDEX IF NOT EXISTS "Article_auditStatus_viewCount_idx" ON "Article"("auditStatus", "viewCount");

-- 零锁版（生产大表推荐，需在事务外单独执行，勿与上面同一事务同时运行）：
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS "Article_auditStatus_viewCount_idx" ON "Article"("auditStatus", "viewCount");
