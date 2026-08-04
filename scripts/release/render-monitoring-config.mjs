#!/usr/bin/env node

import { chmod, chown, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const envFile = path.resolve(process.argv[2] || path.join(repoRoot, "docker", ".env.production"));
const alertmanagerTemplateFile = path.join(
  repoRoot,
  "docker",
  "monitoring",
  "alertmanager.yml.template",
);
const prometheusTemplateFile = path.join(repoRoot, "docker", "monitoring", "prometheus.yml");
const outputDir = path.resolve(
  process.argv[3] || path.join(repoRoot, "docker", "monitoring", ".generated"),
);
const alertmanagerOutputFile = path.join(outputDir, "alertmanager.yml");
const prometheusOutputFile = path.join(outputDir, "prometheus.yml");
const alertmanagerKeys = [
  "WEWORK_CORP_ID",
  "WEWORK_AGENT_ID",
  "WEWORK_AGENT_SECRET",
  "DBA_WEWORK_USER_IDS",
];
const monitoringUrlKeys = ["PUBLIC_API_URL", "PUBLIC_ASSET_ORIGIN"];
const requiredKeys = [...alertmanagerKeys, ...monitoringUrlKeys];
const monitoringContainerGid = 65534;

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

function normalizePublicHttpsUrl(value, key) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${key} 必须是合法的 HTTPS 公网地址`);
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.hostname === "localhost" ||
    parsed.hostname.endsWith(".example.com")
  ) {
    throw new Error(`${key} 必须是无凭据、非占位符的 HTTPS 公网地址`);
  }
  parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";
  return parsed.href.replace(/\/$/, "");
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
  console.error(`错误：监控运行配置未填写：${missing.join(", ")}`);
  console.error("请先填写企业微信告警凭据和正式公网地址，再启动监控栈。");
  process.exit(2);
}

for (const key of monitoringUrlKeys) {
  try {
    values.set(key, normalizePublicHttpsUrl(values.get(key), key));
  } catch (error) {
    console.error(`错误：${error instanceof Error ? error.message : String(error)}`);
    process.exit(2);
  }
}

async function renderTemplate(templateFile, outputFile, keys, label) {
  let rendered = await readFile(templateFile, "utf8");
  for (const key of keys) {
    rendered = rendered.replaceAll(`\${${key}}`, escapeYamlDoubleQuoted(values.get(key)));
  }

  const unresolved = [...rendered.matchAll(/\$\{([A-Z][A-Z0-9_]*)\}/g)].map((match) => match[1]);
  if (unresolved.length > 0) {
    console.error(`错误：${label}仍有未渲染变量：${[...new Set(unresolved)].join(", ")}`);
    process.exit(2);
  }

  await writeFile(outputFile, rendered, { encoding: "utf8", mode: 0o640 });
  if (process.platform !== "win32" && process.getuid?.() === 0) {
    await chown(outputFile, 0, monitoringContainerGid);
  }
  await chmod(outputFile, 0o640);
}

await mkdir(outputDir, { recursive: true });
await renderTemplate(
  alertmanagerTemplateFile,
  alertmanagerOutputFile,
  alertmanagerKeys,
  "Alertmanager 配置",
);
await renderTemplate(
  prometheusTemplateFile,
  prometheusOutputFile,
  monitoringUrlKeys,
  "Prometheus 配置",
);
console.log(
  `监控配置已安全生成：${path.relative(repoRoot, alertmanagerOutputFile)}、${path.relative(repoRoot, prometheusOutputFile)}`,
);
