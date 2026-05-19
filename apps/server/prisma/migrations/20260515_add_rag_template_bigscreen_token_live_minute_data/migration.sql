-- CreateTable
CREATE TABLE "RagPromptTemplate" (
    "id" TEXT NOT NULL,
    "scene" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "userPromptTemplate" TEXT,
    "variables" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RagPromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BigScreenToken" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3) NOT NULL,
    "ipWhitelist" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "revokedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "BigScreenToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveMinuteData" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "minute" TIMESTAMP(3) NOT NULL,
    "onlineCount" INTEGER NOT NULL DEFAULT 0,
    "gmw" INTEGER NOT NULL DEFAULT 0,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "giftAmount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveMinuteData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RagPromptTemplate_scene_idx" ON "RagPromptTemplate"("scene");

-- CreateIndex
CREATE INDEX "RagPromptTemplate_status_idx" ON "RagPromptTemplate"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BigScreenToken_token_key" ON "BigScreenToken"("token");

-- CreateIndex
CREATE INDEX "BigScreenToken_token_idx" ON "BigScreenToken"("token");

-- CreateIndex
CREATE INDEX "BigScreenToken_status_idx" ON "BigScreenToken"("status");

-- CreateIndex
CREATE INDEX "BigScreenToken_validTo_idx" ON "BigScreenToken"("validTo");

-- CreateIndex
CREATE INDEX "LiveMinuteData_roomId_idx" ON "LiveMinuteData"("roomId");

-- CreateIndex
CREATE INDEX "LiveMinuteData_roomId_minute_idx" ON "LiveMinuteData"("roomId", "minute");

-- CreateIndex
CREATE INDEX "LiveMinuteData_minute_idx" ON "LiveMinuteData"("minute");
