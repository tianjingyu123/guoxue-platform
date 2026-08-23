#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

const checks = [];
const add = (name, pass, detail) => checks.push({ name, pass, detail });

const expectedFiles = [
  "course_entitlements.csv",
  "members.csv",
  "orders.csv",
  "stations.csv",
  "users.csv",
  "wallet_balances.csv",
  "wallet_transactions.csv",
  "wechat_auth.csv",
  "withdrawals.csv",
];
const contract = readJson("config/migration/legacy-export-contract.json");
const contractFiles = (contract.files || []).map((item) => item.name).sort();
add(
  "旧系统标准化导出契约完整",
  contract.contractVersion === 1 &&
    contractFiles.length === expectedFiles.length &&
    expectedFiles.every((name, index) => contractFiles[index] === name) &&
    contract.files.every((item) => item.required === true),
  "9 个 CSV 均必须提供；零数据表也要保留表头",
);

const auditScript = read("scripts/migration/audit-legacy-export.mjs");
add(
  "迁移导出审计支持流式校验且不写数据库",
  auditScript.includes("createReadStream") &&
    auditScript.includes("createHash") &&
    !auditScript.includes("@prisma/client"),
  "上线前先校验表头、主键、外键、金额、时区和 SHA-256",
);

const schema = read("apps/server/prisma/schema.prisma");
const migrationSql = read(
  "apps/server/prisma/migrations/manual_add_legacy_migration_audit/migration.sql",
);
add(
  "迁移批次与实体映射具备审计真源",
  schema.includes("model LegacyMigrationBatch") &&
    schema.includes("model LegacyMigrationMap") &&
    migrationSql.includes('CREATE TABLE IF NOT EXISTS "LegacyMigrationBatch"') &&
    migrationSql.includes('CREATE TABLE IF NOT EXISTS "LegacyMigrationMap"') &&
    migrationSql.includes('"LegacyMigrationMap_sourceSystem_entityType_legacyId_key"'),
  "重复干跑、差异追踪与定向回滚必须依赖稳定批次和旧新 ID 映射",
);

const controller = read("apps/server/src/modules/station/legacy-paipan.controller.ts");
const paipanService = read("apps/server/src/modules/station/station-paipan-sync.service.ts");
add(
  "旧排盘回滚入口使用已核验手机号签名协议",
  controller.includes('@Controller("legacy-paipan")') &&
    controller.includes('@Get("entry")') &&
    paipanService.includes('createHash("md5")') &&
    paipanService.includes("`${phone}@rebuguoxue${phone}`") &&
    paipanService.includes("https://www.yrydai.cn/guoxueApp.php") &&
    !paipanService.includes("paipan.rebu.com"),
  "兼容入口仅作显式回滚；服务端生成 key，客户端和日志不得暴露固定密钥材料",
);

const paipanPage = read("apps/mobile/src/pages/paipan/index.vue");
const paipanClient = read("apps/mobile/src/lib/legacy-paipan-data.ts");
add(
  "四端旧排盘默认启用且第三方失败不回退自研",
  paipanClient.includes("/legacy-paipan/entry") &&
    paipanService.includes("this.runtime.isNative()") &&
    paipanService.includes('return { mode: "native", url: null') &&
    paipanPage.includes("window.location.replace(entry.url)") &&
    paipanPage.includes('<web-view v-else-if="legacyEntryUrl"') &&
    !paipanPage.includes("核心工具仍可使用"),
  "默认返回 legacy；H5 整页跳转且 App/小程序/Harmony 使用 web-view，失败只允许重试",
);

const productionTemplate = read("docker/.env.production.example");
add(
  "生产模板默认启用旧排盘并关闭 QA",
  /^PAIPAN_MODE=legacy$/m.test(productionTemplate) &&
    /^PAIPAN_NATIVE_QA_ENABLED=false$/m.test(productionTemplate) &&
    /^PAIPAN_OPERATION_H5_BASE=https:\/\/www\.yrydai\.cn\/guoxueApp\.php$/m.test(
      productionTemplate,
    ),
  "正式运营默认走旧排盘；自研排盘仅由受控 QA 门禁访问",
);

const runbook = read("docs/release/热卜旧系统迁移与覆盖升级执行手册-20260730.md");
add(
  "迁移手册覆盖增量切换、强更桥接和回滚",
  runbook.includes("T-14") &&
    runbook.includes("T0") &&
    runbook.includes("强制升级") &&
    runbook.includes("回滚") &&
    runbook.includes("www.choofine.cn/liftera-service/api/v1/download/ver_rebu/json"),
  "旧更新接口保留期、停写窗口和回滚门槛必须在切换前确认",
);

console.log("旧系统迁移与原生排盘首发代码门禁");
for (const item of checks) {
  console.log(`${item.pass ? "通过" : "阻断"}：${item.name} —— ${item.detail}`);
}

const failed = checks.filter((item) => !item.pass);
console.log(`汇总：${checks.length - failed.length}/${checks.length} 通过`);
if (failed.length > 0) {
  console.error("迁移代码门禁失败：上述问题修复前不得执行生产导入或切流。");
  process.exit(1);
}
