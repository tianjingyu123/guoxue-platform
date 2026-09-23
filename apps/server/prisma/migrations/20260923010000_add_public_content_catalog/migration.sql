-- 公开内容目录只存安全元数据，不存正文、播放地址、交易或用户隐私。
-- 仅建空表；不回填、不切换搜索入口。默认 active=false，避免未核验记录进入公开召回。
CREATE TABLE "ContentCatalog" (
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "stationId" TEXT,
  "circleId" TEXT,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "cover" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "target" TEXT NOT NULL,
  "commercialType" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "sourceUpdatedAt" TIMESTAMP(3) NOT NULL,
  "indexedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "active" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "ContentCatalog_pkey" PRIMARY KEY ("sourceType", "sourceId")
);

CREATE INDEX "ContentCatalog_stationId_sourceType_active_idx"
  ON "ContentCatalog"("stationId", "sourceType", "active");
CREATE INDEX "ContentCatalog_circleId_sourceType_active_idx"
  ON "ContentCatalog"("circleId", "sourceType", "active");
CREATE INDEX "ContentCatalog_sourceType_indexedAt_idx"
  ON "ContentCatalog"("sourceType", "indexedAt");
