-- 仅核对管理员充值/退币审批的稳定引用，不按金额或时间猜测历史归属。
-- STABLE_RECORD_MATCH 只证明引用记录匹配，不证明余额正确、完整流水或历史没有重复到账。
-- 输出限内部审批编号、固定分类和计数，不输出载荷、摘要、备注或账户余额。
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';

WITH parsed AS MATERIALIZED (
  SELECT f.id, f.type, f.status, f.amount,
    CASE WHEN jsonb_typeof(f.payload) = 'object'
      AND jsonb_typeof(f.payload->'userId') = 'string'
      AND length(f.payload->>'userId') BETWEEN 1 AND 128
      AND btrim(f.payload->>'userId') = f.payload->>'userId'
      THEN f.payload->>'userId' END AS "beneficiaryId",
    CASE WHEN jsonb_typeof(f.payload) = 'object'
      AND jsonb_typeof(f.payload->'amountCoin') = 'number'
      AND length(f.payload->>'amountCoin') <= 32
      AND f.payload->>'amountCoin' ~ '^[0-9]{1,10}(\.0{1,20})?$'
      THEN (f.payload->>'amountCoin')::numeric END AS "parsedCoin"
  FROM fund_approval f WHERE f.type IN ('RECHARGE', 'COIN_REFUND')
), examined AS (
  SELECT f.id, f.type,
    CASE WHEN f.status IN ('PENDING', 'APPROVED', 'REJECTED') THEN f.status ELSE 'OTHER' END AS status,
    (f."beneficiaryId" IS NOT NULL AND coalesce(f."parsedCoin" BETWEEN 1 AND 2147483647, false)) AS "payloadValid",
    coalesce(f.amount = f."parsedCoin", false) AS "approvalAmountConsistent",
    CASE WHEN f.type = 'RECHARGE' THEN r.total ELSE t.total END AS "stableRecordCount",
    CASE WHEN f.type = 'RECHARGE' THEN r.matching ELSE t.matching END AS "matchingRecordCount",
    CASE WHEN f.type = 'RECHARGE' THEN t.total ELSE r.total END AS "unexpectedReferenceCount"
  FROM parsed f
  CROSS JOIN LATERAL (
    SELECT count(*) AS total,
      count(*) FILTER (WHERE r."userId" = f."beneficiaryId" AND r."amountCoin" = f."parsedCoin"
        AND r.status = 'PAID' AND r."paidAt" IS NOT NULL AND r."payMethod" = 'ADMIN') AS matching
    FROM "VirtualCoinRecharge" r WHERE r."orderNo" = 'FUND_RECHARGE_' || f.id
  ) r
  CROSS JOIN LATERAL (
    SELECT count(*) AS total,
      count(*) FILTER (WHERE t."userId" = f."beneficiaryId" AND t."amountCoin" = f."parsedCoin"
        AND t.type = 'REFUND' AND t.scene = 'REFUND') AS matching
    FROM "VirtualCoinTransaction" t WHERE t."refId" = f.id
  ) t
), classified AS (
  SELECT *, CASE
    WHEN NOT "payloadValid" THEN 'HOLD_INVALID_PAYLOAD'
    WHEN NOT "approvalAmountConsistent" THEN 'HOLD_APPROVAL_AMOUNT_MISMATCH'
    WHEN status = 'OTHER' THEN 'HOLD_UNKNOWN_STATUS'
    WHEN "stableRecordCount" > 1 THEN 'REVIEW_MULTIPLE_STABLE_RECORDS'
    WHEN "unexpectedReferenceCount" > 0 THEN 'REVIEW_UNEXPECTED_REFERENCE_KIND'
    WHEN "stableRecordCount" > 0 AND "matchingRecordCount" <> "stableRecordCount" THEN 'REVIEW_REFERENCE_MISMATCH'
    WHEN "stableRecordCount" > 0 AND status = 'PENDING' THEN 'REVIEW_PENDING_WITH_REFERENCE'
    WHEN "stableRecordCount" > 0 AND status = 'REJECTED' THEN 'REVIEW_REJECTED_WITH_REFERENCE'
    WHEN "stableRecordCount" = 1 AND status = 'APPROVED' THEN 'STABLE_RECORD_MATCH'
    ELSE 'LINKAGE_UNPROVEN'
  END AS classification FROM examined
)
SELECT jsonb_build_object(
  'mode', 'READ_ONLY',
  'transactionReadOnly', current_setting('transaction_read_only') = 'on',
  'isolationLevel', current_setting('transaction_isolation'),
  'completeLedgerProven', false, 'historicalDuplicateCreditsExcluded', false,
  'automaticRetryOrCompensationAllowed', false,
  'summary', coalesce((SELECT jsonb_object_agg(classification, n) FROM (
    SELECT classification, count(*) AS n FROM classified GROUP BY classification
  ) counts), '{}'::jsonb),
  'unassignedEvidence', jsonb_build_object(
    'legacyAdminRechargeRows', (SELECT count(*) FROM "VirtualCoinRecharge" WHERE left("orderNo", 6) = 'ADMIN_'),
    'unreferencedRefundRows', (SELECT count(*) FROM "VirtualCoinTransaction" WHERE type = 'REFUND' AND coalesce("refId", '') = ''),
    'reservedRechargeOrdersWithoutMatchingApproval', (SELECT count(*) FROM "VirtualCoinRecharge" r
      WHERE left(r."orderNo", 14) = 'FUND_RECHARGE_'
        AND NOT EXISTS (SELECT 1 FROM fund_approval f WHERE f.type = 'RECHARGE' AND r."orderNo" = 'FUND_RECHARGE_' || f.id)),
    'legacyOwnershipProven', false),
  'rows', coalesce((SELECT jsonb_agg(jsonb_build_object(
    'approvalId', id, 'type', type, 'status', status, 'classification', classification,
    'payloadValid', "payloadValid", 'approvalAmountConsistent', "approvalAmountConsistent",
    'stableRecordCount', "stableRecordCount", 'matchingRecordCount', "matchingRecordCount",
    'unexpectedReferenceCount', "unexpectedReferenceCount") ORDER BY id) FROM classified), '[]'::jsonb)
);
COMMIT;
