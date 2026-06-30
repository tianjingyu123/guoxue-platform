-- db-opt-10 清理冗余索引(2026-06-29 数据库审计)
-- 根因:Prisma 模型对带 @unique 的字段又声明了 @@index,生成与唯一约束索引
--       列集完全相同的普通索引。唯一约束自带 B-tree 索引可服务全部等值/范围/排序,
--       这些普通索引纯属写放大与空间浪费。安全删除(覆盖关系经 pg_index 精确比对确认)。
-- 配套:schema.prisma 对应 @@index 声明同步删除,防未来 migrate/db push 重建。
DROP INDEX IF EXISTS "User_phone_idx";
DROP INDEX IF EXISTS "Station_code_idx";
DROP INDEX IF EXISTS "ReferralLink_code_idx";
DROP INDEX IF EXISTS "OrderLogistics_orderId_idx";
DROP INDEX IF EXISTS "VirtualCoinRecharge_orderNo_idx";
DROP INDEX IF EXISTS "HuifuSplitRecord_orderId_idx";
DROP INDEX IF EXISTS "HuifuSplitRecord_outTradeNo_idx";
DROP INDEX IF EXISTS "Tenant_apiKey_idx";
DROP INDEX IF EXISTS "BigScreenToken_token_idx";
DROP INDEX IF EXISTS "UserKnowledgeProfile_userId_idx";
DROP INDEX IF EXISTS "CompetitionInvitation_inviteCode_idx";
DROP INDEX IF EXISTS "CompetitionInviteCode_code_idx";
DROP INDEX IF EXISTS "CheckIn_userId_checkInDate_idx";
DROP INDEX IF EXISTS "CircleInviteCode_code_idx";
DROP INDEX IF EXISTS "ToolShare_shareToken_idx";
