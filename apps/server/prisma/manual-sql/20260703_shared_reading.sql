-- 20260703_shared_reading: V3 共读拼团裂变 建表（纯学习激励·无资金）
-- 背景：新增 SharedReadingGroup / SharedReadingMember 两表，支撑「共读拼团」玩法。
--       奖励走 user-growth 荣誉学分（不可兑现），与商城 GroupBuy（支付拼团）物理隔离，无 FK。
-- 幂等：全部 IF NOT EXISTS，可安全重复执行。
-- 执行（不停机，用户终端/dangerouslyDisableSandbox 连 5433）：
--   cd apps/server && prisma generate && 本文件 execute → nest build → pm2 restart。
-- 注：本文件仅供参考，正式迁移建议用 `prisma migrate diff` 生成（只增不删）后再核对。

-- ── SharedReadingGroup ──
CREATE TABLE IF NOT EXISTS "SharedReadingGroup" (
  "id"             TEXT NOT NULL,
  "classicBookId"  TEXT NOT NULL,
  "bookTitle"      TEXT NOT NULL,
  "initiatorId"    TEXT NOT NULL,
  "targetChapters" INTEGER NOT NULL,
  "minMembers"     INTEGER NOT NULL DEFAULT 3,
  "maxMembers"     INTEGER NOT NULL DEFAULT 5,
  "durationDays"   INTEGER NOT NULL DEFAULT 7,
  "startAt"        TIMESTAMP(3),
  "deadline"       TIMESTAMP(3),
  "status"         TEXT NOT NULL DEFAULT 'RECRUITING',
  "inviteToken"    TEXT NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SharedReadingGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SharedReadingGroup_inviteToken_key" ON "SharedReadingGroup"("inviteToken");
CREATE INDEX IF NOT EXISTS "SharedReadingGroup_status_idx" ON "SharedReadingGroup"("status");
CREATE INDEX IF NOT EXISTS "SharedReadingGroup_initiatorId_idx" ON "SharedReadingGroup"("initiatorId");

-- ── SharedReadingMember ──
CREATE TABLE IF NOT EXISTS "SharedReadingMember" (
  "id"                TEXT NOT NULL,
  "groupId"           TEXT NOT NULL,
  "userId"            TEXT NOT NULL,
  "isLeader"          BOOLEAN NOT NULL DEFAULT false,
  "joinedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedChapters" INTEGER NOT NULL DEFAULT 0,
  "completed"         BOOLEAN NOT NULL DEFAULT false,
  "rewardedAt"        TIMESTAMP(3),
  CONSTRAINT "SharedReadingMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SharedReadingMember_groupId_userId_key" ON "SharedReadingMember"("groupId", "userId");
CREATE INDEX IF NOT EXISTS "SharedReadingMember_groupId_idx" ON "SharedReadingMember"("groupId");
