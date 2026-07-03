-- 20260703_solar_term: V8 节气仪式裂变 建表（纯荣誉·无资金）
-- 背景：新增 SolarTermParticipation 轻表，记录用户参与节气仪式。
--       节气限定成就直建 UserAchievement（已有表），本文件仅建参与记录表，无 FK。
-- 幂等：全部 IF NOT EXISTS，可安全重复执行。
-- 执行（不停机，用户终端/dangerouslyDisableSandbox 连 5433）：
--   cd apps/server && prisma generate && 本文件 execute → nest build → pm2 restart。
--   或：npx prisma db execute --file prisma/manual-sql/20260703_solar_term.sql --schema prisma/schema.prisma
-- 注：本文件仅供参考，正式迁移建议用 `prisma migrate diff` 生成（只增不删）后再核对。

CREATE TABLE IF NOT EXISTS "SolarTermParticipation" (
  "id"             TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "termName"       TEXT NOT NULL,
  "year"           INTEGER NOT NULL,
  "participatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SolarTermParticipation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SolarTermParticipation_userId_termName_year_key"
  ON "SolarTermParticipation"("userId", "termName", "year");
CREATE INDEX IF NOT EXISTS "SolarTermParticipation_userId_idx"
  ON "SolarTermParticipation"("userId");
