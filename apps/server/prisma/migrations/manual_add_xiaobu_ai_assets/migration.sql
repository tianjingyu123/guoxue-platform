-- 小卜 AI：古籍段落、文本派生资产、音频资产、AI 用量记录、排盘报告知识库、语音额度账本、语音角色审核、报告问答记录（2026-09-17）
-- 由 prisma migrate diff 生成：旧 schema（不含上述模型与 segmentId 字段）→ 当前 schema.prisma。
-- 纯新增：只 CREATE TABLE / ADD COLUMN(可空) / CREATE INDEX / ADD FK，不修改或删除已有数据。
-- 若目标库曾用 db push 建过同名表，执行会报错停止，需先核对表结构，不要改成 IF NOT EXISTS 静默跳过。
-- 回滚：同目录 rollback.sql（会删除这些新表中的数据，执行前先备份）。

-- AlterTable
ALTER TABLE "ClassicAnnotation" ADD COLUMN     "segmentId" TEXT;

-- AlterTable
ALTER TABLE "ClassicReadingNote" ADD COLUMN     "segmentId" TEXT;

-- CreateTable
CREATE TABLE "ClassicSegment" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "originalContent" TEXT NOT NULL,
    "startCharOffset" INTEGER NOT NULL,
    "endCharOffset" INTEGER NOT NULL,
    "versionTag" TEXT DEFAULT 'v1',
    "processingStatus" TEXT NOT NULL DEFAULT 'raw',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassicSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TextDerivedAsset" (
    "id" TEXT NOT NULL,
    "assetKey" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "contextHash" TEXT,
    "processingType" TEXT NOT NULL,
    "strategy" TEXT,
    "modelPolicy" TEXT,
    "model" TEXT,
    "promptVersion" TEXT,
    "language" TEXT NOT NULL DEFAULT 'zh-CN',
    "qualityVersion" TEXT,
    "result" TEXT NOT NULL,
    "resultHash" TEXT NOT NULL,
    "processingStatus" TEXT NOT NULL DEFAULT 'processing',
    "errorMessage" TEXT,
    "processingStartedAt" TIMESTAMP(3),
    "processingEndedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TextDerivedAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudioAsset" (
    "id" TEXT NOT NULL,
    "assetKey" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "textVersion" TEXT NOT NULL,
    "textType" TEXT NOT NULL,
    "ttsProvider" TEXT NOT NULL,
    "requestedProvider" TEXT,
    "voiceId" TEXT NOT NULL,
    "voiceVersion" TEXT,
    "pronunciationDict" TEXT,
    "pauseStrategy" TEXT,
    "audioFormat" TEXT NOT NULL DEFAULT 'mp3',
    "synthesisParams" JSONB,
    "storageKey" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "durationMs" INTEGER,
    "fileSize" INTEGER,
    "contentHash" TEXT NOT NULL,
    "synthesisStatus" TEXT NOT NULL DEFAULT 'synthesizing',
    "isPlayable" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "synthesisStartedAt" TIMESTAMP(3),
    "synthesisEndedAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AudioAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportDialogueTurn" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sectionId" TEXT,
    "evidenceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mode" TEXT,
    "model" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'text',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportDialogueTurn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceAgentProfile" (
    "id" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "persona" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "voiceId" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'lite',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "draftVersion" INTEGER NOT NULL DEFAULT 1,
    "activeVersion" INTEGER,
    "riskFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reviewNote" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "submittedBy" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceAgentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceAgentProfileVersion" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "persona" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "voiceId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "approvedBy" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceAgentProfileVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceQuotaAccount" (
    "id" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "balanceSeconds" INTEGER NOT NULL DEFAULT 0,
    "reservedSeconds" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceQuotaAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT,
    "scene" TEXT NOT NULL,
    "contextType" TEXT,
    "contextId" TEXT,
    "tier" TEXT NOT NULL DEFAULT 'lite',
    "status" TEXT NOT NULL DEFAULT 'reserved',
    "reservedSeconds" INTEGER NOT NULL DEFAULT 0,
    "maxSeconds" INTEGER NOT NULL,
    "usedSeconds" INTEGER,
    "usageSource" TEXT,
    "providerSessionId" TEXT,
    "supplierCostMicro" BIGINT,
    "priceRuleVersion" TEXT,
    "endReason" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "VoiceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceQuotaLedger" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "sessionId" TEXT,
    "type" TEXT NOT NULL,
    "seconds" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "note" TEXT,
    "operatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceQuotaLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaipanReportKnowledge" (
    "id" TEXT NOT NULL,
    "paipanType" TEXT NOT NULL DEFAULT 'bazi',
    "school" TEXT,
    "kind" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "bookTitle" TEXT,
    "chapterTitle" TEXT,
    "classicBookId" TEXT,
    "classicChapterId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaipanReportKnowledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsageRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "scene" TEXT NOT NULL,
    "relatedType" TEXT,
    "relatedId" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "cachedTokens" INTEGER NOT NULL DEFAULT 0,
    "cost" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "requestId" TEXT,
    "idempotencyKey" TEXT,
    "isStreaming" BOOLEAN NOT NULL DEFAULT false,
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassicSegment_chapterId_idx" ON "ClassicSegment"("chapterId");

-- CreateIndex
CREATE INDEX "ClassicSegment_contentHash_idx" ON "ClassicSegment"("contentHash");

-- CreateIndex
CREATE INDEX "ClassicSegment_chapterId_versionTag_idx" ON "ClassicSegment"("chapterId", "versionTag");

-- CreateIndex
CREATE UNIQUE INDEX "ClassicSegment_chapterId_sortOrder_key" ON "ClassicSegment"("chapterId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "TextDerivedAsset_assetKey_key" ON "TextDerivedAsset"("assetKey");

-- CreateIndex
CREATE INDEX "TextDerivedAsset_sourceType_sourceId_idx" ON "TextDerivedAsset"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "TextDerivedAsset_contentHash_idx" ON "TextDerivedAsset"("contentHash");

-- CreateIndex
CREATE INDEX "TextDerivedAsset_resultHash_idx" ON "TextDerivedAsset"("resultHash");

-- CreateIndex
CREATE INDEX "TextDerivedAsset_processingStatus_idx" ON "TextDerivedAsset"("processingStatus");

-- CreateIndex
CREATE INDEX "TextDerivedAsset_qualityVersion_idx" ON "TextDerivedAsset"("qualityVersion");

-- CreateIndex
CREATE UNIQUE INDEX "AudioAsset_assetKey_key" ON "AudioAsset"("assetKey");

-- CreateIndex
CREATE INDEX "AudioAsset_sourceType_sourceId_idx" ON "AudioAsset"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "AudioAsset_textVersion_idx" ON "AudioAsset"("textVersion");

-- CreateIndex
CREATE INDEX "AudioAsset_storageKey_idx" ON "AudioAsset"("storageKey");

-- CreateIndex
CREATE INDEX "AudioAsset_synthesisStatus_idx" ON "AudioAsset"("synthesisStatus");

-- CreateIndex
CREATE INDEX "AudioAsset_isPlayable_idx" ON "AudioAsset"("isPlayable");

-- CreateIndex
CREATE INDEX "AudioAsset_ttsProvider_voiceId_idx" ON "AudioAsset"("ttsProvider", "voiceId");

-- CreateIndex
CREATE INDEX "ReportDialogueTurn_reportId_userId_createdAt_idx" ON "ReportDialogueTurn"("reportId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "ReportDialogueTurn_userId_createdAt_idx" ON "ReportDialogueTurn"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "VoiceAgentProfile_status_idx" ON "VoiceAgentProfile"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceAgentProfile_ownerType_ownerId_key" ON "VoiceAgentProfile"("ownerType", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceAgentProfileVersion_profileId_version_key" ON "VoiceAgentProfileVersion"("profileId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceQuotaAccount_ownerType_ownerId_key" ON "VoiceQuotaAccount"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "VoiceSession_userId_startedAt_idx" ON "VoiceSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "VoiceSession_accountId_idx" ON "VoiceSession"("accountId");

-- CreateIndex
CREATE INDEX "VoiceSession_status_idx" ON "VoiceSession"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceQuotaLedger_idempotencyKey_key" ON "VoiceQuotaLedger"("idempotencyKey");

-- CreateIndex
CREATE INDEX "VoiceQuotaLedger_accountId_createdAt_idx" ON "VoiceQuotaLedger"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "VoiceQuotaLedger_sessionId_idx" ON "VoiceQuotaLedger"("sessionId");

-- CreateIndex
CREATE INDEX "PaipanReportKnowledge_paipanType_status_idx" ON "PaipanReportKnowledge"("paipanType", "status");

-- CreateIndex
CREATE INDEX "PaipanReportKnowledge_paipanType_school_status_idx" ON "PaipanReportKnowledge"("paipanType", "school", "status");

-- CreateIndex
CREATE INDEX "PaipanReportKnowledge_topic_idx" ON "PaipanReportKnowledge"("topic");

-- CreateIndex
CREATE UNIQUE INDEX "AiUsageRecord_idempotencyKey_key" ON "AiUsageRecord"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AiUsageRecord_userId_idx" ON "AiUsageRecord"("userId");

-- CreateIndex
CREATE INDEX "AiUsageRecord_scene_idx" ON "AiUsageRecord"("scene");

-- CreateIndex
CREATE INDEX "AiUsageRecord_provider_model_idx" ON "AiUsageRecord"("provider", "model");

-- CreateIndex
CREATE INDEX "AiUsageRecord_createdAt_idx" ON "AiUsageRecord"("createdAt");

-- CreateIndex
CREATE INDEX "AiUsageRecord_relatedType_relatedId_idx" ON "AiUsageRecord"("relatedType", "relatedId");

-- CreateIndex
CREATE INDEX "ClassicAnnotation_segmentId_idx" ON "ClassicAnnotation"("segmentId");

-- CreateIndex
CREATE INDEX "ClassicReadingNote_segmentId_idx" ON "ClassicReadingNote"("segmentId");

-- AddForeignKey
ALTER TABLE "ClassicSegment" ADD CONSTRAINT "ClassicSegment_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "ClassicChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassicAnnotation" ADD CONSTRAINT "ClassicAnnotation_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "ClassicSegment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassicReadingNote" ADD CONSTRAINT "ClassicReadingNote_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "ClassicSegment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceAgentProfileVersion" ADD CONSTRAINT "VoiceAgentProfileVersion_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "VoiceAgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

