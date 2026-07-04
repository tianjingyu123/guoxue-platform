-- OS-P1 数字员工运营 OS：任务池 OpsTask（2026-07-05·设计§2.1）
-- 数字员工与真人从同一池取任务（pending→claim→complete / 转 needs_review），状态存 DB 不存脑内。
-- AuditLog 的 executor / rollbackData 列早已存在（无需增量），本批仅新建 OpsTask。
-- 幂等 DDL：IF NOT EXISTS 全覆盖，可重复执行。

CREATE TABLE IF NOT EXISTS "OpsTask" (
  "id"            text NOT NULL DEFAULT gen_random_uuid(),
  "type"          text NOT NULL,
  "priority"      text NOT NULL DEFAULT 'MEDIUM',
  "status"        text NOT NULL DEFAULT 'pending',
  "title"         text NOT NULL,
  "executor"      text,
  "payload"       jsonb NOT NULL DEFAULT '{}',
  "result"        jsonb,
  "reviewReason"  text,
  "needsApproval" boolean NOT NULL DEFAULT false,
  "createdAt"     timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpsTask_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "OpsTask_status_priority_idx" ON "OpsTask"("status", "priority");
CREATE INDEX IF NOT EXISTS "OpsTask_type_status_idx" ON "OpsTask"("type", "status");
CREATE INDEX IF NOT EXISTS "OpsTask_createdAt_idx" ON "OpsTask"("createdAt");
