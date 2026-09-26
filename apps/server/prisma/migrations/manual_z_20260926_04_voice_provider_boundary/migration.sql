-- 小卜语音：供应商适配边界、设备台账、听书断点、译文人工复核（2026-09-21 非商业 API 收口）
--
-- 前置：manual_add_xiaobu_ai_assets（VoiceSession / TextDerivedAsset 由它创建）。
-- 纯新增列与新表，不改写既有数据语义；回滚见同目录 rollback.sql。
--
-- 设计口径：
-- - VoiceSession 增加 provider / providerIsMock：模拟供应商的会话在库里永远可辨认，不能混进真实用量统计。
-- - usageState：供应商没给真实时长时记 unknown/estimated，usedSeconds 保持为空，不填 0 冒充准确。
-- - 每次调用供应商记一条 VoiceProviderAttempt；用量回调按 (provider, eventId) 唯一，重复到达只处理一次。
-- - 设备序列号只存 HMAC 哈希与末四位；绑定码、转赠码也只存哈希。

-- ── VoiceSession 扩展 ──
ALTER TABLE "VoiceSession" ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'unavailable';
ALTER TABLE "VoiceSession" ADD COLUMN IF NOT EXISTS "providerIsMock" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "VoiceSession" ADD COLUMN IF NOT EXISTS "agentId" TEXT;
ALTER TABLE "VoiceSession" ADD COLUMN IF NOT EXISTS "requestId" TEXT;
ALTER TABLE "VoiceSession" ADD COLUMN IF NOT EXISTS "startIdempotencyKey" TEXT;
ALTER TABLE "VoiceSession" ADD COLUMN IF NOT EXISTS "usageState" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "VoiceSession" ADD COLUMN IF NOT EXISTS "technicalOutcome" TEXT;
ALTER TABLE "VoiceSession" ADD COLUMN IF NOT EXISTS "answerCompleteness" TEXT;
ALTER TABLE "VoiceSession" ADD COLUMN IF NOT EXISTS "userSatisfaction" TEXT;
ALTER TABLE "VoiceSession" ADD COLUMN IF NOT EXISTS "contextVersion" TEXT;
ALTER TABLE "VoiceSession" ADD COLUMN IF NOT EXISTS "contextDigest" TEXT;
ALTER TABLE "VoiceSession" ADD COLUMN IF NOT EXISTS "deviceId" TEXT;
ALTER TABLE "VoiceSession" ADD COLUMN IF NOT EXISTS "deviceBindingVersion" INTEGER;
ALTER TABLE "VoiceSession" ADD COLUMN IF NOT EXISTS "clientEstimatedSeconds" INTEGER;
ALTER TABLE "VoiceSession" ADD COLUMN IF NOT EXISTS "issuedAt" TIMESTAMP(3);
ALTER TABLE "VoiceSession" ADD COLUMN IF NOT EXISTS "lastEventAt" TIMESTAMP(3);

-- 存量行回填关联 ID 后再设为非空（PostgreSQL 13+ 内置 gen_random_uuid）
UPDATE "VoiceSession" SET "requestId" = gen_random_uuid()::text WHERE "requestId" IS NULL;
ALTER TABLE "VoiceSession" ALTER COLUMN "requestId" SET NOT NULL;
-- 存量会话（此前未对外暴露会话接口）用量来源一律视为未知，而不是「无用量」
UPDATE "VoiceSession" SET "usageState" = 'unknown' WHERE "usageState" = 'none' AND "status" <> 'reserved' AND "usedSeconds" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "VoiceSession_requestId_key" ON "VoiceSession"("requestId");
CREATE UNIQUE INDEX IF NOT EXISTS "VoiceSession_startIdempotencyKey_key" ON "VoiceSession"("startIdempotencyKey");
CREATE INDEX IF NOT EXISTS "VoiceSession_provider_providerSessionId_idx" ON "VoiceSession"("provider", "providerSessionId");
CREATE INDEX IF NOT EXISTS "VoiceSession_deviceId_deviceBindingVersion_idx" ON "VoiceSession"("deviceId", "deviceBindingVersion");

-- ── 供应商调用尝试 ──
CREATE TABLE IF NOT EXISTS "VoiceProviderAttempt" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "provider" TEXT NOT NULL,
    "isMock" BOOLEAN NOT NULL DEFAULT false,
    "operation" TEXT NOT NULL,
    "attemptNo" INTEGER NOT NULL DEFAULT 1,
    "idempotencyKey" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "errorCode" TEXT,
    "retryable" BOOLEAN NOT NULL DEFAULT false,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VoiceProviderAttempt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "VoiceProviderAttempt_idempotencyKey_key" ON "VoiceProviderAttempt"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "VoiceProviderAttempt_sessionId_idx" ON "VoiceProviderAttempt"("sessionId");
CREATE INDEX IF NOT EXISTS "VoiceProviderAttempt_provider_createdAt_idx" ON "VoiceProviderAttempt"("provider", "createdAt");

-- ── 用量回调事件 ──
CREATE TABLE IF NOT EXISTS "VoiceUsageEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sessionId" TEXT,
    "providerSessionId" TEXT,
    "usedSeconds" INTEGER,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "isMock" BOOLEAN NOT NULL DEFAULT false,
    "payloadDigest" TEXT NOT NULL,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VoiceUsageEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "VoiceUsageEvent_provider_eventId_key" ON "VoiceUsageEvent"("provider", "eventId");
CREATE INDEX IF NOT EXISTS "VoiceUsageEvent_sessionId_idx" ON "VoiceUsageEvent"("sessionId");

-- ── 设备台账 ──
CREATE TABLE IF NOT EXISTS "VoiceDevice" (
    "id" TEXT NOT NULL,
    "serialHash" TEXT NOT NULL,
    "serialHint" TEXT NOT NULL,
    "productSku" TEXT NOT NULL,
    "circleId" TEXT,
    "agentProfileId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'unbound',
    "currentUserId" TEXT,
    "bindingVersion" INTEGER NOT NULL DEFAULT 0,
    "bindCodeHash" TEXT,
    "bindCodeExpiresAt" TIMESTAMP(3),
    "providerDeviceRef" TEXT,
    "activationState" TEXT NOT NULL DEFAULT 'pending_vendor',
    "disabledReason" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VoiceDevice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "VoiceDevice_serialHash_key" ON "VoiceDevice"("serialHash");
CREATE UNIQUE INDEX IF NOT EXISTS "VoiceDevice_bindCodeHash_key" ON "VoiceDevice"("bindCodeHash");
CREATE INDEX IF NOT EXISTS "VoiceDevice_currentUserId_idx" ON "VoiceDevice"("currentUserId");
CREATE INDEX IF NOT EXISTS "VoiceDevice_circleId_idx" ON "VoiceDevice"("circleId");
CREATE INDEX IF NOT EXISTS "VoiceDevice_status_idx" ON "VoiceDevice"("status");

CREATE TABLE IF NOT EXISTS "VoiceDeviceBinding" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bindingVersion" INTEGER NOT NULL,
    "boundAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unboundAt" TIMESTAMP(3),
    "endReason" TEXT,
    CONSTRAINT "VoiceDeviceBinding_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "VoiceDeviceBinding_deviceId_bindingVersion_key" ON "VoiceDeviceBinding"("deviceId", "bindingVersion");
CREATE INDEX IF NOT EXISTS "VoiceDeviceBinding_userId_idx" ON "VoiceDeviceBinding"("userId");

CREATE TABLE IF NOT EXISTS "VoiceDeviceTransfer" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    CONSTRAINT "VoiceDeviceTransfer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "VoiceDeviceTransfer_tokenHash_key" ON "VoiceDeviceTransfer"("tokenHash");
CREATE INDEX IF NOT EXISTS "VoiceDeviceTransfer_deviceId_status_idx" ON "VoiceDeviceTransfer"("deviceId", "status");

DO $$ BEGIN
  ALTER TABLE "VoiceDeviceBinding" ADD CONSTRAINT "VoiceDeviceBinding_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "VoiceDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "VoiceDeviceTransfer" ADD CONSTRAINT "VoiceDeviceTransfer_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "VoiceDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 有声读书断点 ──
CREATE TABLE IF NOT EXISTS "AudioListenProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "textType" TEXT NOT NULL DEFAULT 'original',
    "segmentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "positionMs" INTEGER NOT NULL DEFAULT 0,
    "rate" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AudioListenProgress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AudioListenProgress_userId_chapterId_textType_key" ON "AudioListenProgress"("userId", "chapterId", "textType");
CREATE INDEX IF NOT EXISTS "AudioListenProgress_userId_bookId_idx" ON "AudioListenProgress"("userId", "bookId");

-- ── 译文人工复核 ──
ALTER TABLE "TextDerivedAsset" ADD COLUMN IF NOT EXISTS "reviewStatus" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "TextDerivedAsset" ADD COLUMN IF NOT EXISTS "reviewedBy" TEXT;
ALTER TABLE "TextDerivedAsset" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
