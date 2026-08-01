#!/usr/bin/env node

import { createHash } from "node:crypto";
import { chmod, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
let auditArgument = "release-evidence/client-artifact-audit.json";
let rootArgument = ".";
let expectedReleaseId = "";
let expectedCommit = "";
let outputArgument = "";
let auditSet = false;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  const next = args[index + 1];
  if (arg === "--root" && next) {
    rootArgument = next;
    index += 1;
  } else if (arg === "--expected-release-id" && next) {
    expectedReleaseId = next.trim();
    index += 1;
  } else if (arg === "--expected-commit" && next) {
    expectedCommit = next.trim().toLowerCase();
    index += 1;
  } else if (arg === "--output" && next) {
    outputArgument = next;
    index += 1;
  } else if (!arg.startsWith("--") && !auditSet) {
    auditArgument = arg;
    auditSet = true;
  } else {
    throw new Error(`未知或不完整参数：${arg}`);
  }
}

if (expectedReleaseId && !/^[A-Za-z0-9._-]{8,80}$/u.test(expectedReleaseId)) {
  throw new Error("--expected-release-id 必须是 8-80 位字母、数字、点、下划线或短横线");
}
if (expectedCommit && !/^[a-f0-9]{40}$/u.test(expectedCommit)) {
  throw new Error("--expected-commit 必须是 40 位 Git 提交 SHA");
}

const root = path.resolve(process.cwd(), rootArgument);
const auditPath = path.resolve(process.cwd(), auditArgument);
const outputPath = outputArgument ? path.resolve(process.cwd(), outputArgument) : "";
const targetDirectories = [
  "apps/admin/dist",
  "apps/mobile/dist/build/h5",
  "apps/mobile/dist/build/mp-weixin",
  "apps/mobile/dist/build/app",
  "apps/mobile/dist/build/app-harmony",
];

async function collectFiles(entry, files) {
  const info = await stat(entry);
  if (info.isFile()) {
    files.push(entry);
    return;
  }
  for (const child of await readdir(entry)) {
    await collectFiles(path.join(entry, child), files);
  }
}

async function fingerprintTarget(targetDir, files) {
  const hash = createHash("sha256");
  let bytes = 0;
  const orderedFiles = [...files].sort((left, right) =>
    path
      .relative(targetDir, left)
      .split(path.sep)
      .join("/")
      .localeCompare(path.relative(targetDir, right).split(path.sep).join("/"), "en"),
  );

  for (const file of orderedFiles) {
    const relative = path.relative(targetDir, file).split(path.sep).join("/");
    const content = await readFile(file);
    bytes += content.length;
    hash.update(relative, "utf8");
    hash.update("\0");
    hash.update(String(content.length), "utf8");
    hash.update("\0");
    hash.update(content);
    hash.update("\0");
  }

  return { bytes, contentSha256: hash.digest("hex") };
}

let audit;
try {
  audit = JSON.parse(await readFile(auditPath, "utf8"));
} catch (error) {
  console.error(`客户端成品验真失败：无法读取或解析 ${auditPath}`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}

const errors = [];
if (audit.schemaVersion !== 2) errors.push("客户端成品审计报告 schemaVersion 必须为 2");
if (audit.success !== true) errors.push("客户端成品审计报告自身未通过");
if (!/^[A-Za-z0-9._-]{8,80}$/u.test(String(audit.releaseId || ""))) {
  errors.push("客户端成品审计报告缺少合法 releaseId");
}
if (!/^[a-f0-9]{40}$/u.test(String(audit.sourceCommit || ""))) {
  errors.push("客户端成品审计报告缺少合法 sourceCommit");
}
if (expectedReleaseId && audit.releaseId !== expectedReleaseId) {
  errors.push(`发布标识不一致：期望 ${expectedReleaseId}，报告为 ${audit.releaseId || "<缺失>"}`);
}
if (expectedCommit && audit.sourceCommit !== expectedCommit) {
  errors.push(`源码提交不一致：期望 ${expectedCommit}，报告为 ${audit.sourceCommit || "<缺失>"}`);
}

const reports = Array.isArray(audit.targets) ? audit.targets : [];
const reportByDirectory = new Map();
for (const target of reports) {
  if (!target || typeof target.directory !== "string") {
    errors.push("客户端成品审计报告存在无效目标记录");
    continue;
  }
  if (reportByDirectory.has(target.directory)) {
    errors.push(`客户端成品审计报告重复记录目录：${target.directory}`);
    continue;
  }
  reportByDirectory.set(target.directory, target);
}
for (const directory of reportByDirectory.keys()) {
  if (!targetDirectories.includes(directory))
    errors.push(`客户端成品审计报告包含未知目录：${directory}`);
}

const targetResults = [];
let totalFiles = 0;
let totalBytes = 0;
for (const directory of targetDirectories) {
  const expected = reportByDirectory.get(directory);
  if (!expected) {
    errors.push(`客户端成品审计报告缺少目录：${directory}`);
    continue;
  }
  if (
    expected.success !== true ||
    !Number.isInteger(expected.files) ||
    expected.files < 1 ||
    !Number.isInteger(expected.bytes) ||
    expected.bytes < 1 ||
    !/^[a-f0-9]{64}$/u.test(String(expected.contentSha256 || ""))
  ) {
    errors.push(`客户端成品审计报告中的目标记录无效：${directory}`);
    continue;
  }

  const targetDir = path.resolve(root, directory);
  const files = [];
  try {
    await collectFiles(targetDir, files);
  } catch {
    errors.push(`客户端成品目录不存在或不可读：${directory}`);
    continue;
  }
  const fingerprint = await fingerprintTarget(targetDir, files);
  totalFiles += files.length;
  totalBytes += fingerprint.bytes;
  const sourceMaps = files.filter((file) => path.extname(file).toLowerCase() === ".map").length;
  const matches =
    files.length === expected.files &&
    fingerprint.bytes === expected.bytes &&
    fingerprint.contentSha256 === expected.contentSha256 &&
    sourceMaps === 0;
  if (!matches) {
    errors.push(
      `客户端成品与审计指纹不一致：${directory}（文件 ${files.length}/${expected.files}，字节 ${fingerprint.bytes}/${expected.bytes}，源码映射 ${sourceMaps}）`,
    );
  }
  targetResults.push({
    directory,
    files: files.length,
    bytes: fingerprint.bytes,
    contentSha256: fingerprint.contentSha256,
    matches,
  });
}

if (reports.length !== targetDirectories.length)
  errors.push("客户端成品审计报告必须且只能包含五类目标");
if (audit.counts?.targets !== targetDirectories.length)
  errors.push("客户端成品审计报告目标总数不是 5");
if (audit.counts?.files !== totalFiles) errors.push("客户端成品总文件数与审计报告不一致");
if (audit.counts?.bytes !== totalBytes) errors.push("客户端成品总字节数与审计报告不一致");
if (audit.counts?.errors !== 0) errors.push("客户端成品审计报告仍记录错误");

const verification = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  releaseId: audit.releaseId || null,
  sourceCommit: audit.sourceCommit || null,
  auditFile: path.relative(root, auditPath).split(path.sep).join("/"),
  success: errors.length === 0,
  counts: {
    targets: targetResults.length,
    files: totalFiles,
    bytes: totalBytes,
    errors: errors.length,
  },
  targets: targetResults,
  errors,
};

if (outputPath) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(verification, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await chmod(outputPath, 0o600).catch(() => undefined);
  console.log(`客户端成品验真报告：${outputPath}`);
}

if (errors.length > 0) {
  errors.forEach((message) => console.error(`错误：${message}`));
  process.exit(1);
}

console.log(
  `客户端成品验真通过：${targetResults.length} 类、${totalFiles} 个文件、${totalBytes} 字节均与发布 ${audit.releaseId} / ${audit.sourceCommit} 的审计指纹一致`,
);
