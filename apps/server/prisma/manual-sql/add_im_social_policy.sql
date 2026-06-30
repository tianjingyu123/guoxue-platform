-- IM 社交权限层建表（阶段一）· 手动迁移 · idempotent
-- 表名/列名严格匹配 Prisma 模型（PascalCase 表名 + camelCase 列名）
-- 安全：仅新增，CREATE TABLE IF NOT EXISTS，不触碰现有表与数据

-- 私信权限全局配置（单例 id="default"，后台可调）
CREATE TABLE IF NOT EXISTS "ImPolicyConfig" (
  "id"              TEXT         NOT NULL DEFAULT 'default',
  "allowStrangerDM" BOOLEAN      NOT NULL DEFAULT false,
  "followerDMQuota" INTEGER      NOT NULL DEFAULT 1,
  "allowImage"      BOOLEAN      NOT NULL DEFAULT true,
  "allowVoice"      BOOLEAN      NOT NULL DEFAULT true,
  "allowFile"       BOOLEAN      NOT NULL DEFAULT false,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImPolicyConfig_pkey" PRIMARY KEY ("id")
);

-- 单向关注/陌生人私信计数（fromUser 向 toUser 已发未回条数）
CREATE TABLE IF NOT EXISTS "ImC2CCounter" (
  "id"         TEXT         NOT NULL,
  "fromUserId" TEXT         NOT NULL,
  "toUserId"   TEXT         NOT NULL,
  "sentCount"  INTEGER      NOT NULL DEFAULT 0,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImC2CCounter_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ImC2CCounter_fromUserId_toUserId_key"
  ON "ImC2CCounter" ("fromUserId", "toUserId");

CREATE INDEX IF NOT EXISTS "ImC2CCounter_toUserId_idx"
  ON "ImC2CCounter" ("toUserId");

-- 注入默认配置（幂等）
INSERT INTO "ImPolicyConfig" ("id", "updatedAt")
  VALUES ('default', CURRENT_TIMESTAMP)
  ON CONFLICT ("id") DO NOTHING;
