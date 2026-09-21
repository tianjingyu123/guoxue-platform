-- 回滚：小卜语音供应商适配边界 / 设备台账 / 听书断点 / 译文人工复核
-- 注意：删除设备台账与会话扩展列会丢失这些字段上的数据。执行前先备份相关表。
DROP TABLE IF EXISTS "AudioListenProgress";
DROP TABLE IF EXISTS "VoiceDeviceTransfer";
DROP TABLE IF EXISTS "VoiceDeviceBinding";
DROP TABLE IF EXISTS "VoiceDevice";
DROP TABLE IF EXISTS "VoiceUsageEvent";
DROP TABLE IF EXISTS "VoiceProviderAttempt";

DROP INDEX IF EXISTS "VoiceSession_deviceId_deviceBindingVersion_idx";
DROP INDEX IF EXISTS "VoiceSession_provider_providerSessionId_idx";
DROP INDEX IF EXISTS "VoiceSession_startIdempotencyKey_key";
DROP INDEX IF EXISTS "VoiceSession_requestId_key";
ALTER TABLE "VoiceSession"
  DROP COLUMN IF EXISTS "lastEventAt",
  DROP COLUMN IF EXISTS "issuedAt",
  DROP COLUMN IF EXISTS "clientEstimatedSeconds",
  DROP COLUMN IF EXISTS "deviceBindingVersion",
  DROP COLUMN IF EXISTS "deviceId",
  DROP COLUMN IF EXISTS "contextDigest",
  DROP COLUMN IF EXISTS "contextVersion",
  DROP COLUMN IF EXISTS "userSatisfaction",
  DROP COLUMN IF EXISTS "answerCompleteness",
  DROP COLUMN IF EXISTS "technicalOutcome",
  DROP COLUMN IF EXISTS "usageState",
  DROP COLUMN IF EXISTS "startIdempotencyKey",
  DROP COLUMN IF EXISTS "requestId",
  DROP COLUMN IF EXISTS "agentId",
  DROP COLUMN IF EXISTS "providerIsMock",
  DROP COLUMN IF EXISTS "provider";

ALTER TABLE "TextDerivedAsset"
  DROP COLUMN IF EXISTS "reviewedAt",
  DROP COLUMN IF EXISTS "reviewedBy",
  DROP COLUMN IF EXISTS "reviewStatus";
