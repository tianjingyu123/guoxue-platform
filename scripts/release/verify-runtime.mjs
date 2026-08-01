#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { probePublicDns } from "./public-dns.mjs";
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
    (expectedReleaseFlag < 0 || index !== expectedReleaseFlag + 1)
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
let tlsCertificates = [];

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

await check("公网 DNS 解析与地址安全", async () => {
  const hostnames = [apiUrl, h5Url, new URL(adminHref), assetUrl]
    .map((url) => url.hostname);
  const uniqueHostnames = [...new Set(hostnames)];
  dnsEndpoints = await Promise.all(uniqueHostnames.map((hostname) => probePublicDns(hostname)));
  return `${dnsEndpoints.length} 个唯一域名均解析到公网地址并保留 CNAME 链`;
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
  dnsEndpoints,
  tlsCertificates,
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
