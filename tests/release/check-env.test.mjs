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
    "WECHAT_PAY_MCH_ID=1900000109",
    `WECHAT_PAY_SERIAL_NO=${"A".repeat(40)}`,
    `WECHAT_PAY_API_V3_KEY=${"V".repeat(32)}`,
    "WECHAT_PAY_NOTIFY_URL=https://api.guoxue.test/api/v1/shop/pay/notify",
    "MONITORING_ENABLED=true",
    `GF_ADMIN_PASSWORD=${"G".repeat(32)}`,
    "WEWORK_CORP_ID=ww1234567890abcdef",
    "WEWORK_AGENT_ID=1000006",
    `WEWORK_AGENT_SECRET=${"W".repeat(48)}`,
    "DBA_WEWORK_USER_IDS=OpsUserA|OpsUserB",
    "",
  ].join("\n");
}

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
