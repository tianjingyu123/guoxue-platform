-- 仅供 bootstrap-empty-database.sh 在已确认空库的单一事务中执行。
-- Prisma 无法表达以下约束；与渠道增量迁移保持一致，不重放旧记录改写。
ALTER TABLE "AppVersion" ALTER COLUMN "targetUserIds" SET NOT NULL;
ALTER TABLE "ResourceRelease" ALTER COLUMN "targetUserIds" SET NOT NULL;
ALTER TABLE "AppVersion" ADD CONSTRAINT "AppVersion_rollout_check"
  CHECK ("rolloutPercentage" BETWEEN 0 AND 100);
DROP INDEX "AppVersion_applicationId_platform_channelId_version_buildNu_key";
CREATE UNIQUE INDEX "AppVersion_applicationId_platform_channelId_version_buildNu_key"
  ON "AppVersion"("applicationId", "platform", "channelId", "version", "buildNumber") NULLS NOT DISTINCT;
ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_operationState_check"
  CHECK ("operationState" IN ('OPEN', 'UNOPENED', 'MAINTENANCE', 'READ_ONLY'));
ALTER TABLE "ResourceRelease" ADD CONSTRAINT "ResourceRelease_rollout_check"
  CHECK ("rolloutPercentage" BETWEEN 0 AND 100);
ALTER TABLE "ResourceRelease" ADD CONSTRAINT "ResourceRelease_version_check"
  CHECK ("resourceVersion" > 0);
INSERT INTO "AppDistribution" ("id", "productId", "applicationId", "platform", "channelId", "clientKey", "packageName", "updatedAt")
SELECT 'legacy-' || p, 'rebu', 'rebu', p, 'legacy', 'rebu-' || p || '-legacy', '', CURRENT_TIMESTAMP
FROM unnest(ARRAY['android', 'ios', 'harmony']) p;
