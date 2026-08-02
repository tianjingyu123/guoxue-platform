import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const checker = path.join(repoRoot, "scripts/migration/check-env.mjs");

function createEnvironment({
  databaseHost = "postgres",
  redisHost = "redis",
  storage = "cos",
} = {}) {
  return [
    "NODE_ENV=production",
    "DB_PASSWORD=R4nd0mDbCredentialValue987654321",
    `DATABASE_URL=postgresql://guoxue:R4nd0mDbCredentialValue987654321@${databaseHost}:5432/guoxue?connection_limit=20&pool_timeout=10`,
    `REDIS_URL=redis://${redisHost}:6379`,
    `JWT_SECRET=${"J".repeat(64)}`,
    `ENCRYPTION_KEY=${"E".repeat(32)}`,
    `BIGSCREEN_SECRET=${"B".repeat(32)}`,
    "PUBLIC_DOMAIN=api.guoxue.test",
    "PUBLIC_API_URL=https://api.guoxue.test",
    "PUBLIC_H5_URL=https://api.guoxue.test/h5/",
    "PUBLIC_ASSET_ORIGIN=https://static.guoxue.test",
    `STORAGE_PROVIDER=${storage}`,
    "CORS_ORIGIN=https://api.guoxue.test",
    "WS_CORS_ORIGIN=https://api.guoxue.test",
    "NGINX_SERVER_NAMES=api.guoxue.test",
    "TENCENT_REGION=ap-beijing",
    "TENCENT_CLB_ID=lb-NewTarget123",
    "TENCENT_CDN_DOMAIN=static.guoxue.test",
    "TENCENT_CERTIFICATE_DOMAIN=api.guoxue.test",
    "TENCENTDB_CA_CERT_PATH=/opt/guoxue/shared/tencentdb-ca.pem",
    "VITE_API_URL=https://api.guoxue.test",
    "VITE_PUBLIC_H5_URL=https://api.guoxue.test/h5/",
    "VITE_PUBLIC_ASSET_ORIGIN=https://static.guoxue.test",
    "PAIPAN_LEGACY_MODE=true",
    "PAIPAN_H5_BASE=https://www.yrydai.com/guoxueApp.php",
    "TENCENT_CREDENTIAL_MODE=static",
    "COS_SECRET_ID=AKID1234567890",
    "COS_SECRET_KEY=CosCredentialValue987654321",
    "COS_BUCKET=guoxue-1250000000",
    "COS_REGION=ap-beijing",
    "",
  ].join("\n");
}

function createFullEnvironment(options = {}) {
  return [
    createEnvironment(options),
    `DEEPSEEK_API_KEY=${"D".repeat(48)}`,
    "WECHAT_MINI_APP_ID=wx06397e8ab26bed9e",
    `MINIPROGRAM_APP_SECRET=${"M".repeat(32)}`,
    "WECHAT_PAY_APP_ID=wx06397e8ab26bed9e",
    "WECHAT_PAY_MCH_ID=1900000109",
    `WECHAT_PAY_SERIAL_NO=${"A".repeat(40)}`,
    `WECHAT_PAY_API_V3_KEY=${"V".repeat(32)}`,
    `WECHAT_PAY_PRIVATE_KEY=${"K".repeat(64)}`,
    "WECHAT_PAY_NOTIFY_URL=https://api.guoxue.test/api/v1/shop/pay/notify",
    "WECHAT_PAY_REFUND_NOTIFY_URL=https://api.guoxue.test/api/v1/shop/refund/notify",
    "MONITORING_ENABLED=true",
    `GF_ADMIN_PASSWORD=${"G".repeat(32)}`,
    "WEWORK_CORP_ID=ww1234567890abcdef",
    "WEWORK_AGENT_ID=1000006",
    `WEWORK_AGENT_SECRET=${"W".repeat(48)}`,
    "DBA_WEWORK_USER_IDS=OpsUserA|OpsUserB",
    "",
  ].join("\n");
}

test("完整上线拒绝只有下单配置而缺少商户私钥或退款回调的微信支付", async () => {
  const incomplete = createFullEnvironment()
    .replace(/^WECHAT_PAY_PRIVATE_KEY=.*\r?\n/mu, "")
    .replace(/^WECHAT_PAY_REFUND_NOTIFY_URL=.*\r?\n/mu, "");
  const result = await runChecker(
    incomplete,
    "--full",
    "--deploy-target",
    "standard",
  );
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /微信支付生产配置不完整/u);
  assert.match(result.stderr, /尚未形成一条完整支付通道/u);
});

async function runChecker(content, ...args) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "guoxue-env-check-"));
  const envFile = path.join(directory, ".env.production");
  await writeFile(envFile, content, { encoding: "utf8", mode: 0o600 });
  const result = spawnSync(process.execPath, [checker, envFile, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  await rm(directory, { recursive: true, force: true });
  return result;
}

test("standard 架构允许固定发布包内的 PostgreSQL 与 Redis 服务名", async () => {
  const result = await runChecker(createEnvironment(), "--deploy-target", "standard");
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /架构：standard/);
});

test("tencent 架构拒绝容器服务名或回环地址伪装成托管数据库", async () => {
  const result = await runChecker(createEnvironment(), "--deploy-target", "tencent");
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(
    result.stderr,
    /DATABASE_URL 在 DEPLOY_TARGET=tencent 时必须使用已验收的托管服务私网地址/,
  );
  assert.match(
    result.stderr,
    /REDIS_URL 在 DEPLOY_TARGET=tencent 时必须使用已验收的托管服务私网地址/,
  );
});

test("tencent 架构接受托管私网地址并强制使用 COS", async () => {
  const valid = await runChecker(
    createEnvironment({ databaseHost: "postgres.internal", redisHost: "redis.internal" }),
    "--deploy-target",
    "tencent",
  );
  assert.equal(valid.status, 0, `${valid.stdout}\n${valid.stderr}`);

  const localStorage = await runChecker(
    createEnvironment({
      databaseHost: "postgres.internal",
      redisHost: "redis.internal",
      storage: "local",
    }),
    "--deploy-target",
    "tencent",
  );
  assert.equal(localStorage.status, 1, `${localStorage.stdout}\n${localStorage.stderr}`);
  assert.match(localStorage.stderr, /STORAGE_PROVIDER 必须为 cos/);
});

test("完整腾讯云上线拒绝缺失或错绑 CLB、CDN 与证书目标", async () => {
  const invalid = createFullEnvironment({
    databaseHost: "postgres.internal",
    redisHost: "redis.internal",
  })
    .replace("TENCENT_CLB_ID=lb-NewTarget123", "TENCENT_CLB_ID=")
    .replace("TENCENT_CDN_DOMAIN=static.guoxue.test", "TENCENT_CDN_DOMAIN=other.guoxue.test")
    .replace(
      "TENCENT_CERTIFICATE_DOMAIN=api.guoxue.test",
      "TENCENT_CERTIFICATE_DOMAIN=other.guoxue.test",
    );
  const result = await runChecker(
    invalid,
    "--full",
    "--deploy-target",
    "tencent",
    "--node-role",
    "app",
  );
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /TENCENT_CLB_ID 未配置/);
  assert.match(result.stderr, /TENCENT_CDN_DOMAIN 必须与 PUBLIC_ASSET_ORIGIN 主机名一致/);
  assert.match(result.stderr, /TENCENT_CERTIFICATE_DOMAIN 必须与 PUBLIC_DOMAIN 一致/);
});

test("短信配置一旦启用就必须具备完整凭据和合法审核标识", async () => {
  const incomplete = await runChecker(
    `${createEnvironment()}SMS_APP_ID=1400000000\nSMS_SIGN_NAME=国学平台\n`,
  );
  assert.equal(incomplete.status, 1, `${incomplete.stdout}\n${incomplete.stderr}`);
  assert.match(incomplete.stderr, /短信配置不完整/);

  const invalid = await runChecker(
    `${createEnvironment()}TENCENT_SECRET_ID=test-id\nTENCENT_SECRET_KEY=test-key\nSMS_APP_ID=app-x\nSMS_SIGN_NAME=国\nSMS_TEMPLATE_ID=template-x\n`,
  );
  assert.equal(invalid.status, 1, `${invalid.stdout}\n${invalid.stderr}`);
  assert.match(invalid.stderr, /SMS_APP_ID 必须/);
  assert.match(invalid.stderr, /SMS_TEMPLATE_ID 必须/);
  assert.match(invalid.stderr, /SMS_SIGN_NAME 长度必须/);

  const valid = await runChecker(
    `${createEnvironment()}TENCENT_SECRET_ID=test-id\nTENCENT_SECRET_KEY=test-key\nSMS_APP_ID=1400000000\nSMS_SIGN_NAME=国学平台\nSMS_TEMPLATE_ID=123456\nSMS_CHURN_TEMPLATE_ID=654321\n`,
  );
  assert.equal(valid.status, 0, `${valid.stdout}\n${valid.stderr}`);
});

test("完整腾讯云上线强制使用受控的数据库 CA 证书绝对路径", async () => {
  const base = createFullEnvironment({
    databaseHost: "postgres.internal",
    redisHost: "redis.internal",
  });
  for (const caPath of ["", "../tencentdb-ca.pem", "/opt/guoxue/shared/tencentdb-ca.txt"]) {
    const invalid = base.replace(
      "TENCENTDB_CA_CERT_PATH=/opt/guoxue/shared/tencentdb-ca.pem",
      `TENCENTDB_CA_CERT_PATH=${caPath}`,
    );
    const result = await runChecker(
      invalid,
      "--full",
      "--deploy-target",
      "tencent",
      "--node-role",
      "app",
    );
    assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stderr, /TENCENTDB_CA_CERT_PATH/u);
  }
});

test("未知部署架构直接阻断", async () => {
  const result = await runChecker(createEnvironment(), "--deploy-target", "legacy");
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /DEPLOY_TARGET 仅允许 standard 或 tencent/);
});

test("完整上线检查不允许省略部署架构", async () => {
  const result = await runChecker(createEnvironment(), "--full");
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /完整上线检查必须通过 --deploy-target 显式指定/);
});

test("数据库与缓存连接协议错误时直接阻断", async () => {
  const invalid = createEnvironment()
    .replace("postgresql://", "mysql://")
    .replace("redis://redis:6379", "http://redis:6379");
  const result = await runChecker(invalid, "--deploy-target", "standard");
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /DATABASE_URL 必须使用 PostgreSQL 连接协议/);
  assert.match(result.stderr, /REDIS_URL 必须使用 redis:\/\/ 或 rediss:\/\//);
});

test("完整上线的业务节点不要求复制监控与企业微信密钥", async () => {
  const appEnvironment = createFullEnvironment({
    databaseHost: "postgres.internal",
    redisHost: "redis.internal",
  })
    .split("\n")
    .filter(
      (line) =>
        !/^(MONITORING_ENABLED|GF_ADMIN_PASSWORD|WEWORK_CORP_ID|WEWORK_AGENT_ID|WEWORK_AGENT_SECRET|DBA_WEWORK_USER_IDS)=/.test(
          line,
        ),
    )
    .join("\n");
  const result = await runChecker(
    appEnvironment,
    "--full",
    "--deploy-target",
    "tencent",
    "--node-role",
    "app",
  );
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /节点角色：app/);
});

test("完整上线的运维节点缺少监控密钥时保持阻断", async () => {
  const operationsEnvironment = createFullEnvironment({
    databaseHost: "postgres.internal",
    redisHost: "redis.internal",
  })
    .split("\n")
    .filter((line) => !/^GF_ADMIN_PASSWORD=/.test(line))
    .join("\n");
  const result = await runChecker(
    operationsEnvironment,
    "--full",
    "--deploy-target",
    "tencent",
    "--node-role",
    "operations",
  );
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /生产监控与企业微信告警配置不完整：GF_ADMIN_PASSWORD/);
});

test("未知节点角色直接阻断", async () => {
  const result = await runChecker(createEnvironment(), "--node-role", "database");
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /NODE_ROLE 仅允许 app 或 operations/);
});

test("完整上线拒绝正式环境指向旧小程序", async () => {
  const environment = createFullEnvironment({
    databaseHost: "postgres.internal",
    redisHost: "redis.internal",
  }).replace("WECHAT_MINI_APP_ID=wx06397e8ab26bed9e", "WECHAT_MINI_APP_ID=wx-old-mini-app");
  const result = await runChecker(
    environment,
    "--full",
    "--deploy-target",
    "tencent",
    "--node-role",
    "app",
  );
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /正式环境的小程序 AppID 与受控商店发布基线不一致/);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /wx-old-mini-app/);
});

test("完整上线拒绝微信支付绑定到其他 AppID", async () => {
  const environment = createFullEnvironment({
    databaseHost: "postgres.internal",
    redisHost: "redis.internal",
  }).replace("WECHAT_PAY_APP_ID=wx06397e8ab26bed9e", "WECHAT_PAY_APP_ID=wx-wrong-pay-app");
  const result = await runChecker(
    environment,
    "--full",
    "--deploy-target",
    "tencent",
    "--node-role",
    "app",
  );
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /微信支付绑定 AppID 与受控商店发布基线不一致/);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /wx-wrong-pay-app/);
});

test("支付或物流回调仍指向旧域名时直接阻断", async () => {
  const environment = createFullEnvironment({
    databaseHost: "postgres.internal",
    redisHost: "redis.internal",
  }).replace(
    "WECHAT_PAY_NOTIFY_URL=https://api.guoxue.test/api/v1/shop/pay/notify",
    "WECHAT_PAY_NOTIFY_URL=https://old.guoxue.test/api/v1/shop/pay/notify",
  );
  const result = await runChecker(
    environment,
    "--full",
    "--deploy-target",
    "tencent",
    "--node-role",
    "app",
  );
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /必须与 PUBLIC_API_URL 同源，禁止第三方平台继续回调旧域名/u);
});

test("完整上线拒绝多个小程序 AppID 别名互相冲突", async () => {
  const environment = `${createFullEnvironment({
    databaseHost: "postgres.internal",
    redisHost: "redis.internal",
  })}MINIPROGRAM_APP_ID=wx-another-mini-app\n`;
  const result = await runChecker(
    environment,
    "--full",
    "--deploy-target",
    "tencent",
    "--node-role",
    "app",
  );
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /微信小程序 AppID 别名配置不一致/);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /wx-another-mini-app/);
});

test("邮件未启用时允许保持全部字段为空", async () => {
  const result = await runChecker(createEnvironment(), "--deploy-target", "standard");
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test("SMTP一旦启用就必须具备完整凭据、合法端口和发件人", async () => {
  const environment = `${createEnvironment()}EMAIL_MODE=smtp\nSMTP_HOST=smtp.guoxue.test\nSMTP_PORT=70000\nSMTP_USER=mailer\nSMTP_PASS=\nEMAIL_FROM=not-an-email\n`;
  const result = await runChecker(environment, "--deploy-target", "standard");
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /SMTP 邮件配置不完整：SMTP_PASS/);
  assert.match(result.stderr, /SMTP_PORT 必须是 1-65535 的整数/);
  assert.match(result.stderr, /EMAIL_FROM 必须是合法邮箱/);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /mailer|not-an-email/);
});

test("生产SMTP禁止关闭证书校验", async () => {
  const environment = `${createEnvironment()}EMAIL_MODE=smtp\nSMTP_HOST=smtp.guoxue.test\nSMTP_PORT=465\nSMTP_USER=mailer\nSMTP_PASS=${"S".repeat(32)}\nEMAIL_FROM=国学平台 <noreply@mail.guoxue.test>\nSMTP_TLS_REJECT_UNAUTHORIZED=false\n`;
  const result = await runChecker(environment, "--deploy-target", "standard");
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /生产环境禁止 SMTP_TLS_REJECT_UNAUTHORIZED=false/);
});

test("当前SMTP客户端拒绝587等非隐式TLS端口", async () => {
  const environment = `${createEnvironment()}EMAIL_MODE=smtp\nSMTP_HOST=smtp.guoxue.test\nSMTP_PORT=587\nSMTP_USER=mailer\nSMTP_PASS=${"S".repeat(32)}\nEMAIL_FROM=国学平台 <noreply@mail.guoxue.test>\n`;
  const result = await runChecker(environment, "--deploy-target", "standard");
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /当前内置 SMTP 客户端仅支持 465 隐式 TLS/);
});

test("邮件API必须显式使用HTTPS且配置完整", async () => {
  const invalid = `${createEnvironment()}EMAIL_MODE=api\nEMAIL_API_URL=http://mail.guoxue.test/send\nEMAIL_API_KEY=\nEMAIL_FROM=noreply@mail.guoxue.test\n`;
  const rejected = await runChecker(invalid, "--deploy-target", "standard");
  assert.equal(rejected.status, 1, `${rejected.stdout}\n${rejected.stderr}`);
  assert.match(rejected.stderr, /邮件 API 配置不完整：EMAIL_API_KEY/);
  assert.match(rejected.stderr, /生产邮件 API 必须使用 HTTPS/);

  const valid = `${createEnvironment()}EMAIL_MODE=api\nEMAIL_API_URL=https://mail.guoxue.test/send\nEMAIL_API_KEY=${"K".repeat(32)}\nEMAIL_FROM=国学平台 <noreply@mail.guoxue.test>\n`;
  const accepted = await runChecker(valid, "--deploy-target", "standard");
  assert.equal(accepted.status, 0, `${accepted.stdout}\n${accepted.stderr}`);
});
