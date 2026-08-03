#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { auditContainerImages } from "./audit-container-images.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRepoRoot = path.resolve(path.dirname(scriptPath), "..", "..");
const productionFiles = new Set([
  "docker/Dockerfile",
  "docker/docker-compose.yml",
  "docker/docker-compose.prod.yml",
]);
const monitoringFile = "docker/monitoring/docker-compose.yml";
const iiifFile = "docker/docker-compose.iiif.yml";

function normalizeArchitecture(architecture) {
  const value = String(architecture || "")
    .trim()
    .toLowerCase();
  if (["x86_64", "x64", "amd64"].includes(value)) return "amd64";
  if (["aarch64", "arm64"].includes(value)) return "arm64";
  return value;
}

function uniqueReferences(references) {
  const grouped = new Map();
  for (const item of references) {
    const current = grouped.get(item.reference) || {
      reference: item.reference,
      files: new Set(),
      controlledException: false,
    };
    current.files.add(item.file);
    grouped.set(item.reference, current);
  }
  return [...grouped.values()].map((item) => ({
    reference: item.reference,
    files: [...item.files].sort(),
    controlledException: item.controlledException,
  }));
}

export function collectTargetImages(
  repoRoot,
  { nodeRole = "operations", includeIiif = false } = {},
) {
  if (!["app", "operations"].includes(nodeRole)) {
    throw new Error("nodeRole 仅允许 app 或 operations");
  }

  const audit = auditContainerImages(repoRoot);
  if (audit.errors.length > 0) {
    throw new Error(`容器镜像不可变性审计未通过：${audit.errors.join("；")}`);
  }

  const selectedFiles = new Set(productionFiles);
  if (nodeRole === "operations") selectedFiles.add(monitoringFile);
  if (includeIiif) selectedFiles.add(iiifFile);

  const exceptions = new Set(audit.exceptions.map((item) => item.reference));
  const images = uniqueReferences(audit.references.filter((item) => selectedFiles.has(item.file)));
  return images.map((item) => ({
    ...item,
    controlledException: exceptions.has(item.reference),
  }));
}

function defaultDockerRunner(args) {
  const result = spawnSync("docker", args, {
    encoding: "utf8",
    timeout: 15 * 60 * 1000,
    windowsHide: true,
  });
  return {
    status: Number.isInteger(result.status) ? result.status : 1,
    stdout: result.stdout || "",
    stderr: result.stderr || result.error?.message || "",
  };
}

function parsePlatform(value) {
  const [osName = "", architecture = ""] = String(value || "")
    .trim()
    .split("/");
  return { os: osName.toLowerCase(), architecture: normalizeArchitecture(architecture) };
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function verifyContainerImages({
  repoRoot = defaultRepoRoot,
  nodeRole = "operations",
  includeIiif = false,
  runDocker = defaultDockerRunner,
} = {}) {
  const images = collectTargetImages(repoRoot, { nodeRole, includeIiif });
  const dockerInfo = runDocker(["info", "--format", "{{.OSType}}/{{.Architecture}}"]);
  const hostPlatform = parsePlatform(dockerInfo.stdout);
  const results = [];

  if (dockerInfo.status !== 0 || hostPlatform.os !== "linux" || !hostPlatform.architecture) {
    return {
      success: false,
      hostPlatform,
      images: [],
      errors: ["Docker Server 不可用，或目标 Docker 主机不是可识别的 Linux 架构"],
    };
  }

  for (const image of images) {
    const expectedDigest = image.reference.match(/@(?<digest>sha256:[0-9a-f]{64})$/u)?.groups
      ?.digest;
    const pull = runDocker(["pull", image.reference]);
    if (pull.status !== 0) {
      results.push({
        reference: image.reference,
        files: image.files,
        controlledException: image.controlledException,
        status: "FAIL",
        reason: "pull-failed",
      });
      continue;
    }

    const inspect = runDocker([
      "image",
      "inspect",
      image.reference,
      "--format",
      '{{.Os}}/{{.Architecture}}|{{join .RepoDigests ","}}',
    ]);
    if (inspect.status !== 0) {
      results.push({
        reference: image.reference,
        files: image.files,
        controlledException: image.controlledException,
        status: "FAIL",
        reason: "inspect-failed",
      });
      continue;
    }

    const [platformText = "", digestText = ""] = inspect.stdout.trim().split("|");
    const imagePlatform = parsePlatform(platformText);
    const repoDigests = digestText.split(",").filter(Boolean);
    let reason = "verified";
    if (
      imagePlatform.os !== hostPlatform.os ||
      imagePlatform.architecture !== hostPlatform.architecture
    ) {
      reason = "platform-mismatch";
    } else if (expectedDigest && !repoDigests.some((item) => item.endsWith(`@${expectedDigest}`))) {
      reason = "digest-mismatch";
    } else if (
      image.controlledException &&
      !repoDigests.some((item) => /@sha256:[0-9a-f]{64}$/u.test(item))
    ) {
      reason = "exception-without-resolved-digest";
    }

    results.push({
      reference: image.reference,
      files: image.files,
      controlledException: image.controlledException,
      status: reason === "verified" ? "PASS" : "FAIL",
      reason,
      platform: `${imagePlatform.os}/${imagePlatform.architecture}`,
      resolvedDigestSha256: repoDigests.length > 0 ? hash(repoDigests.sort().join("\n")) : null,
    });
  }

  const errors = results.filter((item) => item.status === "FAIL").map((item) => item.reason);
  return {
    success: results.length === images.length && errors.length === 0,
    hostPlatform,
    images: results,
    errors,
  };
}

function parseArguments(args) {
  const options = {
    projectDir: defaultRepoRoot,
    nodeRole: "operations",
    includeIiif: false,
    report: "",
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];
    if (arg === "--") continue;
    if (arg === "--project-dir" && next) {
      options.projectDir = next;
      index += 1;
    } else if (arg === "--node-role" && next) {
      options.nodeRole = next;
      index += 1;
    } else if (arg === "--report" && next) {
      options.report = next;
      index += 1;
    } else if (arg === "--include-iiif") {
      options.includeIiif = true;
    } else {
      throw new Error(`未知或缺少值的参数：${arg}`);
    }
  }
  if (!options.report) throw new Error("必须通过 --report 指定镜像验收证据文件");
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const projectDir = path.resolve(options.projectDir);
  const releaseId = readFileSync(path.join(projectDir, ".release-id"), "utf8").trim();
  if (!/^[A-Za-z0-9._-]{8,80}$/u.test(releaseId)) {
    throw new Error("固定发布目录缺少有效的 .release-id，拒绝生成可复用镜像证据");
  }
  const result = verifyContainerImages({
    repoRoot: projectDir,
    nodeRole: options.nodeRole,
    includeIiif: options.includeIiif,
  });
  const reportPath = path.resolve(options.report);
  const report = {
    schemaVersion: 1,
    kind: "guoxue-container-image-runtime-readiness",
    generatedAt: new Date().toISOString(),
    releaseId,
    nodeRole: options.nodeRole,
    includeIiif: options.includeIiif,
    ...result,
  };
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await chmod(reportPath, 0o600).catch(() => undefined);

  for (const item of result.images) {
    console.log(`[${item.status}] ${item.reference} (${item.reason})`);
  }
  console.log(
    `目标主机镜像验收：${result.success ? "PASS" : "FAIL"}（${result.images.filter((item) => item.status === "PASS").length}/${result.images.length}）`,
  );
  console.log(`证据报告：${reportPath}`);
  if (!result.success) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  await main();
}
