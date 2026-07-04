// List configured third-party services (keys only, no values)
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const rows = await p.configSystem.findMany({
    where: { configKey: { startsWith: "third_party." } },
    select: { configKey: true, updatedAt: true },
    orderBy: { configKey: "asc" },
  });
  rows.forEach((r) => console.log(`${r.configKey}  updated=${r.updatedAt.toISOString().slice(0, 16)}`));
  console.log(`total=${rows.length}`);
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
