-- 小智协议终端设备身份锁定：MAC + 设备私有 ID（Client-Id 的 HMAC）
-- 只加可空列，不改已有数据；已登记设备在下次联网时锁定。回滚见 rollback.sql
ALTER TABLE "VoiceDevice" ADD COLUMN IF NOT EXISTS "terminalIdHash" TEXT;
ALTER TABLE "VoiceDevice" ADD COLUMN IF NOT EXISTS "terminalPinnedAt" TIMESTAMP(3);
ALTER TABLE "VoiceDevice" ADD COLUMN IF NOT EXISTS "terminalPinSource" TEXT;
