-- 回滚：删除设备身份锁定三列（回滚后设备重新只按 MAC 识别）
ALTER TABLE "VoiceDevice" DROP COLUMN IF EXISTS "terminalPinSource";
ALTER TABLE "VoiceDevice" DROP COLUMN IF EXISTS "terminalPinnedAt";
ALTER TABLE "VoiceDevice" DROP COLUMN IF EXISTS "terminalIdHash";
