/**
 * 电子书·我的收藏建表(幂等，可重复运行)
 *
 * 建 EbookFavorite 表(原生 SQL·IF NOT EXISTS·不碰现有表)，对齐 ClassicFavorite。
 * 运行：cd apps/server && npx tsx scripts/create-ebook-favorite-table.ts
 * 清理：DROP TABLE "EbookFavorite";
 */
import { PrismaClient } from "@prisma/client";

process.env.DATABASE_URL ||= "postgresql://guoxue:guoxue123@localhost:5433/guoxue";
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "EbookFavorite" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "ebookId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "EbookFavorite_userId_ebookId_key" ON "EbookFavorite"("userId","ebookId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EbookFavorite_userId_idx" ON "EbookFavorite"("userId")`);
  console.log("✅ 表已就绪 EbookFavorite");
}

main()
  .catch((e) => { console.error("❌ 失败:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
