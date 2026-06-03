-- 启用 pg_trgm 扩展，加速 ILIKE '%keyword%' 模糊搜索
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 搜索结果最多的核心表 title 字段加 trigram 索引
-- Article/Course/Product/Circle/Content/ClassicBook 是搜索的主表
CREATE INDEX "Article_title_trgm_idx" ON "Article" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "Course_title_trgm_idx" ON "Course" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "Product_title_trgm_idx" ON "Product" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "Circle_name_trgm_idx" ON "Circle" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "Content_title_trgm_idx" ON "Content" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "ClassicBook_title_trgm_idx" ON "ClassicBook" USING GIN ("title" gin_trgm_ops);
