// order volume check (read-only)
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const orders = await p.order.groupBy({ by: ["status"], _count: true });
  console.log("ORDERS_BY_STATUS:", JSON.stringify(orders));
  const paidLike = await p.order.count({ where: { status: { in: ["PAID", "SHIPPED", "COMPLETED"] } } });
  console.log("PAID_LIKE_TOTAL:", paidLike);
  const recentPaid = await p.order.count({
    where: { status: { in: ["PAID", "SHIPPED", "COMPLETED"] }, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
  });
  console.log("PAID_LIKE_LAST7D:", recentPaid);
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
