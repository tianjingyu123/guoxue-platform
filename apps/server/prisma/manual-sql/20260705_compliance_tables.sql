-- 合-P1 违禁词扫描体系：敏感词落库表 + 合规扫描记录表（2026-07-05）
-- 敏感词系统从 Redis Set 升级为 DB 真源（word 唯一 + category 分级 + B 级 replacement 替换建议）。
-- ComplianceScanRecord 为全站内容域扫描报告 + admin 复核队列；四元组唯一约束保证幂等（同目标同字段同词不重复产出）。
-- 幂等 DDL：IF NOT EXISTS 全覆盖，可重复执行。

CREATE TABLE IF NOT EXISTS "SensitiveWord" (
  "id"          text NOT NULL DEFAULT gen_random_uuid(),
  "word"        text NOT NULL,
  "category"    text NOT NULL DEFAULT 'GENERAL',
  "replacement" text,
  "enabled"     boolean NOT NULL DEFAULT true,
  "remark"      text,
  "createdAt"   timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SensitiveWord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SensitiveWord_word_key" ON "SensitiveWord"("word");
CREATE INDEX IF NOT EXISTS "SensitiveWord_category_enabled_idx" ON "SensitiveWord"("category", "enabled");

CREATE TABLE IF NOT EXISTS "ComplianceScanRecord" (
  "id"         text NOT NULL DEFAULT gen_random_uuid(),
  "scanAt"     timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "targetType" text NOT NULL,
  "targetId"   text NOT NULL,
  "field"      text NOT NULL,
  "word"       text NOT NULL,
  "level"      text NOT NULL,
  "suggestion" text,
  "snippet"    text,
  "status"     text NOT NULL DEFAULT 'OPEN',
  "resolvedBy" text,
  "resolvedAt" timestamp(3),
  "createdAt"  timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComplianceScanRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ComplianceScanRecord_targetType_targetId_field_word_key"
  ON "ComplianceScanRecord"("targetType", "targetId", "field", "word");
CREATE INDEX IF NOT EXISTS "ComplianceScanRecord_status_level_scanAt_idx"
  ON "ComplianceScanRecord"("status", "level", "scanAt");
CREATE INDEX IF NOT EXISTS "ComplianceScanRecord_targetType_targetId_idx"
  ON "ComplianceScanRecord"("targetType", "targetId");
