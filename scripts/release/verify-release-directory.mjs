#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, readFile, readdir, realpath, writeFile, mkdir, chmod } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

let releaseDirectoryArg;
let sharedSslArg;
let reportArg;
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--shared-ssl") {
    sharedSslArg = args[index + 1];
    index += 1;
  } else if (arg === "--report") {
    reportArg = args[index + 1];
    index += 1;
  } else if (arg.startsWith("--")) {
    throw new Error(`未知参数：${arg}`);
  } else if (!releaseDirectoryArg) {
    releaseDirectoryArg = arg;
  } else {
    throw new Error("参数过多");
  }
}

if (!releaseDirectoryArg) {
  throw new Error(
    "用法：verify-release-directory.mjs <release-dir> [--shared-ssl dir] [--report file]",
  );
}
if (!sharedSslArg) throw new Error("必须通过 --shared-ssl 指定共享证书目录");

const releaseDirectory = path.resolve(releaseDirectoryArg);
const sharedSslDirectory = path.resolve(sharedSslArg);
const reportPath = reportArg ? path.resolve(reportArg) : undefined;
const errors = [];
let releaseId = "";
let commit = "";
let checkedFiles = 0;

function addError(message) {
  errors.push(message);
}

function isSafeRelativePath(relativePath) {
  if (
    typeof relativePath !== "string" ||
    !relativePath ||
    /[\u0000-\u001f\u007f]/.test(relativePath) ||
    relativePath.includes("\\") ||
    path.posix.isAbsolute(relativePath)
  ) {
    return false;
  }
  const normalized = path.posix.normalize(relativePath);
  return (
    normalized === relativePath &&
    normalized !== "." &&
    normalized !== ".." &&
    !normalized.startsWith("../") &&
    !normalized.includes("/../")
  );
}

async function sha256File(filePath) {
  const hash = createHash("sha256");
  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return hash.digest("hex");
}

function isAllowedRuntimePath(relativePath) {
  return (
    relativePath === ".release-id" ||
    relativePath === "RELEASE-MANIFEST.json" ||
    relativePath === "docker/nginx/ssl" ||
    relativePath.startsWith("docker/monitoring/.generated/") ||
    relativePath.startsWith("release-evidence/")
  );
}

async function collectEntries(root, current = "") {
  const entries = await readdir(path.join(root, current), { withFileTypes: true });
  const collected = [];
  for (const entry of entries) {
    const relativePath = current
      ? path.posix.join(current.replaceAll("\\", "/"), entry.name)
      : entry.name;
    const absolutePath = path.join(root, ...relativePath.split("/"));
    const entryStat = await lstat(absolutePath);
    if (entryStat.isSymbolicLink()) {
      collected.push({ path: relativePath, type: "symlink" });
    } else if (entryStat.isDirectory()) {
      collected.push(...(await collectEntries(root, relativePath)));
    } else if (entryStat.isFile()) {
      collected.push({ path: relativePath, type: "file" });
    } else {
      collected.push({ path: relativePath, type: "unsupported" });
    }
  }
  return collected;
}

async function writeReport() {
  if (!reportPath) return;
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(
    reportPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        releaseDirectory,
        releaseId: releaseId || null,
        commit: commit || null,
        checkedFiles,
        success: errors.length === 0,
        errorCount: errors.length,
        errors,
      },
      null,
      2,
    )}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  await chmod(reportPath, 0o600).catch(() => undefined);
}

try {
  const releaseRoot = await realpath(releaseDirectory);
  const sharedSslRoot = await realpath(sharedSslDirectory);
  const manifest = JSON.parse(
    await readFile(path.join(releaseRoot, "RELEASE-MANIFEST.json"), "utf8"),
  );
  releaseId = String(manifest.releaseId || "");
  commit = String(manifest.commit || "");

  if (manifest.schemaVersion !== 1) addError("不支持的发布清单版本");
  if (!/^[A-Za-z0-9._-]{8,80}$/.test(releaseId)) addError("发布标识格式无效");
  if (!/^[a-f0-9]{40}$/i.test(commit)) addError("发布提交 SHA 格式无效");
  if (manifest.dirty) addError("生产回滚拒绝脏工作树发布版本");
  if (!Array.isArray(manifest.files) || manifest.files.length !== manifest.fileCount) {
    addError("发布清单文件数不一致");
  }

  const releaseIdText = (await readFile(path.join(releaseRoot, ".release-id"), "utf8")).trim();
  if (releaseIdText !== releaseId) addError(".release-id 与发布清单不一致");

  const manifestPaths = new Set();
  for (const entry of Array.isArray(manifest.files) ? manifest.files : []) {
    const relativePath = String(entry.path || "");
    if (!isSafeRelativePath(relativePath)) {
      addError(`发布清单包含不安全路径：${relativePath}`);
      continue;
    }
    if (manifestPaths.has(relativePath)) {
      addError(`发布清单包含重复路径：${relativePath}`);
      continue;
    }
    manifestPaths.add(relativePath);

    if (relativePath === "docker/nginx/ssl/.gitkeep") {
      const sslLink = path.join(releaseRoot, "docker", "nginx", "ssl");
      const sslStat = await lstat(sslLink).catch(() => undefined);
      if (!sslStat?.isSymbolicLink()) {
        addError("共享证书挂载不是符号链接");
      } else if ((await realpath(sslLink)) !== sharedSslRoot) {
        addError("共享证书符号链接目标不正确");
      }
      continue;
    }

    const absolutePath = path.join(releaseRoot, ...relativePath.split("/"));
    const fileStat = await lstat(absolutePath).catch(() => undefined);
    if (!fileStat?.isFile() || fileStat.isSymbolicLink()) {
      addError(`发布文件缺失或类型错误：${relativePath}`);
      continue;
    }
    if (fileStat.size !== Number(entry.bytes)) {
      addError(`发布文件大小不一致：${relativePath}`);
      continue;
    }
    if ((await sha256File(absolutePath)) !== String(entry.sha256 || "")) {
      addError(`发布文件 SHA-256 不一致：${relativePath}`);
      continue;
    }
    checkedFiles += 1;
  }

  const actualEntries = await collectEntries(releaseRoot);
  for (const entry of actualEntries) {
    if (entry.type === "unsupported") {
      addError(`发布目录包含不支持的文件类型：${entry.path}`);
    } else if (entry.type === "symlink" && entry.path !== "docker/nginx/ssl") {
      addError(`发布目录包含未授权符号链接：${entry.path}`);
    } else if (
      entry.type === "file" &&
      !manifestPaths.has(entry.path) &&
      !isAllowedRuntimePath(entry.path)
    ) {
      addError(`发布目录包含未授权额外文件：${entry.path}`);
    }
  }
} catch (error) {
  addError(error instanceof Error ? error.message : String(error));
} finally {
  await writeReport();
}

for (const error of errors) console.error(`FAIL ${error}`);
if (errors.length > 0) {
  console.error(`发布目录验真失败：${errors.length} 项错误`);
  process.exit(1);
}

console.log(`发布目录验真通过：${releaseId}`);
console.log(`提交：${commit}`);
console.log(`逐文件复核：${checkedFiles}`);
