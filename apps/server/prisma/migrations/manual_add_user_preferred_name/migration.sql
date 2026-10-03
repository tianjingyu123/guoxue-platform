-- 用户称呼（2026-09-18）
--
-- 决策人要求：有些用户名不适合作为称呼，机器人应当有判断力，不合适时主动商量、
-- 确定后自己记住。张口叫一声「abc123 您好」，后面讲得再专业，用户也知道对面不上心。
--
-- 单独建表而不是往 User 上加字段，是因为要记的不只是称呼本身：
-- 还要记**问过没有**——追着问称呼比叫错更烦人，所以只问一次，
-- 用户没答也要留痕，否则下次对话又会问一遍。
CREATE TABLE IF NOT EXISTS "UserPreferredName" (
  "userId"    TEXT PRIMARY KEY,
  "name"      TEXT,
  -- asked=用户自己说的 / nickname=从昵称采用
  "source"    TEXT,
  -- 问过的时间；有值即表示已经问过，不论用户答没答
  "askedAt"   TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
