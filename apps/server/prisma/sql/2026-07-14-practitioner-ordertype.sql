-- 从业者工作台 · 订单类型（单独一个文件：PostgreSQL 不允许 ALTER TYPE ADD VALUE 与「使用该新值」同事务）
-- 从业者会员 ¥98/月，独立于书院会员（MEMBER），不共用 user.memberLevel。
ALTER TYPE "OrderType" ADD VALUE IF NOT EXISTS 'PRACTITIONER_PRO';
