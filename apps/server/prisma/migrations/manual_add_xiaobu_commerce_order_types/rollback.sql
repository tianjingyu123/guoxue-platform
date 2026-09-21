-- 回滚：PostgreSQL 不支持直接删除枚举值。
-- 两个值未被任何订单使用时保留无害；若必须移除，需先确认下面两个计数都为 0，
-- 再按「新建枚举类型 → 改列类型 → 删除旧类型」重建，属高风险操作，须单独审批后执行。本文件不自动执行任何变更。
SELECT type::text AS order_type, count(*) FROM "Order" WHERE type::text IN ('XIAOBU_REPORT', 'XIAOBU_MEMBER') GROUP BY 1;
