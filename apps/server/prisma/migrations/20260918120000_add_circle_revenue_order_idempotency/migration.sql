-- 圈子收益：新增订单级幂等键
--
-- 为什么必须新增列（而不是复用 sourceId）：
--   sourceId 对 circle_join 存的是 CircleMember.id，退款追回按它反查圈主分成
--   （circle-refund.service.ts:229-231 的 `WHERE "sourceId"=$1 AND "type"='circle_join'`）。
--   一个成员会有多笔订单（入圈 + 多次续费），因此成员唯一性**挡不住订单级重复记账**。
--   两者是两把不同的钥匙，不能互相代替。
--
-- 为什么可空：历史行与非订单来源（gift 等）保持 NULL。
--   Postgres 的唯一约束不约束 NULL，多行 NULL 互不冲突，因此对存量零影响、无需回填。
--
-- 影响面：仅 CircleRevenueRecord 一张表，新增一个可空列 + 一个唯一约束 + 一个索引。
--   不改任何既有列、不改既有查询、不回填历史数据。

ALTER TABLE "CircleRevenueRecord" ADD COLUMN IF NOT EXISTS "orderId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "CircleRevenueRecord_type_orderId_key"
  ON "CircleRevenueRecord" ("type", "orderId");

CREATE INDEX IF NOT EXISTS "CircleRevenueRecord_orderId_idx"
  ON "CircleRevenueRecord" ("orderId");
