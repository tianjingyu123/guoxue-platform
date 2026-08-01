#!/usr/bin/env node

import { createHash } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REQUIRED_KEYS = ["VITE_API_URL", "VITE_PUBLIC_H5_URL", "VITE_PUBLIC_ASSET_ORIGIN"];
const BINDING_KIND = "guoxue-client-public-config-binding";

let bindingArg;
let envArg;
let expectedReleaseId = "";
let expectedCommit = "";
let reportArg;
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--expected-release-id") {
    expectedReleaseId = args[++index] || "";
  } else if (arg === "--expected-commit") {
    expectedCommit = (args[++index] || "").toLowerCase();
  } else if (arg === "--report") {
    reportArg = args[++index];
  } else if (arg.startsWith("--")) {
    throw new Error(`未知参数：${arg}`);
  } else if (!bindingArg) {
    bindingArg = arg;
  } else if (!envArg) {
    envArg = arg;
  } else {
    throw new Error("参数过多");
  }
}

if (!bindingArg || !envArg) {
  throw new Error(
    "用法：verify-client-config-binding.mjs <binding.json> <env-file> [--expected-release-id id] [--expected-commit sha] [--report file]",
  );
}
if (expectedReleaseId && !/^[A-Za-z0-9._-]{8,80}$/.test(expectedReleaseId)) {
  throw new Error("--expected-release-id 格式无效");
}
if (expectedCommit && !/^[a-f0-9]{40}$/.test(expectedCommit)) {
  throw new Error("--expected-commit 必须是完整的 40 位提交 SHA");
}

function parseEnv(content) {
  const values = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "").trim();
    }
    values[match[1]] = value;
  }
  return values;
}

function fingerprint(values) {
  const config = {};
  for (const key of REQUIRED_KEYS) {
    const value = String(values[key] || "").trim();
    if (!value) throw new Error(`服务器生产环境缺少 ${key}`);
    config[key] = value;
  }
  return createHash("sha256").update(JSON.stringify(config)).digest("hex");
}

const errors = [];
let binding = {};
let actualFingerprint = "";
try {
  binding = JSON.parse(await readFile(path.resolve(bindingArg), "utf8"));
  actualFingerprint = fingerprint(parseEnv(await readFile(path.resolve(envArg), "utf8")));
  if (binding.schemaVersion !== 1) errors.push("客户端公开配置绑定版本不受支持");
  if (binding.kind !== BINDING_KIND) errors.push("客户端公开配置绑定类型无效");
  if (binding.fingerprintAlgorithm !== "sha256") errors.push("客户端公开配置绑定算法无效");
  if (
    !Array.isArray(binding.keys) ||
    JSON.stringify(binding.keys) !== JSON.stringify(REQUIRED_KEYS)
  ) {
    errors.push("客户端公开配置绑定键集合无效");
  }
  if (!/^[a-f0-9]{64}$/.test(String(binding.fingerprint || ""))) {
    errors.push("客户端公开配置绑定指纹格式无效");
  }
  if (expectedReleaseId && binding.releaseId !== expectedReleaseId) {
    errors.push(`客户端公开配置绑定发布标识不匹配：期望 ${expectedReleaseId}`);
  }
  if (expectedCommit && String(binding.sourceCommit || "").toLowerCase() !== expectedCommit) {
    errors.push(`客户端公开配置绑定提交不匹配：期望 ${expectedCommit}`);
  }
  if (binding.fingerprint !== actualFingerprint) {
    errors.push("服务器生产环境的客户端公开配置与 CI 审计配置不一致");
  }
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  success: errors.length === 0,
  releaseId: binding.releaseId || null,
  expectedReleaseId: expectedReleaseId || null,
  sourceCommit: binding.sourceCommit || null,
  expectedCommit: expectedCommit || null,
  fingerprintAlgorithm: "sha256",
  expectedFingerprint: binding.fingerprint || null,
  actualFingerprint: actualFingerprint || null,
  errorCount: errors.length,
  errors,
};

if (reportArg) {
  const reportPath = path.resolve(reportArg);
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await chmod(reportPath, 0o600).catch(() => undefined);
}

for (const error of errors) console.error(`FAIL ${error}`);
if (errors.length > 0) {
  console.error(`客户端公开配置绑定校验失败：${errors.length} 项错误`);
  process.exitCode = 1;
} else {
  console.log(`客户端公开配置绑定校验通过：${binding.releaseId}`);
  console.log(`配置指纹：${actualFingerprint}`);
}
