-- 收款账号加密改造（提现 PII·个保法）
-- 第一波·资金安全突击。仅新增密文列（additive·不删列不改列不改数据）。
-- 双写切读范式（同 M4 手机号）：写入同写明文列+密文列，读取优先解密密文列、回退明文列。
--
-- 🔴 生产执行顺序：
--   1) 先执行本 SQL（加空列，向后兼容，旧代码不受影响）
--   2) 再部署双写切读代码（新申请开始写密文列）
--   3) 择机跑存量回填脚本 backfill-payout-account-encryption.ts（把历史明文批量加密回填密文列）
--   4) 回填并验证后，未来另起迁移再考虑清空明文列（本次不做）

ALTER TABLE "WithdrawalApplication" ADD COLUMN IF NOT EXISTS "accountInfoEnc" TEXT;
ALTER TABLE "VideoCreatorWithdrawal" ADD COLUMN IF NOT EXISTS "accountEnc" VARCHAR(512);
