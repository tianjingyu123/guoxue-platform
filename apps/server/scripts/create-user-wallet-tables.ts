/* eslint-disable no-console */
/**
 * 用户余额钱包 建表（原生 SQL，绕过 prisma generate 锁）
 * 承载圈子退款到账；与 schema.prisma 的 UserWallet / UserBalanceTransaction model 对齐。
 * 用法: cd apps/server && npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/create-user-wallet-tables.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "UserWallet" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS "UserBalanceTransaction" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "balanceAfter" DECIMAL(10,2) NOT NULL,
    "refId" TEXT,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "UserBalanceTransaction_userId_createdAt_idx" ON "UserBalanceTransaction" ("userId","createdAt")`,
];

async function main() {
  console.log("=== 用户余额钱包 建表 ===");
  for (const sql of STATEMENTS) await prisma.$executeRawUnsafe(sql);
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT table_name FROM information_schema.tables WHERE table_name IN ('UserWallet','UserBalanceTransaction')`,
  );
  console.log("已存在:", rows.map(r => r.table_name).join(", "));
  console.log("完成。");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
