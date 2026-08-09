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
const publicContentAuditor = read("scripts/release/audit-public-content-freshness.mjs");
const publicDns = read("scripts/release/public-dns.mjs");
const publicTls = read("scripts/release/public-tls.mjs");
const evidenceAggregator = read("scripts/release/aggregate-launch-evidence.mjs");
const productionCutover = read("scripts/release/verify-production-cutover.sh");
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
      "服务存活、容器健康且运行版本一致",
      "PREVIOUS_RELEASE_ID",
      'RELEASE_ID="$rollback_release_id"',
      "已回滚并确认旧运行版本与容器健康",
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
      "return `account:${this.hashIdentity(field, normalized)}`",
      "return `ip:${ip}`",
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
  "公开推荐流内容质量纳入最终运行时门禁",
  hasAll(verifier, [
    "auditFeedItems",
    "公开推荐流内容新鲜度",
    "/api/v1/recommend/smart-feed/feed",
    "publicContentFreshness",
    "推荐流没有可展示内容",
  ]) &&
    hasAll(publicContentAuditor, [
      "ARTICLE_COVER_MISSING",
      "UPCOMING_LIVE_EXPIRED",
      "LIVE_STATUS_STALE",
    ]) &&
    hasAll(evidenceAggregator, [
      "publicContentFreshness",
      "公网推荐流为空或存在缺图、过期直播等内容新鲜度阻断项",
    ]),
  "最终切流必须阻断空推荐流、文章缺图、过期预约和长期未结束的直播状态",
);

add(
  "公网合规页面与旧域名永久跳转纳入切流验收",
  hasAll(verifier, [
    "公网协议隐私与用户救济页面",
    "user-agreement",
    "privacy-policy",
    "child-privacy",
    "delete-account",
    "旧域名永久跳转到新 H5",
    "[301, 308]",
    "legacyOriginsFingerprint",
  ]) &&
    hasAll(evidenceAggregator, [
      "公网合规、用户救济或旧域名处置人工证据无效",
      "公网协议隐私、用户救济页面或旧域名永久跳转证据无效",
    ]),
  "最终切流必须同时证明协议隐私、反馈举报和注销入口可达，并将旧生产入口以永久跳转方式导向新 H5",
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
    "公网登录注册与找回密码页面",
    "forgot-password",
    "authenticationSurfaces",
  ]) &&
    hasAll(evidenceAggregator, [
      "公网登录、注册或找回密码页面证据无效",
      "登录迁域、密码找回或会话生命周期人工证据无效",
    ]),
  "新域名最常见的 CORS、Socket.IO、鉴权边界和登录入口回归必须自动阻断，真实账号与会话闭环另由受控人工证据兜底",
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
    "/^https:\\/\\//iu.test(location)",
  ]),
  "非本地生产入口不得接受明文 URL，80 端口必须跳转 HTTPS",
);

add(
  "公网 DNS 解析与目标资源形成机器证据",
  hasAll(verifier, ["probePublicDns", "公网 DNS 解析与地址安全", "dnsEndpoints"]) &&
    hasAll(publicDns, [
      "defaultPublicDnsResolvers",
      "createPublicDnsResolver",
      "probeAuthoritativeDns",
      "resolveCname",
      "resolveSoa",
      "resolveNs",
      "resolve4",
      "resolve6",
      "cnameChain",
      "terminalHostname",
      "maximumTtlSeconds",
      "ttlSeconds",
      "isPublicAddress",
    ]) &&
    hasAll(verifier, [
      'dnsObservationMode: "system-plus-public-authority-v2"',
      "dnsObservations",
      "dnsAuthorityObservations",
      "infrastructureIntakeSha256",
      "authoritativeNameServers",
      "权威 DNS 委派与切流 TTL 收敛",
      'id: "system"',
      "defaultPublicDnsResolvers",
    ]) &&
    hasAll(productionCutover, [
      '--infrastructure-intake "$INFRASTRUCTURE_INTAKE_FILE"',
      'verify-runtime.mjs" "$ENV_FILE"',
    ]) &&
    hasAll(evidenceAggregator, [
      "公网 DNS 解析、CNAME 链或地址安全证据无效",
      "公网 DNS 多解析器一致性证据无效",
      "系统 DNS 快照与多解析器证据不一致",
      "公网 DNS TTL 或权威 NS 策略证据无效",
      "运行时 DNS 验收未绑定本次新基础设施接入清单",
      "权威 DNS 委派或多解析器一致性证据无效",
      '"system", "dnspod", "alidns"',
      "recordAddresses.every",
      "腾讯云 CLB/CDN 目标",
      "loadBalancerVips",
      "cdnCname",
    ]),
  "最终上线必须证明所有公网端点解析到安全公网地址、三路解析器看到相同双 NS 委派且 TTL 已收敛，并把报告绑定本次接入清单与 CLB/CDN，不能误验旧环境",
);

add(
  "公网证书链、域名匹配与剩余有效期形成机器证据",
  hasAll(verifier, [
    "PUBLIC_ASSET_ORIGIN",
    "probePublicTls",
    "公网 TLS 证书链、域名与有效期",
    "tlsCertificates",
  ]) &&
    hasAll(publicTls, [
      "tls.connect",
      "rejectUnauthorized: true",
      "servername: url.hostname",
      "getPeerCertificate(true)",
      "minimumRemainingDays",
      "fingerprintSha256",
    ]) &&
    hasAll(evidenceAggregator, [
      "tlsCertificates",
      "item.daysRemaining < 14",
      "公网 TLS 证书链、域名、有效期或指纹证据无效",
    ]),
  "最终上线必须直接握手新域名，验证系统信任链、域名、至少 14 天剩余有效期和 SHA-256 指纹，不能仅依赖人工勾选",
);

add(
  "运行时验收可生成脱敏证据",
  hasAll(verifier, ["--report", "generatedAt", "environmentFile", "JSON.stringify(report"]),
  "每次切流需保留不含密钥的机器可读报告供复盘",
);

add(
  "运行时命令已进入发布工具与迁移手册",
  packageJson.includes('"release:verify:runtime": "node scripts/release/verify-runtime.mjs"') &&
    runbook.includes("pnpm release:verify:runtime /opt/guoxue/shared/.env.production") &&
    runbook.includes("--infrastructure-intake /opt/guoxue/shared/infrastructure-intake.json") &&
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
