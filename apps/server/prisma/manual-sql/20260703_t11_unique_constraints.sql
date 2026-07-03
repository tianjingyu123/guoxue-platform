-- T11 C-6：三处防重购/防重记缺唯一约束 → 并发双扣，补复合唯一索引
-- 执行方式：由主线程统一执行（prisma db execute --file 或 psql）。本文件幂等，可重复执行。
-- 索引命名严格对齐 Prisma `@@unique` 默认命名（<Model>_<col…>_key），
-- 使 `prisma migrate diff` 视 schema 与 DB 为一致，不产生漂移。
--
-- 顺序：先按业务键去重历史数据（保留每组物理最早的一行 min(ctid)），再建唯一索引。
-- 去重 DELETE 用等值 JOIN，NULL 值天然不参与（NULL = NULL 为假）——与 Postgres
-- 唯一索引对 NULL 不去重的语义一致，故通用分析(school=null)等不受影响。
-- 本地/生产数据量小；若确认无历史重复，去重语句为空操作（no-op）。

-- ── 1. InstituteContentPurchase：一人一内容一次（讲堂购买防并发双扣） ──
DELETE FROM "InstituteContentPurchase" a
USING "InstituteContentPurchase" b
WHERE a.ctid > b.ctid
  AND a."contentId" = b."contentId"
  AND a."userId"    = b."userId";

CREATE UNIQUE INDEX IF NOT EXISTS "InstituteContentPurchase_contentId_userId_key"
  ON "InstituteContentPurchase" ("contentId", "userId");

-- ── 2. AiAnalysisRecord：同用户同盘同流派点评仅一份（流派点评防并发双扣） ──
-- 仅流派点评(BAZI_SCHOOL·school 非空·paipanRecordId 非空)受约束；
-- 通用分析(school=null)与合婚等 NULL 键行不去重、不受约束（正合语义）。
DELETE FROM "AiAnalysisRecord" a
USING "AiAnalysisRecord" b
WHERE a.ctid > b.ctid
  AND a."userId"         = b."userId"
  AND a."paipanRecordId" = b."paipanRecordId"
  AND a."analyzeType"    = b."analyzeType"
  AND a."school"         = b."school";

CREATE UNIQUE INDEX IF NOT EXISTS "AiAnalysisRecord_userId_paipanRecordId_analyzeType_school_key"
  ON "AiAnalysisRecord" ("userId", "paipanRecordId", "analyzeType", "school");

-- ── 3. LedgerEntry（统一总账·settlement）：SKIP ──
-- 防重业务键为 (refType, refId, scene, role)，但同一键下正向分账与其冲正记录（负向 amount）
-- 并存，二者仅靠 amount 正负号区分，模型无 sign/direction 判别列。
-- 普通 @@unique 会误拒合法的冲正负向行，故不加（符合任务"字段组合不能唯一则 skip"约定）。
-- 正确修法应为部分唯一索引 `... (refType, refId, scene, role) WHERE amount > 0`，
-- 但 Prisma @@unique 无法表达部分索引，且 settle() 未捕获 P2002（会 500 冒泡到 gift/consult 等直调方），
-- 超出本次改动范围，留作后续（settle 幂等已有 findMany 守卫兜底，冲正另有 findFirst 守卫）。
