import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  generateDatabaseBaselineSql,
  normalizeDatabaseBaselineSql,
} from "./database-baseline-utils.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../..");
const serverDir = resolve(repoRoot, "apps/server");
function valueOf(flag, fallback) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] || "" : fallback;
}

const schemaPath = resolve(valueOf("--schema", resolve(serverDir, "prisma/schema.prisma")));
const baselinePath = resolve(
  valueOf("--baseline", resolve(serverDir, "prisma/migrations-deploy/full-baseline.sql")),
);

let generated;
try {
  generated = generateDatabaseBaselineSql({ schemaPath, serverDir });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
const committed = normalizeDatabaseBaselineSql(readFileSync(baselinePath, "utf8"));

if (generated !== committed) {
  console.error(`数据库完整基线已落后于 ${schemaPath}，新服务器空库初始化会缺少结构。`);
  console.error(
    "请执行 pnpm release:generate-db-baseline -- --confirm REGENERATE_FULL_BASELINE，复核差异后再发布。",
  );
  process.exit(1);
}

console.log(`数据库空库基线审计通过：${baselinePath} 与 ${schemaPath} 完全一致。`);
