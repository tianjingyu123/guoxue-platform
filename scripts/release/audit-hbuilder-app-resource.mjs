#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const allowedExportChanges = new Set(["app-service.js", "manifest.json"]);

async function filesUnder(root, relative = "") {
  const entries = await readdir(path.join(root, relative), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const name = path.posix.join(relative.replaceAll("\\", "/"), entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(root, name));
    else if (entry.isFile()) files.push(name);
    else throw new Error(`资源中包含非普通文件：${name}`);
  }
  return files.sort();
}

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

export async function auditHbuilderResource({ genericDir, officialDir, appId, versionCode, spaceId, apiOrigin, assetOrigin }) {
  const errors = [];
  for (const [label, value] of Object.entries({ genericDir, officialDir, appId, versionCode, spaceId, apiOrigin, assetOrigin })) {
    if (typeof value !== "string" || !value.trim()) errors.push(`缺少 ${label}`);
  }
  if (errors.length) return { success: false, errors, files: 0, changedFiles: [] };
  const generic = path.resolve(genericDir);
  const official = path.resolve(officialDir);
  if (!await stat(generic).then((v) => v.isDirectory()).catch(() => false)) errors.push("普通 App 资源目录不可读");
  if (!await stat(official).then((v) => v.isDirectory()).catch(() => false)) errors.push("HBuilderX 导出目录不可读");
  if (errors.length) return { success: false, errors, files: 0, changedFiles: [] };

  const genericFiles = await filesUnder(generic);
  const officialFiles = await filesUnder(official);
  const genericSet = new Set(genericFiles);
  const officialSet = new Set(officialFiles);
  const missing = genericFiles.filter((file) => !officialSet.has(file));
  const added = officialFiles.filter((file) => !genericSet.has(file));
  if (missing.length || added.length) errors.push(`资源文件清单不一致：缺少 ${missing.length}，新增 ${added.length}`);

  const changedFiles = [];
  for (const file of genericFiles.filter((item) => officialSet.has(item))) {
    const [left, right] = await Promise.all([
      readFile(path.join(generic, file)),
      readFile(path.join(official, file)),
    ]);
    if (!left.equals(right)) changedFiles.push(file);
  }
  const unexpected = changedFiles.filter((file) => !allowedExportChanges.has(file));
  if (unexpected.length) errors.push(`HBuilderX 导出改动了预期之外的资源：${unexpected.join("、")}`);

  const bundlePath = path.join(official, "app-service.js");
  const manifestPath = path.join(official, "manifest.json");
  let bundle = "";
  let manifest;
  try { bundle = await readFile(bundlePath, "utf8"); }
  catch { errors.push("HBuilderX 导出缺少 app-service.js"); }
  try { manifest = JSON.parse(await readFile(manifestPath, "utf8")); }
  catch { errors.push("HBuilderX 导出缺少有效 manifest.json"); }
  if (bundle && !bundle.includes(`"spaceId":"${spaceId}"`)) errors.push("App 运行资源未绑定指定 uniCloud 服务空间");
  if (bundle && !bundle.includes(apiOrigin)) errors.push("App 运行资源缺少目标 API 域名");
  if (bundle && !bundle.includes(assetOrigin)) errors.push("App 运行资源缺少目标静态资源域名");
  if (manifest && manifest.id !== appId) errors.push("AppID 与发布目标不一致");
  if (manifest && String(manifest.version?.code) !== versionCode) errors.push("App 构建号与发布目标不一致");

  return {
    success: errors.length === 0,
    errors,
    files: officialFiles.length,
    changedFiles,
    appId: manifest?.id || null,
    versionCode: String(manifest?.version?.code || ""),
    genericBundleSha256: await readFile(path.join(generic, "app-service.js")).then(sha256).catch(() => null),
    officialBundleSha256: bundle ? sha256(bundle) : null,
    spaceBound: bundle.includes(`"spaceId":"${spaceId}"`),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const values = {};
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith("--") || !value || value.startsWith("--") || values[key.slice(2)]) {
      throw new Error(`参数不完整或重复：${key || "<缺失>"}`);
    }
    values[key.slice(2)] = value;
  }
  const allowed = new Set(["generic-dir", "official-dir", "app-id", "version-code", "space-id", "api-origin", "asset-origin", "report"]);
  for (const key of Object.keys(values)) if (!allowed.has(key)) throw new Error(`未知参数：--${key}`);
  const result = await auditHbuilderResource({
    genericDir: values["generic-dir"], officialDir: values["official-dir"],
    appId: values["app-id"], versionCode: values["version-code"],
    spaceId: values["space-id"], apiOrigin: values["api-origin"], assetOrigin: values["asset-origin"],
  });
  if (values.report) await writeFile(path.resolve(values.report), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ success: result.success, files: result.files, changedFiles: result.changedFiles, errors: result.errors }));
  if (!result.success) process.exitCode = 1;
}
