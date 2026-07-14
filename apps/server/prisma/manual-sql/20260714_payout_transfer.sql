-- 自动代付（微信商家转账）字段 · 资金架构批次3（2026-07-14）
--
-- 【背景】微信「企业付款到银行卡」已下线，「商家转账到零钱」是唯一出路。
-- 而新版商家转账不是无感到账：发起后状态是 WAIT_USER_CONFIRM，用户要在微信里点
-- 「确认收款」钱才真正到账（超时未确认自动退回）。
--
-- 因此提现状态机必须多一档 TRANSFERRING（已发起转账、钱还没到用户手上）：
--   PENDING → APPROVED → TRANSFERRING → PAID
-- 🔴 TRANSFERRING 已计入 wallet.service 的「占用额度」——钱已从平台发出但用户尚未确认，
--    不占额度的话用户能拿同一笔余额再提一次（见 OCCUPYING_WITHDRAW_STATUSES）。
--
-- 纯 additive：只加列，不动既有数据。

ALTER TABLE "WithdrawalApplication" ADD COLUMN IF NOT EXISTS "transferBillNo"     TEXT;
ALTER TABLE "WithdrawalApplication" ADD COLUMN IF NOT EXISTS "transferState"      TEXT;
ALTER TABLE "WithdrawalApplication" ADD COLUMN IF NOT EXISTS "packageInfo"        TEXT;
ALTER TABLE "WithdrawalApplication" ADD COLUMN IF NOT EXISTS "transferFailReason" TEXT;

COMMENT ON COLUMN "WithdrawalApplication"."packageInfo" IS
  '微信待用户确认收款凭据：前端凭它调起 wx.requestMerchantTransfer。敏感，只返回给提现人本人，到账后清空。';
COMMENT ON COLUMN "WithdrawalApplication"."transferState" IS
  '渠道转账状态 ACCEPTED/PROCESSING/WAIT_USER_CONFIRM/TRANSFERING/SUCCESS/FAIL/CANCELLED';
