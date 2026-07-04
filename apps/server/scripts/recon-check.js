// P2-c readiness check: settlement reconcile alerts + ledger status distribution (read-only)
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const alerts = await p.notification.findMany({
    where: { targetType: "SETTLEMENT_RECONCILE" },
    orderBy: { createdAt: "desc" },
    take: 14,
    select: { targetId: true, content: true, createdAt: true },
  });
  console.log("=== RECON ALERTS (last 14, none = clean days) ===");
  console.log(JSON.stringify(alerts, null, 1));
  const ledger = await p.ledgerEntry.groupBy({ by: ["status"], _count: true, _sum: { amount: true } });
  console.log("=== LEDGER STATUS ===");
  console.log(JSON.stringify(ledger));
  const scenes = await p.ledgerEntry.groupBy({ by: ["scene"], _count: true });
  console.log("=== SCENES ===");
  console.log(JSON.stringify(scenes));
  const range = await p.ledgerEntry.aggregate({ _min: { createdAt: true }, _max: { createdAt: true } });
  console.log("=== RANGE ===");
  console.log(JSON.stringify(range));
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
