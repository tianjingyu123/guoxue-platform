#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createReadStream } from "node:fs";
import { chmod, lstat, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

let archiveArg;
let checksumArg;
let reportArg;
let expectedCommitArg;
let allowDirty = false;
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--allow-dirty") {
    allowDirty = true;
  } else if (arg === "--report") {
    reportArg = args[index + 1];
    if (!reportArg || reportArg.startsWith("--")) {
      throw new Error("--report 后必须指定 JSON 报告路径");
    }
    index += 1;
  } else if (arg === "--expected-commit") {
    expectedCommitArg = args[index + 1];
    if (!expectedCommitArg || expectedCommitArg.startsWith("--")) {
      throw new Error("--expected-commit 后必须指定完整的 40 位提交 SHA");
    }
    index += 1;
  } else if (arg.startsWith("--")) {
    throw new Error(`未知参数：${arg}`);
  } else if (!archiveArg) {
    archiveArg = arg;
  } else if (!checksumArg) {
    checksumArg = arg;
  } else {
    throw new Error(
      "参数过多；用法：verify-fixed-package.mjs <tar.gz> [sha256] [--report file] [--expected-commit sha]",
    );
  }
}

if (!archiveArg) {
  throw new Error("必须指定固定发布包路径");
}

const expectedCommit = expectedCommitArg ? expectedCommitArg.toLowerCase() : "";
if (expectedCommit && !/^[a-f0-9]{40}$/.test(expectedCommit)) {
  throw new Error("--expected-commit 必须是完整的 40 位十六进制提交 SHA");
}

const archivePath = path.resolve(archiveArg);
const archiveDirectory = path.dirname(archivePath);
const archiveName = path.basename(archivePath);
const checksumPath = path.resolve(checksumArg || `${archivePath}.sha256`);
const reportPath = reportArg ? path.resolve(reportArg) : undefined;
const errors = [];
const warnings = [];
let extractedRoot;
let actualArchiveHash = "";
let releaseId = "";
let commit = "";
let fileCount = 0;

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

function isForbiddenSecretPath(relativePath) {
  const base = path.posix.basename(relativePath);
  return (
    (/^\.env(?:\.|$)/i.test(base) && !/\.example$/i.test(base)) ||
    /\.(?:pem|ppk|p12|pfx|jks|keystore|mobileprovision)$/i.test(base)
  );
}

function containsSecretContent(content) {
  return (
    /AKID[A-Za-z0-9]{20,}/.test(content) ||
    /^-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----\r?\n[A-Za-z0-9+/=\r\n]{100,}\r?\n-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----$/m.test(
      content,
    )
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

async function collectFiles(root, current = "") {
  const directory = path.join(root, current);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = current
      ? path.posix.join(current.replaceAll("\\", "/"), entry.name)
      : entry.name;
    const absolutePath = path.join(root, ...relativePath.split("/"));
    const entryStat = await lstat(absolutePath);
    if (entryStat.isSymbolicLink()) {
      addError(`发布包包含符号链接：${relativePath}`);
      continue;
    }
    if (entryStat.isDirectory()) {
      files.push(...(await collectFiles(root, relativePath)));
    } else if (entryStat.isFile()) {
      files.push(relativePath);
    } else {
      addError(`发布包包含不支持的文件类型：${relativePath}`);
    }
  }
  return files.sort();
}

async function writeReport() {
  if (!reportPath) return;
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    archive: path.basename(archivePath),
    sha256: actualArchiveHash || null,
    releaseId: releaseId || null,
    commit: commit || null,
    expectedCommit: expectedCommit || null,
    fileCount,
    allowDirty,
    success: errors.length === 0,
    errorCount: errors.length,
    warningCount: warnings.length,
    errors,
    warnings,
  };
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await chmod(reportPath, 0o600).catch(() => undefined);
}

try {
  const checksumText = await readFile(checksumPath, "utf8");
  const checksumLines = checksumText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (checksumLines.length !== 1) {
    addError("SHA-256 文件必须且只能包含一条记录");
  }
  const checksumMatch = checksumLines[0]?.match(/^([a-f0-9]{64})\s+\*?(.+)$/i);
  if (!checksumMatch) {
    addError("SHA-256 文件格式无效");
  }

  actualArchiveHash = await sha256File(archivePath);
  if (checksumMatch) {
    if (checksumMatch[1].toLowerCase() !== actualArchiveHash) {
      addError("固定发布包 SHA-256 不匹配");
    }
    if (path.basename(checksumMatch[2]) !== path.basename(archivePath)) {
      addError("SHA-256 文件记录的包名与实际包名不一致");
    }
  }

  const listResult = spawnSync("tar", ["-tzf", archiveName], {
    cwd: archiveDirectory,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (listResult.status !== 0) {
    addError(`无法读取 tar 目录：${(listResult.stderr || listResult.stdout).trim()}`);
  } else {
    for (const rawEntry of listResult.stdout.split(/\r?\n/).filter(Boolean)) {
      const entry = rawEntry.replace(/^\.\//, "").replace(/\/$/, "");
      if (!entry) continue;
      if (!isSafeRelativePath(entry)) {
        addError(`tar 目录包含不安全路径：${rawEntry}`);
      }
    }
  }

  const typeResult = spawnSync("tar", ["-tvzf", archiveName], {
    cwd: archiveDirectory,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (typeResult.status !== 0) {
    addError(`无法读取 tar 文件类型：${(typeResult.stderr || typeResult.stdout).trim()}`);
  } else {
    for (const line of typeResult.stdout.split(/\r?\n/).filter(Boolean)) {
      if (!"-d".includes(line[0])) {
        addError(`tar 包含链接或特殊文件：${line}`);
      }
    }
  }

  if (errors.length === 0) {
    // Windows 的 GNU tar 会把 D:\... 解释为远程归档地址，因此归档和临时目录
    // 都放在同一父目录，并只向 tar 传入相对名称。Linux 上行为保持一致。
    extractedRoot = await mkdtemp(path.join(archiveDirectory, ".verify-"));
    const extractResult = spawnSync(
      "tar",
      [
        "--no-same-owner",
        "--no-same-permissions",
        "-xzf",
        archiveName,
        "-C",
        path.basename(extractedRoot),
      ],
      { cwd: archiveDirectory, encoding: "utf8" },
    );
    if (extractResult.status !== 0) {
      addError(`固定发布包解压失败：${(extractResult.stderr || extractResult.stdout).trim()}`);
    }
  }

  if (errors.length === 0) {
    const manifestPath = path.join(extractedRoot, "RELEASE-MANIFEST.json");
    const releaseIdPath = path.join(extractedRoot, ".release-id");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    releaseId = String(manifest.releaseId || "");
    commit = String(manifest.commit || "");
    fileCount = Number(manifest.fileCount || 0);

    if (manifest.schemaVersion !== 1) addError("不支持的发布清单版本");
    if (!/^[A-Za-z0-9._-]{8,80}$/.test(releaseId)) addError("发布标识格式无效");
    if (!/^[a-f0-9]{40}$/i.test(commit)) addError("发布提交 SHA 格式无效");
    if (expectedCommit && commit.toLowerCase() !== expectedCommit) {
      addError(`发布提交 SHA 不匹配：期望 ${expectedCommit}，实际 ${commit || "缺失"}`);
    }
    if (manifest.dirty && !allowDirty) {
      addError("生产验真默认拒绝脏工作树发布包");
    } else if (manifest.dirty) {
      warnings.push("已显式允许脏工作树包，仅限隔离测试");
    }
    if (!Array.isArray(manifest.files) || manifest.files.length !== fileCount) {
      addError("发布清单文件数不一致");
    }

    const releaseIdText = (await readFile(releaseIdPath, "utf8")).trim();
    if (releaseIdText !== releaseId) addError(".release-id 与发布清单不一致");

    const actualFiles = await collectFiles(extractedRoot);
    const payloadFiles = actualFiles.filter(
      (file) => file !== ".release-id" && file !== "RELEASE-MANIFEST.json",
    );
    const actualSet = new Set(payloadFiles);
    const manifestSet = new Set();

    for (const item of Array.isArray(manifest.files) ? manifest.files : []) {
      const relativePath = item?.path;
      if (!isSafeRelativePath(relativePath)) {
        addError(`发布清单包含不安全路径：${String(relativePath)}`);
        continue;
      }
      if (manifestSet.has(relativePath)) {
        addError(`发布清单包含重复路径：${relativePath}`);
        continue;
      }
      manifestSet.add(relativePath);
      if (isForbiddenSecretPath(relativePath)) {
        addError(`发布包包含禁止的敏感文件名：${relativePath}`);
      }
      if (!actualSet.has(relativePath)) {
        addError(`发布清单文件缺失：${relativePath}`);
        continue;
      }
      const absolutePath = path.join(extractedRoot, ...relativePath.split("/"));
      const fileStat = await lstat(absolutePath);
      if (fileStat.size !== item.bytes) addError(`文件大小不匹配：${relativePath}`);
      const fileHash = await sha256File(absolutePath);
      if (fileHash !== item.sha256) addError(`文件哈希不匹配：${relativePath}`);

      if (fileStat.size <= 5 * 1024 * 1024) {
        const content = await readFile(absolutePath, "utf8").catch(() => "");
        if (containsSecretContent(content)) {
          addError(`发布包包含疑似密钥内容：${relativePath}`);
        }
      }
    }

    for (const relativePath of payloadFiles) {
      if (!manifestSet.has(relativePath)) addError(`发布包包含清单外文件：${relativePath}`);
    }

    for (const requiredPath of [
      "package.json",
      "pnpm-lock.yaml",
      "docker/docker-compose.yml",
      "docker/docker-compose.prod.yml",
      "docker/deploy.sh",
      "docker/health-check.sh",
      "docker/pg-backup.sh",
      "docker/pg-restore.sh",
      "docker/setup-server.sh",
      "scripts/migration/run-prisma-migrations.sh",
      "scripts/migration/verify-postgres.sh",
      "scripts/migration/verify-business-integrity.sql",
      "scripts/migration/write-postgres-verification-report.mjs",
      "scripts/release/activate-fixed-release.sh",
      "scripts/release/aggregate-launch-evidence.mjs",
      "scripts/release/audit-host-preflight.mjs",
      "scripts/release/audit-release-retention.mjs",
      "scripts/release/current-compose.sh",
      "scripts/release/finalize-launch-acceptance.mjs",
      "scripts/release/render-monitoring-config.mjs",
      "scripts/release/rollback-fixed-release.sh",
      "scripts/release/verify-release-directory.mjs",
      "scripts/release/preflight-host.sh",
      "scripts/release/validate-release-layout.sh",
      "scripts/release/verify-production-cutover.sh",
      "scripts/release/verify-client-config-binding.mjs",
      "release-evidence/client-config-binding.json",
      "release-evidence/client-artifact-audit.json",
      "release-evidence/client-artifact-verification.json",
      "release-evidence/source-freeze-readiness.json",
    ]) {
      if (!actualSet.has(requiredPath)) addError(`固定发布包缺少必要文件：${requiredPath}`);
    }

    if (actualSet.has("release-evidence/client-config-binding.json")) {
      const binding = JSON.parse(
        await readFile(
          path.join(extractedRoot, "release-evidence/client-config-binding.json"),
          "utf8",
        ),
      );
      if (
        binding?.schemaVersion !== 1 ||
        binding?.kind !== "guoxue-client-public-config-binding" ||
        binding?.releaseId !== releaseId ||
        String(binding?.sourceCommit || "").toLowerCase() !== commit.toLowerCase() ||
        binding?.fingerprintAlgorithm !== "sha256" ||
        !/^[a-f0-9]{64}$/.test(String(binding?.fingerprint || ""))
      ) {
        addError("客户端公开配置绑定与固定包发布标识或提交不一致");
      }
    }

    let clientArtifactAudit = null;
    if (actualSet.has("release-evidence/client-artifact-audit.json")) {
      const audit = JSON.parse(
        await readFile(
          path.join(extractedRoot, "release-evidence/client-artifact-audit.json"),
          "utf8",
        ),
      );
      clientArtifactAudit = audit;
      if (
        audit?.schemaVersion !== 2 ||
        audit?.releaseId !== releaseId ||
        String(audit?.sourceCommit || "").toLowerCase() !== commit.toLowerCase() ||
        audit?.success !== true ||
        audit?.counts?.targets !== 5 ||
        !Array.isArray(audit?.targets) ||
        audit.targets.length !== 5 ||
        !audit.targets.every(
          (target) =>
            target?.success === true &&
            Number.isInteger(target?.bytes) &&
            target.bytes >= 0 &&
            /^[a-f0-9]{64}$/u.test(String(target?.contentSha256 || "")),
        )
      ) {
        addError("客户端成品审计报告未通过或与固定包发布标识不一致");
      }
    }

    if (actualSet.has("release-evidence/client-artifact-verification.json")) {
      const verification = JSON.parse(
        await readFile(
          path.join(extractedRoot, "release-evidence/client-artifact-verification.json"),
          "utf8",
        ),
      );
      const auditTargets = new Map(
        (clientArtifactAudit?.targets || []).map((target) => [target.directory, target]),
      );
      if (
        verification?.schemaVersion !== 1 ||
        verification?.releaseId !== releaseId ||
        String(verification?.sourceCommit || "").toLowerCase() !== commit.toLowerCase() ||
        verification?.success !== true ||
        verification?.counts?.targets !== 5 ||
        verification?.counts?.errors !== 0 ||
        !Array.isArray(verification?.targets) ||
        verification.targets.length !== 5 ||
        !verification.targets.every((target) => {
          const audited = auditTargets.get(target?.directory);
          return (
            target?.matches === true &&
            audited?.success === true &&
            target.files === audited.files &&
            target.bytes === audited.bytes &&
            target.contentSha256 === audited.contentSha256
          );
        })
      ) {
        addError("客户端成品独立验真报告未通过、未与审计指纹一致或发布身份不匹配");
      }
    }

    if (actualSet.has("release-evidence/source-freeze-readiness.json")) {
      const audit = JSON.parse(
        await readFile(
          path.join(extractedRoot, "release-evidence/source-freeze-readiness.json"),
          "utf8",
        ),
      );
      if (
        audit?.schemaVersion !== 2 ||
        audit?.strict !== true ||
        audit?.clean !== true ||
        audit?.readyForProductionPackage !== true ||
        audit?.counts?.total !== 0 ||
        audit?.counts?.conflicted !== 0 ||
        String(audit?.sourceCommit || "").toLowerCase() !== commit.toLowerCase() ||
        String(audit?.expectedCommit || "").toLowerCase() !== commit.toLowerCase() ||
        !String(audit?.expectedBranch || "").trim() ||
        String(audit?.branch || "").trim() !== String(audit?.expectedBranch || "").trim()
      ) {
        addError("源代码冻结审计未通过，或来源分支/提交与固定包不一致");
      }
    }
  }
} catch (error) {
  addError(error instanceof Error ? error.message : String(error));
} finally {
  if (extractedRoot) await rm(extractedRoot, { recursive: true, force: true });
  await writeReport();
}

for (const warning of warnings) console.warn(`WARN ${warning}`);
for (const error of errors) console.error(`FAIL ${error}`);

if (errors.length > 0) {
  console.error(`固定发布包验真失败：${errors.length} 项错误`);
  process.exitCode = 1;
} else {
  console.log(`固定发布包验真通过：${path.basename(archivePath)}`);
  console.log(`发布标识：${releaseId}`);
  console.log(`提交：${commit}`);
  console.log(`文件数：${fileCount}`);
  console.log(`SHA256：${actualArchiveHash}`);
}
