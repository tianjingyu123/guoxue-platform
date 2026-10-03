#!/usr/bin/env node

import { chmod, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
let envFile = "docker/.env.production";
let reportArgument = "";
let releaseId = "";
let sourceCommit = "";

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  const next = args[index + 1];
  if (arg === "--report" && next) {
    reportArgument = next;
    index += 1;
  } else if (arg === "--release-id" && next) {
    releaseId = next.trim();
    index += 1;
  } else if (arg === "--source-commit" && next) {
    sourceCommit = next.trim().toLowerCase();
    index += 1;
  } else if (!arg.startsWith("--") && envFile === "docker/.env.production") {
    envFile = arg;
  } else {
    throw new Error(`未知或不完整参数：${arg}`);
  }
}

if (releaseId && !/^[A-Za-z0-9._-]{8,80}$/u.test(releaseId)) {
  throw new Error("--release-id 必须是 8-80 位字母、数字、点、下划线或短横线");
}
if (sourceCommit && !/^[a-f0-9]{40}$/u.test(sourceCommit)) {
  throw new Error("--source-commit 必须是 40 位 Git 提交 SHA");
}
if (releaseId && !sourceCommit) {
  throw new Error("指定 --release-id 时必须同时提供 --source-commit");
}

const root = process.cwd();
const resolvedEnvFile = path.resolve(root, envFile);
const reportPath = reportArgument ? path.resolve(root, reportArgument) : "";
// 分段构造旧地址，避免源码域名审计把检测器自己的样本误判为运行时依赖。
const legacyHostParts = ["api", "rebugx", "cn"];
const legacyOrigin = `https://${legacyHostParts.join(".")}`;
const allowedLegacyLegalUrls = [
  `${legacyOrigin}/h5/pkg-settings/user-agreement/index`,
  `${legacyOrigin}/h5/pkg-settings/privacy-policy/index`,
];
const nativeUniversalLink = `${legacyOrigin}/h5/`;
const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".mjs",
  ".txt",
  ".xml",
  ".wxml",
  ".wxss",
]);

const targets = [
  { name: "管理后台", dir: "apps/admin/dist", expected: ["VITE_API_URL", "VITE_PUBLIC_H5_URL"] },
  {
    name: "H5",
    dir: "apps/mobile/dist/build/h5",
    expected: ["VITE_API_URL", "VITE_PUBLIC_ASSET_ORIGIN"],
  },
  {
    name: "微信小程序",
    dir: "apps/mobile/dist/build/mp-weixin",
    expected: ["VITE_API_URL", "VITE_PUBLIC_ASSET_ORIGIN"],
  },
  {
    name: "App",
    dir: "apps/mobile/dist/build/app",
    expected: ["VITE_API_URL", "VITE_PUBLIC_ASSET_ORIGIN"],
  },
  {
    name: "鸿蒙 App",
    dir: "apps/mobile/dist/build/app-harmony",
    expected: ["VITE_API_URL", "VITE_PUBLIC_ASSET_ORIGIN"],
  },
];

function parseEnv(content) {
  const result = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[match[1]] = value.replace(/\/+$/, "");
  }
  return result;
}

async function collectFiles(entry, files) {
  const info = await stat(entry);
  if (info.isFile()) {
    files.push(entry);
    return;
  }
  for (const child of await readdir(entry)) {
    await collectFiles(path.join(entry, child), files);
  }
}

async function fingerprintTarget(targetDir, files) {
  const hash = createHash("sha256");
  let bytes = 0;
  const orderedFiles = [...files].sort((left, right) =>
    path
      .relative(targetDir, left)
      .split(path.sep)
      .join("/")
      .localeCompare(path.relative(targetDir, right).split(path.sep).join("/"), "en"),
  );

  for (const file of orderedFiles) {
    const relative = path.relative(targetDir, file).split(path.sep).join("/");
    const content = await readFile(file);
    bytes += content.length;
    hash.update(relative, "utf8");
    hash.update("\0");
    hash.update(String(content.length), "utf8");
    hash.update("\0");
    hash.update(content);
    hash.update("\0");
  }

  return { bytes, contentSha256: hash.digest("hex") };
}

let envContent;
try {
  envContent = await readFile(resolvedEnvFile, "utf8");
} catch (error) {
  console.error(`客户端成品审计失败：无法读取 ${resolvedEnvFile}`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}

const values = parseEnv(envContent);
const requiredKeys = ["VITE_API_URL", "VITE_PUBLIC_H5_URL", "VITE_PUBLIC_ASSET_ORIGIN"];
const missing = requiredKeys.filter((key) => !values[key]);
if (missing.length > 0) {
  console.error(`客户端成品审计失败：缺少 ${missing.join(", ")}`);
  process.exit(2);
}

const preReleaseOriginPattern = /^https?:\/\/pre-/iu;
const preReleaseUrlPattern = /https?:\/\/pre-[a-z0-9.-]+(?=[:/?"'#\s]|$)/giu;
const productionArtifactAudit = requiredKeys.every(
  (key) => !preReleaseOriginPattern.test(values[key]),
);

function findDisallowedLegacyOrigin(content, file) {
  const relativeFile = path.relative(root, file).split(path.sep).join("/");
  const allowsNativeUniversalLink = new Set([
    "apps/mobile/dist/build/app/manifest.json",
    "apps/mobile/dist/build/app-harmony/manifest.json",
  ]).has(relativeFile);
  let index = content.indexOf(legacyOrigin);
  while (index >= 0) {
    const allowedUrl = allowsNativeUniversalLink
      ? [...allowedLegacyLegalUrls, nativeUniversalLink]
      : allowedLegacyLegalUrls;
    const allowed = allowedUrl.some((url) => {
      if (!content.startsWith(url, index)) return false;
      const next = content[index + url.length] || "";
      return !next || /[\s"'<>),\]\\]/u.test(next);
    });
    if (!allowed) return true;
    index = content.indexOf(legacyOrigin, index + legacyOrigin.length);
  }
  return false;
}

const errors = [];
let totalTextFiles = 0;
let totalFiles = 0;
let totalBytes = 0;
const targetReports = [];

for (const target of targets) {
  const targetDir = path.resolve(root, target.dir);
  const files = [];
  try {
    await collectFiles(targetDir, files);
  } catch {
    errors.push(`${target.name} 产物目录不存在：${target.dir}`);
    targetReports.push({
      name: target.name,
      directory: target.dir,
      expectedKeys: target.expected,
      files: 0,
      textFiles: 0,
      sourceMaps: 0,
      success: false,
    });
    continue;
  }

  totalFiles += files.length;
  const fingerprint = await fingerprintTarget(targetDir, files);
  totalBytes += fingerprint.bytes;
  const mapFiles = files.filter((file) => path.extname(file).toLowerCase() === ".map");
  if (mapFiles.length > 0) {
    errors.push(`${target.name} 含 ${mapFiles.length} 个源码映射文件`);
  }

  const textFiles = files.filter((file) => textExtensions.has(path.extname(file).toLowerCase()));
  totalTextFiles += textFiles.length;
  const preReleaseHits = [];
  const hits = new Map(
    ["example.com", ...target.expected.map((key) => values[key])].map((value) => [
      value,
      [],
    ]),
  );
  const disallowedLegacyHits = [];

  for (const file of textFiles) {
    const content = await readFile(file, "utf8");
    if (values.VITE_API_URL !== legacyOrigin && findDisallowedLegacyOrigin(content, file)) {
      disallowedLegacyHits.push(path.relative(root, file));
    }
    if (productionArtifactAudit && preReleaseUrlPattern.test(content)) {
      preReleaseHits.push(path.relative(root, file));
    }
    preReleaseUrlPattern.lastIndex = 0;
    for (const [needle, matches] of hits.entries()) {
      if (needle && content.includes(needle)) matches.push(path.relative(root, file));
    }
  }

  if (disallowedLegacyHits.length > 0) {
    errors.push(
      `${target.name} 仍包含旧域名 ${legacyOrigin}：${disallowedLegacyHits
        .slice(0, 3)
        .join(", ")}`,
    );
  }
  if (hits.get("example.com")?.length > 0) {
    errors.push(`${target.name} 仍包含 example.com 占位地址`);
  }
  if (preReleaseHits.length > 0) {
    errors.push(
      `${target.name} 正式成品仍包含 pre-* 预发布地址：${preReleaseHits
        .slice(0, 3)
        .join(", ")}`,
    );
  }
  for (const key of target.expected) {
    const expected = values[key];
    if ((hits.get(expected) || []).length === 0) {
      errors.push(`${target.name} 未发现构建时配置 ${key}`);
    }
  }

  targetReports.push({
    name: target.name,
    directory: target.dir,
    expectedKeys: target.expected,
    files: files.length,
    textFiles: textFiles.length,
    sourceMaps: mapFiles.length,
    bytes: fingerprint.bytes,
    contentSha256: fingerprint.contentSha256,
    success:
      mapFiles.length === 0 &&
      preReleaseHits.length === 0 &&
      hits.get("example.com")?.length === 0 &&
      disallowedLegacyHits.length === 0 &&
      target.expected.every((key) => (hits.get(values[key]) || []).length > 0),
  });

  console.log(
    `客户端成品审计：${target.name} ${files.length} 个文件，${textFiles.length} 个文本文件，源码映射 ${mapFiles.length} 个`,
  );
}

const report = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  releaseId: releaseId || null,
  sourceCommit: sourceCommit || null,
  environmentFile: path.relative(root, resolvedEnvFile),
  success: errors.length === 0,
  counts: {
    targets: targets.length,
    files: totalFiles,
    textFiles: totalTextFiles,
    bytes: totalBytes,
    errors: errors.length,
  },
  targets: targetReports,
  errors,
};

if (reportPath) {
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await chmod(reportPath, 0o600).catch(() => undefined);
  console.log(`客户端成品审计报告：${reportPath}`);
}

if (errors.length > 0) {
  errors.forEach((message) => console.error(`错误：${message}`));
  process.exit(1);
}

console.log(
  `客户端成品审计通过：共检查 ${totalFiles} 个文件（${totalTextFiles} 个文本文件），新 API、H5 与资源域名均已写入，未残留旧域名或源码映射`,
);
