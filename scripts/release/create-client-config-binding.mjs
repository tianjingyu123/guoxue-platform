#!/usr/bin/env node

import { createHash } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REQUIRED_KEYS = ["VITE_API_URL", "VITE_PUBLIC_H5_URL", "VITE_PUBLIC_ASSET_ORIGIN"];
const BINDING_KIND = "guoxue-client-public-config-binding";

let envArg;
let releaseId = "";
let sourceCommit = "";
let outputArg;
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--release-id") {
    releaseId = args[++index] || "";
  } else if (arg === "--source-commit") {
    sourceCommit = (args[++index] || "").toLowerCase();
  } else if (arg === "--output") {
    outputArg = args[++index];
  } else if (arg.startsWith("--")) {
    throw new Error(`未知参数：${arg}`);
  } else if (!envArg) {
    envArg = arg;
  } else {
    throw new Error("参数过多");
  }
}

if (!envArg || !outputArg) {
  throw new Error(
    "用法：create-client-config-binding.mjs <env-file> --release-id <id> --source-commit <sha> --output <json>",
  );
}
if (!/^[A-Za-z0-9._-]{8,80}$/.test(releaseId)) {
  throw new Error("--release-id 格式无效");
}
if (!/^[a-f0-9]{40}$/.test(sourceCommit)) {
  throw new Error("--source-commit 必须是完整的 40 位提交 SHA");
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

function publicConfig(values) {
  const config = {};
  for (const key of REQUIRED_KEYS) {
    const value = String(values[key] || "").trim();
    if (!value) throw new Error(`客户端公开配置缺少 ${key}`);
    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error(`客户端公开配置 ${key} 不是有效 URL`);
    }
    if (parsed.protocol !== "https:") {
      throw new Error(`客户端公开配置 ${key} 必须使用 HTTPS`);
    }
    if (parsed.username || parsed.password || parsed.hash) {
      throw new Error(`客户端公开配置 ${key} 不得包含账号、密码或 URL 片段`);
    }
    config[key] = value;
  }
  return config;
}

function fingerprint(config) {
  return createHash("sha256").update(JSON.stringify(config)).digest("hex");
}

const envPath = path.resolve(envArg);
const outputPath = path.resolve(outputArg);
const config = publicConfig(parseEnv(await readFile(envPath, "utf8")));
const binding = {
  schemaVersion: 1,
  kind: BINDING_KIND,
  generatedAt: new Date().toISOString(),
  releaseId,
  sourceCommit,
  keys: REQUIRED_KEYS,
  fingerprintAlgorithm: "sha256",
  fingerprint: fingerprint(config),
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(binding, null, 2)}\n`, {
  encoding: "utf8",
  mode: 0o600,
});
await chmod(outputPath, 0o600).catch(() => undefined);

console.log(`客户端公开配置绑定已生成：${outputPath}`);
console.log(`发布标识：${releaseId}`);
console.log(`配置指纹：${binding.fingerprint}`);
