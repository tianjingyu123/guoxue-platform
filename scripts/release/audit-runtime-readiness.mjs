#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const hasAll = (source, snippets) => snippets.every((snippet) => source.includes(snippet));
const checks = [];
const add = (name, pass, detail) => checks.push({ name, pass, detail });

const healthService = read("apps/server/src/modules/health/health.service.ts");
const healthSpec = read("apps/server/src/modules/health/health.service.spec.ts");
const verifier = read("scripts/release/verify-runtime.mjs");
const packageJson = read("package.json");
const runbook = read("docs/operations/服务器数据库域名迁移手册-20260728.md");
const compose = read("docker/docker-compose.yml");
const deploy = read("docker/deploy.sh");
const setupServer = read("docker/setup-server.sh");
const currentCompose = read("scripts/release/current-compose.sh");
const activation = read("scripts/release/activate-fixed-release.sh");
const rollback = read("scripts/release/rollback-fixed-release.sh");
const clientConfigBindingVerifier = read("scripts/release/verify-client-config-binding.mjs");
const serverMain = read("apps/server/src/main.ts");
const redisThrottleGuard = read("apps/server/src/common/redis-throttle.guard.ts");
const throttleSpec = read("apps/server/src/common/throttle.guard.spec.ts");
const nginxClb = read("docker/nginx/nginx.clb.conf.template");

add(
  "运行时实例绑定固定发布标识",
  hasAll(healthService, [
    "releaseId: string",
    "liveness(): { status: string; uptime: number; releaseId: string }",
    "process.env.RELEASE_ID",
    '"unversioned"',
  ]) &&
    hasAll(compose, ["RELEASE_ID: ${RELEASE_ID:-unversioned}"]) &&
    hasAll(deploy, [
      "RUNTIME_RELEASE_ID",
      '[ "$RUNTIME_RELEASE_ID" = "$RELEASE_ID" ]',
      "服务存活且运行版本一致",
      "PREVIOUS_RELEASE_ID",
      'RELEASE_ID="$rollback_release_id"',
      "已回滚并确认旧运行版本",
    ]) &&
    hasAll(setupServer, [
      'RELEASE_ID="$(bash "$SOURCE_DIR/scripts/release/validate-release-layout.sh"',
      "export RELEASE_ID",
      "SETUP_RUNTIME_RELEASE_ID",
      '[ "$SETUP_RUNTIME_RELEASE_ID" = "$RELEASE_ID" ]',
      "服务已就绪且运行版本一致",
    ]) &&
    hasAll(currentCompose, [
      'CURRENT_DIR=$(readlink -f "$RUNTIME_DIR"',
      "RELEASE_ID=$(tr -d",
      "export COMPOSE_PROJECT_NAME RELEASE_ID",
    ]) &&
    hasAll(activation, ['RELEASE_ID="$RELEASE_ID"']) &&
    hasAll(rollback, ['RELEASE_ID="$TARGET_RELEASE_ID"']) &&
    hasAll(verifier, [
      "--expected-release-id",
      "observedReleaseId",
      'observedReleaseId !== "unversioned"',
      "observedReleaseId === expectedReleaseId",
    ]) &&
    healthSpec.includes('expect(result.releaseId).toBe("release-unit-test")') &&
    healthSpec.includes('expect(result.releaseId).toBe("release-liveness-test")'),
  "正式激活、首次初始化、自动回滚、容器、轻量存活、部署等待和公网验收必须使用同一个发布标识，拒绝旧版本健康但误判为新版本",
);

add(
  "服务器实际客户端构建配置绑定 CI 审计输入",
  hasAll(activation, [
    "verify-client-config-binding.mjs",
    "client-config-binding-verification.json",
    '"$SHARED_ENV_FILE"',
    'bash "$FINAL_DIR/docker/deploy.sh"',
  ]) &&
    activation.indexOf("verify-client-config-binding.mjs") <
      activation.indexOf('bash "$FINAL_DIR/docker/deploy.sh"') &&
    hasAll(clientConfigBindingVerifier, [
      "VITE_API_URL",
      "VITE_PUBLIC_H5_URL",
      "VITE_PUBLIC_ASSET_ORIGIN",
      "与 CI 审计配置不一致",
    ]),
  "服务器必须在镜像构建前证明共享生产环境与已经审计的五端客户端配置完全一致",
);

add(
  "就绪探针同时依赖 PostgreSQL 与 Redis",
  healthService.includes('status: dbOk && redisOk ? "ready" : "not_ready"') &&
    healthSpec.includes('it("Redis 异常时返回 not_ready"'),
  "禁止 Redis 故障时编排器继续向应用实例分发流量",
);

add(
  "CLB 真实客户端 IP 与共享 NAT 分层限流",
  hasAll(serverMain, ['app.set("trust proxy", 1)']) &&
    hasAll(nginxClb, [
      "set_real_ip_from 100.64.0.0/10",
      "real_ip_header X-Forwarded-For",
      "proxy_set_header X-Forwarded-For $remote_addr",
    ]) &&
    hasAll(redisThrottleGuard, [
      "private readonly limit: number = 1200",
      "private readonly subjectAware: boolean = false",
      'return `user:${this.hashIdentity("user", userId)}`',
      'return `account:${this.hashIdentity(field, normalized)}`',
      'return `ip:${ip}`',
      'super(redis, 10, 60, "rate:strict", true)',
    ]) &&
    hasAll(throttleSpec, [
      "共享同一公网 IP 的不同登录用户独立计数",
      "同一登录用户更换出口 IP 后仍共用严格额度",
      "Redis key 不包含手机号",
    ]),
  "匿名流量保留 IP 防刷，登录用户与认证账号使用脱敏独立额度，避免移动运营商和企业 NAT 下用户互相误伤",
);

add(
  "运行时门禁覆盖三层健康状态",
  hasAll(verifier, [
    "/api/v1/health/live",
    "/api/v1/health/ready",
    "/api/v1/health",
    "unwrapPayload",
    'data.db === "ok" && data.redis === "ok"',
  ]),
  "存活、核心依赖就绪与完整第三方依赖必须分别验收",
);

add(
  "运行时门禁覆盖用户与管理入口",
  hasAll(verifier, ["PUBLIC_H5_URL", 'new URL("/admin/"', "H5 入口与安全头", "管理后台入口"]),
  "H5 和管理后台均需真实返回 HTML，不能只验证 API",
);

add(
  "安全头与缓存策略纳入切流验收",
  hasAll(verifier, [
    "strict-transport-security",
    "x-content-type-options",
    "referrer-policy",
    'cacheControl.includes("public")',
    'cacheControl.includes("immutable")',
    'includes("no-cache")',
  ]),
  "入口 HTML 必须及时更新，带哈希资源长期缓存，HTTPS 页面必须具备浏览器安全头",
);

add(
  "跨域、实时连接和鉴权边界纳入切流验收",
  hasAll(verifier, [
    "access-control-allow-origin",
    "同源访问无需 CORS 响应头",
    "/socket.io/?EIO=4&transport=polling",
    "/api/v1/auth/me",
    "response.status === 401",
  ]),
  "新域名最常见的 CORS、Socket.IO 和鉴权回归必须自动阻断",
);

add(
  "监控与降级能力可从公网入口验证",
  hasAll(verifier, ["/api/v1/metrics", 'body.includes("# HELP")', "/api/v1/health/degrade"]),
  "指标格式和客户端降级状态必须在切流后可用",
);

add(
  "生产传输强制 HTTPS",
  hasAll(verifier, [
    "HTTP 强制跳转 HTTPS",
    "[301, 302, 307, 308]",
    'location.startsWith("https://")',
  ]),
  "非本地生产入口不得接受明文 URL，80 端口必须跳转 HTTPS",
);

add(
  "运行时验收可生成脱敏证据",
  hasAll(verifier, ["--report", "generatedAt", "environmentFile", "JSON.stringify(report"]),
  "每次切流需保留不含密钥的机器可读报告供复盘",
);

add(
  "运行时命令已进入发布工具与迁移手册",
  packageJson.includes('"release:verify:runtime": "node scripts/release/verify-runtime.mjs"') &&
    runbook.includes("pnpm release:verify:runtime docker/.env.production") &&
    runbook.includes("正常生产切流不得使用 `--allow-degraded`"),
  "值班人员必须能从统一命令执行，并明确预览降级不能冒充上线通过",
);

console.log("运行时上线门禁审计");
for (const item of checks) {
  console.log(`${item.pass ? "PASS" : "FAIL"} ${item.name}：${item.detail}`);
}

const failed = checks.filter((item) => !item.pass);
console.log(`\n结果：${checks.length - failed.length}/${checks.length} 通过`);
if (failed.length > 0) process.exitCode = 1;
