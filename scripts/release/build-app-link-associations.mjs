#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);

function valueOf(name, fallback = "") {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] && !args[index + 1].startsWith("--")
    ? args[index + 1]
    : fallback;
}

function text(value) {
  return String(value ?? "").trim();
}

function isPlaceholder(value) {
  return /(?:example\.(?:com|test)|change[-_ ]?me|placeholder|pending|待填写|待配置|<[^>]+>)/iu.test(
    text(value),
  );
}

function normalizeHost(value) {
  const host = text(value).toLowerCase().replace(/\.$/u, "");
  if (
    !host ||
    host.includes("://") ||
    host.includes("/") ||
    host.includes(":") ||
    !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/u.test(host)
  ) {
    throw new Error("appDeepLinks.host 必须是纯 HTTPS 主机名，不得包含协议、端口或路径");
  }
  if (isPlaceholder(host)) throw new Error("appDeepLinks.host 仍是占位域名");
  return host;
}

function normalizePathPattern(value) {
  const pattern = text(value);
  if (
    !pattern.startsWith("/") ||
    pattern.includes("?") ||
    pattern.includes("#") ||
    pattern.includes("//") ||
    !pattern.endsWith("*")
  ) {
    throw new Error(`非法深链路径 ${pattern || "<empty>"}：必须以 / 开头、以 * 结尾且不含查询或片段`);
  }
  return pattern;
}

function normalizeFingerprint(value) {
  const compact = text(value).replace(/:/gu, "").toUpperCase();
  if (!/^[A-F0-9]{64}$/u.test(compact)) {
    throw new Error("Android SHA-256 签名证书指纹必须是 64 位十六进制，可使用冒号分隔");
  }
  return compact.match(/.{2}/gu).join(":");
}

export function buildAssociationArtifacts(intake) {
  const deepLinks = intake?.appDeepLinks || {};
  const ios = deepLinks.ios || {};
  const android = deepLinks.android || {};
  const host = normalizeHost(deepLinks.host);
  const paths = [...new Set((Array.isArray(deepLinks.pathPatterns) ? deepLinks.pathPatterns : []).map(normalizePathPattern))];
  if (paths.length === 0) throw new Error("appDeepLinks.pathPatterns 至少登记一个受控路径");

  const teamId = text(ios.teamId).toUpperCase();
  const bundleId = text(ios.bundleId);
  const packageName = text(android.packageName);
  if (!/^[A-Z0-9]{10}$/u.test(teamId) || isPlaceholder(teamId)) {
    throw new Error("iOS Team ID 必须是 10 位大写字母或数字且不得为占位值");
  }
  if (!/^[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z0-9_-]+)+$/u.test(bundleId) || isPlaceholder(bundleId)) {
    throw new Error("iOS Bundle ID 格式无效或仍是占位值");
  }
  if (!/^[a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z0-9_]+)+$/u.test(packageName) || isPlaceholder(packageName)) {
    throw new Error("Android 包名格式无效或仍是占位值");
  }
  if (bundleId !== "com.rebu.iosapprebu") {
    throw new Error("iOS Bundle ID 与热卜国学既有应用身份不一致");
  }
  if (packageName !== "com.rebu.apprebu") {
    throw new Error("Android 包名与热卜国学既有应用身份不一致");
  }

  const fingerprints = [
    ...new Set(
      (Array.isArray(android.sha256CertFingerprints) ? android.sha256CertFingerprints : []).map(
        normalizeFingerprint,
      ),
    ),
  ].sort();
  if (fingerprints.length === 0) {
    throw new Error("Android 至少需要一个正式发布签名证书 SHA-256 指纹");
  }

  const appId = `${teamId}.${bundleId}`;
  const apple = {
    applinks: {
      apps: [],
      details: [
        {
          appID: appId,
          components: paths.map((pattern) => ({ "/": pattern })),
        },
      ],
    },
  };
  const androidAssociation = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: packageName,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];
  const androidData = paths.map((pattern) => ({
    scheme: "https",
    host,
    pathPrefix: pattern.slice(0, -1) || "/",
  }));
  const buildPlan = {
    schemaVersion: 1,
    kind: "guoxue-app-deep-link-build-plan",
    host,
    ios: {
      bundleId,
      associatedDomainsEntitlement: [`applinks:${host}`],
      dcloudManifestFragment: {
        capabilities: {
          entitlements: {
            "com.apple.developer.associated-domains": [`applinks:${host}`],
          },
        },
      },
    },
    android: {
      packageName,
      autoVerify: true,
      intentFilter: {
        actions: ["android.intent.action.VIEW"],
        categories: [
          "android.intent.category.DEFAULT",
          "android.intent.category.BROWSABLE",
        ],
        data: androidData,
      },
    },
  };
  return { host, paths, teamId, bundleId, packageName, fingerprints, apple, androidAssociation, buildPlan };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function writeJson(filePath, value, mode = 0o600) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode });
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const inputArg = valueOf("--input");
  const outputArg = valueOf("--output");
  if (!inputArg || !outputArg) {
    console.error("用法：node build-app-link-associations.mjs --input <infrastructure-intake.json> --output <目录>");
    process.exit(2);
  }
  try {
    const intake = JSON.parse(readFileSync(path.resolve(inputArg), "utf8"));
    const artifacts = buildAssociationArtifacts(intake);
    const outputDir = path.resolve(outputArg);
    const wellKnownDir = path.join(outputDir, ".well-known");
    mkdirSync(wellKnownDir, { recursive: true });

    const applePath = path.join(wellKnownDir, "apple-app-site-association");
    const androidPath = path.join(wellKnownDir, "assetlinks.json");
    const planPath = path.join(outputDir, "app-deep-link-build-plan.json");
    writeJson(applePath, artifacts.apple, 0o644);
    writeJson(androidPath, artifacts.androidAssociation, 0o644);
    writeJson(planPath, artifacts.buildPlan);
    const report = {
      schemaVersion: 1,
      kind: "guoxue-app-link-association-generation",
      generatedAt: new Date().toISOString(),
      success: true,
      hostFingerprint: sha256(artifacts.host),
      pathCount: artifacts.paths.length,
      iosIdentityFingerprint: sha256(`${artifacts.teamId}.${artifacts.bundleId}`),
      androidIdentityFingerprint: sha256(
        JSON.stringify({ packageName: artifacts.packageName, fingerprints: artifacts.fingerprints }),
      ),
      files: [
        { path: ".well-known/apple-app-site-association", sha256: sha256(readFileSync(applePath)) },
        { path: ".well-known/assetlinks.json", sha256: sha256(readFileSync(androidPath)) },
        { path: "app-deep-link-build-plan.json", sha256: sha256(readFileSync(planPath)) },
      ],
    };
    writeJson(path.join(outputDir, "app-link-association-report.json"), report);
    console.log(`App 深链关联文件已生成：${outputDir}`);
    console.log("请将 .well-known 原样部署到接入清单登记的 HTTPS 主机根目录，禁止重定向。 ");
  } catch (error) {
    console.error(`App 深链关联文件生成失败：${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
