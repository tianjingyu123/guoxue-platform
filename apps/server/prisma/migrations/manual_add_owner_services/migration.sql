-- 圈主语音助理：圈主自己提供的服务（助理优先引导到这里，不把成员外推给平台其他老师）
ALTER TABLE "VoiceAgentProfile" ADD COLUMN IF NOT EXISTS "ownerServices" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
