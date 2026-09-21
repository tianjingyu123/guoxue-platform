-- 小卜语音时长充值订单类型（2026-09-21 决策人：报告赠送的 30 分钟用完后支持充值继续使用）
-- PostgreSQL 的 ADD VALUE 不能在同一事务里立即使用新值；本迁移只加值，不写数据。
ALTER TYPE "OrderType" ADD VALUE IF NOT EXISTS 'VOICE_MINUTES';
