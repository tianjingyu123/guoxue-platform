-- 仅供已确认空库的单一bootstrap事务；与独立09增量迁移的附加约束一致。
CREATE UNIQUE INDEX "CouponRecord_monthly_user_source_key"
  ON "CouponRecord" ("userId", "issuanceSource")
  WHERE "issuanceSource" <> 'standard';

ALTER TABLE "CouponRecord" ADD CONSTRAINT "CouponRecord_issuance_source_check"
  CHECK ("issuanceSource" = 'standard' OR "issuanceSource" ~ '^member_monthly_[0-9]{4}(0[1-9]|1[0-2])$');
