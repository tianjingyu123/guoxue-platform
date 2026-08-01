#!/usr/bin/env node

import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const envFile = path.resolve(process.argv[2] || path.join(repoRoot, "docker", ".env.production"));
const templateFile = path.join(repoRoot, "docker", "monitoring", "alertmanager.yml.template");
const outputDir = path.join(repoRoot, "docker", "monitoring", ".generated");
const outputFile = path.join(outputDir, "alertmanager.yml");
const requiredKeys = [
  "WEWORK_CORP_ID",
  "WEWORK_AGENT_ID",
  "WEWORK_AGENT_SECRET",
  "DBA_WEWORK_USER_IDS",
];

function parseEnv(content) {
  const values = new Map();
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
    values.set(match[1], value);
  }
  return values;
}

function escapeYamlDoubleQuoted(value) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\r", "\\r")
    .replaceAll("\n", "\\n");
}

let envContent;
try {
  envContent = await readFile(envFile, "utf8");
} catch (error) {
  console.error(`错误：无法读取生产环境文件 ${envFile}`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}

const values = parseEnv(envContent);
const missing = requiredKeys.filter((key) => !values.get(key));
if (missing.length > 0) {
  console.error(`错误：监控告警凭据未配置：${missing.join(", ")}`);
  console.error("请在生产环境文件中填写企业微信应用凭据后再启动 Alertmanager。");
  process.exit(2);
}

let rendered = await readFile(templateFile, "utf8");
for (const key of requiredKeys) {
  rendered = rendered.replaceAll(`\${${key}}`, escapeYamlDoubleQuoted(values.get(key)));
}

const unresolved = [...rendered.matchAll(/\$\{([A-Z][A-Z0-9_]*)\}/g)].map((match) => match[1]);
if (unresolved.length > 0) {
  console.error(`错误：告警配置仍有未渲染变量：${[...new Set(unresolved)].join(", ")}`);
  process.exit(2);
}

await mkdir(outputDir, { recursive: true });
await writeFile(outputFile, rendered, { encoding: "utf8", mode: 0o600 });
await chmod(outputFile, 0o600);
console.log(`监控告警配置已安全生成：${path.relative(repoRoot, outputFile)}`);
