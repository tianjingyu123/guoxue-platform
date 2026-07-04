// P2-c post-flip sanity (read-only)
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const flag = await p.configSystem.findUnique({ where: { configKey: "settlement.ledger_withdrawable.enabled" } });
  console.log("FLAG:", flag ? flag.configValue : "missing");
  const ledgerCount = await p.ledgerEntry.count();
  console.log("LEDGER_COUNT:", ledgerCount);
  const occU = await p.withdrawalApplication.aggregate({ where: { status: { in: ["PENDING", "APPROVED", "PAID"] } }, _sum: { amount: true }, _count: true });
  console.log("USER_WITHDRAW_OCCUPYING:", JSON.stringify({ count: occU._count, sum: occU._sum.amount }));
  const occS = await p.withdrawal.aggregate({ where: { status: { in: ["PENDING", "APPROVED", "PAID"] } }, _sum: { amount: true }, _count: true });
  console.log("STATION_WITHDRAW_OCCUPYING:", JSON.stringify({ count: occS._count, sum: occS._sum.amount }));
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
