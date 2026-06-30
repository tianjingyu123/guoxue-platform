/**
 * 圈子成长体系建表（签到/成长/徽章/入圈审批）—— 原生SQL绕 prisma generate 锁(EPERM)。
 * schema.prisma 已加对应 model 供上线正式 migrate；service 用 $queryRawUnsafe/$executeRawUnsafe 访问。
 * 运行：npx ts-node scripts/create-growth-tables.ts
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // 1. 签到记录
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CircleCheckin" (
      "id" TEXT PRIMARY KEY,
      "circleId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "checkinDate" TEXT NOT NULL,
      "expGained" INTEGER NOT NULL DEFAULT 10,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`)
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "CircleCheckin_circleId_userId_checkinDate_key" ON "CircleCheckin"("circleId","userId","checkinDate");`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CircleCheckin_circleId_userId_idx" ON "CircleCheckin"("circleId","userId");`)

  // 2. 成员成长
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CircleMemberGrowth" (
      "id" TEXT PRIMARY KEY,
      "circleId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "checkinExp" INTEGER NOT NULL DEFAULT 0,
      "checkinStreak" INTEGER NOT NULL DEFAULT 0,
      "lastCheckin" TEXT,
      "totalCheckins" INTEGER NOT NULL DEFAULT 0,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`)
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "CircleMemberGrowth_circleId_userId_key" ON "CircleMemberGrowth"("circleId","userId");`)

  // 3. 徽章获得记录
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CircleBadgeRecord" (
      "id" TEXT PRIMARY KEY,
      "circleId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "badgeCode" TEXT NOT NULL,
      "gainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`)
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "CircleBadgeRecord_circleId_userId_badgeCode_key" ON "CircleBadgeRecord"("circleId","userId","badgeCode");`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CircleBadgeRecord_circleId_userId_idx" ON "CircleBadgeRecord"("circleId","userId");`)

  // 4. 入圈审批申请
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CircleJoinRequest" (
      "id" TEXT PRIMARY KEY,
      "circleId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "message" TEXT,
      "reviewedBy" TEXT,
      "reviewedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CircleJoinRequest_circleId_status_idx" ON "CircleJoinRequest"("circleId","status");`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CircleJoinRequest_userId_idx" ON "CircleJoinRequest"("userId");`)

  const tables = await prisma.$queryRawUnsafe<any[]>(`SELECT tablename FROM pg_tables WHERE tablename IN ('CircleCheckin','CircleMemberGrowth','CircleBadgeRecord','CircleJoinRequest') ORDER BY tablename;`)
  console.log('已建表:', tables.map((t) => t.tablename).join(', '))
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
