-- LiveMic: 直播麦位管理
CREATE TABLE "LiveMic" (
    "id" TEXT NOT NULL,
    "liveRoomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OCCUPIED',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveMic_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LiveMic_liveRoomId_position_key" ON "LiveMic"("liveRoomId", "position");
CREATE INDEX "LiveMic_liveRoomId_idx" ON "LiveMic"("liveRoomId");
CREATE INDEX "LiveMic_userId_idx" ON "LiveMic"("userId");
ALTER TABLE "LiveMic" ADD CONSTRAINT "LiveMic_liveRoomId_fkey" FOREIGN KEY ("liveRoomId") REFERENCES "LiveRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- LiveSlide: 直播课件
CREATE TABLE "LiveSlide" (
    "id" TEXT NOT NULL,
    "liveRoomId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'IMAGE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveSlide_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LiveSlide_liveRoomId_idx" ON "LiveSlide"("liveRoomId");
ALTER TABLE "LiveSlide" ADD CONSTRAINT "LiveSlide_liveRoomId_fkey" FOREIGN KEY ("liveRoomId") REFERENCES "LiveRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- LiveMutedUser: 直播间禁言
CREATE TABLE "LiveMutedUser" (
    "id" TEXT NOT NULL,
    "liveRoomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mutedBy" TEXT NOT NULL,
    "mutedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "LiveMutedUser_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LiveMutedUser_liveRoomId_userId_key" ON "LiveMutedUser"("liveRoomId", "userId");
CREATE INDEX "LiveMutedUser_liveRoomId_idx" ON "LiveMutedUser"("liveRoomId");
ALTER TABLE "LiveMutedUser" ADD CONSTRAINT "LiveMutedUser_liveRoomId_fkey" FOREIGN KEY ("liveRoomId") REFERENCES "LiveRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- LiveFlashSale: 直播限时秒杀
CREATE TABLE "LiveFlashSale" (
    "id" TEXT NOT NULL,
    "liveRoomId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "flashPrice" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveFlashSale_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LiveFlashSale_liveRoomId_status_idx" ON "LiveFlashSale"("liveRoomId", "status");
CREATE INDEX "LiveFlashSale_productId_idx" ON "LiveFlashSale"("productId");
ALTER TABLE "LiveFlashSale" ADD CONSTRAINT "LiveFlashSale_liveRoomId_fkey" FOREIGN KEY ("liveRoomId") REFERENCES "LiveRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- LiveAuditLog: 直播内容审核日志
CREATE TABLE "LiveAuditLog" (
    "id" TEXT NOT NULL,
    "liveRoomId" TEXT NOT NULL,
    "screenshotUrl" TEXT,
    "auditResult" TEXT NOT NULL DEFAULT 'PENDING',
    "label" TEXT,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LiveAuditLog_liveRoomId_createdAt_idx" ON "LiveAuditLog"("liveRoomId", "createdAt");
ALTER TABLE "LiveAuditLog" ADD CONSTRAINT "LiveAuditLog_liveRoomId_fkey" FOREIGN KEY ("liveRoomId") REFERENCES "LiveRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
