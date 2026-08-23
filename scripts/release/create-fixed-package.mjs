#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { assertClientEvidenceConsistency } from "./lib/client-evidence-consistency.mjs";

const projectRoot = process.cwd();
const releaseRoot = path.resolve(projectRoot, "artifacts", "releases");
const requiredRuntimeAuditFiles = new Set([
  ".github/workflows/ci.yml",
  ".github/workflows/perf.yml",
]);

let requestedId;
let allowDirty = false;
let clientConfigBindingArg;
let clientArtifactAuditArg;
let clientArtifactVerificationArg;
let sourceFreezeAuditArg;
const cliArgs = process.argv.slice(2);
for (let index = 0; index < cliArgs.length; index += 1) {
  const arg = cliArgs[index];
  if (arg === "--allow-dirty") {
    allowDirty = true;
  } else if (arg === "--client-config-binding") {
    clientConfigBindingArg = cliArgs[++index];
    if (!clientConfigBindingArg || clientConfigBindingArg.startsWith("--")) {
      throw new Error("--client-config-binding 后必须指定绑定文件路径");
    }
  } else if (arg === "--client-artifact-audit") {
    clientArtifactAuditArg = cliArgs[++index];
    if (!clientArtifactAuditArg || clientArtifactAuditArg.startsWith("--")) {
      throw new Error("--client-artifact-audit 后必须指定审计报告路径");
    }
  } else if (arg === "--client-artifact-verification") {
    clientArtifactVerificationArg = cliArgs[++index];
    if (!clientArtifactVerificationArg || clientArtifactVerificationArg.startsWith("--")) {
      throw new Error("--client-artifact-verification 后必须指定独立验真报告路径");
    }
  } else if (arg === "--source-freeze-audit") {
    sourceFreezeAuditArg = cliArgs[++index];
    if (!sourceFreezeAuditArg || sourceFreezeAuditArg.startsWith("--")) {
      throw new Error("--source-freeze-audit 后必须指定冻结审计报告路径");
    }
  } else if (arg.startsWith("--")) {
    throw new Error(`未知参数：${arg}`);
  } else if (requestedId) {
    throw new Error("只能指定一个发布标识");
  } else {
    requestedId = arg.trim();
  }
}

function git(args) {
  return execFileSync("git", args, {
    cwd: projectRoot,
    encoding: args.includes("-z") ? "buffer" : "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function utcStamp() {
  return new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function isExcluded(relativePath) {
  const normalized = relativePath.replaceAll("\\", "/");
  const base = path.posix.basename(normalized);
  const segments = normalized.split("/");
  // 运行时镜像不可变性校验会复核这两个工作流中的服务镜像。
  // 固定包必须携带审计输入，但仍排除其余与运行无关的 .github 内容。
  if (requiredRuntimeAuditFiles.has(normalized)) return false;
  if (normalized.startsWith("scripts/")) {
    const runtimeScriptFiles = new Set([
      "scripts/backup-db.sh",
      "scripts/db-ops.sh",
      "scripts/restore-db.sh",
    ]);
    const runtimeScriptDirectories = [
      "scripts/migration/",
      "scripts/operations/",
      "scripts/release/",
      "scripts/security/",
    ];
    if (
      !runtimeScriptFiles.has(normalized) &&
      !runtimeScriptDirectories.some((directory) => normalized.startsWith(directory))
    ) {
      return true;
    }
  }
  const excludedSegments = new Set([
    ".git",
    "artifacts",
    "backups",
    "coverage",
    "dist",
    "docs",
    "node_modules",
    "output",
    "playwright-report",
    "screenshots",
    "test-results",
  ]);
  const excludedRootDirs = new Set([
    ".claude",
    ".github",
    ".husky",
    "docs",
    "k6",
    "knowledge",
    "tests",
    "v0-reference",
  ]);
  return (
    segments.some((segment) => excludedSegments.has(segment)) ||
    excludedRootDirs.has(segments[0]) ||
    normalized.startsWith("apps/server/scripts/") ||
    /^kiki-prompt.*\.md$/i.test(base) ||
    /^login(?:-data)?\.json$/i.test(base) ||
    (/^\.env(?:\.|$)/i.test(base) && !/\.example$/i.test(base)) ||
    /\.(?:pem|ppk|p12|pfx|jks|keystore|mobileprovision)$/i.test(base)
  );
}

function assertInside(root, target) {
  const relative = path.relative(root, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`路径越界，拒绝操作：${target}`);
  }
}

async function sha256File(file) {
  const data = await readFile(file);
  return createHash("sha256").update(data).digest("hex");
}

const commit = String(git(["rev-parse", "HEAD"])).trim();
const dirty = String(git(["status", "--porcelain"])).trim().length > 0;
if (dirty && !allowDirty) {
  throw new Error("工作树存在未提交改动，拒绝生成生产固定包；仅隔离测试可显式传入 --allow-dirty");
}
const releaseId = requestedId || `${commit.slice(0, 12)}-${utcStamp()}${dirty ? "-dirty" : ""}`;

if (!/^[A-Za-z0-9._-]{8,80}$/.test(releaseId)) {
  throw new Error("发布标识只能包含字母、数字、点、下划线和短横线，长度为 8-80");
}

if (
  !clientConfigBindingArg ||
  !clientArtifactAuditArg ||
  !clientArtifactVerificationArg ||
  !sourceFreezeAuditArg
) {
  throw new Error(
    "生产固定包必须同时提供 --client-config-binding、--client-artifact-audit、--client-artifact-verification 和 --source-freeze-audit，以绑定源提交、五端成品独立验真、CI 审计配置与服务器运行配置",
  );
}

const staging = path.join(releaseRoot, `.staging-${releaseId}`);
const archive = path.join(releaseRoot, `gx-deploy-91-${releaseId}.tar.gz`);
assertInside(releaseRoot, staging);
assertInside(releaseRoot, archive);

await mkdir(releaseRoot, { recursive: true });
await rm(staging, { recursive: true, force: true });
await mkdir(staging, { recursive: true });

const listed = git(["ls-files", "-co", "--exclude-standard", "-z"]);
const files = listed
  .toString("utf8")
  .split("\0")
  .filter(Boolean)
  .filter((file) => !isExcluded(file))
  .sort();

const unsafeFileNames = files.filter((file) => /[\u0000-\u001f\u007f]/.test(file));
if (unsafeFileNames.length > 0) {
  await rm(staging, { recursive: true, force: true });
  throw new Error(`检测到包含控制字符的文件名，拒绝打包：${unsafeFileNames.length} 个`);
}

const manifestFiles = [];
const secretHits = [];

for (const relativePath of files) {
  const source = path.resolve(projectRoot, relativePath);
  const destination = path.resolve(staging, relativePath);
  assertInside(projectRoot, source);
  assertInside(staging, destination);

  const sourceStat = await stat(source).catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
  // 已在工作树中删除、但仍存在于 Git 索引中的文件不应进入发布包。
  if (!sourceStat) continue;
  if (!sourceStat.isFile()) continue;

  if (sourceStat.size <= 5 * 1024 * 1024) {
    const content = await readFile(source, "utf8").catch(() => "");
    if (
      /AKID[A-Za-z0-9]{20,}/.test(content) ||
      /^-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----\r?\n[A-Za-z0-9+/=\r\n]{100,}\r?\n-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----$/m.test(
        content,
      )
    ) {
      secretHits.push(relativePath);
      continue;
    }
  }

  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
  manifestFiles.push({
    path: relativePath.replaceAll("\\", "/"),
    bytes: sourceStat.size,
    sha256: await sha256File(source),
  });
}

if (secretHits.length > 0) {
  await rm(staging, { recursive: true, force: true });
  throw new Error(`检测到疑似密钥，已拒绝打包：${secretHits.join(", ")}`);
}

function containsSecretContent(content) {
  return (
    /AKID[A-Za-z0-9]{20,}/.test(content) ||
    /^-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/m.test(content)
  );
}

async function includeReleaseEvidence(sourceArg, destinationPath, validate) {
  const source = path.resolve(projectRoot, sourceArg);
  const destination = path.resolve(staging, destinationPath);
  assertInside(projectRoot, source);
  assertInside(staging, destination);
  if (manifestFiles.some((item) => item.path === destinationPath)) {
    throw new Error(`固定包证据路径冲突：${destinationPath}`);
  }
  const sourceStat = await stat(source);
  if (!sourceStat.isFile() || sourceStat.size > 5 * 1024 * 1024) {
    throw new Error(`固定包证据必须是小于 5MB 的普通文件：${sourceArg}`);
  }
  const content = await readFile(source, "utf8");
  const parsed = JSON.parse(content);
  validate(parsed);
  if (containsSecretContent(content)) {
    throw new Error(`固定包证据包含疑似密钥：${sourceArg}`);
  }
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
  manifestFiles.push({
    path: destinationPath,
    bytes: sourceStat.size,
    sha256: await sha256File(source),
  });
  return parsed;
}

await includeReleaseEvidence(
  clientConfigBindingArg,
  "release-evidence/client-config-binding.json",
  (binding) => {
    if (
      binding?.schemaVersion !== 1 ||
      binding?.kind !== "guoxue-client-public-config-binding" ||
      binding?.releaseId !== releaseId ||
      String(binding?.sourceCommit || "").toLowerCase() !== commit.toLowerCase() ||
      !/^[a-f0-9]{64}$/.test(String(binding?.fingerprint || ""))
    ) {
      throw new Error("客户端公开配置绑定与固定包发布标识或提交不一致");
    }
  },
);
const clientArtifactAudit = await includeReleaseEvidence(
  clientArtifactAuditArg,
  "release-evidence/client-artifact-audit.json",
  (audit) => {
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
      throw new Error("客户端成品审计报告未通过或与固定包发布标识不一致");
    }
  },
);
const clientArtifactVerification = await includeReleaseEvidence(
  clientArtifactVerificationArg,
  "release-evidence/client-artifact-verification.json",
  (verification) => {
    if (
      verification?.schemaVersion !== 1 ||
      verification?.releaseId !== releaseId ||
      String(verification?.sourceCommit || "").toLowerCase() !== commit.toLowerCase() ||
      verification?.success !== true ||
      verification?.counts?.targets !== 5 ||
      verification?.counts?.errors !== 0 ||
      !Array.isArray(verification?.targets) ||
      verification.targets.length !== 5 ||
      !verification.targets.every(
        (target) =>
          target?.matches === true &&
          Number.isInteger(target?.files) &&
          target.files > 0 &&
          Number.isInteger(target?.bytes) &&
          target.bytes > 0 &&
          /^[a-f0-9]{64}$/u.test(String(target?.contentSha256 || "")),
      )
    ) {
      throw new Error("客户端成品独立验真报告未通过或与固定包发布标识不一致");
    }
  },
);
assertClientEvidenceConsistency(clientArtifactAudit, clientArtifactVerification);
await includeReleaseEvidence(
  sourceFreezeAuditArg,
  "release-evidence/source-freeze-readiness.json",
  (audit) => {
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
      throw new Error("源代码冻结审计未通过，或来源分支/提交与固定包不一致");
    }
  },
);

manifestFiles.sort((left, right) => left.path.localeCompare(right.path));

const manifest = {
  schemaVersion: 1,
  releaseId,
  commit,
  dirty,
  createdAt: new Date().toISOString(),
  fileCount: manifestFiles.length,
  files: manifestFiles,
};

await writeFile(path.join(staging, ".release-id"), `${releaseId}\n`, "utf8");
await writeFile(
  path.join(staging, "RELEASE-MANIFEST.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

const tarResult = spawnSync(
  "tar",
  ["-czf", path.basename(archive), "-C", path.basename(staging), "."],
  {
    cwd: releaseRoot,
    encoding: "utf8",
  },
);
if (tarResult.status !== 0) {
  await rm(staging, { recursive: true, force: true });
  throw new Error(`tar 打包失败：${tarResult.stderr || tarResult.stdout}`);
}

const archiveHash = await sha256File(archive);
await writeFile(`${archive}.sha256`, `${archiveHash}  ${path.basename(archive)}\n`, "utf8");
await rm(staging, { recursive: true, force: true });

console.log(`固定发布包：${archive}`);
console.log(`SHA256：${archiveHash}`);
console.log(`文件数：${manifestFiles.length}`);
console.log(`发布标识：${releaseId}`);
