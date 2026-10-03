#!/usr/bin/env node

import { existsSync, mkdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  generateDatabaseBaselineSql,
  inspectDatabaseBaselineSql,
} from "./database-baseline-utils.mjs";

const confirmationPhrase = "REGENERATE_FULL_BASELINE";
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const serverDir = path.join(repoRoot, "apps", "server");

function valueOf(flag, fallback = "") {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] || "" : fallback;
}

const schemaPath = path.resolve(
  valueOf("--schema", path.join(serverDir, "prisma", "schema.prisma")),
);
const outputPath = path.resolve(
  valueOf("--output", path.join(serverDir, "prisma", "migrations-deploy", "full-baseline.sql")),
);
const confirmation = valueOf("--confirm", process.env.CONFIRM_REGENERATE_DATABASE_BASELINE || "");

if (confirmation !== confirmationPhrase) {
  console.error("拒绝更新数据库完整基线：缺少显式确认。");
  console.error(`复核 schema 变更后重新执行，并传入 --confirm ${confirmationPhrase}。`);
  process.exit(64);
}

if (!existsSync(schemaPath) || !statSync(schemaPath).isFile()) {
  console.error(`数据库完整基线生成失败：schema 文件不存在：${schemaPath}`);
  process.exit(66);
}

const outputDir = path.dirname(outputPath);
mkdirSync(outputDir, { recursive: true });
const tempPath = path.join(
  outputDir,
  `.${path.basename(outputPath)}.${process.pid}.${Date.now()}.tmp`,
);

try {
  const generated = generateDatabaseBaselineSql({ schemaPath, serverDir });
  const inspected = inspectDatabaseBaselineSql(generated);
  writeFileSync(tempPath, inspected.sql, { encoding: "utf8", flag: "wx" });
  renameSync(tempPath, outputPath);

  console.log(`数据库完整基线已原子更新：${outputPath}`);
  console.log(
    `结构摘要：${inspected.tableCount} 张表、${inspected.indexCount} 条显式索引、${inspected.foreignKeyCount} 个外键。`,
  );
  console.log("下一步必须执行：pnpm release:audit-db-baseline");
} catch (error) {
  rmSync(tempPath, { force: true });
  console.error(
    `数据库完整基线生成失败，原文件未被修改：${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}
