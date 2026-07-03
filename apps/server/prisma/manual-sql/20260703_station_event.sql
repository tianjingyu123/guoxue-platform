-- T8 驿站 OMO P1a（2026-07-03）：驿站活动系统两新表 StationEvent + StationEventRegistration
-- 执行：cd apps/server && npx prisma db execute --file prisma/manual-sql/20260703_station_event.sql --schema prisma/schema.prisma
-- 幂等：IF NOT EXISTS 全覆盖，可重复执行；只增不删

-- 1. 驿站活动表
CREATE TABLE IF NOT EXISTS "StationEvent" (
  "id"           TEXT NOT NULL,
  "stationId"    TEXT NOT NULL,
  "title"        TEXT NOT NULL,
  "type"         TEXT NOT NULL,                                   -- YAJI雅集 / SALON沙龙 / READING读书会 / SOLAR_TERM节气活动 / EXPERIENCE体验课
  "cover"        TEXT,
  "intro"        TEXT,
  "price"        DECIMAL(10,2) NOT NULL DEFAULT 0,                -- 本期免费报名，价格字段留支付门控后启用
  "maxAttendees" INTEGER NOT NULL,
  "startTime"    TIMESTAMP(3) NOT NULL,
  "endTime"      TIMESTAMP(3) NOT NULL,
  "location"     TEXT NOT NULL,
  "status"       TEXT NOT NULL DEFAULT 'DRAFT',                   -- DRAFT / PUBLISHED / CANCELLED / FINISHED
  "photos"       JSONB,                                           -- 回顾照片墙（URL 数组，≤30 张）
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StationEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StationEvent_maxAttendees_check" CHECK ("maxAttendees" > 0)
);

-- 2. 活动查询索引（驿站维度按时间 / C 端已发布按时间）
CREATE INDEX IF NOT EXISTS "StationEvent_stationId_startTime_idx"
  ON "StationEvent"("stationId", "startTime");
CREATE INDEX IF NOT EXISTS "StationEvent_status_startTime_idx"
  ON "StationEvent"("status", "startTime");

-- 3. 活动报名表
CREATE TABLE IF NOT EXISTS "StationEventRegistration" (
  "id"        TEXT NOT NULL,
  "eventId"   TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "status"    TEXT NOT NULL DEFAULT 'REGISTERED',                 -- REGISTERED / SIGNED_IN / CANCELLED
  "qrCode"    TEXT,
  "signedAt"  TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StationEventRegistration_pkey" PRIMARY KEY ("id")
);

-- 4. 唯一约束：一人一活动一条报名（防重复报名的数据库兜底；CANCELLED 复用原行重报）
CREATE UNIQUE INDEX IF NOT EXISTS "StationEventRegistration_eventId_userId_key"
  ON "StationEventRegistration"("eventId", "userId");

-- 5. 用户维度查询索引（我的活动）
CREATE INDEX IF NOT EXISTS "StationEventRegistration_userId_idx"
  ON "StationEventRegistration"("userId");

-- 6. 外键（与 schema.prisma 关系一致）——幂等加约束
DO $$
BEGIN
  -- 活动 → 驿站（不级联：驿站生命周期独立管理）
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StationEvent_stationId_fkey'
  ) THEN
    ALTER TABLE "StationEvent"
      ADD CONSTRAINT "StationEvent_stationId_fkey"
      FOREIGN KEY ("stationId") REFERENCES "StationOffline"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  -- 报名 → 活动（删活动级联删报名）
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StationEventRegistration_eventId_fkey'
  ) THEN
    ALTER TABLE "StationEventRegistration"
      ADD CONSTRAINT "StationEventRegistration_eventId_fkey"
      FOREIGN KEY ("eventId") REFERENCES "StationEvent"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
