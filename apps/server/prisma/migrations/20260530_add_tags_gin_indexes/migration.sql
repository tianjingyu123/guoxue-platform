-- GIN 索引加速 tags String[] 的 hasSome/hasEvery/contains 查询
-- 推荐系统所有标签匹配策略依赖这些索引，没有它们会全表扫描

CREATE INDEX "Content_tags_gin_idx" ON "Content" USING GIN ("tags");
CREATE INDEX "Course_tags_gin_idx" ON "Course" USING GIN ("tags");
CREATE INDEX "Article_tags_gin_idx" ON "Article" USING GIN ("tags");
CREATE INDEX "Product_tags_gin_idx" ON "Product" USING GIN ("tags");
CREATE INDEX "Circle_tags_gin_idx" ON "Circle" USING GIN ("tags");
CREATE INDEX "Video_tags_gin_idx" ON "Video" USING GIN ("tags");
