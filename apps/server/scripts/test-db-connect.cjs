/**
 * 连库探针：验证「由计划任务/不同启动方式拉起的进程」能否连上 5433。
 * 结果写到 scripts/db-test-result.txt（成功 CONNECTED / 失败 FAILED）。
 */
const fs = require("fs");
const path = require("path");
const envPath = path.resolve(__dirname, "../../../.env");
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/\r$/, "");
}
const out = path.join(__dirname, "db-test-result.txt");
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
p.$queryRawUnsafe("SELECT 1 AS ok")
  .then((r) => { fs.writeFileSync(out, "CONNECTED " + new Date().toISOString() + " " + JSON.stringify(r)); return p.$disconnect(); })
  .then(() => process.exit(0))
  .catch((e) => { fs.writeFileSync(out, "FAILED " + new Date().toISOString() + " " + e.message); process.exit(1); });
