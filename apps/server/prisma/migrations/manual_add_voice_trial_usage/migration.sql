-- 广场智能体试聊用量（2026-09-18）
--
-- 决策人定的规则：广场智能体 2 元/分钟，**每个智能体每人可试聊 3 分钟，最多试聊 5 个**。
-- 目的很明确——「通过试聊让用户感兴趣、有好的体验，提高付费意愿」，
-- 所以试聊必须按「人 × 智能体」分别计量：同一个人换一个智能体还能再试，
-- 但同一个智能体不能反复试；试满 5 个之后就该引导付费，而不是无限白嫖。
--
-- 单独建表而不复用 VoiceQuotaAccount 的理由：试聊不是余额，是一次性的体验配额，
-- 它按智能体维度计数，也不该与用户花钱买来的时长混在一个池子里扣。
CREATE TABLE IF NOT EXISTS "VoiceTrialUsage" (
  "id"          TEXT PRIMARY KEY,
  "userId"      TEXT NOT NULL,
  "agentId"     TEXT NOT NULL,
  "usedSeconds" INTEGER NOT NULL DEFAULT 0,
  "sessions"    INTEGER NOT NULL DEFAULT 0,
  "firstAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 一个用户对一个智能体只有一条用量记录；并发下靠这个唯一约束兜底，不靠应用层先查后写
CREATE UNIQUE INDEX IF NOT EXISTS "VoiceTrialUsage_userId_agentId_key" ON "VoiceTrialUsage"("userId", "agentId");
-- 统计「这个人已经试过几个智能体」时走这个索引
CREATE INDEX IF NOT EXISTS "VoiceTrialUsage_userId_idx" ON "VoiceTrialUsage"("userId");
