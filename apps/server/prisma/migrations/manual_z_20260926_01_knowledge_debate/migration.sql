-- 报告知识库：议题归组与立场标注（2026-09-18）
--
-- 背景（决策人 2026-09-18 定的报告定位）：
-- 排盘报告不是知识条目的罗列，而是「各门派、各典籍对这个盘的观点汇总 + 梳理 + 主线引导」。
-- 用户不必自己去查哪本古籍怎么说、哪派怎么看，但也不能让他看完觉得各说各话、自相矛盾。
--
-- 因此需要两样此前表达不了的东西：
-- 1. debateKey —— 议题键。讲同一件事的条目（不论出自哪派）挂同一个键，报告才能把它们聚成一组对照，
--    说清楚「这件事上各家的共识是什么、分歧在哪」。没有它，检索回来的只是一堆平行条目。
-- 2. stance —— 这条在该议题里的位置：
--      consensus     各派共识，可直接作为定论讲
--      mainstream    主流说法（多数派）
--      alternative   另一说（有影响力的不同取法）
--      minority      少数说（存录备考，不作主线）
--      platform_line 平台主线：我们对这个议题的取舍与理由，是引导用户的那条线
ALTER TABLE "PaipanReportKnowledge"
  ADD COLUMN IF NOT EXISTS "debateKey" TEXT,
  ADD COLUMN IF NOT EXISTS "stance" TEXT NOT NULL DEFAULT 'mainstream';

-- 存量数据：此前入库的条目都是单派独立要点，没有对照关系，按「主流说法」对待即可，
-- debateKey 留空表示不参与观点对照（报告里仍作为普通依据引用）。

CREATE INDEX IF NOT EXISTS "PaipanReportKnowledge_debateKey_idx" ON "PaipanReportKnowledge"("debateKey");
CREATE INDEX IF NOT EXISTS "PaipanReportKnowledge_paipanType_stance_idx" ON "PaipanReportKnowledge"("paipanType", "stance");
