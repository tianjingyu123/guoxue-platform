-- P4-7 数据库索引优化：添加高频查询缺失的复合索引
-- 基于 Schema 审计，覆盖 11 个关键查询路径
-- 2026-05-13

-- Post: 圈内按状态过滤（内容审核/管理后台）
CREATE INDEX "Post_circleId_status_createdAt_idx" ON "Post"("circleId", "status", "createdAt");

-- Comment: 用户评论历史
CREATE INDEX "Comment_userId_createdAt_idx" ON "Comment"("userId", "createdAt");

-- Notification: 按类型过滤通知
CREATE INDEX "Notification_userId_type_createdAt_idx" ON "Notification"("userId", "type", "createdAt");

-- Order: 用户按状态查订单（最常见查询）
CREATE INDEX "Order_userId_status_idx" ON "Order"("userId", "status");

-- BotChatLog: 用户对话历史（替换单列 userId 索引）
DROP INDEX "BotChatLog_userId_idx";
CREATE INDEX "BotChatLog_userId_createdAt_idx" ON "BotChatLog"("userId", "createdAt");

-- Video: 圈内视频列表
CREATE INDEX "Video_circleId_status_createdAt_idx" ON "Video"("circleId", "status", "createdAt");

-- Article: 圈内文章审核列表
CREATE INDEX "Article_circleId_auditStatus_createdAt_idx" ON "Article"("circleId", "auditStatus", "createdAt");

-- LiveRoom: 圈内直播列表
CREATE INDEX "LiveRoom_circleId_status_idx" ON "LiveRoom"("circleId", "status");

-- OperationLog: 用户操作日志 + 按操作类型查询（替换单列索引）
DROP INDEX "OperationLog_userId_idx";
CREATE INDEX "OperationLog_userId_createdAt_idx" ON "OperationLog"("userId", "createdAt");
DROP INDEX "OperationLog_action_idx";
CREATE INDEX "OperationLog_action_createdAt_idx" ON "OperationLog"("action", "createdAt");

-- Course: 圈内课程审核列表
CREATE INDEX "Course_circleId_auditStatus_createdAt_idx" ON "Course"("circleId", "auditStatus", "createdAt");
