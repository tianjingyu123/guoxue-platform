ALTER TABLE "AppVersion"
  ADD COLUMN IF NOT EXISTS "checksumSha256" TEXT,
  ADD COLUMN IF NOT EXISTS "minSupportedVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "minSupportedBuildNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS "activePlatformKey" TEXT,
  ADD COLUMN IF NOT EXISTS "publishedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "retiredAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "retiredBy" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "AppVersion" ALTER COLUMN "publishedAt" DROP NOT NULL;
ALTER TABLE "AppVersion" ALTER COLUMN "publishedAt" DROP DEFAULT;

-- 旧版本记录在改造前均已被客户端公开使用；迁移时保留每个平台最新一条为 ACTIVE，
-- 其余标为 RETIRED，避免上线后出现同平台多条“当前版本”。
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "platform" ORDER BY "publishedAt" DESC, "createdAt" DESC
  ) AS rn
  FROM "AppVersion"
)
UPDATE "AppVersion" AS version
SET "status" = CASE WHEN ranked.rn = 1 THEN 'ACTIVE' ELSE 'RETIRED' END,
    "activePlatformKey" = CASE WHEN ranked.rn = 1 THEN version."platform" ELSE NULL END,
    "retiredAt" = CASE WHEN ranked.rn = 1 THEN NULL ELSE COALESCE(version."publishedAt", version."createdAt") END
FROM ranked
WHERE version."id" = ranked."id";

-- 将旧 forceUpdate 记录转换成显式最低支持线；之后新版本会继承该线，
-- 不再依赖“查询一条历史强更记录”的隐式行为。
WITH force_floor AS (
  SELECT DISTINCT ON ("platform") "platform", "version", "buildNumber"
  FROM "AppVersion"
  WHERE "forceUpdate" = TRUE
  ORDER BY "platform", "publishedAt" DESC, "createdAt" DESC
)
UPDATE "AppVersion" AS active
SET "minSupportedVersion" = force_floor."version",
    "minSupportedBuildNumber" = force_floor."buildNumber"
FROM force_floor
WHERE active."status" = 'ACTIVE' AND active."platform" = force_floor."platform";

CREATE INDEX IF NOT EXISTS "AppVersion_platform_status_publishedAt_idx"
  ON "AppVersion"("platform", "status", "publishedAt");
CREATE INDEX IF NOT EXISTS "AppVersion_platform_version_buildNumber_idx"
  ON "AppVersion"("platform", "version", "buildNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "AppVersion_activePlatformKey_key"
  ON "AppVersion"("activePlatformKey");
