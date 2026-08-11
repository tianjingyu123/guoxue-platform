#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { resolvePnpmInvocation } from "./resolve-pnpm-invocation.mjs";

const envFile = process.argv[2] || "docker/.env.production";
const resolvedEnvFile = path.resolve(process.cwd(), envFile);

function parseEnv(content) {
  const result = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[match[1]] = value;
  }
  return result;
}

function runPnpm(args, env) {
  const pnpm = resolvePnpmInvocation();
  if (!pnpm) {
    throw new Error("找不到可用的 pnpm 或 Corepack 运行入口");
  }
  return new Promise((resolve, reject) => {
    const child = spawn(pnpm.command, [...pnpm.prefix, ...args], {
      cwd: process.cwd(),
      env,
      stdio: "inherit",
      shell: false,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`pnpm ${args.join(" ")} 被信号 ${signal} 终止`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`pnpm ${args.join(" ")} 失败，退出码 ${code}`));
        return;
      }
      resolve();
    });
  });
}

let content;
try {
  content = await readFile(resolvedEnvFile, "utf8");
} catch (error) {
  console.error(`生产客户端构建失败：无法读取 ${resolvedEnvFile}`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}

const values = parseEnv(content);
const requiredKeys = ["VITE_API_URL", "VITE_PUBLIC_H5_URL", "VITE_PUBLIC_ASSET_ORIGIN"];
const missing = requiredKeys.filter((key) => !values[key]);
if (missing.length > 0) {
  console.error(`生产客户端构建失败：缺少 ${missing.join(", ")}`);
  process.exit(2);
}

const placeholderPattern = /(<change_me>|change-me|example\.com|your-)/i;
const placeholders = requiredKeys.filter((key) => placeholderPattern.test(values[key]));
if (placeholders.length > 0) {
  console.error(`生产客户端构建失败：${placeholders.join(", ")} 仍是占位值`);
  process.exit(2);
}

const buildEnv = {
  ...process.env,
  VITE_API_URL: values.VITE_API_URL,
  VITE_PUBLIC_H5_URL: values.VITE_PUBLIC_H5_URL,
  VITE_PUBLIC_ASSET_ORIGIN: values.VITE_PUBLIC_ASSET_ORIGIN,
  VITE_RELEASE_CHANNEL: values.VITE_RELEASE_CHANNEL || "",
};

console.log(`生产客户端构建：已从 ${resolvedEnvFile} 注入 3 个公开 Vite 配置（未输出值）`);
await runPnpm(["build:admin"], buildEnv);
await runPnpm(["build:mobile:all"], buildEnv);
console.log("生产客户端构建完成：后台、H5、微信小程序、App、鸿蒙 App");
