#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  chmod,
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  statfs,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const idPattern = /^[A-Za-z0-9._-]{8,80}$/;
let rootArg = "/opt/guoxue";
let keepCount = 5;
let minFreeGb = 20;
let reportArg;

const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  const next = args[index + 1];
  if (arg === "--root" && next) {
    rootArg = next;
    index += 1;
  } else if (arg === "--keep" && next) {
    keepCount = Number.parseInt(next, 10);
    index += 1;
  } else if (arg === "--min-free-gb" && next) {
    minFreeGb = Number.parseFloat(next);
    index += 1;
  } else if (arg === "--report" && next) {
    reportArg = next;
    index += 1;
  } else {
    throw new Error(`未知或不完整参数：${arg}`);
  }
}

if (!Number.isInteger(keepCount) || keepCount < 2 || keepCount > 50) {
  throw new Error("--keep 必须是 2-50 的整数");
}
if (!Number.isFinite(minFreeGb) || minFreeGb < 1 || minFreeGb > 1024) {
  throw new Error("--min-free-gb 必须是 1-1024 的数字");
}

const root = await realpath(path.resolve(rootArg));
const releasesDir = path.join(root, "releases");
const packagesDir = path.join(root, "release-packages");
const evidenceDir = path.join(root, "release-evidence");
const historyFile = path.join(root, "release-history.tsv");
const currentIdFile = path.join(root, "current-release-id");
const currentLink = path.join(root, "current");
const errors = [];
const warnings = [];

async function exists(target) {
  try {
    await lstat(target);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function sha256File(file) {
  return await new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(file);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function directorySize(target) {
  let total = 0;
  for (const entry of await readdir(target, { withFileTypes: true })) {
    const full = path.join(target, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) total += await directorySize(full);
    else if (entry.isFile()) total += (await lstat(full)).size;
  }
  return total;
}

function addReason(map, id, reason) {
  if (!idPattern.test(id)) {
    errors.push(`发布历史包含无效版本标识：${id}`);
    return;
  }
  const reasons = map.get(id) || [];
  if (!reasons.includes(reason)) reasons.push(reason);
  map.set(id, reasons);
}

let currentId = "";
let currentReal = "";
try {
  currentReal = await realpath(currentLink);
  currentId = (await readFile(path.join(currentReal, ".release-id"), "utf8")).trim();
  if (!idPattern.test(currentId)) errors.push("current 目录内 .release-id 格式无效");
} catch (error) {
  errors.push(`current 发布标识读取失败：${error.message}`);
}

try {
  const compatibilityId = (await readFile(currentIdFile, "utf8")).trim();
  if (compatibilityId !== currentId) {
    errors.push("current-release-id 兼容指针与 current 目录不一致");
  }
} catch (error) {
  errors.push(`current-release-id 兼容指针读取失败：${error.message}`);
}

const historyText = await readFile(historyFile, "utf8");
const history = historyText
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line, index) => {
    const fields = line.split("\t");
    if (fields.length !== 6) errors.push(`发布历史第 ${index + 1} 行不是 6 列`);
    const [timestamp, action, releaseId, previousId, migrated, packageHash] = fields;
    if (!/^(activate|rollback)$/.test(action || "")) {
      errors.push(`发布历史第 ${index + 1} 行动作无效`);
    }
    if (!idPattern.test(releaseId || "")) {
      errors.push(`发布历史第 ${index + 1} 行版本标识无效`);
    }
    if (previousId !== "-" && !idPattern.test(previousId || "")) {
      errors.push(`发布历史第 ${index + 1} 行前序版本无效`);
    }
    if (!/^(true|false)$/.test(migrated || "")) {
      errors.push(`发布历史第 ${index + 1} 行迁移标识无效`);
    }
    if (packageHash !== "-" && !/^[a-f0-9]{64}$/.test(packageHash || "")) {
      errors.push(`发布历史第 ${index + 1} 行包哈希无效`);
    }
    return { timestamp, action, releaseId, previousId, migrated, packageHash };
  });

if (history.length === 0) errors.push("发布历史为空");

const protectedReleases = new Map();
addReason(protectedReleases, currentId, "current");
const latest = history.at(-1);
if (latest?.previousId && latest.previousId !== "-") {
  addReason(protectedReleases, latest.previousId, "previous");
}
const lastMigrated = history.findLast((entry) => entry.migrated === "true");
if (lastMigrated) addReason(protectedReleases, lastMigrated.releaseId, "last-migration");

const recentIds = [];
for (const entry of [...history].reverse()) {
  if (!recentIds.includes(entry.releaseId)) recentIds.push(entry.releaseId);
  if (recentIds.length >= keepCount) break;
}
for (const id of recentIds) addReason(protectedReleases, id, `recent-${keepCount}`);

try {
  const expectedReal = await realpath(path.join(releasesDir, currentId));
  if (currentReal !== expectedReal) {
    errors.push("current 软链接与当前目录发布标识不一致");
  }
} catch (error) {
  errors.push(`current 软链接校验失败：${error.message}`);
}

const protectedDetails = [];
for (const [releaseId, reasons] of protectedReleases) {
  const releaseDir = path.join(releasesDir, releaseId);
  const archiveName = `gx-deploy-91-${releaseId}.tar.gz`;
  const archive = path.join(packagesDir, archiveName);
  const checksum = `${archive}.sha256`;
  const evidence = path.join(evidenceDir, releaseId);
  const detail = { releaseId, reasons, releaseDir, archive, evidence, archiveBytes: 0 };
  protectedDetails.push(detail);

  for (const [label, target] of [
    ["发布目录", releaseDir],
    ["发布清单", path.join(releaseDir, "RELEASE-MANIFEST.json")],
    ["发布标识", path.join(releaseDir, ".release-id")],
    ["保留发布包", archive],
    ["发布包校验文件", checksum],
    ["发布证据", evidence],
  ]) {
    if (!(await exists(target))) errors.push(`${releaseId} 缺少${label}：${target}`);
  }

  if (await exists(path.join(releaseDir, ".release-id"))) {
    const embeddedId = (await readFile(path.join(releaseDir, ".release-id"), "utf8")).trim();
    if (embeddedId !== releaseId) errors.push(`${releaseId} 的目录内发布标识不一致`);
  }

  if ((await exists(archive)) && (await exists(checksum))) {
    const checksumText = (await readFile(checksum, "utf8")).trim();
    const match = checksumText.match(/^([a-f0-9]{64})\s+(.+)$/);
    if (!match || path.basename(match[2]) !== archiveName) {
      errors.push(`${releaseId} 的发布包校验文件格式无效`);
    } else {
      const actualHash = await sha256File(archive);
      if (actualHash !== match[1]) errors.push(`${releaseId} 的保留发布包 SHA-256 不一致`);
      detail.archiveBytes = (await lstat(archive)).size;
    }
  }
}

const releaseEntries = await readdir(releasesDir, { withFileTypes: true });
const releaseCandidates = [];
const staleCandidates = [];
for (const entry of releaseEntries) {
  if (!entry.isDirectory()) continue;
  if (entry.name.startsWith(".candidate-")) {
    const target = path.join(releasesDir, entry.name);
    staleCandidates.push({ path: target, bytes: await directorySize(target) });
    warnings.push(`发现部署失败或中断留下的候选目录：${target}`);
  } else if (idPattern.test(entry.name) && !protectedReleases.has(entry.name)) {
    const target = path.join(releasesDir, entry.name);
    releaseCandidates.push({
      releaseId: entry.name,
      path: target,
      bytes: await directorySize(target),
    });
  }
}

const packageCandidates = [];
for (const entry of await readdir(packagesDir, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".tar.gz")) continue;
  const releaseId = entry.name.slice("gx-deploy-91-".length, -".tar.gz".length);
  if (
    entry.name.startsWith("gx-deploy-91-") &&
    idPattern.test(releaseId) &&
    !protectedReleases.has(releaseId)
  ) {
    const target = path.join(packagesDir, entry.name);
    packageCandidates.push({ releaseId, path: target, bytes: (await lstat(target)).size });
  }
}

const disk = await statfs(root);
const blockSize = Number(disk.bsize);
const totalBytes = Number(disk.blocks) * blockSize;
const freeBytes = Number(disk.bavail) * blockSize;
const usedPercent = totalBytes > 0 ? ((totalBytes - freeBytes) / totalBytes) * 100 : 0;
const minFreeBytes = minFreeGb * 1024 ** 3;
if (freeBytes < minFreeBytes) {
  errors.push(`发布磁盘可用空间不足 ${minFreeGb} GiB`);
} else if (usedPercent >= 80) {
  warnings.push(`发布磁盘使用率已达 ${usedPercent.toFixed(1)}%`);
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  root,
  currentReleaseId: currentId,
  retentionCount: keepCount,
  protectedReleases: protectedDetails,
  cleanupCandidates: {
    releaseDirectories: releaseCandidates,
    packages: packageCandidates,
    interruptedCandidates: staleCandidates,
  },
  disk: { totalBytes, freeBytes, usedPercent: Number(usedPercent.toFixed(2)), minFreeGb },
  errors,
  warnings,
  destructiveActionPerformed: false,
};

if (reportArg) {
  const reportPath = path.resolve(reportArg);
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  await chmod(reportPath, 0o600);
}

console.log(`发布保留盘点：保护 ${protectedDetails.length} 个版本`);
console.log(
  `候选清理：目录 ${releaseCandidates.length}，发布包 ${packageCandidates.length}，中断目录 ${staleCandidates.length}`,
);
console.log(
  `磁盘可用：${(freeBytes / 1024 ** 3).toFixed(1)} GiB，使用率 ${usedPercent.toFixed(1)}%`,
);
for (const warning of warnings) console.warn(`WARN ${warning}`);
for (const error of errors) console.error(`FAIL ${error}`);
if (errors.length > 0) process.exitCode = 1;
