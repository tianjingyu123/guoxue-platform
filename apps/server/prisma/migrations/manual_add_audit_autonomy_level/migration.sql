-- Migration: manual_add_audit_autonomy_level（治理护栏 §2.1 · 自主分级留痕）
-- 给 AuditLog 增加 autonomyLevel 列：自动化动作记录其 L1/L2/L3 执行档位，供治理盘点与审计追溯
-- 只增不删·可重复执行（IF NOT EXISTS）

ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "autonomyLevel" TEXT;
