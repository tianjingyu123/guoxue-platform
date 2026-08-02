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
      authoritativeNameServers: ["ns1.dnspod.net", "ns2.dnspod.net"],
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
    appDeepLinks: {
      host: "api.guoxue.cn",
      pathPatterns: ["/h5/*"],
      owner: "App 深链负责人",
      evidenceReference: "CHANGE-20260802-APP-LINKS",
      ios: {
        teamId: "A1B2C3D4E5",
        bundleId: "com.rebu.iosapprebu",
        associatedDomainsEnabled: true,
        provisioningProfileRegenerated: true,
        associationFileDeployed: true,
        deviceVerificationPassed: true,
      },
      android: {
        packageName: "com.rebu.apprebu",
        sha256CertFingerprints: [
          "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99",
        ],
        autoVerifyIntentFilterConfigured: true,
        associationFileDeployed: true,
        deviceVerificationPassed: true,
      },
    },
    storage: {
      provider: "cos",
      bucket: "guoxue-prod-1250000000",
      region: "ap-beijing",
      privateRead: true,
      corsConfigured: true,
      corsAllowedOrigins: ["https://api.guoxue.cn"],
      lifecycleConfigured: true,
      signedUrlVerified: true,
      objectMigration: {
        mode: "copy",
        owner: "对象存储迁移负责人",
        manifestAlgorithm: "sha256-content-v1",
        sourceInventory: {
          generatedAtUtc: "2026-08-02T01:00:00Z",
          objectCount: 128,
          totalBytes: 4096000,
          manifestSha256: "a".repeat(64),
        },
        targetInventory: {
          generatedAtUtc: "2026-08-02T01:30:00Z",
          objectCount: 128,
          totalBytes: 4096000,
          manifestSha256: "a".repeat(64),
        },
        comparisonVerified: true,
        evidenceReference: "CHANGE-20260802-STORAGE",
        oldBucketRetentionHours: 168,
        oldBucketRetentionConfirmed: true,
      },
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
    externalEndpoints: {
      owner: "第三方平台配置负责人",
      clientDomainAllowlistOwner: "客户端域名负责人",
      outboundAccessOwner: "外部服务出站负责人",
      expectedEgressIpv4: ["93.184.216.34"],
      outboundDependencies: [
        {
          serviceId: "tencent-cloud",
          dnsTlsReachabilityVerified: true,
          credentialSmokeTestPassed: true,
          providerSourceIpPolicyVerified: true,
        },
      ],
      outboundEvidenceReference: "CHANGE-20260802-OUTBOUND",
      callbackUrls: [
        "https://api.guoxue.cn/api/v1/shop/pay/notify",
        "https://api.guoxue.cn/api/v1/shop/refund/notify",
        "https://api.guoxue.cn/api/v1/shop/alipay/notify",
        "https://api.guoxue.cn/api/v1/shop/unionpay/notify",
        "https://api.guoxue.cn/api/v1/huifu/notify",
        "https://api.guoxue.cn/api/v1/shop/logistics/kuaidi100/callback",
      ],
      controlPlaneCallbacks: [],
      clientDomainAllowlistEntries: [],
      controlPlaneInventoryVerified: true,
      callbackReachabilityVerified: true,
      callbackAuthenticationVerified: true,
      callbackRetryIdempotencyVerified: true,
      clientDomainAllowlistVerified: true,
      egressIdentityVerified: true,
      outboundDependencySmokeTestsPassed: true,
      evidenceReference: "CHANGE-20260802-001",
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
    WECHAT_PAY_NOTIFY_URL: "https://api.guoxue.cn/api/v1/shop/pay/notify",
    WECHAT_PAY_REFUND_NOTIFY_URL: "https://api.guoxue.cn/api/v1/shop/refund/notify",
    ALIPAY_NOTIFY_URL: "https://api.guoxue.cn/api/v1/shop/alipay/notify",
    UNIONPAY_NOTIFY_URL: "https://api.guoxue.cn/api/v1/shop/unionpay/notify",
    HUIFU_NOTIFY_URL: "https://api.guoxue.cn/api/v1/huifu/notify",
    KUAIDI100_CALLBACK_URL: "https://api.guoxue.cn/api/v1/shop/logistics/kuaidi100/callback",
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
    assert.equal(predeploy.result.status, 0, predeploy.result.stderr || predeploy.result.stdout);
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

test("第三方回调仍指向旧域名或与正式环境登记不一致时阻断", async () => {
  const wrongPlan = completeIntake();
  wrongPlan.externalEndpoints.callbackUrls[0] = "https://old.guoxue.cn/api/v1/shop/pay/notify";
  const plannedOldDomain = await runAudit(wrongPlan, "predeploy");
  const environmentOldDomain = await runAudit(
    completeIntake(),
    "predeploy",
    "tencent",
    completeEnvironment({
      WECHAT_PAY_NOTIFY_URL: "https://old.guoxue.cn/api/v1/shop/pay/notify",
    }),
  );
  try {
    assert.notEqual(plannedOldDomain.result.status, 0);
    assert.match(
      plannedOldDomain.report.checks
        .filter((item) => !item.pass)
        .map((item) => `${item.name} ${item.detail}`)
        .join("\n"),
      /第三方回调地址规划只指向新 API 入口/u,
    );
    assert.notEqual(environmentOldDomain.result.status, 0);
    assert.equal(environmentOldDomain.report.configurationBinding.success, false);
    assert.equal(JSON.stringify(environmentOldDomain.report).includes("old.guoxue.cn"), false);
  } finally {
    await rm(plannedOldDomain.root, { recursive: true, force: true });
    await rm(environmentOldDomain.root, { recursive: true, force: true });
  }
});

test("已启用的腾讯云能力必须逐项登记同源固定控制台回调", async () => {
  const intake = completeIntake();
  intake.externalEndpoints.outboundDependencies.push(
    {
      serviceId: "tencent-im",
      dnsTlsReachabilityVerified: true,
      credentialSmokeTestPassed: true,
      providerSourceIpPolicyVerified: true,
    },
    {
      serviceId: "tencent-live",
      dnsTlsReachabilityVerified: true,
      credentialSmokeTestPassed: true,
      providerSourceIpPolicyVerified: true,
    },
    {
      serviceId: "tencent-vod",
      dnsTlsReachabilityVerified: true,
      credentialSmokeTestPassed: true,
      providerSourceIpPolicyVerified: true,
    },
  );
  intake.externalEndpoints.controlPlaneCallbacks = [
    {
      integrationId: "tencent-vod",
      callbackUrl: "https://api.guoxue.cn/api/v1/videos/vod/callback",
    },
    {
      integrationId: "tencent-live",
      callbackUrl: "https://api.guoxue.cn/api/v1/live/callback",
    },
    {
      integrationId: "tencent-live-audit",
      callbackUrl: "https://api.guoxue.cn/api/v1/live/audit/callback",
    },
    {
      integrationId: "tencent-im",
      callbackUrl: "https://api.guoxue.cn/api/v1/im/callback",
    },
  ];
  intake.externalEndpoints.mediaDelivery = {
    owner: "媒体交付负责人",
    evidenceReference: "CHANGE-20260802-MEDIA",
    livePushDomain: "push.guoxue.cn",
    livePlayDomain: "play.guoxue.cn",
    vodSubAppId: "12345",
    trtcSdkAppId: "",
  };
  const environment = completeEnvironment({
    VOD_SUB_APP_ID: "12345",
    LIVE_PUSH_DOMAIN: "push.guoxue.cn",
    LIVE_PLAY_DOMAIN: "play.guoxue.cn",
    IM_APP_ID: "1400000000",
  });
  const complete = await runAudit(intake, "predeploy", "tencent", environment);

  const missingIntake = structuredClone(intake);
  missingIntake.externalEndpoints.controlPlaneCallbacks =
    missingIntake.externalEndpoints.controlPlaneCallbacks.filter(
      (item) => item.integrationId !== "tencent-live-audit",
    );
  const missing = await runAudit(missingIntake, "predeploy", "tencent", environment);
  try {
    assert.equal(complete.result.status, 0, complete.result.stderr || complete.result.stdout);
    assert.equal(complete.report.configurationBinding.success, true);
    assert.notEqual(missing.result.status, 0);
    assert.match(
      missing.report.checks
        .filter((item) => !item.pass)
        .map((item) => item.name)
        .join("\n"),
      /已启用云能力均登记正式控制台回调/u,
    );
    assert.equal(JSON.stringify(missing.report).includes("api.guoxue.cn"), false);
  } finally {
    await rm(complete.root, { recursive: true, force: true });
    await rm(missing.root, { recursive: true, force: true });
  }
});

test("启用微信客户端时必须逐项登记与正式环境绑定的合法域名", async () => {
  const intake = completeIntake();
  intake.externalEndpoints.outboundDependencies.push({
    serviceId: "wechat-open",
    dnsTlsReachabilityVerified: true,
    credentialSmokeTestPassed: true,
    providerSourceIpPolicyVerified: true,
  });
  intake.externalEndpoints.clientDomainAllowlistEntries = [
    { surfaceId: "wechat-mini-request-api", origin: "https://api.guoxue.cn" },
    { surfaceId: "wechat-mini-upload-api", origin: "https://api.guoxue.cn" },
    { surfaceId: "wechat-mini-download-api", origin: "https://api.guoxue.cn" },
    { surfaceId: "wechat-mini-download-assets", origin: "https://static.guoxue.cn" },
    { surfaceId: "wechat-mini-socket-api", origin: "wss://api.guoxue.cn" },
    { surfaceId: "wechat-mini-business-h5", origin: "https://api.guoxue.cn" },
    { surfaceId: "wechat-official-oauth-h5", origin: "https://api.guoxue.cn" },
    { surfaceId: "wechat-official-js-sdk-h5", origin: "https://api.guoxue.cn" },
  ];
  intake.externalEndpoints.wechatClientDelivery = {
    owner: "微信客户端交付负责人",
    evidenceReference: "CHANGE-20260802-WECHAT",
    miniProgramAppId: "wx06397e8ab26bed9e",
    officialAccountAppId: "wx1234567890abcdef",
    miniProgramRequestVerified: true,
    miniProgramUploadVerified: true,
    miniProgramDownloadVerified: true,
    miniProgramSocketVerified: true,
    miniProgramBusinessWebViewVerified: true,
    officialAccountControlPlaneVerified: true,
    officialAccountOauthSmokeTestPassed: true,
    officialAccountJsSdkConfigVerified: true,
    officialAccountShareCardVerified: true,
  };
  const environment = completeEnvironment({
    WECHAT_MINI_APP_ID: "wx06397e8ab26bed9e",
    WECHAT_OFFICIAL_APPID: "wx1234567890abcdef",
  });
  const complete = await runAudit(intake, "predeploy", "tencent", environment);

  const stale = structuredClone(intake);
  stale.externalEndpoints.clientDomainAllowlistEntries.find(
    (item) => item.surfaceId === "wechat-mini-download-assets",
  ).origin = "https://old.guoxue.cn";
  const staleAudit = await runAudit(stale, "predeploy", "tencent", environment);

  const missing = structuredClone(intake);
  missing.externalEndpoints.clientDomainAllowlistEntries =
    missing.externalEndpoints.clientDomainAllowlistEntries.filter(
      (item) => item.surfaceId !== "wechat-mini-socket-api",
    );
  const missingAudit = await runAudit(missing, "predeploy", "tencent", environment);
  const pathBearing = structuredClone(intake);
  pathBearing.externalEndpoints.clientDomainAllowlistEntries.find(
    (item) => item.surfaceId === "wechat-mini-request-api",
  ).origin = "https://api.guoxue.cn/private/path?token=forbidden";
  const pathBearingAudit = await runAudit(pathBearing, "predeploy", "tencent", environment);
  try {
    assert.equal(complete.result.status, 0, complete.result.stderr || complete.result.stdout);
    assert.equal(complete.report.configurationBinding.success, true);
    for (const audit of [staleAudit, missingAudit]) {
      assert.notEqual(audit.result.status, 0);
      assert.match(
        audit.report.checks
          .filter((item) => !item.pass)
          .map((item) => item.name)
          .join("\n"),
        /已启用微信客户端均登记完整合法域名/u,
      );
      assert.equal(JSON.stringify(audit.report).includes("old.guoxue.cn"), false);
    }
    assert.notEqual(pathBearingAudit.result.status, 0);
    assert.match(
      pathBearingAudit.report.checks
        .filter((item) => !item.pass)
        .map((item) => item.name)
        .join("\n"),
      /客户端合法域名清单使用受控表面与安全 origin/u,
    );
    assert.equal(JSON.stringify(pathBearingAudit.report).includes("forbidden"), false);
  } finally {
    await rm(complete.root, { recursive: true, force: true });
    await rm(staleAudit.root, { recursive: true, force: true });
    await rm(missingAudit.root, { recursive: true, force: true });
    await rm(pathBearingAudit.root, { recursive: true, force: true });
  }
});

test("launch 阶段要求微信内授权分享与小程序合法域名完成真机闭环", async () => {
  const intake = completeIntake();
  intake.externalEndpoints.outboundDependencies.push({
    serviceId: "wechat-open",
    dnsTlsReachabilityVerified: true,
    credentialSmokeTestPassed: true,
    providerSourceIpPolicyVerified: true,
  });
  intake.externalEndpoints.clientDomainAllowlistEntries = [
    { surfaceId: "wechat-mini-request-api", origin: "https://api.guoxue.cn" },
    { surfaceId: "wechat-mini-upload-api", origin: "https://api.guoxue.cn" },
    { surfaceId: "wechat-mini-download-api", origin: "https://api.guoxue.cn" },
    { surfaceId: "wechat-mini-download-assets", origin: "https://static.guoxue.cn" },
    { surfaceId: "wechat-mini-socket-api", origin: "wss://api.guoxue.cn" },
    { surfaceId: "wechat-mini-business-h5", origin: "https://api.guoxue.cn" },
    { surfaceId: "wechat-official-oauth-h5", origin: "https://api.guoxue.cn" },
    { surfaceId: "wechat-official-js-sdk-h5", origin: "https://api.guoxue.cn" },
  ];
  intake.externalEndpoints.wechatClientDelivery = {
    owner: "微信客户端交付负责人",
    evidenceReference: "CHANGE-20260802-WECHAT",
    miniProgramAppId: "wx06397e8ab26bed9e",
    officialAccountAppId: "wx1234567890abcdef",
    miniProgramRequestVerified: true,
    miniProgramUploadVerified: true,
    miniProgramDownloadVerified: true,
    miniProgramSocketVerified: true,
    miniProgramBusinessWebViewVerified: true,
    officialAccountControlPlaneVerified: true,
    officialAccountOauthSmokeTestPassed: true,
    officialAccountJsSdkConfigVerified: true,
    officialAccountShareCardVerified: true,
  };
  const environment = completeEnvironment({
    WECHAT_MINI_APP_ID: "wx06397e8ab26bed9e",
    WECHAT_OFFICIAL_APPID: "wx1234567890abcdef",
  });
  const complete = await runAudit(intake, "launch", "tencent", environment);

  const incomplete = structuredClone(intake);
  incomplete.externalEndpoints.wechatClientDelivery.officialAccountOauthSmokeTestPassed = false;
  incomplete.externalEndpoints.wechatClientDelivery.officialAccountShareCardVerified = false;
  incomplete.externalEndpoints.wechatClientDelivery.miniProgramSocketVerified = false;
  const blocked = await runAudit(incomplete, "launch", "tencent", environment);

  const mismatched = structuredClone(intake);
  mismatched.externalEndpoints.wechatClientDelivery.officialAccountAppId =
    "wx0000000000000000";
  const mismatchedAudit = await runAudit(mismatched, "predeploy", "tencent", environment);
  try {
    assert.equal(complete.result.status, 0, complete.result.stderr || complete.result.stdout);
    assert.equal(complete.report.wechatClientDeliveryEvidence.miniProgramVerified, true);
    assert.equal(complete.report.wechatClientDeliveryEvidence.officialAccountVerified, true);
    assert.equal(JSON.stringify(complete.report).includes("wx1234567890abcdef"), false);
    assert.notEqual(blocked.result.status, 0);
    assert.match(
      blocked.report.checks
        .filter((item) => !item.pass)
        .map((item) => item.name)
        .join("\n"),
      /微信 H5 授权分享与小程序合法域名已真机验收/u,
    );
    assert.notEqual(mismatchedAudit.result.status, 0);
    assert.match(
      mismatchedAudit.report.checks
        .filter((item) => !item.pass)
        .map((item) => item.name)
        .join("\n"),
      /微信客户端身份与交付责任已绑定/u,
    );
    assert.equal(JSON.stringify(mismatchedAudit.report).includes("wx0000000000000000"), false);
  } finally {
    await rm(complete.root, { recursive: true, force: true });
    await rm(blocked.root, { recursive: true, force: true });
    await rm(mismatchedAudit.root, { recursive: true, force: true });
  }
});

test("launch 阶段未完成第三方控制台与客户端白名单验收时阻断", async () => {
  const intake = completeIntake();
  intake.externalEndpoints.callbackRetryIdempotencyVerified = false;
  intake.externalEndpoints.clientDomainAllowlistVerified = false;
  const audit = await runAudit(intake, "launch");
  try {
    assert.notEqual(audit.result.status, 0);
    assert.match(
      audit.report.checks
        .filter((item) => !item.pass)
        .map((item) => item.name)
        .join("\n"),
      /第三方控制台、回调安全与客户端白名单已现场验收/u,
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

test("权威 DNS 缺少双 NS 或仍是占位值时阻断", async () => {
  const missingIntake = completeIntake();
  missingIntake.domains.authoritativeNameServers = ["ns1.dnspod.net"];
  const missing = await runAudit(missingIntake, "procurement");
  const placeholderIntake = completeIntake();
  placeholderIntake.domains.authoritativeNameServers = [
    "pending-ns1.example.com",
    "pending-ns2.example.com",
  ];
  const placeholder = await runAudit(placeholderIntake, "procurement");
  try {
    assert.notEqual(missing.result.status, 0);
    assert.notEqual(placeholder.result.status, 0);
    for (const audit of [missing, placeholder]) {
      assert.match(
        audit.report.checks
          .filter((item) => !item.pass)
          .map((item) => `${item.name} ${item.detail}`)
          .join("\n"),
        /权威 DNS 双 NS 委派已规划/u,
      );
    }
  } finally {
    await rm(missing.root, { recursive: true, force: true });
    await rm(placeholder.root, { recursive: true, force: true });
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

test("对象存储 CORS 来源必须精确绑定正式 H5 与后台入口且报告不泄露旧域名", async () => {
  const stale = completeIntake();
  stale.storage.corsAllowedOrigins = ["https://old.guoxue.cn"];
  const staleAudit = await runAudit(stale, "predeploy");

  const unsafe = completeIntake();
  unsafe.storage.corsAllowedOrigins = ["https://api.guoxue.cn/h5/?from=legacy"];
  const unsafeAudit = await runAudit(unsafe, "predeploy");

  try {
    assert.notEqual(staleAudit.result.status, 0);
    assert.match(
      staleAudit.report.checks
        .filter((item) => !item.pass)
        .map((item) => `${item.name} ${item.detail}`)
        .join("\n"),
      /对象存储 CORS 来源与正式 H5 和后台入口完全绑定/,
    );
    assert.equal(JSON.stringify(staleAudit.report).includes("old.guoxue.cn"), false);

    assert.notEqual(unsafeAudit.result.status, 0);
    assert.match(
      unsafeAudit.report.checks
        .filter((item) => !item.pass)
        .map((item) => `${item.name} ${item.detail}`)
        .join("\n"),
      /对象存储 CORS 仅登记精确 HTTPS origin/,
    );
    assert.equal(JSON.stringify(unsafeAudit.report).includes("from=legacy"), false);
  } finally {
    await rm(staleAudit.root, { recursive: true, force: true });
    await rm(unsafeAudit.root, { recursive: true, force: true });
  }
});

test("launch 阶段对象存储源目标清单不一致时阻断且报告不泄露对象信息", async () => {
  const intake = completeIntake();
  intake.storage.objectMigration.targetInventory.objectCount = 127;
  intake.storage.objectMigration.targetInventory.manifestSha256 = "b".repeat(64);
  intake.storage.objectMigration.evidenceReference = "SECRET-OBJECT-KEY/private/avatar.png";
  const audit = await runAudit(intake, "launch");
  try {
    assert.notEqual(audit.result.status, 0);
    assert.match(
      audit.report.checks
        .filter((item) => !item.pass)
        .map((item) => `${item.name} ${item.detail}`)
        .join("\n"),
      /对象存储源目标清单已逐对象一致性核验/u,
    );
    const serialized = JSON.stringify(audit.report);
    assert.equal(serialized.includes("private/avatar.png"), false);
    assert.equal(serialized.includes("SECRET-OBJECT-KEY"), false);
    assert.equal(audit.report.storageMigrationEvidence.matched, false);
  } finally {
    await rm(audit.root, { recursive: true, force: true });
  }
});

test("launch 阶段拒绝使用 ETag 清单或提前释放旧对象存储", async () => {
  const intake = completeIntake();
  intake.storage.objectMigration.manifestAlgorithm = "etag-v1";
  intake.storage.objectMigration.oldBucketRetentionConfirmed = false;
  intake.storage.objectMigration.oldBucketRetentionHours = 24;
  const audit = await runAudit(intake, "launch");
  try {
    assert.notEqual(audit.result.status, 0);
    const failures = audit.report.checks
      .filter((item) => !item.pass)
      .map((item) => item.name)
      .join("\n");
    assert.match(failures, /对象存储迁移方案使用逐对象内容摘要/u);
    assert.match(failures, /旧对象存储回退窗口已保留/u);
  } finally {
    await rm(audit.root, { recursive: true, force: true });
  }
});

test("App 深链主机必须与正式 H5 主机绑定且报告不泄露域名", async () => {
  const intake = completeIntake();
  intake.appDeepLinks.host = "legacy.guoxue.cn";
  const audit = await runAudit(intake, "predeploy");
  try {
    assert.notEqual(audit.result.status, 0);
    assert.match(
      audit.report.checks
        .filter((item) => !item.pass)
        .map((item) => item.name)
        .join("\n"),
      /App 深链主机、受控路径与责任已规划/u,
    );
    assert.equal(JSON.stringify(audit.report).includes("legacy.guoxue.cn"), false);
  } finally {
    await rm(audit.root, { recursive: true, force: true });
  }
});

test("App 深链拒绝错误应用身份和无效签名指纹", async () => {
  const intake = completeIntake();
  intake.appDeepLinks.ios.bundleId = "com.example.rebu";
  intake.appDeepLinks.android.sha256CertFingerprints = ["invalid"];
  const audit = await runAudit(intake, "predeploy");
  try {
    assert.notEqual(audit.result.status, 0);
    const failures = audit.report.checks
      .filter((item) => !item.pass)
      .map((item) => item.name)
      .join("\n");
    assert.match(failures, /App 深链应用身份与现有发布包一致/u);
    assert.match(failures, /App 深链正式 Team ID 与 Android 签名证书已登记/u);
  } finally {
    await rm(audit.root, { recursive: true, force: true });
  }
});

test("App 深链未完成客户端能力与双端真机验证时阻断 launch", async () => {
  const intake = completeIntake();
  intake.appDeepLinks.ios.provisioningProfileRegenerated = false;
  intake.appDeepLinks.android.deviceVerificationPassed = false;
  const audit = await runAudit(intake, "launch");
  try {
    assert.notEqual(audit.result.status, 0);
    assert.match(
      audit.report.checks
        .filter((item) => !item.pass)
        .map((item) => item.name)
        .join("\n"),
      /App 深链关联文件、客户端能力与真机跳转已现场验收/u,
    );
    assert.equal(audit.report.appDeepLinkEvidence.deviceVerificationPassed, false);
    assert.equal(JSON.stringify(audit.report).includes("A1B2C3D4E5"), false);
    assert.equal(JSON.stringify(audit.report).includes("AA:BB:CC"), false);
  } finally {
    await rm(audit.root, { recursive: true, force: true });
  }
});

test("外部依赖必须按正式环境启用能力逐项验收且报告不泄露出口 IP", async () => {
  const intake = completeIntake();
  intake.externalEndpoints.outboundDependencies.push({
    serviceId: "deepseek",
    dnsTlsReachabilityVerified: true,
    credentialSmokeTestPassed: true,
    providerSourceIpPolicyVerified: true,
  });
  const audit = await runAudit(intake, "launch", "tencent", {
    ...completeEnvironment(),
    DEEPSEEK_API_KEY: "real-but-not-recorded",
  });
  try {
    assert.equal(audit.result.status, 0, audit.result.stderr || audit.result.stdout);
    assert.equal(audit.report.outboundAccessEvidence.verified, true);
    assert.equal(audit.report.outboundAccessEvidence.dependencyCount, 2);
    const serialized = JSON.stringify(audit.report);
    assert.equal(serialized.includes("93.184.216.34"), false);
    assert.equal(serialized.includes("real-but-not-recorded"), false);
  } finally {
    await rm(audit.root, { recursive: true, force: true });
  }
});

test("采购阶段允许在新服务器到位前暂不登记实际出口地址", async () => {
  const intake = completeIntake();
  intake.externalEndpoints.expectedEgressIpv4 = [];
  intake.externalEndpoints.outboundDependencies = [];
  intake.externalEndpoints.egressIdentityVerified = false;
  intake.externalEndpoints.outboundDependencySmokeTestsPassed = false;
  const audit = await runAudit(intake, "procurement");
  try {
    assert.equal(audit.result.status, 0, audit.result.stderr || audit.result.stdout);
    assert.equal(audit.report.outboundAccessEvidence, null);
  } finally {
    await rm(audit.root, { recursive: true, force: true });
  }
});

test("launch 阶段拒绝漏登记启用依赖、保留地址和未完成的鉴权冒烟", async () => {
  const intake = completeIntake();
  intake.externalEndpoints.expectedEgressIpv4 = ["203.0.113.8"];
  intake.externalEndpoints.outboundDependencies[0].credentialSmokeTestPassed = false;
  const audit = await runAudit(intake, "launch", "tencent", {
    ...completeEnvironment(),
    SMS_APP_ID: "1400000000",
  });
  try {
    assert.notEqual(audit.result.status, 0);
    const failures = audit.report.checks
      .filter((item) => !item.pass)
      .map((item) => item.name)
      .join("\n");
    assert.match(failures, /固定公网出口身份/u);
    assert.match(failures, /外部依赖清单/u);
    assert.match(failures, /全部外部依赖/u);
    assert.equal(JSON.stringify(audit.report).includes("203.0.113.8"), false);
  } finally {
    await rm(audit.root, { recursive: true, force: true });
  }
});

test("启用邮件后发送域与信誉验收必须绑定且报告不泄露原始域名", async () => {
  const intake = completeIntake();
  intake.externalEndpoints.outboundDependencies.push({
    serviceId: "email-api",
    dnsTlsReachabilityVerified: true,
    credentialSmokeTestPassed: true,
    providerSourceIpPolicyVerified: true,
  });
  intake.externalEndpoints.emailDelivery = {
    owner: "邮件交付负责人",
    sendingDomain: "mail.guoxue.cn",
    returnPathDomain: "bounce.guoxue.cn",
    evidenceReference: "CHANGE-20260802-MAIL",
    spfVerified: true,
    dkimVerified: true,
    dmarcVerified: true,
    bounceHandlingVerified: true,
    complaintHandlingVerified: true,
    unsubscribeVerified: true,
    deliverySmokeTestPassed: true,
  };
  const audit = await runAudit(intake, "launch", "tencent", {
    ...completeEnvironment(),
    EMAIL_MODE: "api",
    EMAIL_API_URL: "https://mailer.guoxue.cn/v1/send",
    EMAIL_API_KEY: "not-recorded",
    EMAIL_FROM: "国学平台 <noreply@mail.guoxue.cn>",
  });
  try {
    assert.equal(audit.result.status, 0, audit.result.stderr || audit.result.stdout);
    assert.equal(audit.report.emailDeliveryEvidence.verified, true);
    assert.equal(audit.report.outboundAccessEvidence.dependencyCount, 2);
    const serialized = JSON.stringify(audit.report);
    assert.equal(serialized.includes("mail.guoxue.cn"), false);
    assert.equal(serialized.includes("bounce.guoxue.cn"), false);
    assert.equal(serialized.includes("not-recorded"), false);
  } finally {
    await rm(audit.root, { recursive: true, force: true });
  }
});

test("启用邮件后拒绝发送域错绑和未完成的投递治理", async () => {
  const intake = completeIntake();
  intake.externalEndpoints.outboundDependencies.push({
    serviceId: "email-smtp",
    dnsTlsReachabilityVerified: true,
    credentialSmokeTestPassed: true,
    providerSourceIpPolicyVerified: true,
  });
  intake.externalEndpoints.emailDelivery = {
    owner: "邮件交付负责人",
    sendingDomain: "old.guoxue.cn",
    returnPathDomain: "bounce.guoxue.cn",
    evidenceReference: "CHANGE-20260802-MAIL",
    spfVerified: true,
    dkimVerified: true,
    dmarcVerified: false,
    bounceHandlingVerified: true,
    complaintHandlingVerified: false,
    unsubscribeVerified: true,
    deliverySmokeTestPassed: false,
  };
  const audit = await runAudit(intake, "launch", "tencent", {
    ...completeEnvironment(),
    EMAIL_MODE: "smtp",
    SMTP_HOST: "smtp.guoxue.cn",
    EMAIL_FROM: "noreply@mail.guoxue.cn",
  });
  try {
    assert.notEqual(audit.result.status, 0);
    const failures = audit.report.checks
      .filter((item) => !item.pass)
      .map((item) => item.name)
      .join("\n");
    assert.match(failures, /邮件发送域、退信域和交付责任已绑定/u);
    assert.match(failures, /邮件域名信誉、退信投诉与真实投递已现场验收/u);
    assert.match(failures, /正式环境与新基础设施接入清单完全绑定/u);
  } finally {
    await rm(audit.root, { recursive: true, force: true });
  }
});

test("启用短信后签名模板、回执和真实投递验收必须绑定且报告脱敏", async () => {
  const intake = completeIntake();
  intake.externalEndpoints.outboundDependencies.push({
    serviceId: "tencent-sms",
    dnsTlsReachabilityVerified: true,
    credentialSmokeTestPassed: true,
    providerSourceIpPolicyVerified: true,
  });
  intake.externalEndpoints.smsDelivery = {
    owner: "短信交付负责人",
    appId: "1400000000",
    signName: "国学平台",
    verificationTemplateId: "123456",
    retentionTemplateId: "654321",
    evidenceReference: "CHANGE-20260802-SMS",
    signApproved: true,
    verificationTemplateApproved: true,
    retentionTemplateApproved: true,
    deliveryReceiptVerified: true,
    realNumberSmokeTestPassed: true,
    alternateLoginVerified: true,
    retentionConsentAndOptOutVerified: true,
  };
  const audit = await runAudit(intake, "launch", "tencent", {
    ...completeEnvironment(),
    TENCENT_SECRET_ID: "not-recorded-id",
    TENCENT_SECRET_KEY: "not-recorded-key",
    SMS_APP_ID: "1400000000",
    SMS_SIGN_NAME: "国学平台",
    SMS_TEMPLATE_ID: "123456",
    SMS_CHURN_TEMPLATE_ID: "654321",
  });
  try {
    assert.equal(audit.result.status, 0, audit.result.stderr || audit.result.stdout);
    assert.equal(audit.report.smsDeliveryEvidence.verified, true);
    assert.equal(audit.report.smsDeliveryEvidence.retentionEnabled, true);
    assert.equal(audit.report.outboundAccessEvidence.dependencyCount, 2);
    const serialized = JSON.stringify(audit.report);
    assert.equal(serialized.includes("国学平台"), false);
    assert.equal(serialized.includes("1400000000"), false);
    assert.equal(serialized.includes("123456"), false);
    assert.equal(serialized.includes("not-recorded-key"), false);
  } finally {
    await rm(audit.root, { recursive: true, force: true });
  }
});

test("启用短信后拒绝错绑模板、未审核签名和缺失登录兜底", async () => {
  const intake = completeIntake();
  intake.externalEndpoints.outboundDependencies.push({
    serviceId: "tencent-sms",
    dnsTlsReachabilityVerified: true,
    credentialSmokeTestPassed: true,
    providerSourceIpPolicyVerified: true,
  });
  intake.externalEndpoints.smsDelivery = {
    owner: "短信交付负责人",
    appId: "1400000000",
    signName: "旧签名",
    verificationTemplateId: "999999",
    retentionTemplateId: "",
    evidenceReference: "CHANGE-20260802-SMS",
    signApproved: false,
    verificationTemplateApproved: false,
    retentionTemplateApproved: false,
    deliveryReceiptVerified: false,
    realNumberSmokeTestPassed: false,
    alternateLoginVerified: false,
    retentionConsentAndOptOutVerified: false,
  };
  const audit = await runAudit(intake, "launch", "tencent", {
    ...completeEnvironment(),
    TENCENT_SECRET_ID: "not-recorded-id",
    TENCENT_SECRET_KEY: "not-recorded-key",
    SMS_APP_ID: "1400000000",
    SMS_SIGN_NAME: "国学平台",
    SMS_TEMPLATE_ID: "123456",
  });
  try {
    assert.notEqual(audit.result.status, 0);
    const failures = audit.report.checks
      .filter((item) => !item.pass)
      .map((item) => item.name)
      .join("\n");
    assert.match(failures, /短信签名、模板和交付责任已绑定/u);
    assert.match(failures, /短信签名模板、回执、真实投递与登录兜底已现场验收/u);
    assert.match(failures, /正式环境与新基础设施接入清单完全绑定/u);
  } finally {
    await rm(audit.root, { recursive: true, force: true });
  }
});

test("启用支付后首发通道真实收款退款闭环必须绑定且报告脱敏", async () => {
  const intake = completeIntake();
  intake.externalEndpoints.outboundDependencies.push({
    serviceId: "wechat-pay",
    dnsTlsReachabilityVerified: true,
    credentialSmokeTestPassed: true,
    providerSourceIpPolicyVerified: true,
  });
  intake.externalEndpoints.paymentDelivery = {
    owner: "支付闭环负责人",
    channelId: "wechat-pay",
    merchantReference: "1900000109",
    evidenceReference: "CHANGE-20260802-PAYMENT",
    productionAccountVerified: true,
    smallAmountPaymentPassed: true,
    paymentCallbackVerified: true,
    orderLedgerVerified: true,
    refundSmokeTestPassed: true,
    refundCallbackVerified: true,
    reconciliationVerified: true,
    duplicateCallbackReplayVerified: true,
  };
  const audit = await runAudit(intake, "launch", "tencent", {
    ...completeEnvironment(),
    WECHAT_PAY_MCH_ID: "1900000109",
  });
  try {
    assert.equal(audit.result.status, 0, audit.result.stderr || audit.result.stdout);
    assert.equal(audit.report.paymentDeliveryEvidence.verified, true);
    assert.equal(audit.report.outboundAccessEvidence.dependencyCount, 2);
    const serialized = JSON.stringify(audit.report);
    assert.equal(serialized.includes("1900000109"), false);
    assert.equal(serialized.includes("CHANGE-20260802-PAYMENT"), false);
  } finally {
    await rm(audit.root, { recursive: true, force: true });
  }
});

test("启用支付后拒绝错绑商户、沙箱冒充生产和不完整退款对账", async () => {
  const intake = completeIntake();
  intake.externalEndpoints.outboundDependencies.push({
    serviceId: "wechat-pay",
    dnsTlsReachabilityVerified: true,
    credentialSmokeTestPassed: true,
    providerSourceIpPolicyVerified: true,
  });
  intake.externalEndpoints.paymentDelivery = {
    owner: "支付闭环负责人",
    channelId: "wechat-pay",
    merchantReference: "1900000999",
    evidenceReference: "CHANGE-20260802-PAYMENT",
    productionAccountVerified: false,
    smallAmountPaymentPassed: true,
    paymentCallbackVerified: true,
    orderLedgerVerified: true,
    refundSmokeTestPassed: false,
    refundCallbackVerified: false,
    reconciliationVerified: false,
    duplicateCallbackReplayVerified: false,
  };
  const audit = await runAudit(intake, "launch", "tencent", {
    ...completeEnvironment(),
    WECHAT_PAY_MCH_ID: "1900000109",
  });
  try {
    assert.notEqual(audit.result.status, 0);
    const failures = audit.report.checks
      .filter((item) => !item.pass)
      .map((item) => item.name)
      .join("\n");
    assert.match(failures, /首发支付通道、商户身份和闭环责任已绑定/u);
    assert.match(failures, /首发支付通道已完成真实收款、退款、回调和对账闭环/u);
    assert.match(failures, /正式环境与新基础设施接入清单完全绑定/u);
  } finally {
    await rm(audit.root, { recursive: true, force: true });
  }
});

test("启用物流后首发供应商真实运单履约闭环必须绑定且报告脱敏", async () => {
  const intake = completeIntake();
  intake.externalEndpoints.outboundDependencies.push({
    serviceId: "kuaidi100",
    dnsTlsReachabilityVerified: true,
    credentialSmokeTestPassed: true,
    providerSourceIpPolicyVerified: true,
  });
  intake.externalEndpoints.logisticsDelivery = {
    owner: "物流履约负责人",
    providerId: "kuaidi100",
    accountReference: "CUS-LOGISTICS-001",
    evidenceReference: "CHANGE-20260802-LOGISTICS",
    productionAccountVerified: true,
    controlledWaybillVerified: true,
    trackingSubscriptionVerified: true,
    trackingCallbackAuthenticated: true,
    trackingStatePersisted: true,
    deliveryExceptionVerified: true,
    returnRefundLinkageVerified: true,
    duplicateCallbackReplayVerified: true,
  };
  const audit = await runAudit(intake, "launch", "tencent", {
    ...completeEnvironment(),
    KUAIDI100_API_KEY: "not-recorded-api-key",
    KUAIDI100_CUSTOMER: "CUS-LOGISTICS-001",
    KUAIDI100_SALT: "not-recorded-callback-salt",
  });
  try {
    assert.equal(audit.result.status, 0, audit.result.stderr || audit.result.stdout);
    assert.equal(audit.report.logisticsDeliveryEvidence.verified, true);
    assert.equal(audit.report.outboundAccessEvidence.dependencyCount, 2);
    const serialized = JSON.stringify(audit.report);
    assert.equal(serialized.includes("CUS-LOGISTICS-001"), false);
    assert.equal(serialized.includes("CHANGE-20260802-LOGISTICS"), false);
    assert.equal(serialized.includes("not-recorded-api-key"), false);
  } finally {
    await rm(audit.root, { recursive: true, force: true });
  }
});

test("启用物流后拒绝错绑账号和不完整轨迹异常退货闭环", async () => {
  const intake = completeIntake();
  intake.externalEndpoints.outboundDependencies.push({
    serviceId: "kuaidi100",
    dnsTlsReachabilityVerified: true,
    credentialSmokeTestPassed: true,
    providerSourceIpPolicyVerified: true,
  });
  intake.externalEndpoints.logisticsDelivery = {
    owner: "物流履约负责人",
    providerId: "kuaidi100",
    accountReference: "CUS-WRONG-ACCOUNT",
    evidenceReference: "CHANGE-20260802-LOGISTICS",
    productionAccountVerified: false,
    controlledWaybillVerified: true,
    trackingSubscriptionVerified: true,
    trackingCallbackAuthenticated: false,
    trackingStatePersisted: true,
    deliveryExceptionVerified: false,
    returnRefundLinkageVerified: false,
    duplicateCallbackReplayVerified: false,
  };
  const audit = await runAudit(intake, "launch", "tencent", {
    ...completeEnvironment(),
    KUAIDI100_API_KEY: "not-recorded-api-key",
    KUAIDI100_CUSTOMER: "CUS-LOGISTICS-001",
    KUAIDI100_SALT: "not-recorded-callback-salt",
  });
  try {
    assert.notEqual(audit.result.status, 0);
    const failures = audit.report.checks
      .filter((item) => !item.pass)
      .map((item) => item.name)
      .join("\n");
    assert.match(failures, /首发物流供应商、账号身份和履约责任已绑定/u);
    assert.match(
      failures,
      /首发物流供应商已完成真实运单、轨迹回调、异常件和退货联动闭环/u,
    );
    assert.match(failures, /正式环境与新基础设施接入清单完全绑定/u);
  } finally {
    await rm(audit.root, { recursive: true, force: true });
  }
});

test("启用直播点播语音后生产资源与多端真实媒体闭环必须绑定且报告脱敏", async () => {
  const intake = completeIntake();
  intake.externalEndpoints.outboundDependencies.push(
    {
      serviceId: "tencent-im",
      dnsTlsReachabilityVerified: true,
      credentialSmokeTestPassed: true,
      providerSourceIpPolicyVerified: true,
    },
    {
      serviceId: "tencent-live",
      dnsTlsReachabilityVerified: true,
      credentialSmokeTestPassed: true,
      providerSourceIpPolicyVerified: true,
    },
    {
      serviceId: "tencent-vod",
      dnsTlsReachabilityVerified: true,
      credentialSmokeTestPassed: true,
      providerSourceIpPolicyVerified: true,
    },
  );
  intake.externalEndpoints.controlPlaneCallbacks = [
    {
      integrationId: "tencent-vod",
      callbackUrl: "https://api.guoxue.cn/api/v1/videos/vod/callback",
    },
    {
      integrationId: "tencent-live",
      callbackUrl: "https://api.guoxue.cn/api/v1/live/callback",
    },
    {
      integrationId: "tencent-live-audit",
      callbackUrl: "https://api.guoxue.cn/api/v1/live/audit/callback",
    },
  ];
  intake.externalEndpoints.mediaDelivery = {
    owner: "媒体交付负责人",
    evidenceReference: "CHANGE-20260802-MEDIA",
    livePushDomain: "push.guoxue.cn",
    livePlayDomain: "play.guoxue.cn",
    vodSubAppId: "1500000000",
    trtcSdkAppId: "1400000000",
    liveProductionAccountVerified: true,
    livePushVerified: true,
    livePlaybackVerified: true,
    liveCallbackVerified: true,
    liveAuditCallbackVerified: true,
    vodProductionAccountVerified: true,
    vodUploadVerified: true,
    vodTranscodeVerified: true,
    vodPlaybackVerified: true,
    vodCallbackVerified: true,
    voiceProductionAccountVerified: true,
    voiceWebVerified: true,
    voiceMiniProgramVerified: true,
    voiceAppVerified: true,
    voicePermissionRecoveryVerified: true,
    voiceWeakNetworkRecoveryVerified: true,
  };
  const audit = await runAudit(intake, "launch", "tencent", {
    ...completeEnvironment(),
    LIVE_PUSH_DOMAIN: "push.guoxue.cn",
    LIVE_PLAY_DOMAIN: "play.guoxue.cn",
    VOD_SUB_APP_ID: "1500000000",
    TRTC_SDK_APP_ID: "1400000000",
  });
  try {
    assert.equal(audit.result.status, 0, audit.result.stderr || audit.result.stdout);
    assert.equal(audit.report.mediaDeliveryEvidence.liveVerified, true);
    assert.equal(audit.report.mediaDeliveryEvidence.vodVerified, true);
    assert.equal(audit.report.mediaDeliveryEvidence.voiceVerified, true);
    const serialized = JSON.stringify(audit.report);
    assert.equal(serialized.includes("push.guoxue.cn"), false);
    assert.equal(serialized.includes("1500000000"), false);
    assert.equal(serialized.includes("1400000000"), false);
    assert.equal(serialized.includes("CHANGE-20260802-MEDIA"), false);
  } finally {
    await rm(audit.root, { recursive: true, force: true });
  }
});

test("启用直播点播语音后拒绝资源错绑和缺失多端真实媒体验收", async () => {
  const intake = completeIntake();
  intake.externalEndpoints.outboundDependencies.push(
    {
      serviceId: "tencent-im",
      dnsTlsReachabilityVerified: true,
      credentialSmokeTestPassed: true,
      providerSourceIpPolicyVerified: true,
    },
    {
      serviceId: "tencent-live",
      dnsTlsReachabilityVerified: true,
      credentialSmokeTestPassed: true,
      providerSourceIpPolicyVerified: true,
    },
    {
      serviceId: "tencent-vod",
      dnsTlsReachabilityVerified: true,
      credentialSmokeTestPassed: true,
      providerSourceIpPolicyVerified: true,
    },
  );
  intake.externalEndpoints.controlPlaneCallbacks = [
    {
      integrationId: "tencent-vod",
      callbackUrl: "https://api.guoxue.cn/api/v1/videos/vod/callback",
    },
    {
      integrationId: "tencent-live",
      callbackUrl: "https://api.guoxue.cn/api/v1/live/callback",
    },
    {
      integrationId: "tencent-live-audit",
      callbackUrl: "https://api.guoxue.cn/api/v1/live/audit/callback",
    },
  ];
  intake.externalEndpoints.mediaDelivery = {
    owner: "媒体交付负责人",
    evidenceReference: "CHANGE-20260802-MEDIA",
    livePushDomain: "wrong.guoxue.cn",
    livePlayDomain: "play.guoxue.cn",
    vodSubAppId: "1599999999",
    trtcSdkAppId: "1499999999",
    liveProductionAccountVerified: false,
    livePushVerified: true,
    livePlaybackVerified: false,
    liveCallbackVerified: false,
    liveAuditCallbackVerified: false,
    vodProductionAccountVerified: false,
    vodUploadVerified: true,
    vodTranscodeVerified: false,
    vodPlaybackVerified: false,
    vodCallbackVerified: false,
    voiceProductionAccountVerified: false,
    voiceWebVerified: true,
    voiceMiniProgramVerified: false,
    voiceAppVerified: false,
    voicePermissionRecoveryVerified: false,
    voiceWeakNetworkRecoveryVerified: false,
  };
  const audit = await runAudit(intake, "launch", "tencent", {
    ...completeEnvironment(),
    LIVE_PUSH_DOMAIN: "push.guoxue.cn",
    LIVE_PLAY_DOMAIN: "play.guoxue.cn",
    VOD_SUB_APP_ID: "1500000000",
    TRTC_SDK_APP_ID: "1400000000",
  });
  try {
    assert.notEqual(audit.result.status, 0);
    const failures = audit.report.checks
      .filter((item) => !item.pass)
      .map((item) => item.name)
      .join("\n");
    assert.match(failures, /直播、点播与实时语音生产资源和验收责任已绑定/u);
    assert.match(failures, /直播、点播与实时语音已完成对应多端真实媒体闭环/u);
    assert.match(failures, /正式环境与新基础设施接入清单完全绑定/u);
  } finally {
    await rm(audit.root, { recursive: true, force: true });
  }
});
