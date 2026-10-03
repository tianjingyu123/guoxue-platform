-- 排盘报告应验回访表（2026-09-19）
--
-- 用途：补上「报告之后到底怎么样了」这一环。报告本身存在 AiAnalysisRecord，
-- 加上这张表之后，每一次排盘 + 一次回访就构成一条带完整推理链的案例，
-- 这是案例库唯一能持续长大的来源。
--
-- 纯新增：只 CREATE TABLE / CREATE INDEX / ADD CONSTRAINT，不修改也不删除任何已有数据与结构。
-- 未加外键约束：paipanRecordId / analysisId 允许指向已被清理的记录（反馈本身仍有统计价值），
-- 与 AiAnalysisRecord 对 paipanRecordId 的可空处理同一思路。
--
-- 回滚：同目录 rollback.sql（会删除本表全部数据，执行前先备份）。

-- CreateTable
CREATE TABLE "PaipanCaseFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paipanRecordId" TEXT NOT NULL,
    "analysisId" TEXT,
    "paipanType" TEXT NOT NULL,
    "matter" TEXT NOT NULL DEFAULT '',
    "reportedAt" TIMESTAMP(3) NOT NULL,
    "outcomeAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verdict" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "whichRight" TEXT,
    "whichWrong" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'prompted',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "lesson" TEXT,
    "reviewNote" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "desensitized" BOOLEAN NOT NULL DEFAULT true,
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaipanCaseFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaipanCaseFeedback_paipanType_status_idx" ON "PaipanCaseFeedback"("paipanType", "status");
CREATE INDEX "PaipanCaseFeedback_paipanType_verdict_outcomeAt_idx" ON "PaipanCaseFeedback"("paipanType", "verdict", "outcomeAt");
CREATE INDEX "PaipanCaseFeedback_paipanRecordId_idx" ON "PaipanCaseFeedback"("paipanRecordId");
CREATE INDEX "PaipanCaseFeedback_userId_createdAt_idx" ON "PaipanCaseFeedback"("userId", "createdAt");
CREATE INDEX "PaipanCaseFeedback_status_outcomeAt_idx" ON "PaipanCaseFeedback"("status", "outcomeAt");

-- 结果必须晚于报告。这不是防呆，是案例有效性的唯一凭据——
-- 断语写在结果发生之前，这条记录才算数；否则就是事后追认。
-- 放在数据库层而不是应用层，是因为这条底线不该由任何一处调用方的疏忽绕过。
ALTER TABLE "PaipanCaseFeedback"
  ADD CONSTRAINT "PaipanCaseFeedback_outcome_after_report"
  CHECK ("outcomeAt" >= "reportedAt");

-- 应验判定只认这四种，避免出现自定义的模糊档位（如「大致准」）稀释统计口径
ALTER TABLE "PaipanCaseFeedback"
  ADD CONSTRAINT "PaipanCaseFeedback_verdict_enum"
  CHECK ("verdict" IN ('HIT', 'PARTIAL', 'MISS', 'UNKNOWN'));

ALTER TABLE "PaipanCaseFeedback"
  ADD CONSTRAINT "PaipanCaseFeedback_status_enum"
  CHECK ("status" IN ('PENDING', 'APPROVED', 'REJECTED'));

ALTER TABLE "PaipanCaseFeedback"
  ADD CONSTRAINT "PaipanCaseFeedback_channel_enum"
  CHECK ("channel" IN ('prompted', 'voluntary'));
