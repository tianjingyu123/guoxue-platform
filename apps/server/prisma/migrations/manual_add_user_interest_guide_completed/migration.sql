-- 仅新增账号级引导完成态，不修改兴趣内容或用户身份。
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "interestGuideCompleted" BOOLEAN NOT NULL DEFAULT FALSE;

-- 非空历史兴趣明确代表已选择；空兴趣不能推断曾跳过，因此保持未完成。
UPDATE "User"
SET "interestGuideCompleted" = TRUE
WHERE "interestGuideCompleted" = FALSE
  AND cardinality("interestCategories") > 0;
