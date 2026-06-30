/* eslint-disable no-console */
/**
 * 圈子退款资金子系统 建表（原生 SQL，绕过被 dev server 锁住的 prisma generate）
 * 表结构与 schema.prisma 的 CircleRefundRequest / CommissionRecall model 对齐。
 * 用法: cd apps/server && npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/create-refund-tables.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "CircleRefundRequest" (
    "id" TEXT PRIMARY KEY,
    "circleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "paidAmount" DECIMAL(10,2) NOT NULL,
    "dailyCost" DECIMAL(10,2) NOT NULL,
    "usedDays" INTEGER NOT NULL,
    "refundBase" DECIMAL(10,2) NOT NULL,
    "feeRate" DECIMAL(5,4) NOT NULL DEFAULT 0.20,
    "feeAmount" DECIMAL(10,2) NOT NULL,
    "actualRefund" DECIMAL(10,2) NOT NULL,
    "reason" TEXT,
    "refundType" TEXT NOT NULL DEFAULT 'normal',
    "ownerStatus" TEXT NOT NULL DEFAULT 'pending',
    "ownerReviewedAt" TIMESTAMP(3),
    "ownerRejectReason" TEXT,
    "adminStatus" TEXT NOT NULL DEFAULT 'pending',
    "adminReviewedAt" TIMESTAMP(3),
    "adminRejectReason" TEXT,
    "refundStatus" TEXT NOT NULL DEFAULT 'pending',
    "refundedAt" TIMESTAMP(3),
    "ownerRecalled" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "stationRecalled" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "CircleRefundRequest_circleId_refundStatus_idx" ON "CircleRefundRequest" ("circleId","refundStatus")`,
  `CREATE INDEX IF NOT EXISTS "CircleRefundRequest_userId_idx" ON "CircleRefundRequest" ("userId")`,
  // 防重复申请：同一用户对同一圈子只能有一个待处理申请（refundStatus=pending 且未驳回）
  `CREATE UNIQUE INDEX IF NOT EXISTS "CircleRefundRequest_active_uniq" ON "CircleRefundRequest" ("circleId","userId") WHERE "refundStatus" = 'pending'`,
  `CREATE TABLE IF NOT EXISTS "CommissionRecall" (
    "id" TEXT PRIMARY KEY,
    "refundId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userType" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "balanceAfter" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "offsetCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "CommissionRecall_userId_status_idx" ON "CommissionRecall" ("userId","status")`,
  `CREATE INDEX IF NOT EXISTS "CommissionRecall_refundId_idx" ON "CommissionRecall" ("refundId")`,
];

async function main() {
  console.log("=== 圈子退款表 建表 ===");
  for (const sql of STATEMENTS) {
    await prisma.$executeRawUnsafe(sql);
  }
  // 校验
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT table_name FROM information_schema.tables WHERE table_name IN ('CircleRefundRequest','CommissionRecall')`,
  );
  console.log("已存在的退款表:", rows.map(r => r.table_name).join(", "));
  console.log("完成。");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
