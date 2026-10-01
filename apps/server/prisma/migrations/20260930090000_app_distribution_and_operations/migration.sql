BEGIN;
-- 仅候选迁移，生产执行须独立审批。原记录保持 legacy 范围，不猜测商店。
-- 旧版本冲突须整批回滚，不能留下已增加的列或改写后的活动槽。
ALTER TABLE "AppVersion"
  ADD COLUMN "applicationId" TEXT NOT NULL DEFAULT 'rebu',
  ADD COLUMN "channelId" TEXT NOT NULL DEFAULT 'legacy',
  ADD COLUMN "rolloutPercentage" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN "targetUserIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "AppVersion" ADD CONSTRAINT "AppVersion_rollout_check" CHECK ("rolloutPercentage" BETWEEN 0 AND 100);
UPDATE "AppVersion" SET "activePlatformKey" = 'rebu:' || "platform" || ':legacy' WHERE "activePlatformKey" IS NOT NULL;
DROP INDEX IF EXISTS "AppVersion_platform_status_publishedAt_idx";
DROP INDEX IF EXISTS "AppVersion_platform_version_buildNumber_idx";
CREATE INDEX "AppVersion_applicationId_platform_channelId_status_publishedAt_idx"
  ON "AppVersion"("applicationId", "platform", "channelId", "status", "publishedAt");
-- 历史重复版本会明确阻塞迁移，不隐式删除审计记录；空构建号也视为同一版本。
CREATE UNIQUE INDEX "AppVersion_applicationId_platform_channelId_version_buildNumber_key"
  ON "AppVersion"("applicationId", "platform", "channelId", "version", "buildNumber") NULLS NOT DISTINCT;
ALTER TABLE "FeatureFlag"
  ADD COLUMN "operationState" TEXT NOT NULL DEFAULT 'OPEN',
  ADD COLUMN "emergencyDisabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "scopeRules" JSONB;
ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_operationState_check"
  CHECK ("operationState" IN ('OPEN', 'UNOPENED', 'MAINTENANCE', 'READ_ONLY'));
CREATE TABLE "AppDistribution" (
  "id" TEXT NOT NULL PRIMARY KEY, "productId" TEXT NOT NULL, "applicationId" TEXT NOT NULL,
  "platform" TEXT NOT NULL, "channelId" TEXT NOT NULL, "clientKey" TEXT NOT NULL,
  "packageName" TEXT NOT NULL, "signingCertificateSha256" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true, "wgtPolicy" TEXT NOT NULL DEFAULT 'DENIED',
  "policyEvidence" TEXT, "recoveryEvidence" TEXT, "nativeFingerprint" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "AppDistribution_clientKey_key" ON "AppDistribution"("clientKey");
CREATE UNIQUE INDEX "AppDistribution_applicationId_platform_channelId_key" ON "AppDistribution"("applicationId","platform","channelId");
-- 仅登记历史兼容槽；其他渠道的实际包名/签名须核验后登记，不伪造已上架身份。
INSERT INTO "AppDistribution" ("id","productId","applicationId","platform","channelId","clientKey","packageName","updatedAt")
SELECT 'legacy-' || p, 'rebu', 'rebu', p, 'legacy', 'rebu-' || p || '-legacy', '', CURRENT_TIMESTAMP
FROM unnest(ARRAY['android','ios','harmony']) p;
CREATE TABLE "ResourceRelease" (
  "id" TEXT NOT NULL PRIMARY KEY, "applicationId" TEXT NOT NULL, "platform" TEXT NOT NULL,
  "channelId" TEXT NOT NULL, "resourceVersion" INTEGER NOT NULL, "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "activeScopeKey" TEXT, "manifest" JSONB NOT NULL, "signature" TEXT NOT NULL, "keyId" TEXT NOT NULL,
  "rolloutPercentage" INTEGER NOT NULL DEFAULT 0, "targetUserIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "publishedBy" TEXT, "publishedAt" TIMESTAMP(3), "retiredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResourceRelease_rollout_check" CHECK ("rolloutPercentage" BETWEEN 0 AND 100),
  CONSTRAINT "ResourceRelease_version_check" CHECK ("resourceVersion" > 0)
);
CREATE UNIQUE INDEX "ResourceRelease_activeScopeKey_key" ON "ResourceRelease"("activeScopeKey");
CREATE UNIQUE INDEX "ResourceRelease_applicationId_platform_channelId_resourceVersion_key" ON "ResourceRelease"("applicationId","platform","channelId","resourceVersion");
CREATE INDEX "ResourceRelease_applicationId_platform_channelId_status_idx" ON "ResourceRelease"("applicationId","platform","channelId","status");
COMMIT;
