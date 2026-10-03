-- 回滚：PostgreSQL 不支持直接删除枚举值。
-- 该值未被任何订单使用时保留无害；若必须移除，需先确认 SELECT count(*) FROM "Order" WHERE type='VOICE_MINUTES' 为 0，
-- 再按「新建枚举类型 → 改列类型 → 删除旧类型」重建，属高风险操作，须单独审批后执行。本文件不自动执行任何变更。
SELECT count(*) AS voice_minutes_orders FROM "Order" WHERE type::text = 'VOICE_MINUTES';
