/**
 * 圈子达人通话表 ConsultCall 建表 —— 原生SQL绕 prisma generate 锁。
 * schema.prisma 已加 model 供上线 migrate；service 用 $queryRawUnsafe/$executeRawUnsafe 访问。
 * 运行：npx ts-node scripts/create-consult-call-table.ts
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ConsultCall" (
      "id" TEXT PRIMARY KEY,
      "circleId" TEXT NOT NULL,
      "callerId" TEXT NOT NULL,
      "expertId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "pricePerMinute" INTEGER NOT NULL,
      "prepaidCoin" INTEGER NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'WAITING',
      "rtcRoomId" TEXT,
      "startAt" TIMESTAMP(3),
      "endAt" TIMESTAMP(3),
      "durationSec" INTEGER NOT NULL DEFAULT 0,
      "settledCoin" INTEGER NOT NULL DEFAULT 0,
      "refundedCoin" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ConsultCall_callerId_idx" ON "ConsultCall"("callerId");`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ConsultCall_expertId_status_idx" ON "ConsultCall"("expertId","status");`)

  const t = await prisma.$queryRawUnsafe<any[]>(`SELECT tablename FROM pg_tables WHERE tablename='ConsultCall';`)
  console.log('已建表:', t.map((x) => x.tablename).join(', ') || '(失败)')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
