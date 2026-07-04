// Verify huifu config row (exact key, masked fields, read-only)
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const row = await p.configSystem.findUnique({ where: { configKey: "third_party.huifu" } });
  if (!row) {
    console.log("NO third_party.huifu row");
  } else {
    console.log("updated:", row.updatedAt.toISOString(), "by:", row.updatedBy || "?", "rawLen:", row.configValue.length);
    // value may be encrypted; try JSON parse first
    try {
      const obj = JSON.parse(row.configValue);
      for (const [k, v] of Object.entries(obj)) {
        const s = String(v || "");
        console.log(`  ${k}: len=${s.length} head=${s.slice(0, 10)}`);
      }
    } catch {
      console.log("  value is not plain JSON (likely encrypted at rest) — head:", row.configValue.slice(0, 24));
    }
  }
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
