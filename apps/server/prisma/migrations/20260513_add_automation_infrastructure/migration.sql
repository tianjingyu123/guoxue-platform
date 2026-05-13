-- 任务优先级枚举
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
-- 任务状态枚举
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'NEEDS_REVIEW', 'CANCELLED');
-- 任务类型枚举
CREATE TYPE "TaskType" AS ENUM ('CODE_DEVELOP', 'BUG_FIX', 'DATA_ANALYSIS', 'USER_FEEDBACK', 'CONTENT_REVIEW', 'FINANCE_CHECK', 'SYSTEM_HEALTH', 'SCHEDULED_TASK');

-- 任务表
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "type" "TaskType" NOT NULL,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "executorType" TEXT NOT NULL,
    "executorId" TEXT,
    "snapshot" JSONB,
    "result" JSONB,
    "errorLog" TEXT,
    "rollbackData" JSONB,
    "rollbackUrl" TEXT,
    "needsApproval" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- 任务流转日志表
CREATE TABLE "TaskTransferLog" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "fromType" TEXT NOT NULL,
    "fromId" TEXT,
    "toType" TEXT NOT NULL,
    "toId" TEXT,
    "reason" TEXT NOT NULL,
    "snapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskTransferLog_pkey" PRIMARY KEY ("id")
);

-- 自动化权限表
CREATE TABLE "AutomationPermission" (
    "id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationPermission_pkey" PRIMARY KEY ("id")
);

-- 自动化角色表
CREATE TABLE "AutomationRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRole_pkey" PRIMARY KEY ("id")
);

-- 角色权限关联表
CREATE TABLE "AutomationRolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "AutomationRolePermission_pkey" PRIMARY KEY ("id")
);

-- 角色分配表
CREATE TABLE "AutomationRoleAssignee" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationRoleAssignee_pkey" PRIMARY KEY ("id")
);

-- AuditLog 扩展字段
ALTER TABLE "AuditLog" ADD COLUMN "executor" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "rollbackData" JSONB;

-- 索引
CREATE INDEX "Task_status_idx" ON "Task"("status");
CREATE INDEX "Task_executorType_status_idx" ON "Task"("executorType", "status");
CREATE INDEX "Task_priority_idx" ON "Task"("priority");
CREATE INDEX "TaskTransferLog_taskId_idx" ON "TaskTransferLog"("taskId");
CREATE INDEX "AutomationPermission_resource_action_key" ON "AutomationPermission"("resource", "action");
CREATE UNIQUE INDEX "AutomationRole_name_key" ON "AutomationRole"("name");
CREATE UNIQUE INDEX "AutomationRolePermission_roleId_permissionId_key" ON "AutomationRolePermission"("roleId", "permissionId");
CREATE UNIQUE INDEX "AutomationRoleAssignee_roleId_userId_key" ON "AutomationRoleAssignee"("roleId", "userId");
CREATE INDEX "AuditLog_executor_createdAt_idx" ON "AuditLog"("executor", "createdAt");

-- 外键
ALTER TABLE "TaskTransferLog" ADD CONSTRAINT "TaskTransferLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AutomationRolePermission" ADD CONSTRAINT "AutomationRolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "AutomationRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AutomationRolePermission" ADD CONSTRAINT "AutomationRolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "AutomationPermission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AutomationRoleAssignee" ADD CONSTRAINT "AutomationRoleAssignee_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "AutomationRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
