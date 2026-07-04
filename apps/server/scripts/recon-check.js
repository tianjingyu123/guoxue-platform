// P2-c 转正复盘取数：结算对账告警 + 引擎台账状态分布（只读）
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const alerts = await p.notification.findMany({
    where: { targetType: "SETTLEMENT_RECONCILE" },
    orderBy: { createdAt: "desc" },
    take: 14,
    select: { targetId: true, content: true, createdAt: true },
  });
  console.log("=== 对账告警(近14条·无告警日不产生记录) ===");
  console.log(JSON.stringify(alerts, null, 1));
  const ledger = await p.ledgerEntry.groupBy({ by: ["status"], _count: true, _sum: { amount: true } });
  console.log("=== LedgerEntry 状态分布 ===");
  console.log(JSON.stringify(ledger));
  const scenes = await p.ledgerEntry.groupBy({ by: ["scene"], _count: true });
  console.log("=== 场景分布 ===");
  console.log(JSON.stringify(scenes));
  const range = await p.ledgerEntry.aggregate({ _min: { createdAt: true }, _max: { createdAt: true } });
  console.log("=== 台账时间范围 ===");
  console.log(JSON.stringify(range));
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
