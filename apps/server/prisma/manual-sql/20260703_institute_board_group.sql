-- T9 私董会小组（2026-07-03）：InstituteBoardGroup 建表（§3.6.5：6-12 人闭门小组·轮流出题·众人拆解，承载=私密子圈，一组一圈）
-- 执行：cd apps/server && npx prisma db execute --file prisma/manual-sql/20260703_institute_board_group.sql --schema prisma/schema.prisma
-- 幂等：IF NOT EXISTS / DO $$ 守卫全覆盖，可重复执行；只增不删

-- 1. 私董会小组表
CREATE TABLE IF NOT EXISTS "InstituteBoardGroup" (
  "id"          TEXT NOT NULL,
  "instituteId" TEXT NOT NULL,                                    -- 归属研究院
  "circleId"    TEXT NOT NULL,                                    -- 承载私密圈（FREE + needApproval，圈主=组长）
  "name"        TEXT NOT NULL,                                    -- 小组名（≤20 字，圈名为「私董会·{name}」）
  "topic"       TEXT,                                             -- 当期课题/小组主题
  "leaderId"    TEXT NOT NULL,                                    -- 组长 userId（即圈主·本院 ACTIVE 讲席成员）
  "memberLimit" INTEGER NOT NULL DEFAULT 12,                      -- 满员软约束（6-20·入组硬闸在圈主审批）
  "status"      TEXT NOT NULL DEFAULT 'ACTIVE',                   -- ACTIVE, DISBANDED
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InstituteBoardGroup_pkey" PRIMARY KEY ("id")
);

-- 2. 唯一约束：一组一圈
CREATE UNIQUE INDEX IF NOT EXISTS "InstituteBoardGroup_circleId_key"
  ON "InstituteBoardGroup"("circleId");

-- 3. 查询索引：院内在活小组列表 + 组长维度
CREATE INDEX IF NOT EXISTS "InstituteBoardGroup_instituteId_status_idx"
  ON "InstituteBoardGroup"("instituteId", "status");
CREATE INDEX IF NOT EXISTS "InstituteBoardGroup_leaderId_idx"
  ON "InstituteBoardGroup"("leaderId");

-- 4. 外键（与 schema.prisma 关系一致：必选关系 Prisma 默认 ON DELETE RESTRICT / ON UPDATE CASCADE）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InstituteBoardGroup_instituteId_fkey'
  ) THEN
    ALTER TABLE "InstituteBoardGroup"
      ADD CONSTRAINT "InstituteBoardGroup_instituteId_fkey"
      FOREIGN KEY ("instituteId") REFERENCES "Institute"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InstituteBoardGroup_circleId_fkey'
  ) THEN
    ALTER TABLE "InstituteBoardGroup"
      ADD CONSTRAINT "InstituteBoardGroup_circleId_fkey"
      FOREIGN KEY ("circleId") REFERENCES "Circle"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
