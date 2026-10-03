-- 达人通话评价体系（V0 待办 #31·2026-07-11）
-- ConsultCall 补评价列 + 24 小时账单申诉列。幂等可重跑（ADD COLUMN IF NOT EXISTS）。
-- 该表沿用 $queryRawUnsafe 原生访问（建表时即绕 prisma generate），本批列同理，不跑 generate。

-- ① 评价：星级 1-5 + 标签（逗号串）+ 文字（≤200 字·应用层校验）+ 评价时间（非空即已评·幂等锚点）
ALTER TABLE "ConsultCall" ADD COLUMN IF NOT EXISTS "rating" INTEGER;
ALTER TABLE "ConsultCall" ADD COLUMN IF NOT EXISTS "ratingTags" TEXT;
ALTER TABLE "ConsultCall" ADD COLUMN IF NOT EXISTS "ratingComment" TEXT;
ALTER TABLE "ConsultCall" ADD COLUMN IF NOT EXISTS "ratedAt" TIMESTAMP(3);

-- ② 24 小时账单申诉：原因 + 提交时间（非空即已申诉·幂等锚点）+ 状态（PENDING/RESOLVED/REJECTED）
--    处理侧只记结论（资金零触碰·退款走人工金币退款审批流）
ALTER TABLE "ConsultCall" ADD COLUMN IF NOT EXISTS "disputeReason" TEXT;
ALTER TABLE "ConsultCall" ADD COLUMN IF NOT EXISTS "disputedAt" TIMESTAMP(3);
ALTER TABLE "ConsultCall" ADD COLUMN IF NOT EXISTS "disputeStatus" TEXT;
ALTER TABLE "ConsultCall" ADD COLUMN IF NOT EXISTS "disputeResolveNote" TEXT;
ALTER TABLE "ConsultCall" ADD COLUMN IF NOT EXISTS "disputeResolvedAt" TIMESTAMP(3);
ALTER TABLE "ConsultCall" ADD COLUMN IF NOT EXISTS "disputeReviewerId" TEXT;

-- ③ 索引：达人好评率聚合（expertId + rating）与申诉队列（disputeStatus）
CREATE INDEX IF NOT EXISTS "ConsultCall_expertId_rating_idx" ON "ConsultCall"("expertId", "rating");
CREATE INDEX IF NOT EXISTS "ConsultCall_disputeStatus_idx" ON "ConsultCall"("disputeStatus");
