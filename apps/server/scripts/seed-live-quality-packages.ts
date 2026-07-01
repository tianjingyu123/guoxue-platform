/**
 * 注入直播画质时长包（C5·用户拍板定价·1元=10国学币）。
 * 幂等：固定 id upsert，可重复执行。
 * 运行：cd apps/server && npx tsx scripts/seed-live-quality-packages.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PACKAGES = [
  { id: "pkg-hd-10h", name: "高清 720P · 10 小时包", quality: "hd", minutes: 600, priceCoin: 1280, priceYuan: "128.00", sortOrder: 1 },
  { id: "pkg-hd-30h", name: "高清 720P · 30 小时包", quality: "hd", minutes: 1800, priceCoin: 3280, priceYuan: "328.00", sortOrder: 2 },
  { id: "pkg-uhd-10h", name: "超清 1080P · 10 小时包", quality: "uhd", minutes: 600, priceCoin: 2580, priceYuan: "258.00", sortOrder: 1 },
  { id: "pkg-uhd-30h", name: "超清 1080P · 30 小时包", quality: "uhd", minutes: 1800, priceCoin: 6980, priceYuan: "698.00", sortOrder: 2 },
];

async function main() {
  for (const p of PACKAGES) {
    await prisma.liveQualityPackage.upsert({
      where: { id: p.id },
      create: { ...p, status: "ACTIVE" },
      update: { name: p.name, quality: p.quality, minutes: p.minutes, priceCoin: p.priceCoin, priceYuan: p.priceYuan, sortOrder: p.sortOrder, status: "ACTIVE" },
    });
    console.log(`✔ ${p.name} — ${p.priceCoin}币 / ${p.minutes}分`);
  }
  const total = await prisma.liveQualityPackage.count({ where: { status: "ACTIVE" } });
  console.log(`\n已上架时长包：${total} 个`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
