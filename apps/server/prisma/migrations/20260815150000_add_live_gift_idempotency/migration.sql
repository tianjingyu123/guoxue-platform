-- 直播送礼属于资金操作：为每次明确送礼动作增加持久化幂等键。
-- 本次采用 expand 阶段的可空列，保证双节点滚动发布期间旧服务仍可写入。
-- 历史记录使用自身主键回填；全部旧客户端和旧服务退场后，再单独执行 contract 迁移收紧非空。
ALTER TABLE "GiftRecord" ADD COLUMN "idempotencyKey" TEXT;

UPDATE "GiftRecord"
SET "idempotencyKey" = 'legacy:' || "id"
WHERE "idempotencyKey" IS NULL;

CREATE UNIQUE INDEX "GiftRecord_idempotencyKey_key"
ON "GiftRecord"("idempotencyKey");
