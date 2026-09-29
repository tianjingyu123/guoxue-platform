CREATE TABLE "ImFallbackMessage" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "content" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    CONSTRAINT "ImFallbackMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImFallbackConversationPreference" (
    "userId" TEXT NOT NULL,
    "peerUserId" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "hiddenBefore" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ImFallbackConversationPreference_pkey" PRIMARY KEY ("userId", "peerUserId")
);

CREATE INDEX "ImFallbackMessage_fromUserId_toUserId_createdAt_idx" ON "ImFallbackMessage"("fromUserId", "toUserId", "createdAt");
CREATE INDEX "ImFallbackMessage_toUserId_fromUserId_createdAt_idx" ON "ImFallbackMessage"("toUserId", "fromUserId", "createdAt");
CREATE INDEX "ImFallbackMessage_toUserId_readAt_createdAt_idx" ON "ImFallbackMessage"("toUserId", "readAt", "createdAt");
CREATE INDEX "ImFallbackConversationPreference_userId_isPinned_updatedAt_idx" ON "ImFallbackConversationPreference"("userId", "isPinned", "updatedAt");

ALTER TABLE "BrandConfig" ADD COLUMN "serviceWechatQrUrl" TEXT NOT NULL DEFAULT '';
