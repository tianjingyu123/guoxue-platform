import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "..", "..");
const auditor = path.join(projectRoot, "scripts/release/audit-infrastructure-intake.mjs");

function completeIntake() {
  return {
    schemaVersion: 2,
    kind: "guoxue-new-infrastructure-intake",
    deployTarget: "tencent",
    server: {
      provider: "腾讯云",
      region: "ap-beijing",
      osFamily: "linux",
      architecture: "x86_64",
      cpuCores: 4,
      memoryMb: 8192,
      diskGb: 100,
      ingressMode: "clb",
      clbId: "lb-NewTarget123",
      sshUser: "deploy",
      sshHostFingerprint: "SHA256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      securityGroupReviewed: true,
    },
    database: {
      provider: "腾讯云 PostgreSQL",
      engine: "postgresql",
      endpointHost: "pg.internal.guoxue.cn",
      versionMajor: 16,
      topology: "managed",
      privateNetwork: true,
      tls: true,
      backupEnabled: true,
      pitrEnabled: true,
      retentionDays: 14,
    },
    cache: {
      provider: "腾讯云 Redis",
      engine: "redis",
      endpointHost: "redis.internal.guoxue.cn",
      versionMajor: 7,
      topology: "managed",
      privateNetwork: true,
      tls: true,
      persistenceEnabled: true,
    },
    domains: {
      publicDomain: "api.guoxue.cn",
      apiUrl: "https://api.guoxue.cn",
      h5Url: "https://api.guoxue.cn/h5/",
      adminUrl: "https://api.guoxue.cn/admin/",
      assetOrigin: "https://static.guoxue.cn",
      dnsProvider: "DNSPod",
      ttlSeconds: 300,
      certificateProvider: "腾讯云 SSL",
      certificateType: "free",
      certificateValidationMode: "dns-auto",
      certificateDeploymentMode: "clb-cdn-managed",
      certificateStatus: "issued",
      certificateDeploymentVerified: true,
      certificateRenewalOwner: "证书续期负责人",
      certificateFallbackOwner: "证书兜底负责人",
      certificateRenewalProcedureVerified: true,
      certificatePublicHandshakeVerified: true,
    },
    storage: {
      provider: "cos",
      bucket: "guoxue-prod-1250000000",
      region: "ap-beijing",
      privateRead: true,
      corsConfigured: true,
      lifecycleConfigured: true,
      signedUrlVerified: true,
    },
    migration: {
      sourceDatabaseAccessVerified: true,
      targetDatabaseAccessVerified: true,
      dnsChangeAccessVerified: true,
      rehearsalCompleted: true,
      writeFreezeOwner: "停写负责人",
      maintenanceWindowUtc: "2026-08-02T02:00:00Z/2026-08-02T04:00:00Z",
      rollbackRetentionHours: 168,
      oldEnvironmentRetentionConfirmed: true,
    },
    operations: {
      backupOwner: "备份负责人",
      cutoverOwner: "切流负责人",
      rollbackOwner: "回滚负责人",
      technicalApprover: "技术负责人",
      businessApprover: "业务负责人",
      monitoringConfigured: true,
      alertTested: true,
      restoreDrillCompleted: true,
    },
  };
}

function completeEnvironment(overrides = {}) {
  return {
    DATABASE_URL:
      "postgresql://guoxue:not-recorded@pg.internal.guoxue.cn:5432/guoxue?sslmode=require",
    REDIS_URL: "rediss://:not-recorded@redis.internal.guoxue.cn:6379",
    PUBLIC_DOMAIN: "api.guoxue.cn",
    PUBLIC_API_URL: "https://api.guoxue.cn",
    PUBLIC_H5_URL: "https://api.guoxue.cn/h5/",
    PUBLIC_ASSET_ORIGIN: "https://static.guoxue.cn",
    STORAGE_PROVIDER: "cos",
    COS_BUCKET: "guoxue-prod-1250000000",
    COS_REGION: "ap-beijing",
    TENCENT_REGION: "ap-beijing",
    TENCENT_CLB_ID: "lb-NewTarget123",
    TENCENT_CDN_DOMAIN: "static.guoxue.cn",
    TENCENT_CERTIFICATE_DOMAIN: "api.guoxue.cn",
    ...overrides,
  };
}

async function runAudit(
  intake,
  stage = "launch",
  expectedTarget = "tencent",
  environment = completeEnvironment(),
) {
  const root = await mkdtemp(path.join(os.tmpdir(), "gx-infra-intake-"));
  const input = path.join(root, "intake.json");
  const envFile = path.join(root, "production.env");
  const report = path.join(root, "report.json");
  await writeFile(input, `${JSON.stringify(intake, null, 2)}\n`, "utf8");
  await writeFile(
    envFile,
    `${Object.entries(environment)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n")}\n`,
    "utf8",
  );
  const commandArgs = [
    "--",
    auditor,
    "--",
    "--input",
    input,
    "--stage",
    stage,
    "--expected-deploy-target",
    expectedTarget,
    "--report",
    report,
  ];
  if (stage !== "procurement") commandArgs.push("--env-file", envFile);
  const result = spawnSync(process.execPath, commandArgs, { cwd: projectRoot, encoding: "utf8" });
  const parsed = JSON.parse(await readFile(report, "utf8"));
  return { root, result, report: parsed };
}

test("完整腾讯云接入清单通过 launch 门禁且报告不落原始地址", async () => {
  const audit = await runAudit(completeIntake());
  try {
    assert.equal(audit.result.status, 0, audit.result.stderr || audit.result.stdout);
    assert.equal(audit.report.success, true);
    assert.equal(audit.report.summary.failed, 0);
    assert.equal(audit.report.configurationBinding.success, true);
    assert.equal(JSON.stringify(audit.report).includes("api.guoxue.cn"), false);
    assert.equal(JSON.stringify(audit.report).includes("not-recorded"), false);
  } finally {
    await rm(audit.root, { recursive: true, force: true });
  }
});

test("采购阶段阻断低配服务器和未启用恢复保护的数据库", async () => {
  const intake = completeIntake();
  intake.server.memoryMb = 2048;
  intake.database.pitrEnabled = false;
  const audit = await runAudit(intake, "procurement");
  try {
    assert.notEqual(audit.result.status, 0);
    assert.equal(audit.report.success, false);
    assert.match(
      audit.report.checks
        .filter((item) => !item.pass)
        .map((item) => item.name)
        .join("\n"),
      /服务器容量达到首发最低线|PostgreSQL 规格与保护策略满足要求/,
    );
  } finally {
    await rm(audit.root, { recursive: true, force: true });
  }
});

test("旧版接入清单必须从最新模板重新生成", async () => {
  const intake = completeIntake();
  intake.schemaVersion = 1;
  const audit = await runAudit(intake, "procurement");
  try {
    assert.notEqual(audit.result.status, 0);
    assert.match(
      audit.report.checks
        .filter((item) => !item.pass)
        .map((item) => item.name)
        .join("\n"),
      /接入清单契约有效/,
    );
  } finally {
    await rm(audit.root, { recursive: true, force: true });
  }
});

test("采购阶段接受腾讯云仍受支持的 Redis 6.x，并拒绝更旧主版本", async () => {
  const supported = completeIntake();
  supported.cache.versionMajor = 6;
  const supportedAudit = await runAudit(supported, "procurement");
  const obsolete = completeIntake();
  obsolete.cache.versionMajor = 5;
  const obsoleteAudit = await runAudit(obsolete, "procurement");
  try {
    assert.equal(
      supportedAudit.result.status,
      0,
      supportedAudit.result.stderr || supportedAudit.result.stdout,
    );
    assert.notEqual(obsoleteAudit.result.status, 0);
    assert.match(
      obsoleteAudit.report.checks
        .filter((item) => !item.pass)
        .map((item) => item.name)
        .join("\n"),
      /Redis 规格与持久化策略满足要求/,
    );
  } finally {
    await rm(supportedAudit.root, { recursive: true, force: true });
    await rm(obsoleteAudit.root, { recursive: true, force: true });
  }
});

test("采购可接受待签证书，但 predeploy 和 launch 阶段必须完成资源实测", async () => {
  const intake = completeIntake();
  intake.server.sshHostFingerprint = "pending";
  intake.server.securityGroupReviewed = false;
  intake.domains.certificateStatus = "pending";
  intake.storage.signedUrlVerified = false;
  intake.operations.restoreDrillCompleted = false;
  const procurement = await runAudit(intake, "procurement");
  const predeploy = await runAudit(intake, "predeploy");
  const launch = await runAudit(intake, "launch");
  try {
    assert.equal(
      procurement.result.status,
      0,
      procurement.result.stderr || procurement.result.stdout,
    );
    assert.notEqual(predeploy.result.status, 0);
    assert.equal(predeploy.report.success, false);
    assert.notEqual(launch.result.status, 0);
    assert.equal(launch.report.success, false);
    assert.ok(launch.report.summary.failed >= 4);
  } finally {
    await rm(procurement.root, { recursive: true, force: true });
    await rm(predeploy.root, { recursive: true, force: true });
    await rm(launch.root, { recursive: true, force: true });
  }
});

test("证书方案缺少责任人、目标入口部署或公网续期验收时按阶段阻断", async () => {
  const unplanned = completeIntake();
  unplanned.domains.certificateProvider = "pending";
  unplanned.domains.certificateRenewalOwner = "待填写";
  const procurement = await runAudit(unplanned, "procurement");

  const notDeployed = completeIntake();
  notDeployed.domains.certificateDeploymentVerified = false;
  const predeploy = await runAudit(notDeployed, "predeploy");

  const notOperationallyVerified = completeIntake();
  notOperationallyVerified.domains.certificateRenewalProcedureVerified = false;
  notOperationallyVerified.domains.certificatePublicHandshakeVerified = false;
  const launch = await runAudit(notOperationallyVerified, "launch");
  try {
    assert.notEqual(procurement.result.status, 0);
    assert.match(
      procurement.report.checks
        .filter((item) => !item.pass)
        .map((item) => item.name)
        .join("\n"),
      /新域名证书生命周期方案与责任人已规划/,
    );
    assert.notEqual(predeploy.result.status, 0);
    assert.match(
      predeploy.report.checks
        .filter((item) => !item.pass)
        .map((item) => item.name)
        .join("\n"),
      /安全组与正式证书签发部署已完成/,
    );
    assert.notEqual(launch.result.status, 0);
    assert.match(
      launch.report.checks
        .filter((item) => !item.pass)
        .map((item) => item.name)
        .join("\n"),
      /证书续期兜底与公网握手已现场验证/,
    );
  } finally {
    await rm(procurement.root, { recursive: true, force: true });
    await rm(predeploy.root, { recursive: true, force: true });
    await rm(launch.root, { recursive: true, force: true });
  }
});

test("predeploy 阶段可在迁移演练前验证真实资源和正式环境绑定", async () => {
  const intake = completeIntake();
  intake.operations.monitoringConfigured = false;
  intake.operations.alertTested = false;
  intake.operations.restoreDrillCompleted = false;
  intake.migration.sourceDatabaseAccessVerified = false;
  intake.migration.targetDatabaseAccessVerified = false;
  intake.migration.dnsChangeAccessVerified = false;
  intake.migration.rehearsalCompleted = false;
  intake.migration.oldEnvironmentRetentionConfirmed = false;
  const predeploy = await runAudit(intake, "predeploy");
  const launch = await runAudit(intake, "launch");
  try {
    assert.equal(
      predeploy.result.status,
      0,
      predeploy.result.stderr || predeploy.result.stdout,
    );
    assert.equal(predeploy.report.success, true);
    assert.equal(predeploy.report.configurationBinding.success, true);
    assert.notEqual(launch.result.status, 0);
    assert.match(
      launch.report.checks
        .filter((item) => !item.pass)
        .map((item) => item.name)
        .join("\n"),
      /监控、告警和恢复演练已完成|源库、目标库与 DNS 变更权限已现场验证|数据库迁移演练和旧环境回退保留已完成/,
    );
  } finally {
    await rm(predeploy.root, { recursive: true, force: true });
    await rm(launch.root, { recursive: true, force: true });
  }
});

test("predeploy 阶段拒绝占位资源或正式环境错绑且报告不泄露凭据", async () => {
  const placeholderIntake = completeIntake();
  placeholderIntake.server.clbId = "pending";
  const placeholder = await runAudit(placeholderIntake, "predeploy");
  const mismatched = await runAudit(
    completeIntake(),
    "predeploy",
    "tencent",
    completeEnvironment({
      DATABASE_URL:
        "postgresql://guoxue:predeploy-secret@wrong-predeploy.internal.guoxue.cn:5432/guoxue?sslmode=require",
    }),
  );
  try {
    assert.notEqual(placeholder.result.status, 0);
    assert.match(
      placeholder.report.checks
        .filter((item) => !item.pass)
        .map((item) => item.name)
        .join("\n"),
      /接入清单不含占位值/,
    );
    assert.notEqual(mismatched.result.status, 0);
    assert.equal(mismatched.report.configurationBinding.success, false);
    const serialized = JSON.stringify(mismatched.report);
    assert.equal(serialized.includes("wrong-predeploy.internal.guoxue.cn"), false);
    assert.equal(serialized.includes("predeploy-secret"), false);
  } finally {
    await rm(placeholder.root, { recursive: true, force: true });
    await rm(mismatched.root, { recursive: true, force: true });
  }
});

test("launch 阶段拒绝 CLB 资源 ID 缺失或与正式环境错绑", async () => {
  const intake = completeIntake();
  intake.server.clbId = "pending";
  const missing = await runAudit(intake, "launch");
  const mismatched = await runAudit(
    { ...completeIntake(), server: { ...completeIntake().server, clbId: "lb-OtherTarget456" } },
    "launch",
  );
  try {
    assert.notEqual(missing.result.status, 0);
    assert.match(
      missing.report.checks
        .filter((item) => !item.pass)
        .map((item) => item.name)
        .join("\n"),
      /接入清单不含占位值/,
    );
    assert.notEqual(mismatched.result.status, 0);
    assert.match(
      mismatched.report.checks
        .filter((item) => !item.pass)
        .map((item) => item.name)
        .join("\n"),
      /正式环境与新基础设施接入清单完全绑定/,
    );
  } finally {
    await rm(missing.root, { recursive: true, force: true });
    await rm(mismatched.root, { recursive: true, force: true });
  }
});

test("launch 阶段缺少迁移权限实测、演练或旧环境保留时阻断", async () => {
  const intake = completeIntake();
  intake.migration.sourceDatabaseAccessVerified = false;
  intake.migration.dnsChangeAccessVerified = false;
  intake.migration.rehearsalCompleted = false;
  intake.migration.oldEnvironmentRetentionConfirmed = false;
  const audit = await runAudit(intake, "launch");
  try {
    assert.notEqual(audit.result.status, 0);
    assert.match(
      audit.report.checks
        .filter((item) => !item.pass)
        .map((item) => item.name)
        .join("\n"),
      /源库、目标库与 DNS 变更权限已现场验证|数据库迁移演练和旧环境回退保留已完成/,
    );
  } finally {
    await rm(audit.root, { recursive: true, force: true });
  }
});

test("接入清单部署架构与完整门禁不一致时阻断", async () => {
  const audit = await runAudit(completeIntake(), "launch", "standard");
  try {
    assert.notEqual(audit.result.status, 0);
    assert.match(
      audit.report.checks
        .filter((item) => !item.pass)
        .map((item) => item.name)
        .join("\n"),
      /接入清单与完整门禁部署架构一致/,
    );
  } finally {
    await rm(audit.root, { recursive: true, force: true });
  }
});

test("腾讯云证书使用第三方 DNS 时不得登记自动 DNS 验证", async () => {
  const invalidIntake = completeIntake();
  invalidIntake.domains.dnsProvider = "阿里云 DNS";
  const invalid = await runAudit(invalidIntake, "procurement");

  const manualIntake = completeIntake();
  manualIntake.domains.dnsProvider = "阿里云 DNS";
  manualIntake.domains.certificateValidationMode = "dns-manual";
  manualIntake.domains.certificateDeploymentMode = "clb-cdn-manual";
  const manual = await runAudit(manualIntake, "procurement");

  try {
    assert.notEqual(invalid.result.status, 0);
    assert.match(
      invalid.report.checks
        .filter((item) => !item.pass)
        .map((item) => `${item.name} ${item.detail}`)
        .join("\n"),
      /腾讯云证书方案与 CLB\/CDN 入口一致.*第三方 DNS 必须使用人工验证与人工部署/,
    );
    assert.equal(manual.result.status, 0);
  } finally {
    await rm(invalid.root, { recursive: true, force: true });
    await rm(manual.root, { recursive: true, force: true });
  }
});

test("正式环境连接到另一套数据库或对象存储时阻断且报告不泄露地址与凭据", async () => {
  const audit = await runAudit(
    completeIntake(),
    "launch",
    "tencent",
    completeEnvironment({
      DATABASE_URL:
        "postgresql://guoxue:secret-should-not-leak@wrong.internal.guoxue.cn:5432/guoxue?sslmode=require",
      COS_BUCKET: "wrong-bucket-1250000000",
    }),
  );
  try {
    assert.notEqual(audit.result.status, 0);
    assert.equal(audit.report.configurationBinding.success, false);
    assert.match(
      audit.report.checks
        .filter((item) => !item.pass)
        .map((item) => `${item.name} ${item.detail}`)
        .join("\n"),
      /正式环境与新基础设施接入清单完全绑定.*databaseHost.*storageBucket/,
    );
    const serialized = JSON.stringify(audit.report);
    assert.equal(serialized.includes("wrong.internal.guoxue.cn"), false);
    assert.equal(serialized.includes("secret-should-not-leak"), false);
    assert.equal(serialized.includes("wrong-bucket-1250000000"), false);
  } finally {
    await rm(audit.root, { recursive: true, force: true });
  }
});
