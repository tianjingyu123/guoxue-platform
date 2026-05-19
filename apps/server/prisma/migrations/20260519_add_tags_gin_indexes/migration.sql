-- GIN 索引：加速 tags 数组包含查询（@> 运算符）
-- 用于推荐引擎按标签检索、内容发现等场景

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Course_tags_gin_idx" ON "Course" USING GIN ("tags");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Product_tags_gin_idx" ON "Product" USING GIN ("tags");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Video_tags_gin_idx" ON "Video" USING GIN ("tags");
