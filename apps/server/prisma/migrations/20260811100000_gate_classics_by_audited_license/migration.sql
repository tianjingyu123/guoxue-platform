-- 首发古籍版权门禁（数据迁移，不删除任何书籍或章节）
-- 1. 为已有 Kanseki Repository 导入记录补齐可核验的 CC BY-SA 版权台账。
-- 2. 将没有「已审计且允许商业发布」版权记录的古籍降为 DRAFT。
--
-- 官方来源声明：https://github.com/kanripo
-- 许可原文：https://creativecommons.org/licenses/by-sa/4.0/

INSERT INTO "ClassicCopyright" (
  "id",
  "bookId",
  "sourceName",
  "sourceUrl",
  "license",
  "licenseUrl",
  "auditNote",
  "auditedAt",
  "auditedBy",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  b."id",
  'Kanseki Repository',
  'https://' || b."source",
  'CC-BY-SA-4.0',
  'https://creativecommons.org/licenses/by-sa/4.0/',
  '来源字段指向 github.com/kanripo；首发门禁迁移按 Kanseki Repository 官方 CC BY-SA 声明登记。文本若另有人工改动，应在产品侧注明。',
  CURRENT_TIMESTAMP,
  'release-migration-20260811',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "ClassicBook" b
WHERE b."source" LIKE 'github.com/kanripo/%'
ON CONFLICT ("bookId", "sourceName") DO UPDATE SET
  "sourceUrl" = EXCLUDED."sourceUrl",
  "license" = EXCLUDED."license",
  "licenseUrl" = EXCLUDED."licenseUrl",
  "auditNote" = EXCLUDED."auditNote",
  "auditedAt" = EXCLUDED."auditedAt",
  "auditedBy" = EXCLUDED."auditedBy",
  "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "ClassicBook" b
SET "status" = 'DRAFT', "updatedAt" = CURRENT_TIMESTAMP
WHERE b."status" = 'PUBLISHED'
  AND NOT EXISTS (
    SELECT 1
    FROM "ClassicCopyright" c
    WHERE c."bookId" = b."id"
      AND c."auditedAt" IS NOT NULL
      AND c."license" IN (
        'CC-BY-SA-4.0',
        'CC-BY-SA-3.0',
        'CC-BY-4.0',
        'CC0-1.0',
        'PUBLIC-DOMAIN',
        'OWNED'
      )
  );
