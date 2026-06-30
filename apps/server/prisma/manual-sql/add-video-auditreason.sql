-- 短视频审核流：Video 表新增驳回原因列（2026-06-29 批次5）
ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "auditReason" TEXT;
