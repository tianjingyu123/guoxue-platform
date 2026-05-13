-- 启用 pgvector 扩展（需要数据库已安装 pgvector）
-- 在 Docker 环境下使用 pgvector/pgvector:pg16 镜像
-- Windows 原生 PostgreSQL 需手动安装 pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 给 circle_knowledge 表添加向量列（由 raw SQL 管理，Prisma schema 中不包含此列）
ALTER TABLE "circle_knowledge" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);
