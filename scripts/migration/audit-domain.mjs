#!/usr/bin/env node

import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const valueOf = (name, fallback = "") => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const target = valueOf("--domain", "api.rebugx.cn").toLowerCase();
const strict = args.includes("--strict");
const root = process.cwd();
const scanRoots = ["apps", "docker", "scripts", ".env.example"];
const ignoredParts = new Set([
  ".git",
  "node_modules",
  "dist",
  "coverage",
  "artifacts",
  "backups",
  ".cache",
]);
const textExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".vue",
  ".json",
  ".yml",
  ".yaml",
  ".env",
  ".example",
  ".md",
  ".sh",
  ".conf",
  ".prisma",
]);

const compatibilityFallbacks = new Set([
  "apps/server/src/config/server-config.ts",
  "apps/server/src/modules/system/system.service.ts",
  "apps/server/prisma/schema.prisma",
  "apps/mobile/src/lib/brand.ts",
  "apps/mobile/src/utils/share.ts",
  "apps/mobile/vite.config.ts",
  "apps/admin/src/lib/brand.ts",
  "docker/docker-compose.prod.yml",
  "scripts/migration/audit-domain.mjs",
]);

const demoDataPatterns = [
  /^apps\/mobile\/src\/lib\/(?:auth|course|discover|home|im|live|station-detail)-data\.ts$/,
  /^apps\/mobile\/src\/pkg-operator\/station-config\/index\.vue$/,
  /^apps\/mobile\/scripts\/migrate-static-cdn\.mjs$/,
  /^apps\/server\/scripts\/seed-/,
];

const normalize = (file) => path.relative(root, file).replaceAll("\\", "/");
const isIgnored = (file) => normalize(file).split("/").some((part) => ignoredParts.has(part));

async function collect(entry, files) {
  const absolute = path.resolve(root, entry);
  let info;
  try {
    info = await stat(absolute);
  } catch {
    return;
  }
  if (isIgnored(absolute)) return;
  if (info.isFile()) {
    const ext = path.extname(absolute).toLowerCase();
    if (textExtensions.has(ext) || path.basename(absolute).startsWith(".env")) files.push(absolute);
    return;
  }
  for (const child of await readdir(absolute)) await collect(path.join(entry, child), files);
}

function isCommentOnly(line) {
  const trimmed = line.trim();
  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("/*") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("<!--") ||
    trimmed.startsWith("#")
  );
}

function classify(relative, line) {
  if (isCommentOnly(line)) return "注释";
  if (
    relative.includes("/prisma/migrations/") ||
    relative.includes("/__fixtures__/") ||
    relative.endsWith(".spec.ts") ||
    relative.endsWith(".test.ts") ||
    /(^|\/)(seed|mock|demo)[^/]*\./i.test(relative)
  ) {
    return "历史/测试数据";
  }
  if (demoDataPatterns.some((pattern) => pattern.test(relative))) return "演示/兜底资源";
  if (compatibilityFallbacks.has(relative)) return "兼容兜底";
  return "运行时";
}

const files = [];
for (const entry of scanRoots) await collect(entry, files);

const hits = [];
for (const file of files) {
  const relative = normalize(file);
  const content = await readFile(file, "utf8");
  content.split(/\r?\n/).forEach((line, index) => {
    if (line.toLowerCase().includes(target)) {
      hits.push({
        relative,
        line: index + 1,
        kind: classify(relative, line),
        preview: line.trim().slice(0, 180),
      });
    }
  });
}

if (hits.length === 0) {
  console.log(`域名审计通过：未发现 ${target}`);
  process.exit(0);
}

for (const hit of hits) {
  console.log(`[${hit.kind}] ${hit.relative}:${hit.line} ${hit.preview}`);
}

const runtime = hits.filter((hit) => hit.kind === "运行时");
const count = (kind) => hits.filter((hit) => hit.kind === kind).length;
console.log(
  `审计汇总：运行时 ${runtime.length}，兼容兜底 ${count("兼容兜底")}，` +
    `演示/兜底资源 ${count("演示/兜底资源")}，历史/测试数据 ${count("历史/测试数据")}，` +
    `注释 ${count("注释")}`,
);

if (runtime.length > 0 || (strict && hits.length > 0)) process.exit(1);
