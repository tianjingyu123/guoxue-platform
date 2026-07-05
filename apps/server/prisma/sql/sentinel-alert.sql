-- O-T1 业务哨兵告警表（与 schema.prisma SentinelAlert 对齐·只增不删）
CREATE TABLE IF NOT EXISTS "SentinelAlert" (
    "id" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "context" JSONB,
    "firedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "notified" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "SentinelAlert_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SentinelAlert_rule_resolvedAt_idx" ON "SentinelAlert"("rule", "resolvedAt");
CREATE INDEX IF NOT EXISTS "SentinelAlert_firedAt_idx" ON "SentinelAlert"("firedAt");
