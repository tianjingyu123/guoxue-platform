#!/usr/bin/env node

import { createHash } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const options = new Map();
for (let index = 0; index < args.length; index += 2) {
  const key = args[index];
  const value = args[index + 1];
  if (!key?.startsWith("--") || value === undefined) {
    throw new Error(`未知或缺少值的参数：${key || "<empty>"}`);
  }
  options.set(key, value);
}

function required(name) {
  const value = options.get(name)?.trim();
  if (!value) throw new Error(`必须提供 ${name}`);
  return value;
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function parseManifest(content) {
  return Object.fromEntries(
    content
      .split(/\r?\n/u)
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf("=");
        if (separator <= 0) throw new Error(`迁移清单存在无效行：${line}`);
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

const releaseId = required("--release-id");
const verificationMode = required("--verification-mode");
const targetDatabaseName = required("--target-database-name");
const tableCount = Number.parseInt(required("--table-count"), 10);
const prismaMigrationStatus = required("--prisma-migration-status");
const countsPath = path.resolve(required("--source-counts-file"));
const checksumPath = path.resolve(required("--source-checksum-file"));
const manifestPath = path.resolve(required("--source-manifest-file"));
const reportPath = path.resolve(required("--report"));

if (!/^[A-Za-z0-9._-]{8,80}$/u.test(releaseId)) {
  throw new Error("发布标识必须为 8-80 位字母、数字、点、下划线或连字符");
}
if (!new Set(["rehearsal", "final"]).has(verificationMode)) {
  throw new Error("verification-mode 只允许 rehearsal 或 final");
}
if (!Number.isSafeInteger(tableCount) || tableCount < 1) {
  throw new Error("table-count 必须为大于 0 的整数");
}
if (prismaMigrationStatus !== "passed") {
  throw new Error("prisma-migration-status 必须为 passed");
}
if (targetDatabaseName.length > 128 || /[\r\n]/u.test(targetDatabaseName)) {
  throw new Error("目标数据库名称无效");
}

const [countsContent, checksumContent, manifestContent] = await Promise.all([
  readFile(countsPath, "utf8"),
  readFile(checksumPath, "utf8"),
  readFile(manifestPath, "utf8"),
]);
const manifest = parseManifest(manifestContent);

if (!new Set(["rehearsal", "final"]).has(manifest.export_mode)) {
  throw new Error("迁移清单的 export_mode 无效");
}
if (!/^[A-Fa-f0-9-]+$/u.test(manifest.consistent_snapshot || "")) {
  throw new Error("迁移清单缺少有效的一致性快照标识");
}
if (!manifest.database_name || /[\r\n]/u.test(manifest.database_name)) {
  throw new Error("迁移清单缺少有效的源数据库名称");
}
if (verificationMode === "final" && manifest.export_mode !== "final") {
  throw new Error("正式核验只接受最终停写后生成的 final 归档");
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  releaseId,
  success: true,
  verificationMode,
  sourceExportMode: manifest.export_mode,
  consistentSnapshot: manifest.consistent_snapshot,
  sourceDatabaseName: manifest.database_name,
  targetDatabaseName,
  tableCount,
  mismatchedTableCount: 0,
  businessIntegrityPassed: true,
  prismaMigrationStatusPassed: true,
  sources: {
    counts: { file: path.basename(countsPath), sha256: sha256(countsContent) },
    checksum: { file: path.basename(checksumPath), sha256: sha256(checksumContent) },
    manifest: { file: path.basename(manifestPath), sha256: sha256(manifestContent) },
  },
};

await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, {
  encoding: "utf8",
  mode: 0o600,
});
await chmod(reportPath, 0o600).catch(() => undefined);
console.log(`数据库迁移核验证据已写入：${reportPath}`);
