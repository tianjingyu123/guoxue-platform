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
    schemaVersion: 1,
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
      certificateStatus: "issued",
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
  if (stage === "launch") commandArgs.push("--env-file", envFile);
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

test("采购可接受待签证书但 launch 阶段必须完成全部实测", async () => {
  const intake = completeIntake();
  intake.server.sshHostFingerprint = "pending";
  intake.server.securityGroupReviewed = false;
  intake.domains.certificateStatus = "pending";
  intake.storage.signedUrlVerified = false;
  intake.operations.restoreDrillCompleted = false;
  const procurement = await runAudit(intake, "procurement");
  const launch = await runAudit(intake, "launch");
  try {
    assert.equal(
      procurement.result.status,
      0,
      procurement.result.stderr || procurement.result.stdout,
    );
    assert.notEqual(launch.result.status, 0);
    assert.equal(launch.report.success, false);
    assert.ok(launch.report.summary.failed >= 4);
  } finally {
    await rm(procurement.root, { recursive: true, force: true });
    await rm(launch.root, { recursive: true, force: true });
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
