import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  parseQaRedisTarget,
  validateRedisServer,
} = require("../../apps/server/scripts/qa-redis-smoke.cjs");
const { validateTarget, specs } = require("../../apps/server/scripts/qa-isolated-roles.cjs");

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const compose = read("docker/docker-compose.test.yml");

test("验收数据库与正式编排锁定同一 pgvector 镜像", () => {
  const production = read("docker/docker-compose.yml");
  const vectorImage = production.match(/image: (pgvector\/pgvector:pg16@sha256:[a-f0-9]{64})/)[1];
  assert.ok(compose.includes(`image: ${vectorImage}`));
  assert.match(compose, /image: redis:7-alpine@sha256:[a-f0-9]{64}/);
  assert.match(compose, /"--maxmemory-policy", "noeviction"/);
});

test("验收只监听本机独立端口，容器名由 Compose 项目隔离", () => {
  assert.match(compose, /127\.0\.0\.1:\$\{TEST_POSTGRES_PORT:-55433\}:5432/);
  assert.match(compose, /127\.0\.0\.1:\$\{TEST_REDIS_PORT:-56380\}:6379/);
  assert.doesNotMatch(compose, /container_name:/);
  assert.match(compose, /POSTGRES_DB: guoxue_test/);
  assert.match(compose, /DATABASE_URL: postgresql:\/\/guoxue:guoxue123@postgres:5432\/guoxue_test/);
  assert.doesNotMatch(compose, /env_file:|\.env\.production|host\.docker\.internal/);
});

test("迁移失败会终止测试，Prisma 与 Jest 从服务端工作区解析", () => {
  assert.ok(compose.includes('echo "[test] 数据库未就绪, 等待中... ($$i/30)"'));
  assert.ok(!compose.includes('echo \\"[test]'), "YAML 块中的 Shell 引号不能额外转义");
  assert.match(compose, /- \/bin\/sh\s+- -ec/);
  assert.match(
    compose,
    /CONFIRM_EMPTY_DATABASE=YES sh prisma\/migrations-deploy\/bootstrap-empty-database\.sh/,
  );
  assert.match(compose, /pnpm --dir apps\/server exec prisma generate/);
  assert.match(compose, /pnpm --dir apps\/server exec jest --config jest\.config\.ts/);
  assert.ok(
    compose.indexOf("exec prisma generate") < compose.indexOf("CONFIRM_EMPTY_DATABASE=YES"),
  );
  assert.doesNotMatch(compose, /migrate reset|db push|TRUNCATE|DROP DATABASE/);
});

test("共享服务器验收运行时断开外网并限制资源", () => {
  const resources = read("docker/docker-compose.qa-resources.yml");
  assert.match(resources, /networks:\s+default:\s+(?:#[^\n]*\n\s*)?internal: true/);
  assert.match(resources, /mem_limit: 6g/);
  assert.match(resources, /NODE_OPTIONS: --max-old-space-size=5120/);
  assert.doesNotMatch(resources, /network_mode: host|privileged: true|docker\.sock|env_file:/);
});

test("QA 回归必须自然退出，不用强制退出掩盖句柄泄漏", () => {
  assert.doesNotMatch(compose, /--forceExit|--openHandlesTimeout[= ]0/);
  const manifest = JSON.parse(read("package.json"));
  assert.doesNotMatch(manifest.scripts["test:e2e"], /--forceExit/);
});

test("隔离账号脚本严格拒绝非测试环境、业务库和副本数据库", () => {
  const env = {
    NODE_ENV: "test",
    QA_ISOLATED_CONFIRM: "guoxue-admin-qa-20260902",
    DATABASE_URL: "postgresql://guoxue:guoxue123@postgres:5432/guoxue_test",
    REDIS_URL: "redis://redis:6379",
    ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef",
  };
  assert.doesNotThrow(() => validateTarget(env));
  for (const override of [
    { NODE_ENV: "production" },
    { QA_ISOLATED_CONFIRM: "" },
    { DATABASE_URL: "postgresql://guoxue:guoxue123@postgres:5432/guoxue" },
    { DATABASE_URL: "postgresql://guoxue:guoxue123@localhost:5432/guoxue_test" },
    { REDIS_URL: "redis://localhost:6379" },
    { DATABASE_REPLICA_URL: "postgresql://business/database" },
    { ENCRYPTION_KEY: "short" },
  ])
    assert.throws(() => validateTarget({ ...env, ...override }));
  assert.equal(specs.length, 15);
  assert.equal(new Set(specs.map((spec) => spec.phone)).size, 15);
  const script = read("apps/server/scripts/qa-isolated-roles.cjs");
  assert.doesNotMatch(script, /dotenv|deleteMany|\.flushdb\(|\.flushall\(|DISABLE_RATE_LIMIT/);
  assert.match(script, /mode: 0o600/);
  assert.match(script, /非本批 QA 用户/);
});

test("QA 应用不发布公网端口，不读取生产配置，并同时监控两个进程", () => {
  const app = read("docker/docker-compose.qa-app.yml");
  const entry = read("docker/qa/start-app.sh");
  assert.doesNotMatch(app, /ports:|env_file:|network_mode:|privileged:|docker\.sock/);
  assert.match(app, /NODE_ENV: test/);
  assert.match(app, /EMAIL_MODE: disabled/);
  assert.match(entry, /lint --max-warnings 0/);
  assert.match(entry, /wait -n "\$api_pid" "\$preview_pid"/);
  assert.match(entry, /trap cleanup EXIT/);
});

test("测试镜像具备 psql、原生构建工具与共享包产物", () => {
  const dockerfile = read("docker/Dockerfile.test");
  assert.match(dockerfile, /apk add --no-cache postgresql-client openssl python3 make g\+\+/);
  assert.match(dockerfile, /pnpm --filter @guoxue\/shared build/);
  assert.match(dockerfile, /pnpm --dir apps\/server exec prisma generate/);
  for (const app of ["admin", "mobile", "server"]) {
    assert.ok(
      dockerfile.indexOf(`COPY apps/${app}/package.json`) <
        dockerfile.indexOf("pnpm install --frozen-lockfile"),
    );
  }
});

test("验收密钥完整且独立于生产凭据", () => {
  const encryptionKey = compose.match(/ENCRYPTION_KEY: "([^"]+)"/)[1];
  assert.equal(Buffer.byteLength(encryptionKey), 32);
  assert.match(compose, /BIGSCREEN_SECRET: e2e-test-only-bigscreen-never-production/);
  assert.match(compose, /NODE_ENV: test/);
});

test("镜像上下文排除数据库备份、账号临时脚本和其他工作树", () => {
  const ignored = read(".dockerignore").split(/\r?\n/);
  for (const entry of [".codex-tmp", ".worktrees", ".device-audit", "*.dump", ".env", ".env.*"]) {
    assert.ok(ignored.includes(entry), `缺少构建上下文排除项：${entry}`);
  }
});

const qaEnv = {
  NODE_ENV: "test",
  QA_REDIS_CONFIRM: "ISOLATED_TEST_REDIS",
  QA_REDIS_URL: "redis://redis:6379/15",
};

test("真实队列只连接显式确认的隔离容器或独立本机端口", () => {
  assert.deepEqual(parseQaRedisTarget(qaEnv), { host: "redis", port: 6379, db: 15 });
  assert.deepEqual(parseQaRedisTarget({ ...qaEnv, QA_REDIS_URL: "redis://127.0.0.1:56380/15" }), {
    host: "127.0.0.1",
    port: 56380,
    db: 15,
  });
  assert.throws(() => parseQaRedisTarget({ ...qaEnv, NODE_ENV: "production" }), /拒绝执行/);
  assert.throws(() => parseQaRedisTarget({ ...qaEnv, QA_REDIS_CONFIRM: "" }), /拒绝执行/);
  assert.throws(
    () =>
      parseQaRedisTarget({
        ...qaEnv,
        QA_REDIS_URL: undefined,
        REDIS_URL: "redis://localhost:6379",
      }),
    /不会回退/,
  );
});

test("队列验收拒绝业务 Redis、远程地址、其他库及带凭据地址", () => {
  for (const url of [
    "redis://localhost:6379/15",
    "redis://redis:6379/0",
    "redis://db.example.com:6379/15",
    "redis://user:private@redis:6379/15",
    "redis://redis:6379/15?db=0",
    "redis://redis:6379/15#unsafe",
    "https://redis:6379/15",
  ]) {
    assert.throws(() => parseQaRedisTarget({ ...qaEnv, QA_REDIS_URL: url }), /拒绝连接/);
  }
});

test("队列检查必须发现 Redis 版本或淘汰策略错误", () => {
  assert.equal(validateRedisServer("# Server\r\nredis_version:7.4.0\r\n", "noeviction"), "7.4.0");
  assert.throws(() => validateRedisServer("redis_version:3.0.504\r\n", "noeviction"), /Redis 7/);
  assert.throws(() => validateRedisServer("redis_version:7.4.0\r\n", "allkeys-lru"), /noeviction/);
});

test("真实队列检查独立于关闭 BullMQ 的 Jest 环境", () => {
  assert.match(compose, /QA_REDIS_URL: redis:\/\/redis:6379\/15/);
  assert.match(compose, /QA_REDIS_CONFIRM: ISOLATED_TEST_REDIS/);
  assert.ok(
    compose.indexOf("node apps/server/scripts/qa-redis-smoke.cjs") < compose.indexOf("exec jest"),
  );
  const smoke = read("apps/server/scripts/qa-redis-smoke.cjs");
  assert.match(smoke, /admin-qa-\$\{randomUUID\(\)\}/);
  assert.match(smoke, /obliterate\(\{ force: false \}\)/);
  assert.match(smoke, /retried\.attemptsMade, 2/);
  assert.doesNotMatch(smoke, /\.flushdb\(|\.flushall\(|dotenv|process\.env\.REDIS_URL/i);
});

test("独立 Linux 工作流只能手动运行测试，不访问部署凭据或现有服务", () => {
  const workflow = read(".github/workflows/admin-qa.yml");
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /runs-on: ubuntu-24\.04/);
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /persist-credentials: false/);
  assert.doesNotMatch(
    workflow,
    /secrets\.|environment:|packages: write|ssh-action|scp-action|git push|workflow_run:|pull_request_target:/,
  );
  assert.match(workflow, /lint --max-warnings 0/);
  assert.match(workflow, /pnpm --dir apps\/admin build/);
  for (const command of workflow.split(/\r?\n/).filter((line) => /docker compose/.test(line))) {
    assert.ok(command.includes('-p "$COMPOSE_PROJECT_NAME"'), "容器操作必须限定本次独立项目");
  }
  assert.match(workflow, /\^guoxue-admin-qa-\[0-9\]\+-\[0-9\]\+\$/);
  assert.doesNotMatch(workflow, /docker system prune|docker volume prune|docker container prune/);
});
