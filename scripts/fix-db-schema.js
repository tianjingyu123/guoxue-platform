const { PrismaClient } = require("../apps/server/node_modules/@prisma/client");
const p = new PrismaClient();

async function main() {
  // 1. Fix failed migration
  try {
    await p.$executeRawUnsafe(`UPDATE "_prisma_migrations" SET "finished_at" = NOW(), "logs" = 'Manually resolved' WHERE "migration_name" = 'add_stationId_bounty_call'`);
    console.log("1. Fixed: add_stationId_bounty_call");
  } catch (e) { console.log("1. Note:", e.message); }

  // 2. Station paipanLink + paipanUserId
  try {
    await p.$executeRawUnsafe(`ALTER TABLE "Station" ADD COLUMN IF NOT EXISTS "paipanLink" TEXT`);
    await p.$executeRawUnsafe(`ALTER TABLE "Station" ADD COLUMN IF NOT EXISTS "paipanUserId" TEXT`);
    console.log("2. Added: Station.paipanLink, Station.paipanUserId");
  } catch (e) { console.log("2. Error:", e.message); }

  // 3. Station tenant SaaS fields
  try {
    await p.$executeRawUnsafe(`ALTER TABLE "Station" ADD COLUMN IF NOT EXISTS "tenantType" TEXT NOT NULL DEFAULT 'INTERNAL'`);
    await p.$executeRawUnsafe(`ALTER TABLE "Station" ADD COLUMN IF NOT EXISTS "schemaName" TEXT`);
    await p.$executeRawUnsafe(`ALTER TABLE "Station" ADD COLUMN IF NOT EXISTS "dbConnString" TEXT`);
    await p.$executeRawUnsafe(`ALTER TABLE "Station" ADD COLUMN IF NOT EXISTS "featureFlags" JSONB`);
    await p.$executeRawUnsafe(`ALTER TABLE "Station" ADD COLUMN IF NOT EXISTS "apiDailyQuota" INTEGER NOT NULL DEFAULT 0`);
    await p.$executeRawUnsafe(`ALTER TABLE "Station" ADD COLUMN IF NOT EXISTS "dataRetentionDays" INTEGER NOT NULL DEFAULT 90`);
    await p.$executeRawUnsafe(`ALTER TABLE "Station" ADD COLUMN IF NOT EXISTS "paymentConfig" JSONB`);
    await p.$executeRawUnsafe(`ALTER TABLE "Station" ADD COLUMN IF NOT EXISTS "autoSuspendOnExpiry" BOOLEAN NOT NULL DEFAULT true`);
    console.log("3. Added: Station tenant SaaS fields");
  } catch (e) { console.log("3. Error:", e.message); }

  // 4. Post audit/feature fields
  try {
    await p.$executeRawUnsafe(`ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "isPushHome" BOOLEAN NOT NULL DEFAULT false`);
    await p.$executeRawUnsafe(`ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "auditStatus" TEXT NOT NULL DEFAULT 'PENDING'`);
    await p.$executeRawUnsafe(`ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "auditReason" TEXT`);
    await p.$executeRawUnsafe(`ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "isRecommended" BOOLEAN NOT NULL DEFAULT false`);
    console.log("4. Added: Post audit fields");
  } catch (e) { console.log("4. Error:", e.message); }

  // 5. RoleType enum - add INSTITUTE_ADMIN
  try {
    await p.$executeRawUnsafe(`ALTER TYPE "RoleType" ADD VALUE IF NOT EXISTS 'INSTITUTE_ADMIN'`);
    console.log("5. Added: RoleType.INSTITUTE_ADMIN");
  } catch (e) { console.log("5. Note:", e.message); }

  // 6. OrderType enum - add BUNDLE
  try {
    await p.$executeRawUnsafe(`ALTER TYPE "OrderType" ADD VALUE IF NOT EXISTS 'BUNDLE'`);
    console.log("6. Added: OrderType.BUNDLE");
  } catch (e) { console.log("6. Note:", e.message); }

  // 7. Institute tables
  try {
    await p.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Institute" (
      "id" TEXT NOT NULL, "name" TEXT NOT NULL, "intro" TEXT, "logo" TEXT,
      "circleId" TEXT, "adminUserId" TEXT NOT NULL, "contactName" TEXT,
      "contactPhone" TEXT, "legalEntity" TEXT,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Institute_pkey" PRIMARY KEY ("id"))`);
    console.log("7. Created: Institute");
  } catch (e) { console.log("7. Error:", e.message); }

  await p.$disconnect();
  console.log("\nAll done!");
}

main();
