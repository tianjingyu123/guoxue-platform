-- 圈子治理体系建表（2026-07-10·幂等可重跑）
-- 对应待办清单第二章「治理」#8-#14：圈规条文/加入确认/违规阶梯/申诉/自动治理配置/权限矩阵
-- 与 schema.prisma 五个新模型一一对应（无外键·同 CircleAnnouncementRead 风格）

-- ① 圈规条文（#9/#14·官方模板一键套用·templateKey 幂等去重·editedAt 非空=手改不覆盖）
CREATE TABLE IF NOT EXISTS "CircleRule" (
  "id"          TEXT NOT NULL,
  "circleId"    TEXT NOT NULL,
  "sortOrder"   INTEGER NOT NULL DEFAULT 0,
  "text"        TEXT NOT NULL,
  "templateKey" TEXT,
  "editedAt"    TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CircleRule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CircleRule_circleId_sortOrder_idx" ON "CircleRule"("circleId", "sortOrder");

-- ② 新成员加入圈规确认记录（#9·逐条确认留痕·快照可在违规处理时引用当时版本）
CREATE TABLE IF NOT EXISTS "CircleRuleAck" (
  "id"            TEXT NOT NULL,
  "circleId"      TEXT NOT NULL,
  "userId"        TEXT NOT NULL,
  "ruleIds"       JSONB NOT NULL,
  "rulesSnapshot" JSONB NOT NULL,
  "ackAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CircleRuleAck_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CircleRuleAck_circleId_userId_key" ON "CircleRuleAck"("circleId", "userId");
CREATE INDEX IF NOT EXISTS "CircleRuleAck_userId_idx" ON "CircleRuleAck"("userId");

-- ③ 违规记录（#10/#13·警告/禁言/移出三级·状态机 ACTIVE/EXPIRED/LIFTED/REVOKED）
CREATE TABLE IF NOT EXISTS "CircleViolation" (
  "id"          TEXT NOT NULL,
  "circleId"    TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "type"        TEXT NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'ACTIVE',
  "ruleId"      TEXT,
  "ruleText"    TEXT,
  "reason"      TEXT,
  "evidence"    TEXT,
  "contentType" TEXT,
  "contentId"   TEXT,
  "operatorId"  TEXT NOT NULL,
  "auto"        BOOLEAN NOT NULL DEFAULT false,
  "strikeCount" INTEGER NOT NULL DEFAULT 0,
  "expiresAt"   TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CircleViolation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CircleViolation_circleId_userId_type_status_idx" ON "CircleViolation"("circleId", "userId", "type", "status");
CREATE INDEX IF NOT EXISTS "CircleViolation_circleId_createdAt_idx" ON "CircleViolation"("circleId", "createdAt");
CREATE INDEX IF NOT EXISTS "CircleViolation_userId_createdAt_idx" ON "CircleViolation"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "CircleViolation_type_status_expiresAt_idx" ON "CircleViolation"("type", "status", "expiresAt");

-- ④ 申诉（#12·72h 内可诉·每处理一次·平台仲裁 48h 答复）
CREATE TABLE IF NOT EXISTS "CircleAppeal" (
  "id"          TEXT NOT NULL,
  "violationId" TEXT NOT NULL,
  "circleId"    TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "content"     TEXT NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'PENDING',
  "resolution"  TEXT,
  "reviewerId"  TEXT,
  "deadlineAt"  TIMESTAMP(3) NOT NULL,
  "resolvedAt"  TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CircleAppeal_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CircleAppeal_violationId_key" ON "CircleAppeal"("violationId");
CREATE INDEX IF NOT EXISTS "CircleAppeal_status_deadlineAt_idx" ON "CircleAppeal"("status", "deadlineAt");
CREATE INDEX IF NOT EXISTS "CircleAppeal_circleId_createdAt_idx" ON "CircleAppeal"("circleId", "createdAt");
CREATE INDEX IF NOT EXISTS "CircleAppeal_userId_idx" ON "CircleAppeal"("userId");

-- ⑤ 自动治理配置 + 权限矩阵覆盖（#8/#11·一圈一行·rolePermissions 存矩阵覆盖位·锁定项硬编码仅圈主）
CREATE TABLE IF NOT EXISTS "CircleGovernanceConfig" (
  "id"                      TEXT NOT NULL,
  "circleId"                TEXT NOT NULL,
  "requireRuleAck"          BOOLEAN NOT NULL DEFAULT true,
  "warningThreshold"        INTEGER NOT NULL DEFAULT 3,
  "warningResetDays"        INTEGER NOT NULL DEFAULT 90,
  "muteDays"                INTEGER NOT NULL DEFAULT 7,
  "removeBanRejoin"         BOOLEAN NOT NULL DEFAULT true,
  "newMemberReviewEnabled"  BOOLEAN NOT NULL DEFAULT false,
  "newMemberReviewDays"     INTEGER NOT NULL DEFAULT 7,
  "sensitiveWordsEnabled"   BOOLEAN NOT NULL DEFAULT true,
  "sensitiveWords"          JSONB,
  "postIntervalSeconds"     INTEGER NOT NULL DEFAULT 0,
  "reportAutoHideEnabled"   BOOLEAN NOT NULL DEFAULT true,
  "reportAutoHideThreshold" INTEGER NOT NULL DEFAULT 3,
  "rolePermissions"         JSONB,
  "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CircleGovernanceConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CircleGovernanceConfig_circleId_key" ON "CircleGovernanceConfig"("circleId");
