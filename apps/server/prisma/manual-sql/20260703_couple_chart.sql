-- V4 双人合盘裂变（2026-07-03）：新表 CoupleChart（邀请授权流 + R3 最小授权）
-- 执行：cd apps/server && npx prisma db execute --file prisma/manual-sql/20260703_couple_chart.sql --schema prisma/schema.prisma
-- 幂等：IF NOT EXISTS 全覆盖，可重复执行；只增不删

-- 1. 双人合盘表
CREATE TABLE IF NOT EXISTS "CoupleChart" (
  "id"                TEXT NOT NULL,
  "initiatorId"       TEXT NOT NULL,                                 -- 发起方 userId
  "partnerId"         TEXT,                                          -- 被邀请方 userId（授权后填）
  "status"            TEXT NOT NULL DEFAULT 'PENDING_INVITE',        -- PENDING_INVITE / AUTHORIZED / REJECTED / EXPIRED
  "initiatorRecordId" TEXT NOT NULL,                                 -- 发起方 BAZI 盘 id（裸 String，无 FK）
  "partnerRecordId"   TEXT,                                          -- 对方授权时提供的 BAZI 盘 id（裸 String，无 FK）
  "inviteToken"       TEXT NOT NULL,                                 -- 邀请令牌（随机 32 位 hex）
  "analysisId"        TEXT,                                          -- 关联 AiAnalysisRecord.id（合婚报告）
  "initiatorDeleted"  BOOLEAN NOT NULL DEFAULT false,                -- 发起方单侧软删可见性
  "partnerDeleted"    BOOLEAN NOT NULL DEFAULT false,                -- 被邀请方单侧软删可见性
  "expiresAt"         TIMESTAMP(3) NOT NULL,                         -- 邀请过期时间
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CoupleChart_pkey" PRIMARY KEY ("id")
);

-- 2. 邀请令牌唯一约束
CREATE UNIQUE INDEX IF NOT EXISTS "CoupleChart_inviteToken_key"
  ON "CoupleChart"("inviteToken");

-- 3. 双方维度查询索引（我发起的 / 我参与的）
CREATE INDEX IF NOT EXISTS "CoupleChart_initiatorId_idx"
  ON "CoupleChart"("initiatorId");
CREATE INDEX IF NOT EXISTS "CoupleChart_partnerId_idx"
  ON "CoupleChart"("partnerId");

-- 4. 外键（与 schema.prisma 关系一致）——幂等加约束
-- 注：仅 initiatorId/partnerId → User 建 FK；记录引用（initiatorRecordId/partnerRecordId）按本模块惯例裸 String 无 FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CoupleChart_initiatorId_fkey'
  ) THEN
    ALTER TABLE "CoupleChart"
      ADD CONSTRAINT "CoupleChart_initiatorId_fkey"
      FOREIGN KEY ("initiatorId") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CoupleChart_partnerId_fkey'
  ) THEN
    ALTER TABLE "CoupleChart"
      ADD CONSTRAINT "CoupleChart_partnerId_fkey"
      FOREIGN KEY ("partnerId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
