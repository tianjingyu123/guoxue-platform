-- 待人工核对的圈主分成追回 · 只读查询
--
-- 用途：在没有管理端页面时，作为 pending_manual 待办的固定执行渠道。
-- 对应接口：GET /circle-refund/admin-manual-recalls（SUPER_ADMIN / OPERATION_ADMIN）。
--
-- 责任与时限（2026-09-19 由业务指定）：
--   · 负责人：田崇民
--   · 处理时限：待办产生后 **7 天内** 完成人工核对与冲正
--     —— 按**自然日**计（业务原话是「7 天」，不是「7 个工作日」）；若应按工作日计，
--        请同步修改本文件与 `MANUAL_RECALL_SLA_DAYS`（circle-refund.service.ts）。
--   · 建议执行频率：每周一次即可覆盖 7 天时限；待办量上来后按需加密。
--
-- 约束：
--   · 下面的语句**全部只读**，不含任何 INSERT / UPDATE / DELETE。
--   · 超期只是**标出来给人看**，系统不会因此改状态、不告警、不自动冲抵。
--   · 不提供「一键冲正」。这些行之所以存在，正是因为系统判定不出该冲正哪一笔收益；
--     自动冲抵等于回到「猜」。核对结论由人给出，冲正动作按财务既定流程执行。
--   · 用户那一侧不受影响：退款照退、余额照到账、成员身份照常失效。
--     这里待定的只有「圈主分成该追回多少」。


-- ───────────────────────────────────────────────────────────────────────
-- ① 按原因码的发生量 + 超期条数
--
-- 这是决策项 N9（是否放开 single / amount 推断匹配自动冲正）唯一的量化依据：
--   inferred_match_not_approved  系统能推断出一条，但推断匹配尚未获业务批准
--                                → 这一档的条数就是「放开后会被自动处理的量」，
--                                  也是「放开后的误判风险敞口」
--   ambiguous_candidates         多条候选且金额区分不开，放开也处理不了
--   revenue_ownership_mismatch   按 orderId 命中了收益行，但不属于本圈子 / 本成员
--   revenue_amount_mismatch      按 orderId 命中了收益行，但金额与本次退款已付金额对不上
-- ───────────────────────────────────────────────────────────────────────
SELECT
  coalesce(r."reason", '(历史行·无原因码)') AS "原因码",
  count(*)                                  AS "待办条数",
  count(*) FILTER (
    WHERE r."createdAt" < CURRENT_TIMESTAMP - INTERVAL '7 days'
  )                                         AS "已超期",
  min(r."createdAt")                        AS "最早",
  max(r."createdAt")                        AS "最近"
FROM "CommissionRecall" r
WHERE r."status" = 'pending_manual'
GROUP BY 1
ORDER BY 3 DESC, 2 DESC;


-- ───────────────────────────────────────────────────────────────────────
-- ② 待办明细（超期的排在最前）
-- ───────────────────────────────────────────────────────────────────────
SELECT
  CASE WHEN r."createdAt" < CURRENT_TIMESTAMP - INTERVAL '7 days'
       THEN '⚠ 超期' ELSE '' END                                   AS "超期",
  date_part('day', CURRENT_TIMESTAMP - r."createdAt")::int          AS "已等待天数",
  r."id"          AS "待办id",
  r."createdAt"   AS "产生时间",
  r."reason"      AS "原因码",
  r."refundId"    AS "退款申请id",
  r."userId"      AS "圈主id",
  u."nickname"    AS "圈主昵称",
  r."sourceId"    AS "成员id",          -- 候选收益行按它关联；退款后成员行已删，只能靠这一列
  q."circleId"    AS "圈子id",
  c."name"        AS "圈子名",
  q."userId"      AS "退款用户id",
  q."orderId"     AS "退款关联订单id",  -- 为空即历史数据，正是推断配对会出错的场景
  q."paidAmount"  AS "已付金额",
  q."actualRefund" AS "实退金额",
  q."refundedAt"  AS "退款完成时间"
FROM "CommissionRecall" r
LEFT JOIN "CircleRefundRequest" q ON q."id" = r."refundId"
LEFT JOIN "Circle" c              ON c."id" = q."circleId"
LEFT JOIN "User"   u              ON u."id" = r."userId"
WHERE r."status" = 'pending_manual'
ORDER BY r."createdAt" ASC          -- 最旧的最先处理
LIMIT 200;


-- ───────────────────────────────────────────────────────────────────────
-- ③ 单条待办的候选收益行（把 ② 查到的「成员id」替换掉下面的占位串）
--
-- 人按退款申请的订单与金额，从这几条里挑出被退的那一笔，再按财务流程手工冲正。
-- amount > 0 的过滤不能去掉：金额为 0 的行不是真实收益，选中它等于圈主一分不追回。
-- ───────────────────────────────────────────────────────────────────────
SELECT
  v."id"          AS "收益行id",
  v."orderId"     AS "订单id",          -- 非空说明这一笔本可精确匹配
  v."amount"      AS "金额",
  v."ownerShare"  AS "圈主分成",
  v."platformFee" AS "平台抽成",
  v."createdAt"   AS "记账时间"
FROM "CircleRevenueRecord" v
WHERE v."type" = 'circle_join'
  AND v."amount" > 0
  AND v."sourceId" = '把这里替换成②查到的成员id'
ORDER BY v."createdAt" DESC;
