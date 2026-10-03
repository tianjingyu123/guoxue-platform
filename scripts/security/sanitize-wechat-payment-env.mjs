#!/usr/bin/env node

import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const args = process.argv.slice(2);

const valueOf = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? String(args[index + 1] || "").trim() : "";
};

const envFile = path.resolve(valueOf("--env-file"));
const allowedMerchantId = valueOf("--allowed-mch-id");
const callbackKeyMode = valueOf("--callback-key-mode") || "PUBLIC_KEY";
const repoPrefix = `${repoRoot}${path.sep}`.toLowerCase();

if (!envFile || !envFile.toLowerCase().startsWith(repoPrefix)) {
  console.error("错误：--env-file 必须指向当前仓库内的环境文件");
  process.exit(2);
}
if (!/^\d{6,20}$/u.test(allowedMerchantId)) {
  console.error("错误：--allowed-mch-id 必须是 6-20 位数字商户号");
  process.exit(2);
}
if (!["PLATFORM_CERT", "PUBLIC_KEY"].includes(callbackKeyMode)) {
  console.error("错误：--callback-key-mode 仅允许 PLATFORM_CERT 或 PUBLIC_KEY");
  process.exit(2);
}

const replacements = new Map([
  ["WECHAT_PAY_API_V3_KEY", ""],
  ["WECHAT_PAY_MCH_ID", ""],
  ["WECHAT_PAY_PRIVATE_KEY", ""],
  ["WECHAT_PAY_PUBLIC_KEY", ""],
  ["WECHAT_PAY_SERIAL_NO", ""],
  ["WECHAT_PAY_ALLOWED_MCH_ID", allowedMerchantId],
  ["WECHAT_PAY_DB_CONFIG_VERIFIED", "true"],
  ["WECHAT_PAY_CALLBACK_KEY_MODE", callbackKeyMode],
]);

const original = await readFile(envFile, "utf8");
const newline = original.includes("\r\n") ? "\r\n" : "\n";
const seen = new Set();
const changed = new Set();
const output = [];

for (const line of original.split(/\r?\n/u)) {
  const match = line.match(/^([A-Z][A-Z0-9_]*)\s*=/u);
  const key = match?.[1];
  if (!key || !replacements.has(key)) {
    output.push(line);
    continue;
  }
  if (seen.has(key)) {
    changed.add(key);
    continue;
  }
  seen.add(key);
  const nextLine = `${key}=${replacements.get(key)}`;
  output.push(nextLine);
  if (line !== nextLine) changed.add(key);
}

for (const [key, value] of replacements) {
  if (seen.has(key)) continue;
  output.push(`${key}=${value}`);
  changed.add(key);
}

const normalized = `${output.join(newline).replace(/(?:\r?\n)+$/u, "")}${newline}`;
const temporaryFile = `${envFile}.sanitizing-${process.pid}`;
await writeFile(temporaryFile, normalized, { encoding: "utf8", mode: 0o600 });
await rename(temporaryFile, envFile);

console.log(`微信支付环境清理完成：${changed.size} 个键已规范化（未输出任何配置值）`);
