#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRepoRoot = path.resolve(path.dirname(scriptPath), "..", "..");
const workflowExtensions = new Set([".yml", ".yaml"]);

function listWorkflowFiles(workflowRoot) {
  if (!fs.existsSync(workflowRoot)) return [];

  return fs
    .readdirSync(workflowRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && workflowExtensions.has(path.extname(entry.name)))
    .map((entry) => path.join(workflowRoot, entry.name))
    .sort((left, right) => left.localeCompare(right, "en"));
}

function normalizeRelativePath(repoRoot, absolutePath) {
  return path.relative(repoRoot, absolutePath).split(path.sep).join("/");
}

function listPipelineFiles(repoRoot, workflowFiles) {
  const files = [...workflowFiles];
  const cnbFile = path.join(repoRoot, ".cnb.yml");
  if (fs.existsSync(cnbFile)) files.push(cnbFile);
  return files;
}

function isImmutableActionReference(reference) {
  if (reference.startsWith("./")) return true;
  if (/^docker:\/\/[^\s]+@sha256:[0-9a-f]{64}$/iu.test(reference)) return true;
  return /^[^@\s]+@[0-9a-f]{40}$/iu.test(reference);
}

function readTopLevelPermissions(lines) {
  const start = lines.findIndex((line) => /^permissions:\s*(?:#.*)?$/u.test(line));
  if (start < 0) return null;

  const permissions = new Map();
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || /^\s*#/u.test(line)) continue;
    if (!/^\s/u.test(line)) break;

    const match = line.match(/^\s{2}([a-z-]+):\s*(read|write|none)\s*(?:#.*)?$/u);
    if (match) permissions.set(match[1], match[2]);
  }

  return permissions;
}

export function auditWorkflowSupplyChain(repoRoot = defaultRepoRoot) {
  const resolvedRoot = path.resolve(repoRoot);
  const workflowFiles = listWorkflowFiles(path.join(resolvedRoot, ".github", "workflows"));
  const pipelineFiles = listPipelineFiles(resolvedRoot, workflowFiles);
  const references = [];
  const runners = [];
  const remoteInstallChecks = [];
  const errors = [];

  if (workflowFiles.length === 0) {
    errors.push("没有找到 .github/workflows/*.yml 或 *.yaml，无法验证发布供应链");
  }

  for (const pipelineFile of pipelineFiles) {
    const relativePath = normalizeRelativePath(resolvedRoot, pipelineFile);
    const lines = fs.readFileSync(pipelineFile, "utf8").replace(/\r\n?/gu, "\n").split("\n");

    lines.forEach((line, index) => {
      const location = `${relativePath}:${index + 1}`;
      if (/releases\/latest\/download/iu.test(line)) {
        errors.push(`${location} 禁止从 latest 地址下载构建或测试工具，必须固定版本与校验来源`);
        remoteInstallChecks.push({ file: relativePath, line: index + 1, kind: "latest-download" });
      }
      if (/\b(?:curl|wget)\b[^|\n]*\|\s*(?:bash|sh|tar)\b/iu.test(line)) {
        errors.push(`${location} 禁止把远程下载直接管道交给解释器或解压器`);
        remoteInstallChecks.push({ file: relativePath, line: index + 1, kind: "remote-pipe" });
      }
    });
  }

  for (const workflowFile of workflowFiles) {
    const relativePath = normalizeRelativePath(resolvedRoot, workflowFile);
    const lines = fs.readFileSync(workflowFile, "utf8").replace(/\r\n?/gu, "\n").split("\n");

    const topLevelPermissions = readTopLevelPermissions(lines);
    if (!topLevelPermissions) {
      errors.push(`${relativePath} 必须显式设置顶层 permissions，禁止继承仓库默认令牌权限`);
    } else {
      if (topLevelPermissions.get("contents") !== "read") {
        errors.push(`${relativePath} 顶层 permissions 必须包含 contents: read`);
      }
      for (const [scope, access] of topLevelPermissions) {
        if (access === "write") {
          errors.push(
            `${relativePath} 顶层 permissions 不得授予 ${scope}: write；写权限必须缩小到具体 job`,
          );
        }
      }
    }

    lines.forEach((line, index) => {
      const runnerMatch = line.match(/^\s*runs-on:\s*(.+?)\s*$/u);
      if (runnerMatch) {
        const runner = runnerMatch[1].replace(/\s+#.*$/u, "").trim();
        runners.push({ file: relativePath, line: index + 1, runner });
        if (/\b(?:ubuntu|windows|macos)-latest\b/u.test(runner)) {
          errors.push(
            `${relativePath}:${index + 1} GitHub 托管运行器不得使用会跨系统版本漂移的 latest 标签：${runner}`,
          );
        }
      }

      const match = line.match(/^\s*(?:-\s*)?uses:\s*(.+?)\s*$/u);
      if (!match) return;

      const reference = match[1].replace(/\s+#.*$/u, "").trim();
      const item = { file: relativePath, line: index + 1, reference };
      references.push(item);

      if (!isImmutableActionReference(reference)) {
        errors.push(
          `${relativePath}:${index + 1} 外部 Action 必须锁定 40 位提交 SHA（容器 Action 必须锁定 sha256 摘要）：${reference}`,
        );
      }
    });
  }

  return {
    workflowFiles: workflowFiles.map((file) => normalizeRelativePath(resolvedRoot, file)),
    pipelineFiles: pipelineFiles.map((file) => normalizeRelativePath(resolvedRoot, file)),
    references,
    runners,
    remoteInstallChecks,
    errors,
  };
}

function main() {
  const result = auditWorkflowSupplyChain();
  if (result.errors.length > 0) {
    console.error(`GitHub Actions 供应链审计失败：${result.errors.length} 项`);
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(
    `GitHub Actions 供应链审计通过：${result.workflowFiles.length} 个工作流、${result.runners.length} 个运行器均固定系统版本、${result.references.length} 个 Action 引用均使用不可变提交或摘要`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) main();
