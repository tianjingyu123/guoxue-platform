#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export function fingerprintMonitoringDirectory(directory) {
  const root = path.resolve(directory);
  const rootStat = fs.lstatSync(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error("监控配置根路径必须是普通目录");
  }

  const files = [];
  const walk = (currentDirectory) => {
    for (const entry of fs.readdirSync(currentDirectory, { withFileTypes: true })) {
      const absolute = path.join(currentDirectory, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`监控配置禁止符号链接：${path.relative(root, absolute)}`);
      }
      if (entry.isDirectory()) walk(absolute);
      if (entry.isFile()) {
        const relative = path.relative(root, absolute).split(path.sep).join("/");
        if (relative !== "README.md") files.push({ absolute, relative });
      }
    }
  };

  walk(root);
  if (files.length === 0) throw new Error("监控配置目录没有可参与指纹计算的文件");
  files.sort((left, right) => left.relative.localeCompare(right.relative));

  const hash = crypto.createHash("sha256");
  for (const file of files) {
    hash.update(file.relative);
    hash.update("\0");
    hash.update(fs.readFileSync(file.absolute));
    hash.update("\0");
  }
  return hash.digest("hex");
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  if (process.argv.length !== 3) {
    console.error("用法：monitoring-config-fingerprint.mjs <monitoring-dir>");
    process.exit(64);
  }
  try {
    process.stdout.write(fingerprintMonitoringDirectory(process.argv[2]));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(64);
  }
}
