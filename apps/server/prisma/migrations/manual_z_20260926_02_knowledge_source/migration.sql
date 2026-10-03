-- 报告知识库：来源与可引用性（2026-09-17）
-- 背景：著作权保护表达而非思想。命理理论、规则、方法本身不受保护，用自己的话重述后入库是安全的；
-- 逐字复制他人表达（网络文章、现代著作、点校本），即使注明来源也不免责。
-- 因此只有公版古籍白文允许按“原文”展示并跳转读原书，其余来源以“知识要点”呈现。
ALTER TABLE "PaipanReportKnowledge"
  ADD COLUMN IF NOT EXISTS "sourceKind" TEXT NOT NULL DEFAULT 'classic_public',
  ADD COLUMN IF NOT EXISTS "sourceRefs" JSONB,
  ADD COLUMN IF NOT EXISTS "restated" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "quotable" BOOLEAN NOT NULL DEFAULT false;

-- 存量数据：已入库条目均为公版古籍原文或门派理论，按原语义回填
UPDATE "PaipanReportKnowledge" SET "quotable" = true WHERE "kind" = 'classic_excerpt' AND "quotable" = false;
UPDATE "PaipanReportKnowledge" SET "restated" = true, "sourceKind" = 'platform_expert'
  WHERE "kind" = 'school_theory' AND "restated" = false;

CREATE INDEX IF NOT EXISTS "PaipanReportKnowledge_sourceKind_idx" ON "PaipanReportKnowledge"("sourceKind");
