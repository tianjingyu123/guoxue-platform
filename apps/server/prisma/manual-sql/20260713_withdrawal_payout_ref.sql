-- 提现出款幂等键（2026-07-13 · P1 资金安全护栏）
--
-- 背景：三套提现表全部【没有出款幂等键】。此前不炸是因为根本没有真出款（全靠人工线下转账）；
-- 一旦接入代付 API 或人工重复点击，就是【重复打款】——钱出去了收不回来。
--
-- payoutRef 语义：
--   线下打款 = 银行/支付宝转账流水号（管理员必填）
--   自动代付 = 渠道 out_bill_no（直接复用，幂等语义不变）
-- UNIQUE 约束是最后一道兜底：同一笔流水不可能被记两次。
--
-- 本迁移是纯 additive（只加可空列 + 唯一索引），不删列、不改类型、不动数据，零运行风险。

-- ① 站长/分佣提现
ALTER TABLE "Withdrawal" ADD COLUMN IF NOT EXISTS "payoutRef" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Withdrawal_payoutRef_key" ON "Withdrawal"("payoutRef");

-- ② 用户提现
ALTER TABLE "WithdrawalApplication" ADD COLUMN IF NOT EXISTS "payoutRef" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "WithdrawalApplication_payoutRef_key" ON "WithdrawalApplication"("payoutRef");

-- 注：Postgres 的 UNIQUE 索引允许多行 NULL，故历史未打款记录（payoutRef IS NULL）不受影响。
-- 注：VideoCreatorWithdrawal 以虚拟币计价、不向外部账户出款，不需要幂等键。

-- ③ Webhook 事件枚举补 WITHDRAWAL_PAID（打款完成事件·供对账/通知下游）
--    ADD VALUE IF NOT EXISTS 是幂等的；注意它在旧版 PG 不能跑在事务块内，prisma db execute 逐句执行故可行。
ALTER TYPE "WebhookEvent" ADD VALUE IF NOT EXISTS 'WITHDRAWAL_PAID';
