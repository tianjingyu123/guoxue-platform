-- 历史活动积分仅供核对。当前会籍不能证明活动完成当时的应得资格，不自动补发或删除积分。
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '30s';
WITH examined AS (
  SELECT e.id AS "eventId", e.type, e."instituteId", e."lecturerId",
    u.status::text AS "accountStatus", COALESCE(m.n, 0)::int AS "activeMemberCount",
    COALESCE(p.n, 0)::int AS "referenceRows", COALESCE(p.auto_n, 0)::int AS "matchingAutoRows"
  FROM "InstituteEvent" e
  LEFT JOIN "User" u ON u.id=e."lecturerId"
  LEFT JOIN LATERAL (
    SELECT count(*) AS n FROM "InstituteMember" im
    WHERE im."userId"=e."lecturerId" AND im.status='ACTIVE'
      AND (e."instituteId" IS NULL OR im."instituteId"=e."instituteId")
  ) m ON TRUE
  LEFT JOIN LATERAL (
    SELECT count(*) AS n,
      count(*) FILTER (WHERE sp."verifiedBy" IS NULL AND sp."userId"=e."lecturerId"
        AND sp."pointType"=CASE e.type WHEN 'SALON' THEN 'INSTITUTE_SALON' WHEN 'LIVE' THEN 'LIVE_COURSE' END
        AND (e."instituteId" IS NULL OR sp."instituteId"=e."instituteId")) AS auto_n
    FROM "InstituteSharePoint" sp WHERE sp."refId"=e.id
  ) p ON TRUE
  WHERE e.status='COMPLETED'
), classified AS (
  SELECT *, CASE
    WHEN type NOT IN ('SALON','LIVE') THEN 'SKIP_UNSUPPORTED_TYPE'
    WHEN "lecturerId" IS NULL THEN 'SKIP_NO_LECTURER'
    WHEN "matchingAutoRows">1 THEN 'REVIEW_MULTIPLE_AUTO_ROWS'
    WHEN "matchingAutoRows"=1 AND "referenceRows"=1 THEN 'AUTO_REFERENCE_PRESENT'
    WHEN "referenceRows">0 THEN 'REVIEW_EXISTING_REFERENCE'
    WHEN "accountStatus" IS DISTINCT FROM 'ACTIVE' THEN 'HOLD_ACCOUNT'
    WHEN "activeMemberCount"=0 THEN 'HOLD_NO_ACTIVE_MEMBER'
    WHEN "activeMemberCount">1 THEN 'HOLD_AMBIGUOUS_MEMBER'
    ELSE 'POTENTIAL_GAP'
  END AS classification FROM examined
)
SELECT jsonb_build_object(
  'mode','READ_ONLY', 'historicalEligibilityProven',false,
  'transactionReadOnly',current_setting('transaction_read_only')='on',
  'isolationLevel',current_setting('transaction_isolation'),
  'summary',COALESCE((SELECT jsonb_object_agg(classification,n) FROM (SELECT classification,count(*) AS n FROM classified GROUP BY classification) counts),'{}'::jsonb),
  'rows',COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY c."eventId") FROM classified c),'[]'::jsonb)
);
COMMIT;
