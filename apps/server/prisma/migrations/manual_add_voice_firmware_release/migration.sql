-- 小智协议终端固件发布（在线升级通道）：发布表 + 单设备推送状态表
-- 只新建表，不改已有数据。回滚见 rollback.sql
-- CreateTable
CREATE TABLE IF NOT EXISTS "VoiceFirmwareRelease" (
    "id" TEXT NOT NULL,
    "boardName" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "chipId" INTEGER NOT NULL,
    "fileKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "rolloutPercent" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceFirmwareRelease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "VoiceFirmwareDeviceState" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "fromVersion" TEXT NOT NULL,
    "offers" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'offered',
    "firstOfferAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastOfferAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "VoiceFirmwareDeviceState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VoiceFirmwareRelease_boardName_status_idx" ON "VoiceFirmwareRelease"("boardName", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "VoiceFirmwareRelease_boardName_version_key" ON "VoiceFirmwareRelease"("boardName", "version");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VoiceFirmwareDeviceState_deviceId_idx" ON "VoiceFirmwareDeviceState"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "VoiceFirmwareDeviceState_releaseId_deviceId_key" ON "VoiceFirmwareDeviceState"("releaseId", "deviceId");

-- AddForeignKey（重复执行时跳过）
DO $$ BEGIN
  ALTER TABLE "VoiceFirmwareDeviceState" ADD CONSTRAINT "VoiceFirmwareDeviceState_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "VoiceFirmwareRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
