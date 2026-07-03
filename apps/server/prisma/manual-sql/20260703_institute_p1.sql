-- T9-P1 研究院制度落地（2026-07-03）：双轨席位 seatType + 分院制唯一约束改造 + 分享积分流水表 InstituteSharePoint
-- 执行：cd apps/server && npx prisma db execute --file prisma/manual-sql/20260703_institute_p1.sql --schema prisma/schema.prisma
-- 幂等：IF NOT EXISTS / DO $$ 守卫全覆盖，可重复执行；只增不删（唯一约束变更除外，见第 2 步说明）

-- 1. InstituteMember 加席位列（存量成员默认 LECTURE 讲席，兼容既有考核语义）
ALTER TABLE "InstituteMember"
  ADD COLUMN IF NOT EXISTS "seatType" TEXT NOT NULL DEFAULT 'LECTURE';

-- 2. 唯一约束改造（分院制：userId 全局唯一 → (instituteId, userId) 复合唯一）
--    迁移顺序：先建新复合唯一索引，再删旧 userId 唯一索引——存量数据（单院）天然满足复合唯一，
--    两索引可短暂共存，任一时刻都不失去防重保护。
CREATE UNIQUE INDEX IF NOT EXISTS "InstituteMember_instituteId_userId_key"
  ON "InstituteMember"("instituteId", "userId");

DROP INDEX IF EXISTS "InstituteMember_userId_key";

-- 2.1 补 userId 普通索引（旧唯一索引兼做查询索引，删除后需补回；按用户查会籍是高频路径）
CREATE INDEX IF NOT EXISTS "InstituteMember_userId_idx"
  ON "InstituteMember"("userId");

-- 3. 分享积分流水表
CREATE TABLE IF NOT EXISTS "InstituteSharePoint" (
  "id"          TEXT NOT NULL,
  "instituteId" TEXT NOT NULL,
  "memberId"    TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "pointType"   TEXT NOT NULL,                                    -- OFFLINE_STATION / SALON_MONTHLY / QUARTERLY_EVENT / INSTITUTE_SALON / LIVE_COURSE / ARTICLE / MENTORING / QA / MANUAL
  "points"      INTEGER NOT NULL,                                 -- 可负（人工纠错）
  "refId"       TEXT,                                             -- 关联来源ID（自动记分幂等查重键，如 InstituteEvent.id）
  "remark"      TEXT,
  "verifiedBy"  TEXT,                                             -- 人工记分/质量验证操作者
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InstituteSharePoint_pkey" PRIMARY KEY ("id")
);

-- 4. 索引：成员维度按时间（年度/季度聚合）+ 用户维度
CREATE INDEX IF NOT EXISTS "InstituteSharePoint_memberId_createdAt_idx"
  ON "InstituteSharePoint"("memberId", "createdAt");
CREATE INDEX IF NOT EXISTS "InstituteSharePoint_userId_idx"
  ON "InstituteSharePoint"("userId");

-- 5. 外键（与 schema.prisma 关系一致）——幂等加约束（删成员级联删流水）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InstituteSharePoint_memberId_fkey'
  ) THEN
    ALTER TABLE "InstituteSharePoint"
      ADD CONSTRAINT "InstituteSharePoint_memberId_fkey"
      FOREIGN KEY ("memberId") REFERENCES "InstituteMember"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 6. 特邀席位（§3.2 V6·名师破格引入·2026-07-03 追加）：永久免会费标志 + 邀请操作留痕
ALTER TABLE "InstituteMember"
  ADD COLUMN IF NOT EXISTS "feeExempt" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "InstituteMember"
  ADD COLUMN IF NOT EXISTS "invitedBy" TEXT;
ALTER TABLE "InstituteMember"
  ADD COLUMN IF NOT EXISTS "inviteRemark" TEXT;
