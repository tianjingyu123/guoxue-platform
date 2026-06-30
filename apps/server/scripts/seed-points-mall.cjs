/**
 * 积分商城商品种子（幂等：按 title 查重）。前台跑（连 5433）。
 */
const fs = require("fs");
const path = require("path");
const envPath = path.resolve(__dirname, "../../../.env");
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/\r$/, "");
}
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const products = [
  { type: "COUPON", title: "10元无门槛券", points: 500, stock: 100, icon: "ticket", color: "#c9a96e", description: "全场通用，无门槛抵扣", payload: {} },
  { type: "COUPON", title: "满100减20券", points: 800, stock: 50, icon: "ticket", color: "#c9a96e", description: "订单满100元可用", payload: {} },
  { type: "COIN", title: "50国学币", points: 500, stock: -1, icon: "coins", color: "#d97706", description: "可用于课程/圈子/打赏", payload: { coinAmount: 50 } },
  { type: "COIN", title: "200国学币", points: 1800, stock: -1, icon: "coins", color: "#d97706", description: "可用于课程/圈子/打赏", payload: { coinAmount: 200 } },
  { type: "VIP", title: "7天会员体验", points: 1000, stock: 30, icon: "crown", color: "#eab308", description: "尊享会员专属权益7天", payload: { days: 7 } },
  { type: "GIFT", title: "国学书签套装", points: 2000, stock: 20, icon: "package", color: "#22c55e", description: "精装国学主题书签，含邮费", payload: {} },
];

async function main() {
  let created = 0, skipped = 0;
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const exist = await prisma.pointsProduct.findFirst({ where: { title: p.title } });
    if (exist) { skipped++; continue; }
    await prisma.pointsProduct.create({
      data: { ...p, sortOrder: i, status: "ACTIVE" },
    });
    created++;
  }
  const total = await prisma.pointsProduct.count({ where: { status: "ACTIVE" } });
  console.log(`✓ 积分商品种子完成：新建 ${created}，跳过 ${skipped}，当前上架 ${total}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error("种子失败:", e); process.exit(1); });
