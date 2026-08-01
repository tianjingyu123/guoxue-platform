-- 内容开放范围 + 审核体系 P1（schema 迁移·幂等可重跑）
-- 注：原文件在项目迁移 D 盘过程中丢失（未进 git 保存点），2026-07-10 依据 schema.prisma 重建。
-- 内容：四类内容加 visibility；Video/LiveRoom 补 auditStatus/auditReason；LiveRoom 加回放字段；ContentAuditRecord 待审队列索引。

ALTER TABLE "Article"  ADD COLUMN IF NOT EXISTS "visibility" TEXT NOT NULL DEFAULT 'CIRCLE_ONLY';
ALTER TABLE "Course"   ADD COLUMN IF NOT EXISTS "visibility" TEXT NOT NULL DEFAULT 'CIRCLE_ONLY';

ALTER TABLE "Video"    ADD COLUMN IF NOT EXISTS "visibility"  TEXT NOT NULL DEFAULT 'CIRCLE_ONLY';
ALTER TABLE "Video"    ADD COLUMN IF NOT EXISTS "auditStatus" TEXT NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "Video"    ADD COLUMN IF NOT EXISTS "auditReason" TEXT;

ALTER TABLE "LiveRoom" ADD COLUMN IF NOT EXISTS "visibility"       TEXT NOT NULL DEFAULT 'CIRCLE_ONLY';
ALTER TABLE "LiveRoom" ADD COLUMN IF NOT EXISTS "auditStatus"      TEXT NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "LiveRoom" ADD COLUMN IF NOT EXISTS "auditReason"      TEXT;
ALTER TABLE "LiveRoom" ADD COLUMN IF NOT EXISTS "replayVisibility" TEXT NOT NULL DEFAULT 'CIRCLE_ONLY';
ALTER TABLE "LiveRoom" ADD COLUMN IF NOT EXISTS "replayCharge"     BOOLEAN NOT NULL DEFAULT false;

-- ContentAuditRecord 待审队列索引（表已存在·只补索引）
CREATE INDEX IF NOT EXISTS "ContentAuditRecord_finalStatus_idx" ON "ContentAuditRecord"("finalStatus");
CREATE INDEX IF NOT EXISTS "ContentAuditRecord_isRecommended_finalStatus_createdAt_idx" ON "ContentAuditRecord"("isRecommended", "finalStatus", "createdAt");
CREATE INDEX IF NOT EXISTS "ContentAuditRecord_circleId_createdAt_idx" ON "ContentAuditRecord"("circleId", "createdAt");
