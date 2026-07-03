-- ============================================================================
-- 20260703_live_quota_backfill.sql
-- 补齐「他线在生产直接部署过、但未留迁移工件」的 6 处 schema↔DB 漂移。
-- 全部 IF NOT EXISTS / ADD VALUE IF NOT EXISTS 守卫：
--   · 生产库已有这些对象 → 全部 no-op，安全
--   · 本地/全新库缺失     → 创建，达成目标态（正式上线全量部署可依此脚本）
-- 索引/约束命名严格对齐 Prisma 生成规范（{table}_{cols}_idx / _key / _pkey），
-- 以便未来 `prisma migrate diff` 视为已匹配、不再报漂移。
-- 来源：apps/server/prisma/schema.prisma（行号见每段注释）
-- ⚠️ 含 ALTER TYPE ADD VALUE，须用 prisma db execute（逐句执行），勿包进显式事务块。
-- ============================================================================

-- 1) LiveQualityPackage —— schema.prisma:1219-1231（直播画质时长包·分档商业化 C5·无 @relation 无外键）
CREATE TABLE IF NOT EXISTS "LiveQualityPackage" (
    "id"        TEXT           NOT NULL,
    "name"      TEXT           NOT NULL,
    "quality"   TEXT           NOT NULL,
    "minutes"   INTEGER        NOT NULL,
    "priceCoin" INTEGER        NOT NULL,
    "priceYuan" DECIMAL(10,2)  NOT NULL,
    "sortOrder" INTEGER        NOT NULL DEFAULT 0,
    "status"    TEXT           NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LiveQualityPackage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LiveQualityPackage_status_quality_idx"
    ON "LiveQualityPackage" ("status", "quality");

-- 2) LiveQuotaAccount —— schema.prisma:1234-1243（主播画质额度账户·userId @unique）
CREATE TABLE IF NOT EXISTS "LiveQuotaAccount" (
    "id"         TEXT         NOT NULL,
    "userId"     TEXT         NOT NULL,
    "hdMinutes"  INTEGER      NOT NULL DEFAULT 0,
    "uhdMinutes" INTEGER      NOT NULL DEFAULT 0,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LiveQuotaAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LiveQuotaAccount_userId_key"
    ON "LiveQuotaAccount" ("userId");
CREATE INDEX IF NOT EXISTS "LiveQuotaAccount_userId_idx"
    ON "LiveQuotaAccount" ("userId");

-- 3) LiveQuotaRecord —— schema.prisma:1246-1259（画质额度流水·packageId/roomId 裸字段无外键）
CREATE TABLE IF NOT EXISTS "LiveQuotaRecord" (
    "id"        TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "type"      TEXT         NOT NULL,
    "quality"   TEXT         NOT NULL,
    "minutes"   INTEGER      NOT NULL,
    "costCoin"  INTEGER      NOT NULL DEFAULT 0,
    "packageId" TEXT,
    "roomId"    TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LiveQuotaRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LiveQuotaRecord_userId_createdAt_idx"
    ON "LiveQuotaRecord" ("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "LiveQuotaRecord_userId_type_idx"
    ON "LiveQuotaRecord" ("userId", "type");

-- 4) CoinScene 补枚举值 —— schema.prisma:3121（直播画质时长包购买场景）
ALTER TYPE "CoinScene" ADD VALUE IF NOT EXISTS 'LIVE_QUALITY_PACKAGE';

-- 5) Video 补两列 —— schema.prisma:1391,1395
ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "isPrivate" BOOLEAN NOT NULL DEFAULT false;

-- 6) WithdrawalApplication 补四列 —— schema.prisma:4032-4035（注意 taxRate 精度 (5,4)，其余 (10,2)）
ALTER TABLE "WithdrawalApplication" ADD COLUMN IF NOT EXISTS "fee"          DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "WithdrawalApplication" ADD COLUMN IF NOT EXISTS "taxAmount"    DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "WithdrawalApplication" ADD COLUMN IF NOT EXISTS "taxRate"      DECIMAL(5,4)  NOT NULL DEFAULT 0;
ALTER TABLE "WithdrawalApplication" ADD COLUMN IF NOT EXISTS "actualAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- 7) LiveRoom 补 quality 列 —— schema.prisma:1183
ALTER TABLE "LiveRoom" ADD COLUMN IF NOT EXISTS "quality" TEXT NOT NULL DEFAULT 'basic';
