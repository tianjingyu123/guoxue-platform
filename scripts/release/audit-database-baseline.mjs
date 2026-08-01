import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../..");
const serverDir = resolve(repoRoot, "apps/server");
const schemaPath = "prisma/schema.prisma";
const baselinePath = resolve(
  serverDir,
  "prisma/migrations-deploy/full-baseline.sql",
);
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const pnpmEntry = process.env.npm_execpath;
const prismaDiffArgs = [
  "exec",
  "prisma",
  "migrate",
  "diff",
  "--from-empty",
  "--to-schema-datamodel",
  schemaPath,
  "--script",
];

const result = spawnSync(
  pnpmEntry ? process.execPath : pnpmCommand,
  pnpmEntry ? [pnpmEntry, ...prismaDiffArgs] : prismaDiffArgs,
  {
    cwd: serverDir,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  },
);

if (result.error) {
  console.error(`无法生成 Prisma 空库基线：${result.error.message}`);
  process.exit(1);
}

if (result.status !== 0) {
  console.error("Prisma 空库基线生成失败。");
  if (result.stderr) {
    console.error(result.stderr.trim());
  }
  process.exit(result.status ?? 1);
}

const normalizeSql = (sql) =>
  sql
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .trimEnd();

const generated = normalizeSql(result.stdout);
const committed = normalizeSql(readFileSync(baselinePath, "utf8"));

if (generated !== committed) {
  console.error(
    "数据库完整基线已落后于 prisma/schema.prisma，新服务器空库初始化会缺少结构。",
  );
  console.error(
    "请重新生成 apps/server/prisma/migrations-deploy/full-baseline.sql，并复核差异后再发布。",
  );
  process.exit(1);
}

console.log(
  `数据库空库基线审计通过：full-baseline.sql 与 ${schemaPath} 完全一致。`,
);
