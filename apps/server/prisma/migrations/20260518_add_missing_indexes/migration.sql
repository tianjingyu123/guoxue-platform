-- 新增索引：ReadingProgress.userId — 加速 getContinueReading/getReadingStats 按用户查询
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ReadingProgress_userId_idx" ON "ReadingProgress"("userId");

-- 新增索引：ClassicBook.title — 加速 getBookVersions startsWith 查询
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ClassicBook_title_idx" ON "ClassicBook"("title");

-- 提示：OCR 文本全文搜索可通过安装 pg_trgm 扩展启用 GIN 索引
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS "ClassicOcrText_content_trgm_idx" ON "ClassicOcrText" USING gin ("content" gin_trgm_ops);
