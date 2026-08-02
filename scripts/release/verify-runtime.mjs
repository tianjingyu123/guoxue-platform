#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  createPublicDnsResolver,
  defaultPublicDnsResolvers,
  probeAuthoritativeDns,
  probePublicDns,
} from "./public-dns.mjs";
import { probePublicTls } from "./public-tls.mjs";

const args = process.argv.slice(2);
const reportFlag = args.indexOf("--report");
const reportFile =
  reportFlag >= 0 && args[reportFlag + 1] ? path.resolve(args[reportFlag + 1]) : null;
const expectedReleaseFlag = args.indexOf("--expected-release-id");
const expectedReleaseId =
  expectedReleaseFlag >= 0 && args[expectedReleaseFlag + 1]
    ? args[expectedReleaseFlag + 1].trim()
    : null;
const infrastructureIntakeFlag = args.indexOf("--infrastructure-intake");
const infrastructureIntakeFile =
  infrastructureIntakeFlag >= 0 && args[infrastructureIntakeFlag + 1]
    ? path.resolve(args[infrastructureIntakeFlag + 1])
    : null;
if (expectedReleaseFlag >= 0 && !expectedReleaseId) {
  console.error("运行时验收失败：--expected-release-id 后必须提供发布标识");
  process.exit(2);
}
if (expectedReleaseId && !/^[A-Za-z0-9._-]{8,80}$/u.test(expectedReleaseId)) {
  console.error("运行时验收失败：发布标识格式无效");
  process.exit(2);
}
const allowDegraded = args.includes("--allow-degraded");
const positionalArgs = args.filter((arg, index) => {
  if (arg.startsWith("--")) return false;
  return (
    (reportFlag < 0 || index !== reportFlag + 1) &&
    (expectedReleaseFlag < 0 || index !== expectedReleaseFlag + 1) &&
    (infrastructureIntakeFlag < 0 || index !== infrastructureIntakeFlag + 1)
  );
});
const envFile = path.resolve(positionalArgs[0] || "docker/.env.production");

function parseEnv(source) {
  const env = {};
  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const normalized = line.startsWith("export ") ? line.slice(7).trim() : line;
    const separator = normalized.indexOf("=");
    if (separator <= 0) continue;
    const key = normalized.slice(0, separator).trim();
    let value = normalized.slice(separator + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function requireUrl(value, name) {
  if (!value) throw new Error(`${name} 未配置`);
  const url = new URL(value);
  const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (!local && url.protocol !== "https:") {
    throw new Error(`${name} 必须使用 HTTPS：${url.origin}`);
  }
  return url;
}

if (!fs.existsSync(envFile)) {
  console.error(`运行时验收失败：环境文件不存在：${envFile}`);
  process.exit(2);
}

const env = parseEnv(fs.readFileSync(envFile, "utf8"));
let apiUrl;
let h5Url;
let assetUrl;
try {
  apiUrl = requireUrl(env.PUBLIC_API_URL, "PUBLIC_API_URL");
  h5Url = requireUrl(env.PUBLIC_H5_URL, "PUBLIC_H5_URL");
  assetUrl = requireUrl(env.PUBLIC_ASSET_ORIGIN, "PUBLIC_ASSET_ORIGIN");
} catch (error) {
  console.error(`运行时验收失败：${error.message}`);
  process.exit(2);
}

const apiBase = apiUrl.href.replace(/\/$/u, "");
const h5Href = h5Url.href.endsWith("/") ? h5Url.href : `${h5Url.href}/`;
const adminHref = new URL("/admin/", apiUrl.origin).href;
const expectedOrigin = h5Url.origin;
const results = [];
let observedReleaseId = null;
let dnsEndpoints = [];
let dnsObservations = [];
let dnsAuthorityObservations = [];
let tlsCertificates = [];
const uniquePublicHostnames = [...new Set(
  [apiUrl, h5Url, new URL(adminHref), assetUrl].map((url) => url.hostname),
)];
const dnsResolvers = [
  { id: "system", resolver: undefined },
  ...defaultPublicDnsResolvers.map((item) => ({
    id: item.id,
    resolver: createPublicDnsResolver(item.servers),
  })),
];

async function request(url, options = {}) {
  const startedAt = Date.now();
  const response = await fetch(url, {
    redirect: options.redirect || "follow",
    headers: options.headers,
    signal: AbortSignal.timeout(options.timeoutMs || 15_000),
  });
  const body = await response.text();
  return { response, body, latencyMs: Date.now() - startedAt };
}

async function check(name, run) {
  try {
    const detail = await run();
    results.push({ name, status: "PASS", detail });
    console.log(`PASS ${name}：${detail}`);
  } catch (error) {
    results.push({ name, status: "FAIL", detail: error.message });
    console.error(`FAIL ${name}：${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseJson(body, label) {
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`${label} 未返回合法 JSON`);
  }
}

function unwrapPayload(payload) {
  if (payload && typeof payload === "object" && payload.data && typeof payload.data === "object") {
    return payload.data;
  }
  return payload;
}
if (!infrastructureIntakeFile || !fs.existsSync(infrastructureIntakeFile)) {
  console.error(
    "运行时验收失败：必须通过 --infrastructure-intake 提供实际新基础设施接入清单",
  );
  process.exit(2);
}

let infrastructureIntakeRaw;
let infrastructureIntake;
try {
  infrastructureIntakeRaw = fs.readFileSync(infrastructureIntakeFile, "utf8");
  infrastructureIntake = JSON.parse(infrastructureIntakeRaw);
} catch (error) {
  console.error(`运行时验收失败：无法读取新基础设施接入清单：${error.message}`);
  process.exit(2);
}
const plannedDnsTtlSeconds = Number(infrastructureIntake?.domains?.ttlSeconds);
const authoritativeNameServers = [...new Set(
  (Array.isArray(infrastructureIntake?.domains?.authoritativeNameServers)
    ? infrastructureIntake.domains.authoritativeNameServers
    : [])
    .map((value) => String(value || "").trim().toLowerCase().replace(/\.$/u, ""))
    .filter(Boolean),
)].sort();
if (
  !Number.isInteger(plannedDnsTtlSeconds) ||
  plannedDnsTtlSeconds < 60 ||
  plannedDnsTtlSeconds > 600 ||
  authoritativeNameServers.length < 2
) {
  console.error("运行时验收失败：接入清单缺少有效的 60-600 秒 TTL 或双权威 NS");
  process.exit(2);
}
const infrastructureIntakeSha256 = createHash("sha256")
  .update(infrastructureIntakeRaw)
  .digest("hex");
const publicCompliance = infrastructureIntake?.migration?.publicCompliance || {};
const legacyOriginMode = String(publicCompliance.legacyOriginMode || "").trim().toLowerCase();
const legacyOrigins = [
  ...new Set(
    (Array.isArray(publicCompliance.legacyOrigins) ? publicCompliance.legacyOrigins : [])
      .map((value) => {
        try {
          return new URL(String(value || "").trim()).origin;
        } catch {
          return "";
        }
      })
      .filter(Boolean),
  ),
].sort();
const publicComplianceRoutes = [
  { id: "user-agreement", path: "pkg-settings/user-agreement/index" },
  { id: "privacy-policy", path: "pkg-settings/privacy-policy/index" },
  { id: "child-privacy", path: "pkg-settings/child-privacy/index" },
  { id: "feedback", path: "pkg-mine/feedback/index" },
  { id: "report", path: "pkg-report/index/index" },
  { id: "delete-account", path: "pkg-mine/delete-account/index" },
];
const authenticationSurfaceRoutes = [
  { id: "login", path: "pkg-auth/login/index" },
  { id: "register", path: "pkg-auth/register/index" },
  { id: "forgot-password", path: "pkg-auth/forgot-password/index" },
];
let publicComplianceObservations = [];
let authenticationSurfaceObservations = [];
let legacyRedirectObservations = [];

await check("公网 DNS 解析与地址安全", async () => {
  dnsObservations = await Promise.all(
    dnsResolvers.map(async ({ id, resolver }) => {
      try {
        return {
          resolver: id,
          endpoints: await Promise.all(
            uniquePublicHostnames.map((hostname) =>
              probePublicDns(hostname, {
                resolver,
                maximumTtlSeconds: plannedDnsTtlSeconds,
              }),
            ),
          ),
        };
      } catch (error) {
        throw new Error(`${id} 解析器验收失败：${error.message}`);
      }
    }),
  );
  dnsEndpoints = dnsObservations.find((item) => item.resolver === "system")?.endpoints || [];
  return `${dnsObservations.length} 路独立解析器均覆盖 ${dnsEndpoints.length} 个唯一域名并返回安全公网地址`;
});

await check("权威 DNS 委派与切流 TTL 收敛", async () => {
  dnsAuthorityObservations = await Promise.all(
    dnsResolvers.map(async ({ id, resolver }) => {
      try {
        return {
          resolver: id,
          endpoints: await Promise.all(
            uniquePublicHostnames.map((hostname) =>
              probeAuthoritativeDns(hostname, {
                resolver,
                expectedNameServers: authoritativeNameServers,
              }),
            ),
          ),
        };
      } catch (error) {
        throw new Error(`${id} 权威 DNS 验收失败：${error.message}`);
      }
    }),
  );
  return `${dnsAuthorityObservations.length} 路解析器均确认双 NS 委派，A/AAAA TTL 不高于 ${plannedDnsTtlSeconds}s`;
});

await check("公网 TLS 证书链、域名与有效期", async () => {
  const origins = [apiUrl, h5Url, new URL(adminHref), assetUrl]
    .filter((url) => url.protocol === "https:")
    .map((url) => url.origin);
  const uniqueOrigins = [...new Set(origins)];
  tlsCertificates = await Promise.all(
    uniqueOrigins.map((origin) => probePublicTls(origin, { minimumRemainingDays: 14 })),
  );
  const minimumDays = Math.min(...tlsCertificates.map((item) => item.daysRemaining));
  return `${tlsCertificates.length} 个公网入口证书链可信、域名匹配，最短剩余 ${minimumDays} 天`;
});

await check("API 存活探针", async () => {
  const { response, body, latencyMs } = await request(`${apiBase}/api/v1/health/live`);
  assert(response.ok, `HTTP ${response.status}`);
  const data = unwrapPayload(parseJson(body, "存活探针"));
  assert(data.status === "alive", `状态为 ${String(data.status)}`);
  return `alive，${latencyMs}ms`;
});

await check("数据库与 Redis 就绪探针", async () => {
  const { response, body, latencyMs } = await request(`${apiBase}/api/v1/health/ready`);
  assert(response.ok, `HTTP ${response.status}`);
  const data = unwrapPayload(parseJson(body, "就绪探针"));
  assert(data.status === "ready", `状态为 ${String(data.status)}`);
  assert(data.db === "ok" && data.redis === "ok", `db=${data.db} redis=${data.redis}`);
  return `ready，${latencyMs}ms`;
});

await check("完整依赖健康报告", async () => {
  const { response, body, latencyMs } = await request(`${apiBase}/api/v1/health`);
  assert(response.ok, `HTTP ${response.status}`);
  const data = unwrapPayload(parseJson(body, "完整健康报告"));
  const accepted = allowDegraded ? ["ok", "degraded"] : ["ok"];
  assert(accepted.includes(data.status), `状态为 ${String(data.status)}`);
  assert(data.checks?.db?.status === "ok", "数据库检查未通过");
  assert(data.checks?.redis?.status === "ok", "Redis 检查未通过");
  observedReleaseId = String(data.releaseId || "").trim();
  assert(observedReleaseId && observedReleaseId !== "unversioned", "运行实例未暴露固定发布标识");
  if (expectedReleaseId) {
    assert(
      observedReleaseId === expectedReleaseId,
      `发布标识不一致：期望 ${expectedReleaseId}，实际 ${observedReleaseId}`,
    );
  }
  return `${data.status}，${Object.keys(data.checks || {}).length} 项依赖，${latencyMs}ms`;
});

await check("Prometheus 指标端点", async () => {
  const { response, body, latencyMs } = await request(`${apiBase}/api/v1/metrics`);
  assert(response.ok, `HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  assert(contentType.includes("text/plain"), `Content-Type=${contentType || "缺失"}`);
  assert(body.includes("# HELP") && body.includes("# TYPE"), "缺少 Prometheus 指标元数据");
  return `指标格式有效，${latencyMs}ms`;
});

let h5Html = "";
await check("H5 入口与安全头", async () => {
  const { response, body, latencyMs } = await request(h5Href);
  assert(response.ok, `HTTP ${response.status}`);
  h5Html = body;
  assert((response.headers.get("content-type") || "").includes("text/html"), "未返回 HTML");
  assert((response.headers.get("cache-control") || "").includes("no-cache"), "入口未禁用缓存");
  assert(response.headers.get("x-content-type-options") === "nosniff", "缺少 nosniff");
  assert(Boolean(response.headers.get("referrer-policy")), "缺少 Referrer-Policy");
  if (h5Url.protocol === "https:") {
    assert(Boolean(response.headers.get("strict-transport-security")), "缺少 HSTS");
  }
  return `HTML 与安全头有效，${latencyMs}ms`;
});

await check("公网协议隐私与用户救济页面", async () => {
  publicComplianceObservations = await Promise.all(
    publicComplianceRoutes.map(async (route) => {
      const target = new URL(route.path, h5Href);
      target.searchParams.set("runtime_probe", expectedReleaseId || "cutover");
      const { response, body, latencyMs } = await request(target.href);
      assert(response.ok, `${route.id} 返回 HTTP ${response.status}`);
      assert(
        (response.headers.get("content-type") || "").includes("text/html"),
        `${route.id} 未返回 HTML`,
      );
      assert(body.includes('id="app"') || body.includes("<uni-app"), `${route.id} 缺少应用入口`);
      const finalUrl = new URL(response.url);
      assert(finalUrl.origin === h5Url.origin, `${route.id} 被重定向到非正式 H5 来源`);
      assert(
        finalUrl.pathname === target.pathname,
        `${route.id} 被重定向到其他页面 ${finalUrl.pathname}`,
      );
      return { id: route.id, status: response.status, latencyMs };
    }),
  );
  return `${publicComplianceObservations.length} 个协议、隐私、反馈、举报与注销入口均可达`;
});

await check("公网登录注册与找回密码页面", async () => {
  authenticationSurfaceObservations = await Promise.all(
    authenticationSurfaceRoutes.map(async (route) => {
      const target = new URL(route.path, h5Href);
      target.searchParams.set("runtime_probe", expectedReleaseId || "cutover");
      const { response, body, latencyMs } = await request(target.href);
      assert(response.ok, `${route.id} 返回 HTTP ${response.status}`);
      assert(
        (response.headers.get("content-type") || "").includes("text/html"),
        `${route.id} 未返回 HTML`,
      );
      assert(body.includes('id="app"') || body.includes("<uni-app"), `${route.id} 缺少应用入口`);
      const finalUrl = new URL(response.url);
      assert(finalUrl.origin === h5Url.origin, `${route.id} 被重定向到非正式 H5 来源`);
      assert(
        finalUrl.pathname === target.pathname,
        `${route.id} 被重定向到其他页面 ${finalUrl.pathname}`,
      );
      return { id: route.id, status: response.status, latencyMs };
    }),
  );
  return `${authenticationSurfaceObservations.length} 个登录、注册与找回密码入口均可达`;
});

await check("旧域名永久跳转到新 H5", async () => {
  if (legacyOrigins.length === 0) {
    assert(legacyOriginMode === "none", `legacyOriginMode=${legacyOriginMode || "缺失"}`);
    legacyRedirectObservations = [];
    return "未登记旧生产域名，无需跳转";
  }
  assert(legacyOriginMode === "redirect", `legacyOriginMode=${legacyOriginMode || "缺失"}`);
  legacyRedirectObservations = await Promise.all(
    legacyOrigins.map(async (origin) => {
      const oldEntry = new URL(h5Url.pathname, `${origin}/`);
      const { response, latencyMs } = await request(oldEntry.href, { redirect: "manual" });
      assert([301, 308].includes(response.status), `旧入口返回 HTTP ${response.status}`);
      const location = response.headers.get("location") || "";
      const redirected = new URL(location, oldEntry);
      assert(redirected.origin === h5Url.origin, "旧入口未跳转到新 H5 origin");
      assert(
        redirected.pathname.startsWith(h5Url.pathname),
        `旧入口跳转路径错误 ${redirected.pathname}`,
      );
      return { status: response.status, latencyMs };
    }),
  );
  return `${legacyRedirectObservations.length} 个旧生产入口均以 301/308 永久跳转到新 H5`;
});

await check("管理后台入口", async () => {
  const { response, latencyMs } = await request(adminHref);
  assert(response.ok, `HTTP ${response.status}`);
  assert((response.headers.get("content-type") || "").includes("text/html"), "未返回 HTML");
  assert((response.headers.get("cache-control") || "").includes("no-cache"), "入口未禁用缓存");
  return `后台可达且入口不缓存，${latencyMs}ms`;
});

await check("静态资源长期缓存", async () => {
  const match = h5Html.match(/(?:src|href)=["']([^"']*\/assets\/[^"']+)["']/u);
  assert(match?.[1], "H5 入口未发现带哈希静态资源");
  const assetUrl = new URL(match[1], h5Href).href;
  const { response, latencyMs } = await request(assetUrl);
  assert(response.ok, `资源 HTTP ${response.status}`);
  const cacheControl = response.headers.get("cache-control") || "";
  assert(
    cacheControl.includes("public") && cacheControl.includes("immutable"),
    `Cache-Control=${cacheControl || "缺失"}`,
  );
  return `不可变缓存有效，${latencyMs}ms`;
});

await check("CORS 精确来源", async () => {
  const { response } = await request(`${apiBase}/api/v1/health`, {
    headers: { Origin: expectedOrigin },
  });
  assert(response.ok, `HTTP ${response.status}`);
  const allowedOrigin = response.headers.get("access-control-allow-origin");
  assert(allowedOrigin !== "*", "生产环境不得使用通配 CORS");
  if (apiUrl.origin === expectedOrigin) {
    return allowedOrigin ? `同源访问（服务同时返回 ${allowedOrigin}）` : "同源访问无需 CORS 响应头";
  }
  assert(allowedOrigin === expectedOrigin, `允许来源为 ${allowedOrigin || "缺失"}`);
  return `跨域来源精确匹配 ${expectedOrigin}`;
});

await check("Socket.IO 反向代理", async () => {
  const { response, body, latencyMs } = await request(
    `${apiBase}/socket.io/?EIO=4&transport=polling&t=${Date.now()}`,
  );
  assert(response.ok, `HTTP ${response.status}`);
  assert(body.startsWith("0"), "未收到 Engine.IO open packet");
  return `握手成功，${latencyMs}ms`;
});

await check("鉴权边界", async () => {
  const { response } = await request(`${apiBase}/api/v1/auth/me`);
  assert(response.status === 401, `未登录访问返回 HTTP ${response.status}`);
  return "未登录访问被拒绝";
});

await check("依赖降级状态端点", async () => {
  const { response, body } = await request(`${apiBase}/api/v1/health/degrade`);
  assert(response.ok, `HTTP ${response.status}`);
  const data = unwrapPayload(parseJson(body, "降级状态端点"));
  assert(typeof data === "object" && data !== null, "响应结构无效");
  return "可供客户端展示降级提示";
});

if (apiUrl.protocol === "https:") {
  await check("HTTP 强制跳转 HTTPS", async () => {
    const httpUrl = new URL(apiUrl.href);
    httpUrl.protocol = "http:";
    const { response } = await request(httpUrl.href, { redirect: "manual" });
    assert([301, 302, 307, 308].includes(response.status), `HTTP ${response.status}`);
    const location = response.headers.get("location") || "";
    assert(/^https:\/\//iu.test(location), `Location=${location || "缺失"}`);
    return `HTTP ${response.status} → HTTPS`;
  });
}

const failed = results.filter((item) => item.status === "FAIL");
const report = {
  schemaVersion: 1,
  kind: "guoxue-runtime-verification",
  generatedAt: new Date().toISOString(),
  environmentFile: path.relative(process.cwd(), envFile),
  endpoints: { api: apiUrl.origin, h5: h5Href, admin: adminHref, asset: assetUrl.origin },
  allowDegraded,
  expectedReleaseId,
  observedReleaseId,
  infrastructureIntakeSha256,
  dnsObservationMode: "system-plus-public-authority-v2",
  dnsTtlPolicy: { maximumSeconds: plannedDnsTtlSeconds },
  authoritativeNameServers,
  dnsEndpoints,
  dnsObservations,
  dnsAuthorityObservations,
  tlsCertificates,
  publicCompliance: {
    routeCount: publicComplianceObservations.length,
    routeIds: publicComplianceObservations.map((item) => item.id).sort(),
    legacyOriginMode,
    legacyOriginCount: legacyOrigins.length,
    legacyOriginsFingerprint: createHash("sha256")
      .update(JSON.stringify(legacyOrigins))
      .digest("hex"),
    legacyRedirectObservations,
  },
  authenticationSurfaces: {
    routeCount: authenticationSurfaceObservations.length,
    routeIds: authenticationSurfaceObservations.map((item) => item.id).sort(),
  },
  summary: { passed: results.length - failed.length, failed: failed.length, total: results.length },
  results,
};

if (reportFile) {
  fs.mkdirSync(path.dirname(reportFile), { recursive: true });
  fs.writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  console.log(`验收报告：${reportFile}`);
}

console.log(`\n运行时验收：${report.summary.passed}/${report.summary.total} 通过`);
if (failed.length > 0) process.exitCode = 1;
