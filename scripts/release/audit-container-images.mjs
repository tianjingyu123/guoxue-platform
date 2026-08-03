#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRepoRoot = path.resolve(path.dirname(scriptPath), "..", "..");

const auditedFiles = [
  ".cnb.yml",
  "docker/Dockerfile",
  "docker/Dockerfile.dev",
  "docker/Dockerfile.test",
  "docker/docker-compose.yml",
  "docker/docker-compose.prod.yml",
  "docker/docker-compose.test.yml",
  "docker/docker-compose.iiif.yml",
  "docker/monitoring/docker-compose.yml",
];

// 该上游镜像目前匿名访问 GHCR 清单会返回 403；版本已固定，必须在新主机使用实际发布凭据拉取验收。
const approvedTagOnlyExceptions = new Map([
  [
    "ghcr.io/uclalibrary/cantaloupe:5.0.5",
    "可选 IIIF 服务；GHCR 匿名清单查询受限，必须在目标主机完成凭据拉取和启动验收",
  ],
]);

function normalizeRelativePath(repoRoot, absolutePath) {
  return path.relative(repoRoot, absolutePath).split(path.sep).join("/");
}

function extractImageReferences(content) {
  const references = [];
  const normalized = content.replace(/\r\n?/gu, "\n");

  normalized.split("\n").forEach((line, index) => {
    const fromMatch = line.match(/^\s*FROM\s+([^\s]+)(?:\s+AS\s+[^\s]+)?\s*$/iu);
    const imageMatch = line.match(/^\s*image:\s*([^\s#]+)\s*(?:#.*)?$/u);
    const reference = fromMatch?.[1] ?? imageMatch?.[1];
    if (reference) references.push({ line: index + 1, reference });
  });

  return references;
}

function isDigestPinned(reference) {
  return /@sha256:[0-9a-f]{64}$/u.test(reference);
}

export function auditContainerImages(repoRoot = defaultRepoRoot) {
  const resolvedRoot = path.resolve(repoRoot);
  const references = [];
  const exceptions = [];
  const errors = [];

  for (const relativePath of auditedFiles) {
    const absolutePath = path.join(resolvedRoot, relativePath);
    if (!fs.existsSync(absolutePath)) {
      errors.push(`${relativePath} 不存在，无法审计容器镜像来源`);
      continue;
    }

    for (const item of extractImageReferences(fs.readFileSync(absolutePath, "utf8"))) {
      const reference = { file: normalizeRelativePath(resolvedRoot, absolutePath), ...item };
      references.push(reference);

      if (/:latest(?:@|$)/u.test(reference.reference)) {
        errors.push(
          `${reference.file}:${reference.line} 禁止使用 latest 标签：${reference.reference}`,
        );
        continue;
      }

      if (isDigestPinned(reference.reference)) continue;

      const reason = approvedTagOnlyExceptions.get(reference.reference);
      if (reason) {
        exceptions.push({ ...reference, reason });
        continue;
      }

      errors.push(
        `${reference.file}:${reference.line} 容器镜像必须锁定 sha256 摘要：${reference.reference}`,
      );
    }
  }

  return { auditedFiles, references, exceptions, errors };
}

function main() {
  const result = auditContainerImages();
  if (result.errors.length > 0) {
    console.error(`容器镜像不可变性审计失败：${result.errors.length} 项`);
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(
    `容器镜像不可变性审计通过：${result.references.length - result.exceptions.length} 个引用已锁定摘要，${result.exceptions.length} 个受控例外待目标主机验收`,
  );
  for (const exception of result.exceptions) {
    console.log(
      `- 受控例外 ${exception.file}:${exception.line} ${exception.reference}：${exception.reason}`,
    );
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) main();
