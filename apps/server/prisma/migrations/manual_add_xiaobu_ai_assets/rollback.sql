-- 回滚 manual_add_xiaobu_ai_assets。会删除段落、文本派生、音频资产元数据与 AI 用量记录，执行前必须备份。
-- 注意：音频对象存储中的文件不会被删除，需按 AudioAsset.storageKey 另行清理。
BEGIN;
ALTER TABLE "ClassicReadingNote" DROP CONSTRAINT IF EXISTS "ClassicReadingNote_segmentId_fkey";
ALTER TABLE "ClassicAnnotation" DROP CONSTRAINT IF EXISTS "ClassicAnnotation_segmentId_fkey";
DROP INDEX IF EXISTS "ClassicReadingNote_segmentId_idx";
DROP INDEX IF EXISTS "ClassicAnnotation_segmentId_idx";
ALTER TABLE "ClassicReadingNote" DROP COLUMN IF EXISTS "segmentId";
ALTER TABLE "ClassicAnnotation" DROP COLUMN IF EXISTS "segmentId";
DROP TABLE IF EXISTS "ReportDialogueTurn";
DROP TABLE IF EXISTS "VoiceAgentProfileVersion";
DROP TABLE IF EXISTS "VoiceAgentProfile";
DROP TABLE IF EXISTS "VoiceQuotaLedger";
DROP TABLE IF EXISTS "VoiceSession";
DROP TABLE IF EXISTS "VoiceQuotaAccount";
DROP TABLE IF EXISTS "PaipanReportKnowledge";
DROP TABLE IF EXISTS "AiUsageRecord";
DROP TABLE IF EXISTS "AudioAsset";
DROP TABLE IF EXISTS "TextDerivedAsset";
DROP TABLE IF EXISTS "ClassicSegment";
COMMIT;
