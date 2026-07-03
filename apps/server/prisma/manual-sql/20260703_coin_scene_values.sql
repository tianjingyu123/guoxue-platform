-- CoinScene 枚举补值（2026-07-03）：circle 帖子打赏与 consult-call 预扣的 scene 值
-- 代码早在使用但枚举缺失，真实落库被 Postgres 拒绝（mock 单测盲区）。幂等。
ALTER TYPE "CoinScene" ADD VALUE IF NOT EXISTS 'POST_REWARD';
ALTER TYPE "CoinScene" ADD VALUE IF NOT EXISTS 'CONSULT_CALL_PREPAY';
