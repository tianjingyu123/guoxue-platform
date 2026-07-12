-- ═══════════════════════════════════════════════════════════════
-- 分站主推位表 StationPinnedContent（V0 重构·三个「没有」模型灵魂）
-- 9 板块 × 每板块 6 位；站长把平台内容锁定到主推位，分散注入平台各板块。
-- 幂等：可重复执行。生产用 `prisma db execute --file` 或 psql 跑。
-- 关联记忆：[[guoxue-station-operator-v0]] [[guoxue-schema-db-consistency]]
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "StationPinnedContent" (
  "id"          TEXT PRIMARY KEY,
  "stationId"   TEXT NOT NULL,
  "board"       TEXT NOT NULL,
  "slotIndex"   INTEGER NOT NULL,
  "contentType" TEXT NOT NULL,
  "contentId"   TEXT NOT NULL,
  "lockedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedBy"    TEXT NOT NULL,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 唯一约束：同一分站的同一板块同一位序只能有一条（前端 UPSERT 覆盖写）
CREATE UNIQUE INDEX IF NOT EXISTS "StationPinnedContent_stationId_board_slotIndex_key"
  ON "StationPinnedContent" ("stationId", "board", "slotIndex");

-- 按板块查询主推位
CREATE INDEX IF NOT EXISTS "StationPinnedContent_stationId_board_idx"
  ON "StationPinnedContent" ("stationId", "board");

-- 直播结束后按内容批量失活
CREATE INDEX IF NOT EXISTS "StationPinnedContent_board_contentType_contentId_idx"
  ON "StationPinnedContent" ("board", "contentType", "contentId");

-- 外键：分站删除时级联清理主推位
DO $$ BEGIN
  ALTER TABLE "StationPinnedContent"
    ADD CONSTRAINT "StationPinnedContent_stationId_fkey"
    FOREIGN KEY ("stationId") REFERENCES "Station"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Station 表新增：最近一次主推位更新时间（S1 工作台展示）
ALTER TABLE "Station" ADD COLUMN IF NOT EXISTS "pinnedUpdatedAt" TIMESTAMP(3);
