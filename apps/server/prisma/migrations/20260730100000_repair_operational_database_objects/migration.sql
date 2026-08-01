-- Prisma schema 无法完整表达的 PostgreSQL 运维对象。
-- 本迁移同时用于：
-- 1. 修复历史环境中 pgvector 表名/字段名不一致；
-- 2. 为全新空库基线补齐扩展、表达式索引和 GIN/HNSW 索引。

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE "CircleKnowledge"
  ADD COLUMN IF NOT EXISTS "embedding" vector(1536);

ALTER TABLE "AiCacheEntry"
  ADD COLUMN IF NOT EXISTS "queryVector" vector(1536);

CREATE INDEX IF NOT EXISTS "CircleKnowledge_embedding_hnsw_idx"
  ON "CircleKnowledge"
  USING hnsw ("embedding" vector_cosine_ops)
  WHERE "embedding" IS NOT NULL;

-- 结构化全文检索：只索引可公开展示的数据。
CREATE INDEX IF NOT EXISTS "idx_article_fts"
  ON "Article" USING GIN (
    to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("excerpt", ''))
  )
  WHERE "auditStatus" = 'APPROVED';

CREATE INDEX IF NOT EXISTS "idx_course_fts"
  ON "Course" USING GIN (
    to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("intro", ''))
  )
  WHERE "auditStatus" = 'APPROVED';

CREATE INDEX IF NOT EXISTS "idx_product_fts"
  ON "Product" USING GIN (
    to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("intro", ''))
  )
  WHERE "status" = 'ON_SALE';

CREATE INDEX IF NOT EXISTS "idx_circle_fts"
  ON "Circle" USING GIN (
    to_tsvector('simple', coalesce("name", '') || ' ' || coalesce("intro", ''))
  )
  WHERE "status" = 'ACTIVE';

CREATE INDEX IF NOT EXISTS "idx_video_fts"
  ON "Video" USING GIN (to_tsvector('simple', coalesce("title", '')))
  WHERE "status" = 'PUBLISHED';

CREATE INDEX IF NOT EXISTS "idx_classic_book_fts"
  ON "ClassicBook" USING GIN (
    to_tsvector(
      'simple',
      coalesce("title", '') || ' ' || coalesce("author", '') || ' ' || coalesce("intro", '')
    )
  )
  WHERE "status" = 'PUBLISHED';

CREATE INDEX IF NOT EXISTS "idx_content_fts"
  ON "Content" USING GIN (
    to_tsvector(
      'simple',
      coalesce("title", '') || ' ' || coalesce("author", '') || ' ' || coalesce("excerpt", '')
    )
  )
  WHERE "status" = 'PUBLISHED';

CREATE INDEX IF NOT EXISTS "idx_user_fts"
  ON "User" USING GIN (to_tsvector('simple', coalesce("nickname", '')))
  WHERE "status" = 'ACTIVE';

-- 标签数组查询。
CREATE INDEX IF NOT EXISTS "Content_tags_gin_idx"
  ON "Content" USING GIN ("tags");
CREATE INDEX IF NOT EXISTS "Course_tags_gin_idx"
  ON "Course" USING GIN ("tags");
CREATE INDEX IF NOT EXISTS "Article_tags_gin_idx"
  ON "Article" USING GIN ("tags");
CREATE INDEX IF NOT EXISTS "Product_tags_gin_idx"
  ON "Product" USING GIN ("tags");
CREATE INDEX IF NOT EXISTS "Circle_tags_gin_idx"
  ON "Circle" USING GIN ("tags");
CREATE INDEX IF NOT EXISTS "Video_tags_gin_idx"
  ON "Video" USING GIN ("tags");

-- 标题模糊检索。
CREATE INDEX IF NOT EXISTS "Article_title_trgm_idx"
  ON "Article" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Course_title_trgm_idx"
  ON "Course" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Product_title_trgm_idx"
  ON "Product" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Circle_name_trgm_idx"
  ON "Circle" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Content_title_trgm_idx"
  ON "Content" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "ClassicBook_title_trgm_idx"
  ON "ClassicBook" USING GIN ("title" gin_trgm_ops);
