-- 独立待决策候选：每月赠券保留旧券，不作废旧券，不补历史月份。
-- 普通记录回填standard，继续保持原来的同模板、用户、状态防重。
BEGIN;

ALTER TABLE "CouponRecord" ADD COLUMN "issuanceSource" TEXT NOT NULL DEFAULT 'standard';

CREATE UNIQUE INDEX "CouponRecord_coupon_user_status_source_key"
  ON "CouponRecord" ("couponId", "userId", "status", "issuanceSource");

-- 每人每月最多一张月度券，使用后也不能再次插入；不受模板更换影响。
CREATE UNIQUE INDEX "CouponRecord_monthly_user_source_key"
  ON "CouponRecord" ("userId", "issuanceSource")
  WHERE "issuanceSource" <> 'standard';

ALTER TABLE "CouponRecord" ADD CONSTRAINT "CouponRecord_issuance_source_check"
  CHECK ("issuanceSource" = 'standard' OR "issuanceSource" ~ '^member_monthly_[0-9]{4}(0[1-9]|1[0-2])$');

DROP INDEX "CouponRecord_couponId_userId_status_key";

COMMIT;
