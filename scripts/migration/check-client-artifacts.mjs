#!/usr/bin/env node

import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const root = process.cwd();
const target = path.resolve(root, args[0] || "");

const valuesOf = (name) =>
  args.flatMap((value, index) => (value === name && args[index + 1] ? [args[index + 1]] : []));

const forbiddenOrigins = valuesOf("--forbid-origin");
const expectedOrigins = valuesOf("--expect-origin");
const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".map",
  ".mjs",
  ".txt",
  ".vue",
  ".xml",
  ".wxml",
  ".wxss",
]);

async function collectFiles(entry, files) {
  const info = await stat(entry);
  if (info.isFile()) {
    if (textExtensions.has(path.extname(entry).toLowerCase())) files.push(entry);
    return;
  }

  for (const child of await readdir(entry)) {
    await collectFiles(path.join(entry, child), files);
  }
}

if (!args[0]) {
  console.error(
    "用法：node scripts/migration/check-client-artifacts.mjs <产物目录> " +
      "--forbid-origin <旧地址> --expect-origin <新地址>",
  );
  process.exit(1);
}

try {
  await stat(target);
} catch {
  console.error(`客户端产物门禁失败：目录不存在 ${target}`);
  process.exit(1);
}

if (forbiddenOrigins.length === 0 || expectedOrigins.length === 0) {
  console.error("客户端产物门禁失败：必须同时声明 --forbid-origin 和 --expect-origin");
  process.exit(1);
}

const files = [];
await collectFiles(target, files);

const matches = new Map([...forbiddenOrigins, ...expectedOrigins].map((origin) => [origin, []]));

for (const file of files) {
  const content = await readFile(file, "utf8");
  for (const origin of matches.keys()) {
    if (content.includes(origin)) matches.get(origin).push(path.relative(root, file));
  }
}

let failed = false;

for (const origin of forbiddenOrigins) {
  const hitFiles = matches.get(origin);
  if (hitFiles.length > 0) {
    failed = true;
    console.error(`客户端产物门禁失败：发现旧地址 ${origin}`);
    hitFiles.slice(0, 10).forEach((file) => console.error(`  - ${file}`));
  }
}

for (const origin of expectedOrigins) {
  const hitFiles = matches.get(origin);
  if (hitFiles.length === 0) {
    failed = true;
    console.error(`客户端产物门禁失败：未发现预期新地址 ${origin}`);
  } else {
    console.log(`客户端产物地址已确认：${origin}（${hitFiles.length} 个文件）`);
  }
}

if (failed) process.exit(1);

console.log(`客户端产物门禁通过：扫描 ${files.length} 个文本产物，未发现旧地址`);
