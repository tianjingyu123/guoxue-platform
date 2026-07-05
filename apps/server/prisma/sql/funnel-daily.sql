-- D-T1 转化漏斗日聚合表（与 schema.prisma FunnelDaily 对齐·只增不删）
CREATE TABLE IF NOT EXISTS "FunnelDaily" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "funnel" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "stepKey" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    CONSTRAINT "FunnelDaily_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FunnelDaily_date_funnel_step_key" ON "FunnelDaily"("date", "funnel", "step");
CREATE INDEX IF NOT EXISTS "FunnelDaily_funnel_date_idx" ON "FunnelDaily"("funnel", "date");
