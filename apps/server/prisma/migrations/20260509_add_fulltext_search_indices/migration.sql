-- PostgreSQL 全文搜索索引
-- 使用 expression-based GIN 索引，无需修改表结构
-- simple 配置对中文按单字分词，配合 ts_rank 实现相关性排序

-- 文章：标题 + 摘要
CREATE INDEX IF NOT EXISTS idx_article_fts
  ON "Article" USING GIN (to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("excerpt", '')))
  WHERE "auditStatus" = 'APPROVED';

-- 课程：标题 + 简介
CREATE INDEX IF NOT EXISTS idx_course_fts
  ON "Course" USING GIN (to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("intro", '')))
  WHERE "auditStatus" = 'APPROVED';

-- 商品：标题 + 简介
CREATE INDEX IF NOT EXISTS idx_product_fts
  ON "Product" USING GIN (to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("intro", '')))
  WHERE "status" = 'ON_SALE';

-- 圈子：名称 + 简介
CREATE INDEX IF NOT EXISTS idx_circle_fts
  ON "Circle" USING GIN (to_tsvector('simple', coalesce("name", '') || ' ' || coalesce("intro", '')))
  WHERE "status" = 'ACTIVE';

-- 视频：标题
CREATE INDEX IF NOT EXISTS idx_video_fts
  ON "Video" USING GIN (to_tsvector('simple', coalesce("title", '')))
  WHERE "status" = 'PUBLISHED';

-- 国学典籍：标题 + 作者 + 简介
CREATE INDEX IF NOT EXISTS idx_classic_book_fts
  ON "ClassicBook" USING GIN (to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("author", '') || ' ' || coalesce("intro", '')))
  WHERE "status" = 'PUBLISHED';

-- 内容：标题 + 作者 + 摘要
CREATE INDEX IF NOT EXISTS idx_content_fts
  ON "Content" USING GIN (to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("author", '') || ' ' || coalesce("excerpt", '')))
  WHERE "status" = 'PUBLISHED';

-- 用户：昵称
CREATE INDEX IF NOT EXISTS idx_user_fts
  ON "User" USING GIN (to_tsvector('simple', coalesce("nickname", '')))
  WHERE "status" = 'ACTIVE';
