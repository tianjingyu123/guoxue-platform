#!/usr/bin/env node

import { chmodSync, copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);

function valueOf(name, fallback = "") {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] && !args[index + 1].startsWith("--")
    ? args[index + 1]
    : fallback;
}

const deployTarget = valueOf("--deploy-target").toLowerCase();
const outputPath = path.resolve(
  valueOf("--output", path.join(projectRoot, "config/release/infrastructure-intake.json")),
);
const templatePath = path.join(projectRoot, "config/release/infrastructure-intake.example.json");

if (!["standard", "tencent"].includes(deployTarget)) {
  console.error("错误：必须通过 --deploy-target 显式指定 standard 或 tencent");
  process.exit(2);
}
if (existsSync(outputPath)) {
  console.error(`错误：目标文件已存在，拒绝覆盖：${outputPath}`);
  process.exit(1);
}

const intake = JSON.parse(readFileSync(templatePath, "utf8"));
intake.deployTarget = deployTarget;
if (deployTarget === "standard") {
  intake.server.ingressMode = "direct";
  intake.database.provider = "self-hosted PostgreSQL";
  intake.database.topology = "self-hosted";
  intake.database.endpointHost = "postgres";
  intake.database.tls = false;
  intake.cache.provider = "self-hosted Redis";
  intake.cache.topology = "self-hosted";
  intake.cache.endpointHost = "redis";
  intake.cache.tls = false;
  intake.domains.certificateType = "letsencrypt";
  intake.domains.certificateValidationMode = "http-01";
  intake.domains.certificateDeploymentMode = "local-nginx";
} else {
  intake.domains.certificateValidationMode = "dns-auto";
  intake.domains.certificateDeploymentMode = "clb-cdn-managed";
}

copyFileSync(templatePath, outputPath);
writeFileSync(outputPath, `${JSON.stringify(intake, null, 2)}\n`, {
  encoding: "utf8",
  mode: 0o600,
});
chmodSync(outputPath, 0o600);

console.log(`已创建新基础设施私有接入清单：${outputPath}`);
console.log(`部署架构：${deployTarget}`);
console.log(
  "下一步：填实所有 pending/待填写项，然后先运行 procurement 阶段审计；正式切流前必须通过 launch 阶段审计。",
);
