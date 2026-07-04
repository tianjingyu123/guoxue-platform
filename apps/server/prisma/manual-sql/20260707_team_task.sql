-- 商-P2 运营商团队任务下发：TeamTask + TeamTaskProgress
-- 执行方式：cd apps/server && npx prisma db execute --file prisma/manual-sql/20260707_team_task.sql --schema prisma/schema.prisma
-- 合规红线 R1：任务奖励仅限荣誉/资源位，本表不含任何现金奖励字段
-- 幂等：可重复执行

-- 枚举类型
DO $$ BEGIN
  CREATE TYPE "TeamTaskType" AS ENUM ('PROMOTE', 'RECRUIT', 'SALES', 'CUSTOM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TeamTaskStatus" AS ENUM ('OPEN', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 任务主表
CREATE TABLE IF NOT EXISTS "TeamTask" (
  "id"          TEXT NOT NULL,
  "operatorId"  TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "desc"        TEXT,
  "type"        "TeamTaskType" NOT NULL,
  "targetValue" INTEGER,
  "deadline"    TIMESTAMP(3) NOT NULL,
  "status"      "TeamTaskStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TeamTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TeamTask_operatorId_status_idx" ON "TeamTask"("operatorId", "status");
CREATE INDEX IF NOT EXISTS "TeamTask_status_deadline_idx" ON "TeamTask"("status", "deadline");

DO $$ BEGIN
  ALTER TABLE "TeamTask"
    ADD CONSTRAINT "TeamTask_operatorId_fkey"
    FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 站长任务进度表（每日 cron 03:00 自动结算；CUSTOM 类型站长手动标记完成）
CREATE TABLE IF NOT EXISTS "TeamTaskProgress" (
  "id"              TEXT NOT NULL,
  "taskId"          TEXT NOT NULL,
  "stationMasterId" TEXT NOT NULL,
  "currentValue"    INTEGER NOT NULL DEFAULT 0,
  "completedAt"     TIMESTAMP(3),

  CONSTRAINT "TeamTaskProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TeamTaskProgress_taskId_stationMasterId_key" ON "TeamTaskProgress"("taskId", "stationMasterId");
CREATE INDEX IF NOT EXISTS "TeamTaskProgress_stationMasterId_idx" ON "TeamTaskProgress"("stationMasterId");

DO $$ BEGIN
  ALTER TABLE "TeamTaskProgress"
    ADD CONSTRAINT "TeamTaskProgress_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "TeamTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TeamTaskProgress"
    ADD CONSTRAINT "TeamTaskProgress_stationMasterId_fkey"
    FOREIGN KEY ("stationMasterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
