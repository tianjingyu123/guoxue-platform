-- AI 语义缓存表
CREATE TABLE IF NOT EXISTS "AiCacheEntry" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "scene" TEXT NOT NULL,
    "queryHash" TEXT NOT NULL,
    "queryText" TEXT NOT NULL,
    "queryVectorJson" TEXT,
    "response" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "tokenUsage" JSONB,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "lastHitAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiCacheEntry_pkey" PRIMARY KEY ("id")
);

-- pgvector 向量列（扩展可用时生效，不可用时跳过）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        EXECUTE 'ALTER TABLE "AiCacheEntry" ADD COLUMN IF NOT EXISTS "queryVector" vector(1536)';
    END IF;
END $$;

-- 索引
CREATE INDEX IF NOT EXISTS "AiCacheEntry_scene_queryHash_idx" ON "AiCacheEntry"("scene", "queryHash");
CREATE INDEX IF NOT EXISTS "AiCacheEntry_scene_expiresAt_idx" ON "AiCacheEntry"("scene", "expiresAt");
CREATE INDEX IF NOT EXISTS "AiCacheEntry_hitCount_idx" ON "AiCacheEntry"("hitCount");
