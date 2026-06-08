const { PrismaClient } = require("../apps/server/node_modules/@prisma/client");
const p = new PrismaClient();

async function exec(sql, label) {
  try {
    await p.$executeRawUnsafe(sql);
    console.log("OK:", label);
  } catch (e) {
    console.log("SKIP:", label, "-", e.message.split("\n")[0]);
  }
}

async function main() {
  console.log("=== 补全所有缺失的数据库对象 ===\n");

  // ─── manual_add_institute_audit_split 剩余部分 ───
  await exec(
    `CREATE TABLE IF NOT EXISTS "InstituteCourse" (` +
    `"id" TEXT NOT NULL, "instituteId" TEXT NOT NULL, "teacherId" TEXT NOT NULL, ` +
    `"title" TEXT NOT NULL, "cover" TEXT, "intro" TEXT, ` +
    `"price" DECIMAL(10,2) NOT NULL DEFAULT 0, "teacherShare" DECIMAL(5,4) NOT NULL DEFAULT 0, ` +
    `"maxStudents" INTEGER NOT NULL DEFAULT 20, "location" TEXT, ` +
    `"startTime" TIMESTAMP(3) NOT NULL, "endTime" TIMESTAMP(3) NOT NULL, ` +
    `"status" TEXT NOT NULL DEFAULT 'DRAFT', ` +
    `"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ` +
    `"updatedAt" TIMESTAMP(3) NOT NULL, ` +
    `CONSTRAINT "InstituteCourse_pkey" PRIMARY KEY ("id"))`,
    "InstituteCourse"
  );

  await exec(
    `CREATE TABLE IF NOT EXISTS "InstituteCourseRegistration" (` +
    `"id" TEXT NOT NULL, "courseId" TEXT NOT NULL, "userId" TEXT NOT NULL, ` +
    `"status" TEXT NOT NULL DEFAULT 'REGISTERED', "signedAt" TIMESTAMP(3), ` +
    `"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ` +
    `CONSTRAINT "InstituteCourseRegistration_pkey" PRIMARY KEY ("id"))`,
    "InstituteCourseRegistration"
  );

  await exec(
    `ALTER TABLE "InstituteMember" ADD COLUMN IF NOT EXISTS "instituteId" TEXT`,
    "InstituteMember.instituteId"
  );

  await exec(
    `CREATE TABLE IF NOT EXISTS "ContentAuditRecord" (` +
    `"id" TEXT NOT NULL, "contentType" TEXT NOT NULL, "contentId" TEXT NOT NULL, ` +
    `"circleId" TEXT, "submitterId" TEXT NOT NULL, ` +
    `"auditMode" TEXT NOT NULL DEFAULT 'PRE_PUBLISH', ` +
    `"machineStatus" TEXT NOT NULL DEFAULT 'PENDING', "machineResult" TEXT, ` +
    `"machineAuditAt" TIMESTAMP(3), "machineAuditBy" TEXT, ` +
    `"humanAuditorId" TEXT, "humanStatus" TEXT NOT NULL DEFAULT 'PENDING', ` +
    `"humanResult" TEXT, "humanAuditAt" TIMESTAMP(3), ` +
    `"aiReauditEnabled" BOOLEAN NOT NULL DEFAULT false, ` +
    `"aiReauditStatus" TEXT, "aiReauditResult" TEXT, "aiReauditAt" TIMESTAMP(3), ` +
    `"isRecommended" BOOLEAN NOT NULL DEFAULT false, ` +
    `"recommendedAt" TIMESTAMP(3), "recommendedBy" TEXT, ` +
    `"finalStatus" TEXT NOT NULL DEFAULT 'PENDING', "rejectReason" TEXT, ` +
    `"finishedAt" TIMESTAMP(3), ` +
    `"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ` +
    `"updatedAt" TIMESTAMP(3) NOT NULL, ` +
    `CONSTRAINT "ContentAuditRecord_pkey" PRIMARY KEY ("id"))`,
    "ContentAuditRecord"
  );

  await exec(
    `CREATE TABLE IF NOT EXISTS "CircleRevenueSplit" (` +
    `"id" TEXT NOT NULL, "circleId" TEXT NOT NULL, "guestId" TEXT NOT NULL, ` +
    `"scene" TEXT NOT NULL DEFAULT 'ALL', "splitRate" DECIMAL(5,4) NOT NULL, ` +
    `"status" TEXT NOT NULL DEFAULT 'ACTIVE', ` +
    `"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ` +
    `"updatedAt" TIMESTAMP(3) NOT NULL, ` +
    `CONSTRAINT "CircleRevenueSplit_pkey" PRIMARY KEY ("id"))`,
    "CircleRevenueSplit"
  );

  await exec(
    `CREATE TABLE IF NOT EXISTS "CircleGuestEarning" (` +
    `"id" TEXT NOT NULL, "circleId" TEXT NOT NULL, "guestId" TEXT NOT NULL, ` +
    `"scene" TEXT NOT NULL, "sourceId" TEXT NOT NULL, ` +
    `"amount" DECIMAL(10,2) NOT NULL, "splitRate" DECIMAL(5,4) NOT NULL, ` +
    `"earned" DECIMAL(10,2) NOT NULL, "settled" BOOLEAN NOT NULL DEFAULT false, ` +
    `"settledAt" TIMESTAMP(3), ` +
    `"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ` +
    `CONSTRAINT "CircleGuestEarning_pkey" PRIMARY KEY ("id"))`,
    "CircleGuestEarning"
  );

  await exec(
    `CREATE TABLE IF NOT EXISTS "CourseBundle" (` +
    `"id" TEXT NOT NULL, "name" TEXT NOT NULL, "cover" TEXT, "intro" TEXT, ` +
    `"type" "BundleType" NOT NULL DEFAULT 'FREE_GIFT', ` +
    `"target" "BundleTarget" NOT NULL DEFAULT 'PUBLIC', ` +
    `"originalPrice" DECIMAL(10,2), "sellPrice" DECIMAL(10,2), ` +
    `"sortOrder" INTEGER NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'ACTIVE', ` +
    `"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ` +
    `"updatedAt" TIMESTAMP(3) NOT NULL, ` +
    `CONSTRAINT "CourseBundle_pkey" PRIMARY KEY ("id"))`,
    "CourseBundle"
  );

  await exec(
    `CREATE TABLE IF NOT EXISTS "CourseBundleItem" (` +
    `"id" TEXT NOT NULL, "bundleId" TEXT NOT NULL, ` +
    `"itemType" TEXT NOT NULL DEFAULT 'COURSE', "itemId" TEXT NOT NULL, ` +
    `"sortOrder" INTEGER NOT NULL DEFAULT 0, ` +
    `"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ` +
    `CONSTRAINT "CourseBundleItem_pkey" PRIMARY KEY ("id"))`,
    "CourseBundleItem"
  );

  await exec(
    `CREATE TABLE IF NOT EXISTS "StationBundleAccess" (` +
    `"id" TEXT NOT NULL, "bundleId" TEXT NOT NULL, ` +
    `"stationId" TEXT, "operatorId" TEXT, ` +
    `"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ` +
    `CONSTRAINT "StationBundleAccess_pkey" PRIMARY KEY ("id"))`,
    "StationBundleAccess"
  );

  // ─── manual_add_content_supply_chain ───
  await exec(
    `CREATE TABLE IF NOT EXISTS "ContentSupply" (` +
    `"id" TEXT NOT NULL, "contentId" TEXT NOT NULL, "contentType" TEXT NOT NULL, ` +
    `"priceMode" TEXT NOT NULL DEFAULT 'REVENUE_SPLIT', "priceConfig" JSONB NOT NULL DEFAULT '{}', ` +
    `"status" TEXT NOT NULL DEFAULT 'ACTIVE', ` +
    `"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ` +
    `"updatedAt" TIMESTAMP(3) NOT NULL, ` +
    `CONSTRAINT "ContentSupply_pkey" PRIMARY KEY ("id"))`,
    "ContentSupply"
  );

  await exec(
    `CREATE TABLE IF NOT EXISTS "TenantAccount" (` +
    `"id" TEXT NOT NULL, "stationId" TEXT NOT NULL, ` +
    `"balance" DECIMAL(12,2) NOT NULL DEFAULT 0, "totalRecharged" DECIMAL(12,2) NOT NULL DEFAULT 0, ` +
    `"totalConsumed" DECIMAL(12,2) NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'ACTIVE', ` +
    `"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ` +
    `"updatedAt" TIMESTAMP(3) NOT NULL, ` +
    `CONSTRAINT "TenantAccount_pkey" PRIMARY KEY ("id"))`,
    "TenantAccount"
  );

  await exec(
    `CREATE TABLE IF NOT EXISTS "TenantRecharge" (` +
    `"id" TEXT NOT NULL, "accountId" TEXT NOT NULL, "amount" DECIMAL(10,2) NOT NULL, ` +
    `"payMethod" TEXT NOT NULL, "transactionId" TEXT, ` +
    `"status" TEXT NOT NULL DEFAULT 'PENDING', ` +
    `"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ` +
    `CONSTRAINT "TenantRecharge_pkey" PRIMARY KEY ("id"))`,
    "TenantRecharge"
  );

  await exec(
    `CREATE TABLE IF NOT EXISTS "TenantConsumption" (` +
    `"id" TEXT NOT NULL, "accountId" TEXT NOT NULL, "amount" DECIMAL(10,2) NOT NULL, ` +
    `"scene" TEXT NOT NULL, "procurementId" TEXT, "description" TEXT, ` +
    `"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ` +
    `CONSTRAINT "TenantConsumption_pkey" PRIMARY KEY ("id"))`,
    "TenantConsumption"
  );

  await exec(
    `CREATE TABLE IF NOT EXISTS "TenantProcurement" (` +
    `"id" TEXT NOT NULL, "stationId" TEXT NOT NULL, "supplyId" TEXT NOT NULL, ` +
    `"contentId" TEXT NOT NULL, "contentType" TEXT NOT NULL, "priceMode" TEXT NOT NULL, ` +
    `"actualPrice" DECIMAL(10,2) NOT NULL, "splitRate" DECIMAL(5,4), ` +
    `"perUsePrice" DECIMAL(10,4), "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ` +
    `"expireAt" TIMESTAMP(3), "status" TEXT NOT NULL DEFAULT 'ACTIVE', ` +
    `"autoRenew" BOOLEAN NOT NULL DEFAULT false, ` +
    `CONSTRAINT "TenantProcurement_pkey" PRIMARY KEY ("id"))`,
    "TenantProcurement"
  );

  await exec(
    `CREATE TABLE IF NOT EXISTS "ContentSettlement" (` +
    `"id" TEXT NOT NULL, "procurementId" TEXT NOT NULL, "tenantId" TEXT NOT NULL, ` +
    `"amount" DECIMAL(10,2) NOT NULL, "tenantShare" DECIMAL(10,2), ` +
    `"platformShare" DECIMAL(10,2), "scene" TEXT NOT NULL, ` +
    `"status" TEXT NOT NULL DEFAULT 'PENDING', "settledAt" TIMESTAMP(3), ` +
    `"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ` +
    `CONSTRAINT "ContentSettlement_pkey" PRIMARY KEY ("id"))`,
    "ContentSettlement"
  );

  // ─── manual_add_capability_request ───
  await exec(
    `CREATE TABLE IF NOT EXISTS "CapabilityRequest" (` +
    `"id" TEXT NOT NULL, "userId" TEXT NOT NULL, "type" TEXT NOT NULL, ` +
    `"reason" TEXT NOT NULL DEFAULT '', "status" TEXT NOT NULL DEFAULT 'PENDING', ` +
    `"reviewedBy" TEXT, "reviewNote" TEXT, "reviewedAt" TIMESTAMP(3), ` +
    `"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ` +
    `"updatedAt" TIMESTAMP(3) NOT NULL, ` +
    `CONSTRAINT "CapabilityRequest_pkey" PRIMARY KEY ("id"))`,
    "CapabilityRequest"
  );

  // ─── add_stationId_marketing (column exists, just index) ───
  await exec(
    `CREATE INDEX IF NOT EXISTS "MarketingPage_stationId_idx" ON "MarketingPage"("stationId")`,
    "MarketingPage_stationId_idx"
  );

  // ─── Mark all pending migrations as resolved ───
  console.log("\n=== 标记迁移为已应用 ===");
  const migrations = [
    "20260604_add_circle_read_and_booking",
    "add_stationId_marketing",
    "manual_add_capability_request",
    "manual_add_content_supply_chain",
    "manual_add_institute_audit_split",
    "manual_add_station_paipan_link",
    "manual_add_tenant_saas_fields"
  ];

  for (const m of migrations) {
    try {
      // Check if already applied
      const existing = await p.$queryRawUnsafe(
        `SELECT "migration_name" FROM "_prisma_migrations" WHERE "migration_name" = $1`, m
      );
      if (existing.length > 0) {
        console.log(`${m} - already in table`);
      } else {
        console.log(`${m} - needs resolving`);
      }
    } catch (e) {
      console.log(`${m} - Error:`, e.message);
    }
  }

  await p.$disconnect();
  console.log("\n=== 完成！请运行 prisma migrate resolve 来标记迁移 ===");
}

main();
