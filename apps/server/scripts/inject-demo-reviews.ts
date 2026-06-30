/**
 * 注入演示有图评价 —— 验证评价列表 withImages「有图优先」排序。
 * 现网评价数据全部无图，无法体现 withImages 与 newest 的差异，故注入演示数据。
 * 幂等：每次先删除本脚本注入的「【演示】」开头评价再重新插入。
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const productId = "c4171392-45b4-455a-a3f3-99e42f0b50e4"; // 手工檀香·静心礼盒
const userId = "39c2bd42-ed51-418b-847d-864fb827b77c"; // 国学管理员

async function main() {
  await prisma.productReview.deleteMany({ where: { productId, content: { startsWith: "【演示】" } } });
  await prisma.productReview.create({
    data: { productId, userId, rating: 5, content: "【演示】有图好评·檀香气味温润持久", images: ["/static/images/products/p1.jpg", "/static/images/products/p2.jpg"], status: "PUBLISHED", createdAt: new Date("2026-06-10T10:00:00+08:00") },
  });
  await prisma.productReview.create({
    data: { productId, userId, rating: 4, content: "【演示】有图评价·礼盒包装精致", images: ["/static/images/products/p3.jpg"], status: "PUBLISHED", createdAt: new Date("2026-06-20T10:00:00+08:00") },
  });
  const total = await prisma.productReview.count({ where: { productId } });
  const withImg = await prisma.productReview.count({ where: { productId, NOT: { images: { isEmpty: true } } } });
  console.log(`注入完成 — 该商品评价总数=${total}, 有图=${withImg}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
