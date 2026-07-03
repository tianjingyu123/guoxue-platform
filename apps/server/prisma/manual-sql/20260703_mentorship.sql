-- V5 师徒传承（2026-07-03·纯荣誉体系·合规隔离于分销计酬链路）
-- 幂等·只写不执行。执行：
--   cd apps/server && npx prisma db execute --file prisma/manual-sql/20260703_mentorship.sql --schema prisma/schema.prisma
--
-- 合规铁律：Mentorship 完全独立于 ReferralRelation/commission/settlement，
-- 拜师不产生任何资金关系，传道值不可兑换现金/国学币/任何财物。

-- 1) UserGrowth 加列：师父累计传道值（荣誉总和·冗余便于榜单）
ALTER TABLE "UserGrowth" ADD COLUMN IF NOT EXISTS "mentorshipPoints" INTEGER NOT NULL DEFAULT 0;

-- 2) 师徒关系表（无 FK·裸 String 惯例）
CREATE TABLE IF NOT EXISTS "Mentorship" (
  "id" TEXT NOT NULL,
  "mentorId" TEXT NOT NULL,
  "discipleId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "mentorshipPoints" INTEGER NOT NULL DEFAULT 0,
  "disciplePledge" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "graduatedAt" TIMESTAMP(3),
  CONSTRAINT "Mentorship_pkey" PRIMARY KEY ("id")
);

-- 「一人一师」约束按 ACTIVE 计（应用层保证：无 ACTIVE 师父方可拜师），
-- GRADUATED 后可再拜师，故不加表级 discipleId 唯一约束，仅建索引。
CREATE INDEX IF NOT EXISTS "Mentorship_mentorId_idx" ON "Mentorship"("mentorId");
CREATE INDEX IF NOT EXISTS "Mentorship_discipleId_idx" ON "Mentorship"("discipleId");
