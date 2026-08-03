#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);

function valueOf(name, fallback = "") {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function failConfiguration(message) {
  console.error(`业务验收配置失败：${message}`);
  process.exit(2);
}

const specArgument = valueOf("--spec", process.env.BUSINESS_JOURNEY_SPEC || "");
const reportArgument = valueOf("--report", process.env.BUSINESS_JOURNEY_REPORT || "");
const releaseId = valueOf("--release-id", process.env.RELEASE_ID || "").trim();
const apiOriginOverride = valueOf("--api-origin", "").trim();
const selectedJourneyId = valueOf("--journey", "").trim();
const allowWrite = args.includes("--allow-write");
const writeConfirmation = valueOf("--confirm-write", "");

if (!specArgument) failConfiguration("必须通过 --spec 提供业务旅程清单");
if (!releaseId || !/^[A-Za-z0-9._-]{8,80}$/u.test(releaseId)) {
  failConfiguration("必须通过 --release-id 提供 8-80 位有效发布标识");
}

const specPath = path.resolve(specArgument);
if (!fs.existsSync(specPath)) failConfiguration(`业务旅程清单不存在：${specPath}`);

let spec;
try {
  spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
} catch (error) {
  failConfiguration(`无法读取业务旅程清单：${error.message}`);
}

if (spec?.schemaVersion !== 1 || spec?.kind !== "guoxue-business-journeys") {
  failConfiguration("业务旅程清单 kind 或 schemaVersion 无效");
}

let apiOrigin;
try {
  const parsed = new URL(apiOriginOverride || String(spec.apiOrigin || ""));
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  if (!isLocal && parsed.protocol !== "https:") {
    throw new Error("非本机目标必须使用 HTTPS");
  }
  if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("apiOrigin 只能包含协议、主机和端口");
  }
  apiOrigin = parsed.origin;
} catch (error) {
  failConfiguration(`apiOrigin 无效：${error.message}`);
}

const allJourneys = Array.isArray(spec.journeys) ? spec.journeys : [];
const journeys = selectedJourneyId
  ? allJourneys.filter((journey) => journey?.id === selectedJourneyId)
  : allJourneys;
if (journeys.length === 0) failConfiguration("至少需要声明一条业务旅程");

const qaPrefix = String(spec.qaPrefix || `QA_${releaseId.replace(/[^A-Za-z0-9]/gu, "_")}`);
if (!/^QA_[A-Za-z0-9_]{6,72}$/u.test(qaPrefix)) {
  failConfiguration("qaPrefix 必须以 QA_ 开头，且只能包含字母、数字和下划线");
}

const writeJourneys = journeys.filter((journey) => journey?.mode === "write");
if (writeJourneys.length > 0) {
  if (!allowWrite) failConfiguration("清单包含写操作，必须显式提供 --allow-write");
  if (writeConfirmation !== `QA_WRITES:${releaseId}`) {
    failConfiguration(`写操作确认串必须为 QA_WRITES:${releaseId}`);
  }
}

const authEnvironment = spec.auth || {};
const secretEnvironment = spec.secrets || {};
const safeEnvironmentName = /^QA_[A-Z0-9_]+$/u;

for (const [role, envName] of Object.entries(authEnvironment)) {
  if (!/^[a-z][a-z0-9_-]{1,31}$/u.test(role) || !safeEnvironmentName.test(envName)) {
    failConfiguration(`鉴权角色 ${role} 的环境变量名无效`);
  }
}
for (const [name, envName] of Object.entries(secretEnvironment)) {
  if (!/^[A-Za-z][A-Za-z0-9_]{1,47}$/u.test(name) || !safeEnvironmentName.test(envName)) {
    failConfiguration(`私密变量 ${name} 的环境变量名无效`);
  }
}

const forbiddenSideEffects = [
  /\/auth\/sms\/send(?:\/|$)/u,
  /\/pay(?:ment)?(?:\/|$)/u,
  /\/refund(?:s)?(?:\/|$)/u,
  /\/notify(?:\/|$)/u,
  /\/callback(?:\/|$)/u,
  /\/batch-ship(?:\/|$)/u,
  /\/return-logistics(?:\/|$)/u,
];
const allowedMethods = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"]);
const sensitiveBodyKey = /(password|phone|mobile|token|secret|authorization|credential)/iu;
const reservedHeader = /^(authorization|cookie|set-cookie|x-api-key)$/iu;

function validateTemplateValue(value, key = "") {
  if (Array.isArray(value)) {
    value.forEach((item) => validateTemplateValue(item, key));
    return;
  }
  if (value && typeof value === "object") {
    for (const [childKey, childValue] of Object.entries(value)) {
      validateTemplateValue(childValue, childKey);
    }
    return;
  }
  if (
    sensitiveBodyKey.test(key) &&
    typeof value === "string" &&
    !/^\{\{secret\.[A-Za-z0-9_]+\}\}$/u.test(value)
  ) {
    throw new Error(`敏感字段 ${key} 必须通过 {{secret.NAME}} 从环境变量注入`);
  }
}

function validateStep(step, journeyMode, phase) {
  if (!step || !/^[a-z][a-z0-9-]{1,63}$/u.test(String(step.id || ""))) {
    throw new Error(`${phase} 步骤缺少有效 id`);
  }
  const method = String(step.method || "GET").toUpperCase();
  if (!allowedMethods.has(method)) throw new Error(`${step.id} 使用了不支持的 HTTP 方法`);
  if (journeyMode !== "write" && !["GET", "HEAD"].includes(method)) {
    throw new Error(`${step.id} 在只读旅程中声明了写方法 ${method}`);
  }
  const rawPath = String(step.path || "");
  if (!rawPath.startsWith("/api/v1/") || rawPath.startsWith("//") || rawPath.includes("://")) {
    throw new Error(`${step.id} 只能访问当前目标的 /api/v1/ 路径`);
  }
  const pathWithoutTemplates = rawPath.replace(/\{\{[^}]+\}\}/gu, "fixture");
  const url = new URL(pathWithoutTemplates, apiOrigin);
  for (const key of url.searchParams.keys()) {
    if (/(token|secret|password|phone|mobile|credential)/iu.test(key)) {
      throw new Error(`${step.id} 不允许在 URL 查询参数中传递敏感字段 ${key}`);
    }
  }
  if (forbiddenSideEffects.some((pattern) => pattern.test(url.pathname.toLowerCase()))) {
    throw new Error(`${step.id} 命中外部副作用接口硬阻断规则`);
  }
  for (const headerName of Object.keys(step.headers || {})) {
    if (reservedHeader.test(headerName)) {
      throw new Error(`${step.id} 不允许在清单中硬编码 ${headerName} 请求头`);
    }
  }
  validateTemplateValue(step.body);
}

try {
  const ids = new Set();
  for (const journey of journeys) {
    if (!journey || !/^[a-z][a-z0-9-]{2,63}$/u.test(String(journey.id || ""))) {
      throw new Error("旅程缺少有效 id");
    }
    if (ids.has(journey.id)) throw new Error(`旅程 id 重复：${journey.id}`);
    ids.add(journey.id);
    if (!new Set(["read", "write"]).has(journey.mode)) {
      throw new Error(`${journey.id} 的 mode 必须为 read 或 write`);
    }
    if (!Array.isArray(journey.steps) || journey.steps.length === 0) {
      throw new Error(`${journey.id} 未声明验收步骤`);
    }
    if (
      journey.mode === "write" &&
      (!Array.isArray(journey.cleanup) || journey.cleanup.length === 0)
    ) {
      throw new Error(`${journey.id} 是写旅程，但没有声明清理步骤`);
    }
    journey.steps.forEach((step) => validateStep(step, journey.mode, `${journey.id} 主流程`));
    (journey.cleanup || []).forEach((step) => validateStep(step, "write", `${journey.id} 清理`));
  }
} catch (error) {
  failConfiguration(error.message);
}

const secretValues = Object.fromEntries(
  Object.entries(secretEnvironment).map(([name, envName]) => [name, process.env[envName] || ""]),
);
const authValues = Object.fromEntries(
  Object.entries(authEnvironment).map(([role, envName]) => [role, process.env[envName] || ""]),
);

function readJsonPointer(value, pointer) {
  if (pointer === "") return value;
  if (!pointer.startsWith("/")) throw new Error(`JSON Pointer 必须以 / 开头：${pointer}`);
  return pointer
    .slice(1)
    .split("/")
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce((current, segment) => current?.[segment], value);
}

function interpolateString(value, context) {
  return value.replace(
    /\{\{(releaseId|qaPrefix|capture\.[A-Za-z0-9_]+|secret\.[A-Za-z0-9_]+)\}\}/gu,
    (match, key) => {
      if (key === "releaseId") return releaseId;
      if (key === "qaPrefix") return qaPrefix;
      if (key.startsWith("capture.")) {
        const name = key.slice("capture.".length);
        if (!(name in context.capture)) throw new Error(`缺少捕获变量 ${name}`);
        return String(context.capture[name]);
      }
      const name = key.slice("secret.".length);
      if (!secretValues[name]) throw new Error(`私密变量 ${name} 对应的环境变量未配置`);
      return secretValues[name];
    },
  );
}

function interpolate(value, context) {
  if (typeof value === "string") return interpolateString(value, context);
  if (Array.isArray(value)) return value.map((item) => interpolate(item, context));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, interpolate(item, context)]),
    );
  }
  return value;
}

function assertResponse(step, response, json, context) {
  const expectedStatuses = Array.isArray(step.expectStatus)
    ? step.expectStatus
    : [step.expectStatus || 200];
  if (!expectedStatuses.includes(response.status)) {
    throw new Error(`HTTP ${response.status}，预期 ${expectedStatuses.join("/")}`);
  }
  for (const assertion of step.expectJson || []) {
    const actual = readJsonPointer(json, assertion.pointer);
    let expected;
    if (Object.hasOwn(assertion, "equals")) {
      const captureMatch =
        typeof assertion.equals === "string"
          ? assertion.equals.match(/^\{\{capture\.([A-Za-z0-9_]+)\}\}$/u)
          : null;
      expected = captureMatch
        ? context.capture[captureMatch[1]]
        : interpolate(assertion.equals, context);
    }
    if (Object.hasOwn(assertion, "equals") && actual !== expected) {
      throw new Error(`${assertion.pointer} 的值不符合预期`);
    }
    if (assertion.exists === true && actual === undefined) {
      throw new Error(`${assertion.pointer} 不存在`);
    }
    if (Object.hasOwn(assertion, "matches")) {
      const pattern = interpolateString(String(assertion.matches), context);
      if (typeof actual !== "string" || !new RegExp(pattern, "u").test(actual)) {
        throw new Error(`${assertion.pointer} 的值不符合 QA 资源命名规则`);
      }
    }
  }
}

async function executeStep(step, context, phase) {
  const startedAt = Date.now();
  const method = String(step.method || "GET").toUpperCase();
  const relativePath = interpolateString(step.path, context);
  const url = new URL(relativePath, apiOrigin);
  if (url.origin !== apiOrigin) throw new Error("模板展开后请求越过目标 API 源");
  const headers = {
    Accept: "application/json",
    "X-QA-Run": `${qaPrefix}:${releaseId}`,
    ...interpolate(step.headers || {}, context),
  };
  if (step.auth) {
    const token = authValues[step.auth];
    if (!token) throw new Error(`鉴权角色 ${step.auth} 对应的环境变量未配置`);
    headers.Authorization = `Bearer ${token}`;
  }
  let body;
  if (step.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(interpolate(step.body, context));
  }
  if (!["GET", "HEAD"].includes(method)) {
    headers["Idempotency-Key"] = `${releaseId}:${phase}:${step.id}`.slice(0, 120);
  }

  const response = await fetch(url, {
    method,
    headers,
    body,
    redirect: "error",
    signal: AbortSignal.timeout(Number(step.timeoutMs) || 15_000),
  });
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  if (text.length > 1_000_000) throw new Error("响应体超过 1MB 安全上限");
  let json;
  if (text && contentType.includes("json")) {
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("接口声明 JSON 但返回内容无法解析");
    }
  }
  assertResponse(step, response, json, context);
  for (const [name, pointer] of Object.entries(step.capture || {})) {
    const captured = readJsonPointer(json, pointer);
    if (captured === undefined || captured === null || captured === "") {
      throw new Error(`无法从 ${pointer} 捕获 ${name}`);
    }
    context.capture[name] = captured;
  }
  return {
    id: step.id,
    method,
    path: new URL(relativePath, apiOrigin).pathname,
    status: "PASS",
    statusCode: response.status,
    durationMs: Date.now() - startedAt,
  };
}

function safeError(error) {
  let message = String(error?.message || error || "未知错误");
  for (const value of [...Object.values(secretValues), ...Object.values(authValues)]) {
    if (value) message = message.replaceAll(value, "[REDACTED]");
  }
  return message.slice(0, 300);
}

async function verifyReleaseBinding() {
  const startedAt = Date.now();
  let observedReleaseId = null;
  try {
    const response = await fetch(`${apiOrigin}/api/v1/health`, {
      headers: {
        Accept: "application/json",
        "X-QA-Run": `${qaPrefix}:${releaseId}`,
      },
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`健康检查返回 HTTP ${response.status}`);
    const payload = await response.json();
    const data = payload?.data && typeof payload.data === "object" ? payload.data : payload;
    observedReleaseId = String(data?.releaseId || "").trim();
    if (!observedReleaseId || observedReleaseId === "unversioned") {
      throw new Error("目标实例未暴露固定发布标识");
    }
    if (observedReleaseId !== releaseId) {
      throw new Error(`目标实例发布标识为 ${observedReleaseId}，期望 ${releaseId}`);
    }
    return {
      status: "PASS",
      expectedReleaseId: releaseId,
      observedReleaseId,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      status: "FAIL",
      expectedReleaseId: releaseId,
      observedReleaseId,
      error: safeError(error),
      durationMs: Date.now() - startedAt,
    };
  }
}

const releaseBinding = await verifyReleaseBinding();
console.log(
  `${releaseBinding.status === "PASS" ? "PASS" : "FAIL"} 固定发布版本绑定：${
    releaseBinding.status === "PASS" ? releaseBinding.observedReleaseId : releaseBinding.error
  }`,
);

const journeyResults = [];
for (const journey of releaseBinding.status === "PASS" ? journeys : []) {
  const context = { capture: {} };
  const result = {
    id: journey.id,
    mode: journey.mode,
    status: "PASS",
    steps: [],
    cleanup: [],
  };
  console.log(`\n业务旅程：${journey.id}（${journey.mode === "write" ? "隔离写入" : "只读"}）`);
  for (const step of journey.steps) {
    try {
      const stepResult = await executeStep(step, context, "run");
      result.steps.push(stepResult);
      console.log(`PASS ${step.id}：HTTP ${stepResult.statusCode}，${stepResult.durationMs}ms`);
    } catch (error) {
      result.status = "FAIL";
      result.steps.push({
        id: step.id,
        method: String(step.method || "GET").toUpperCase(),
        path: String(step.path || "").split("?")[0],
        status: "FAIL",
        error: safeError(error),
      });
      console.error(`FAIL ${step.id}：${safeError(error)}`);
      break;
    }
  }

  if (journey.mode === "write") {
    for (const step of [...journey.cleanup].reverse()) {
      try {
        const stepResult = await executeStep(step, context, "cleanup");
        result.cleanup.push(stepResult);
        console.log(`CLEAN ${step.id}：HTTP ${stepResult.statusCode}`);
      } catch (error) {
        result.status = "FAIL";
        result.cleanup.push({
          id: step.id,
          method: String(step.method || "GET").toUpperCase(),
          path: String(step.path || "").split("?")[0],
          status: "FAIL",
          error: safeError(error),
        });
        console.error(`CLEANUP FAIL ${step.id}：${safeError(error)}`);
      }
    }
  }
  journeyResults.push(result);
}

const failedJourneys = journeyResults.filter((item) => item.status !== "PASS");
const totalSteps = journeyResults.reduce(
  (total, item) => total + item.steps.length + item.cleanup.length,
  0,
);
const passedSteps = journeyResults.reduce(
  (total, item) =>
    total + [...item.steps, ...item.cleanup].filter((step) => step.status === "PASS").length,
  0,
);
const report = {
  schemaVersion: 1,
  kind: "guoxue-business-journey-evidence",
  generatedAt: new Date().toISOString(),
  releaseId,
  apiOrigin,
  qaPrefix,
  writeEnabled: writeJourneys.length > 0,
  releaseBinding,
  success: releaseBinding.status === "PASS" && failedJourneys.length === 0,
  summary: {
    requestedJourneys: journeys.length,
    journeys: journeyResults.length,
    passedJourneys: journeyResults.length - failedJourneys.length,
    failedJourneys: failedJourneys.length,
    totalSteps,
    passedSteps,
    failedSteps: totalSteps - passedSteps,
  },
  journeys: journeyResults,
};

if (reportArgument) {
  const reportPath = path.resolve(reportArgument);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  try {
    fs.chmodSync(reportPath, 0o600);
  } catch {
    // Windows 不支持完整 POSIX 权限语义，写入成功即可。
  }
  console.log(`\n业务验收报告：${reportPath}`);
}

console.log(
  `\n业务验收：${report.success ? "通过" : "失败"}，版本绑定 ${releaseBinding.status}，旅程 ${report.summary.passedJourneys}/${report.summary.requestedJourneys}，步骤 ${passedSteps}/${totalSteps}`,
);
process.exitCode = report.success ? 0 : 1;
