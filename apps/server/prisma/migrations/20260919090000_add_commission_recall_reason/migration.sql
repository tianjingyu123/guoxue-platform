-- 追回台账：新增原因码列
--
-- 为什么需要：圈主分成追回在「无法确定该冲正哪一笔收益」时会留下一条
--   CommissionRecall(status='pending_manual', amount=0)。没有原因码，人工核对者
--   看到的只是一条 0 元待办，既不知道卡在哪一步，也无法统计各分支的真实发生量——
--   而那个发生量正是决策项 N9（推断匹配是否允许自动冲正）所需要的唯一依据。
--
-- 为什么可空：历史行保持 NULL，对存量零影响、无需回填。
--
-- 影响面：仅 CommissionRecall 一张表，新增一个可空列 + 一个按状态查询的索引。
--   不改任何既有列、不改既有查询、不回填历史数据。
--   该表在本次改动前**没有任何读取方**，因此新增列与新增 status 取值均不影响既有逻辑。
--
-- 回退：删除本列会丢失已产生的待办分类信息，但不影响资金数据本身（金额在 amount 列）。
--   与 CircleRevenueRecord.orderId 不同，本列不承载「收益↔订单」关联，可安全删除。

ALTER TABLE "CommissionRecall" ADD COLUMN IF NOT EXISTS "reason" TEXT;

CREATE INDEX IF NOT EXISTS "CommissionRecall_status_createdAt_idx"
  ON "CommissionRecall" ("status", "createdAt");
