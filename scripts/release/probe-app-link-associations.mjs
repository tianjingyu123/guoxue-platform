#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { buildAssociationArtifacts } from "./build-app-link-associations.mjs";

const args = process.argv.slice(2);
const valueOf = (name, fallback = "") => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] && !args[index + 1].startsWith("--")
    ? args[index + 1]
    : fallback;
};
const inputArg = valueOf("--input");
const reportArg = valueOf("--report");
const timeoutMs = Number(valueOf("--timeout-ms", "10000"));

if (!inputArg || !reportArg || !Number.isFinite(timeoutMs) || timeoutMs < 1000 || timeoutMs > 30000) {
  console.error("用法：node probe-app-link-associations.mjs --input <intake.json> --report <report.json> [--timeout-ms 10000]");
  process.exit(2);
}

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map((item) => canonicalize(item));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
};
const stableJson = (value) => JSON.stringify(canonicalize(value));
const fingerprint = (value) => createHash("sha256").update(stableJson(value)).digest("hex");

async function fetchAssociation(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: { Accept: "application/json, application/pkcs7-mime" },
    });
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    const body = await response.text();
    let json = null;
    try {
      json = JSON.parse(body);
    } catch {
      // 由调用方将不可解析内容记录为阻断，不输出响应正文。
    }
    return {
      ok: response.status === 200 && response.type !== "opaqueredirect",
      status: response.status,
      redirected: response.status >= 300 && response.status < 400,
      contentType,
      json,
    };
  } finally {
    clearTimeout(timer);
  }
}

let report;
try {
  const intake = JSON.parse(readFileSync(path.resolve(inputArg), "utf8"));
  const expected = buildAssociationArtifacts(intake);
  const base = `https://${expected.host}/.well-known`;
  const [apple, android] = await Promise.all([
    fetchAssociation(`${base}/apple-app-site-association`),
    fetchAssociation(`${base}/assetlinks.json`),
  ]);
  const appleContentTypeValid =
    apple.contentType.includes("application/json") ||
    apple.contentType.includes("application/pkcs7-mime");
  const androidContentTypeValid = android.contentType.includes("application/json");
  const checks = [
    {
      name: "Apple 关联文件以 HTTPS 200 直接返回且不重定向",
      pass: apple.ok && !apple.redirected,
    },
    { name: "Apple 关联文件 Content-Type 合法", pass: appleContentTypeValid },
    {
      name: "Apple 关联文件与受控 Team ID、Bundle ID 和路径完全一致",
      pass: apple.json !== null && stableJson(apple.json) === stableJson(expected.apple),
    },
    {
      name: "Android 关联文件以 HTTPS 200 直接返回且不重定向",
      pass: android.ok && !android.redirected,
    },
    { name: "Android 关联文件 Content-Type 为 JSON", pass: androidContentTypeValid },
    {
      name: "Android 关联文件与受控包名和正式签名指纹完全一致",
      pass:
        android.json !== null &&
        stableJson(android.json) === stableJson(expected.androidAssociation),
    },
  ];
  const failed = checks.filter((item) => !item.pass);
  report = {
    schemaVersion: 1,
    kind: "guoxue-app-link-association-probe",
    generatedAt: new Date().toISOString(),
    success: failed.length === 0,
    hostFingerprint: fingerprint(expected.host),
    expectedIdentityFingerprint: fingerprint({
      ios: `${expected.teamId}.${expected.bundleId}`,
      android: {
        packageName: expected.packageName,
        fingerprints: expected.fingerprints,
      },
    }),
    summary: { total: checks.length, passed: checks.length - failed.length, failed: failed.length },
    checks,
  };
} catch (error) {
  report = {
    schemaVersion: 1,
    kind: "guoxue-app-link-association-probe",
    generatedAt: new Date().toISOString(),
    success: false,
    errorCode: error instanceof Error ? error.name : "UnknownError",
    summary: { total: 1, passed: 0, failed: 1 },
    checks: [{ name: "App 深链公网探测可执行", pass: false }],
  };
}

const reportPath = path.resolve(reportArg);
mkdirSync(path.dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
console.log(`App 深链公网探测：${report.success ? "通过" : "阻断"}；报告 ${reportPath}`);
if (!report.success) process.exit(1);
