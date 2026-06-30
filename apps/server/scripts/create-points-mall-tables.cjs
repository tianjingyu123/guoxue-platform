/**
 * 精准建表：积分商城 PointsProduct + PointsExchangeRecord（只建这两张，不碰其他表）。
 * 在你自己终端或前台跑（连 5433）。幂等（IF NOT EXISTS）。
 */
const fs = require("fs");
const path = require("path");

// 注入根 .env 的 DATABASE_URL
const envPath = path.resolve(__dirname, "../../../.env");
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/\r$/, "");
}

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const stmts = [
  `CREATE TABLE IF NOT EXISTS "PointsProduct" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT -1,
    "icon" TEXT,
    "color" TEXT,
    "description" TEXT,
    "payload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PointsProduct_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "PointsProduct_status_sortOrder_idx" ON "PointsProduct"("status","sortOrder")`,
  `CREATE TABLE IF NOT EXISTS "PointsExchangeRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "pointsCost" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reward" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PointsExchangeRecord_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "PointsExchangeRecord_userId_createdAt_idx" ON "PointsExchangeRecord"("userId","createdAt")`,
];

async function main() {
  for (const s of stmts) await prisma.$executeRawUnsafe(s);
  // 外键（ADD CONSTRAINT 无 IF NOT EXISTS，幂等靠 try/catch）
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "PointsExchangeRecord" ADD CONSTRAINT "PointsExchangeRecord_productId_fkey" FOREIGN KEY ("productId") REFERENCES "PointsProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    console.log("✓ FK 已添加");
  } catch (e) {
    console.log("FK skip（已存在）:", String(e.message).slice(0, 60));
  }
  const p = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS c FROM "PointsProduct"`);
  const r = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS c FROM "PointsExchangeRecord"`);
  console.log("✓ PointsProduct 表就绪，行数:", p[0].c);
  console.log("✓ PointsExchangeRecord 表就绪，行数:", r[0].c);
  await prisma.$disconnect();
}
main().catch((e) => { console.error("建表失败:", e); process.exit(1); });
