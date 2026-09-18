-- 权益异常只读检测 · 取数 SQL（全部为 SELECT，禁止任何写操作）
--
-- 使用方式：由 run.mjs 在 `BEGIN READ ONLY` 事务内执行，并预先设置
--   SET LOCAL statement_timeout = <ms>;
--   SET LOCAL idle_in_transaction_session_timeout = <ms>;
--   SET LOCAL default_transaction_read_only = on;
--
-- 参数（均为必填，由 run.mjs 绑定，不做字符串拼接）：
--   $1 = window_from (timestamptz)
--   $2 = window_to   (timestamptz)
--   $3 = limit       (int, 单页行数)
--   $4 = offset      (int)
--
-- 口径依据见 truth-sources.mjs 顶部注释。字段一律按最小必要选取：
-- 不取 shippingInfo、payTransactionId 明文之外的支付凭证、用户昵称、手机号、地址。

-- ───────── Q1 时间窗内的相关订单 ─────────
-- 排除 PRODUCT（实物订单无权益，纳入会产生大量假阳性）
-- 只取检测必需字段；amount/payAmount 仅用于产出金额量级桶，不输出精确值
-- name: orders
SELECT
  o.id,
  o."userId",
  o.type::text                AS type,
  o."targetId",
  o.quantity,
  o.amount,
  o."payAmount",
  o.status::text              AS status,
  o."payMethod",
  o."payTransactionId",
  o."paidAt",
  o."refundedAt",
  o."completedAt",
  o."createdAt"
FROM "Order" o
WHERE o.type <> 'PRODUCT'
  AND (
        (o."paidAt" IS NOT NULL AND o."paidAt" >= $1 AND o."paidAt" < $2)
     OR (o."refundedAt" IS NOT NULL AND o."refundedAt" >= $1 AND o."refundedAt" < $2)
  )
ORDER BY o."paidAt" NULLS LAST, o.id
LIMIT $3 OFFSET $4;

-- ───────── Q2 与上述订单相关的权益台账 ─────────
-- name: entitlementLedger
SELECT
  l.id,
  l."userId",
  l."entitlementKey",
  l.kind,
  l.action,
  l.quantity,
  l.unlimited,
  l."validFrom",
  l."validUntil",
  l."sourceType",
  l."sourceId",
  l."reversesLedgerId",
  l."idempotencyKey",
  l."resourceType",
  l."resourceId",
  l.scope,
  l."createdAt"
FROM "EntitlementLedger" l
WHERE l."sourceType" = 'ORDER'
  AND l."sourceId" = ANY($5::text[])
ORDER BY l."createdAt", l.id;

-- ───────── Q3 相关用户的权益余额投影 ─────────
-- name: entitlementBalance
SELECT
  b."userId",
  b."entitlementKey",
  b."resourceType",
  b."resourceId",
  b.scope,
  b.quantity,
  b.unlimited,
  b."validUntil",
  b.status,
  b."updatedAt"
FROM "EntitlementBalance" b
WHERE b."userId" = ANY($5::text[])
ORDER BY b."userId", b."entitlementKey";

-- ───────── Q4 圈子成员（履约真源） ─────────
-- name: circleMembers
SELECT
  m."circleId",
  m."userId",
  m."joinedAt",
  m."expireAt"
FROM "CircleMember" m
WHERE m."userId" = ANY($5::text[]);

-- ───────── Q4b 圈子状态（判别「未决规则暂停」用） ─────────
-- 只取 id/status/type：不取圈名、简介、封面等内容字段
-- name: circles
SELECT
  c.id,
  c.status::text AS status,
  c.type::text   AS type
FROM "Circle" c
WHERE c.id = ANY($5::text[]);

-- ───────── Q5 会员购买对账记录 ─────────
-- name: memberPurchases
SELECT
  p.id,
  p."userId",
  p."orderId",
  p."memberType"::text AS "memberType",
  p."paidAt",
  p."expireAt",
  p."refundedAt"
FROM "MemberPurchase" p
WHERE p."userId" = ANY($5::text[]);

-- ───────── Q6 用户会员态（会员真源，不含任何 PII） ─────────
-- 明确只取 id / memberLevel / memberExpire，不取 phone/phoneEnc/phoneHash/email/nickname
-- name: users
SELECT
  u.id,
  u."memberLevel"::text AS "memberLevel",
  u."memberExpire"
FROM "User" u
WHERE u.id = ANY($5::text[]);

-- ───────── Q7 从业者会员真源 ─────────
-- name: practitionerProfiles
SELECT
  pp."userId",
  pp."proExpireAt"
FROM "PractitionerProfile" pp
WHERE pp."userId" = ANY($5::text[]);

-- ───────── Q8 分站真源 ─────────
-- name: stations
SELECT
  s.id,
  s."userId",
  s.status::text AS status,
  s."expireAt"
FROM "Station" s
WHERE s."userId" = ANY($5::text[]);

-- ───────── Q9 运营商真源 ─────────
-- name: operators
SELECT
  op."userId",
  op.level::text  AS level,
  op.status::text AS status,
  op."expireAt"
FROM "Operator" op
WHERE op."userId" = ANY($5::text[]);

-- ───────── Q10 幂等横切：同一 payTransactionId 对应多单 ─────────
-- 只输出计数，不输出 payTransactionId 本身
-- name: dupPayTransaction
SELECT count(*)::int AS "dupGroups"
FROM (
  SELECT o."payTransactionId"
  FROM "Order" o
  WHERE o."payTransactionId" IS NOT NULL
    AND o."paidAt" >= $1 AND o."paidAt" < $2
  GROUP BY o."payTransactionId"
  HAVING count(*) > 1
) t;

-- ───────── Q11 幂等横切：同一 MemberPurchase.orderId 多条 ─────────
-- name: dupMemberPurchase
SELECT count(*)::int AS "dupGroups"
FROM (
  SELECT p."orderId"
  FROM "MemberPurchase" p
  WHERE p."orderId" IS NOT NULL
    AND p."paidAt" >= $1 AND p."paidAt" < $2
  GROUP BY p."orderId"
  HAVING count(*) > 1
) t;
