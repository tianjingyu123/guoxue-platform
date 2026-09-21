-- 小卜报告单独购买 / 小卜AI会员订单类型（2026-09-21 决策人：报告 29 元一份；会员 月150/年988/三年1899/五年2499）
-- PostgreSQL 的 ADD VALUE 不能在同一事务里立即使用新值；本迁移只加值，不写数据。
-- 已购与会员期记在既有 EntitlementLedger（entitlementKey = xiaobu.report / xiaobu.member），无需新表。
ALTER TYPE "OrderType" ADD VALUE IF NOT EXISTS 'XIAOBU_REPORT';
ALTER TYPE "OrderType" ADD VALUE IF NOT EXISTS 'XIAOBU_MEMBER';
