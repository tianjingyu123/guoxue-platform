-- 案例投稿奖励的国学币场景
-- 🔴 PostgreSQL 不允许在「添加枚举值」的同一个事务里使用该值，故必须单独一个文件先跑。
ALTER TYPE "CoinScene" ADD VALUE IF NOT EXISTS 'CASE_CONTRIBUTION';
