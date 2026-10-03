-- 语音会话：记录最近一次用户输入时间（决策人 2026-09-21：1 分钟无新输入自动结束）
-- 只加可空列，不改已有数据；已结束的历史会话保持为空
ALTER TABLE "VoiceSession" ADD COLUMN IF NOT EXISTS "lastInputAt" TIMESTAMP(3);
