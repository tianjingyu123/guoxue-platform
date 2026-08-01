#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const args = process.argv.slice(2);
const strict = args.includes("--strict");

function valueOf(name, fallback = "") {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

function compareNumericVersions(left, right) {
  const parse = (value) => {
    const normalized = String(value || "").replace(/^v/i, "").split("-")[0];
    if (!/^\d+(?:\.\d+){0,3}$/.test(normalized)) return null;
    return normalized.split(".").map(Number);
  };
  const a = parse(left);
  const b = parse(right);
  if (!a || !b) return null;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const partA = a[index] ?? 0;
    const partB = b[index] ?? 0;
    if (partA !== partB) return partA > partB ? 1 : -1;
  }
  return 0;
}

const manifest = readJson("apps/mobile/src/manifest.json");
const mobilePackage = readJson("apps/mobile/package.json");
const expectedMiniAppId =
  valueOf("--expected-wechat-appid") ||
  process.env.EXPECTED_WECHAT_APP_ID ||
  "wx06397e8ab26bed9e";
const defaultBaseline = fs.existsSync(path.join(repoRoot, "config/release/store-baseline.json"))
  ? "config/release/store-baseline.json"
  : "";
const baselinePath = valueOf(
  "--baseline",
  process.env.STORE_BASELINE_FILE || defaultBaseline,
);
const appPlus = manifest["app-plus"] || {};
const distribute = appPlus.distribute || {};
const android = distribute.android || {};
const ios = distribute.ios || {};
const harmony = manifest["app-harmony"]?.distribute || {};
const mini = manifest["mp-weixin"] || {};

const checks = [];
const add = (name, pass, detail, kind = "配置") => checks.push({ name, pass, detail, kind });

add("DCloud AppID 已配置", Boolean(String(manifest.appid || "").trim()), "正式云打包需要沿用受控 DCloud AppID");
add(
  "Android 包名已冻结",
  Boolean(String(android.packagename || "").trim()),
  "必须与应用商店现有热卜国学包名完全一致",
);
add(
  "iOS Bundle ID 已冻结",
  Boolean(String(ios.appid || "").trim()),
  "必须与 App Store Connect 现有应用完全一致",
);
add(
  "鸿蒙 Bundle Name 已冻结",
  Boolean(String(harmony.bundleName || "").trim()),
  "必须与 AppGallery 现有热卜国学应用完全一致",
);
add(
  "展示版本号格式有效",
  /^v?\d+(?:\.\d+){0,3}(?:-[0-9A-Za-z.-]+)?$/.test(String(manifest.versionName || "")),
  `当前值 ${manifest.versionName || "未配置"}`,
  "代码",
);
add(
  "构建号格式有效",
  /^\d+$/.test(String(manifest.versionCode || "")) && Number(manifest.versionCode) > 0,
  `当前值 ${manifest.versionCode || "未配置"}`,
  "代码",
);
add(
  "热卜星火目标小程序 AppID 已切换",
  mini.appid === expectedMiniAppId,
  `当前配置 ${mini.appid || "未配置"}；目标为热卜星火 ${expectedMiniAppId}`,
);
add(
  "微信合法域名校验已开启",
  mini.setting?.urlCheck === true,
  "提审包不得使用 urlCheck:false",
);
add(
  "App 原生 SDK/插件配置已完成",
  Object.keys(appPlus.nativePlugins || {}).length > 0 ||
    Object.keys(distribute.sdkConfigs || {}).length > 0,
  "语音/实时音视频能力需在正式真机包中注册原生插件或 SDK",
);
add(
  "鸿蒙 App 编译器与构建命令已接入",
  Boolean(mobilePackage.dependencies?.["@dcloudio/uni-app-harmony"]) &&
    String(mobilePackage.scripts?.["build:app-harmony"] || "").includes("-p app-harmony"),
  "鸿蒙元服务（mp-harmony）不能替代 AppGallery 所需的 HarmonyOS NEXT App 安装包",
  "代码",
);

const updateRuntime = fs.readFileSync(
  path.join(repoRoot, "apps/mobile/src/lib/app-update.ts"),
  "utf8",
);
const updateController = fs.readFileSync(
  path.join(repoRoot, "apps/server/src/modules/system/version.controller.ts"),
  "utf8",
);
add(
  "App 启动版本检查已接通",
  updateRuntime.includes("/system/version/check") &&
    updateRuntime.includes("forceUpdate") &&
    updateController.includes("isAppUpdateAvailable"),
  "客户端、服务端和强制更新策略必须同时存在",
  "代码",
);

if (!baselinePath) {
  add(
    "旧版商店基线已登记",
    false,
    "请复制 config/release/store-baseline.example.json，填写现有 Android/iOS 包名和版本",
  );
} else {
  const absoluteBaseline = path.resolve(repoRoot, baselinePath);
  if (!fs.existsSync(absoluteBaseline)) {
    add("旧版商店基线文件可读取", false, `文件不存在：${baselinePath}`);
  } else {
    const baseline = JSON.parse(fs.readFileSync(absoluteBaseline, "utf8"));
    const androidBaseline = baseline.android || {};
    const iosBaseline = baseline.ios || {};
    const harmonyBaseline = baseline.harmony || {};
    const androidPackage = String(android.packagename || "");
    const iosBundleId = String(ios.appid || "");
    const harmonyBundleName = String(harmony.bundleName || "");
    add(
      "DCloud AppID 与旧版一致",
      Boolean(baseline.dcloudAppId) && manifest.appid === baseline.dcloudAppId,
      "DCloud AppID 改变会破坏原应用云打包身份与相关服务配置",
    );
    add(
      "微信小程序 AppID 与热卜星火发布基线一致",
      Boolean(baseline.wechatMiniAppId) && mini.appid === baseline.wechatMiniAppId,
      "新系统必须发布到热卜星火，禁止误发到被限制分享的热卜国学旧小程序",
    );
    add(
      "Android 包名与旧版一致",
      Boolean(androidBaseline.packageName) && androidPackage === androidBaseline.packageName,
      "包名不一致会被商店识别为新应用，老用户无法覆盖升级",
    );
    add(
      "iOS Bundle ID 与旧版一致",
      Boolean(iosBaseline.bundleId) && iosBundleId === iosBaseline.bundleId,
      "Bundle ID 不一致会被 App Store 识别为新应用",
    );
    add(
      "鸿蒙 Bundle Name 与旧版一致",
      Boolean(harmonyBaseline.bundleName) &&
        harmonyBundleName === harmonyBaseline.bundleName,
      "Bundle Name 不一致会被 AppGallery 识别为新应用，旧版无法覆盖升级",
    );
    const currentBuild = Number(manifest.versionCode);
    add(
      "Android 构建号高于线上旧版",
      Number.isInteger(Number(androidBaseline.versionCode)) &&
        currentBuild > Number(androidBaseline.versionCode) &&
        androidBaseline.versionCodeEvidenceVersion === androidBaseline.versionName,
      androidBaseline.versionCodeEvidenceVersion === androidBaseline.versionName
        ? `当前 ${manifest.versionCode || "未配置"}；必须高于线上 versionCode`
        : `仅核验到 ${androidBaseline.versionCodeEvidenceVersion || "未知版本"} 的构建号；须从商店后台确认 ${androidBaseline.versionName || "当前版"} 的 versionCode`,
    );
    add(
      "iOS 构建号高于线上旧版",
      iosBaseline.buildNumber !== null &&
        iosBaseline.buildNumber !== "" &&
        Number.isInteger(Number(iosBaseline.buildNumber)) &&
        currentBuild > Number(iosBaseline.buildNumber),
      `当前 ${manifest.versionCode || "未配置"}；必须高于线上 CFBundleVersion`,
    );
    add(
      "展示版本号高于 Android 线上旧版",
      compareNumericVersions(manifest.versionName, androidBaseline.versionName) === 1,
      `当前 ${manifest.versionName || "未配置"}；必须高于 Android 线上 versionName`,
    );
    add(
      "展示版本号高于 iOS 线上旧版",
      compareNumericVersions(manifest.versionName, iosBaseline.versionName) === 1,
      `当前 ${manifest.versionName || "未配置"}；必须高于 iOS 线上 CFBundleShortVersionString`,
    );
    add(
      "鸿蒙构建号高于线上旧版",
      Number.isInteger(Number(harmonyBaseline.versionCode)) &&
        currentBuild > Number(harmonyBaseline.versionCode),
      `当前 ${manifest.versionCode || "未配置"}；必须高于 AppGallery 线上 versionCode`,
    );
    add(
      "展示版本号高于鸿蒙线上旧版",
      compareNumericVersions(manifest.versionName, harmonyBaseline.versionName) === 1,
      `当前 ${manifest.versionName || "未配置"}；必须高于 AppGallery 线上 versionName`,
    );
    add(
      "鸿蒙正式签名资料已核验",
      harmonyBaseline.signingProfileVerified === true,
      "须在 HBuilderX/DevEco 使用受控发布证书生成 .app，并确认可覆盖安装线上旧版",
      "外部",
    );
  }
}

const failed = checks.filter((item) => !item.pass);
console.log("应用商店覆盖升级门禁");
for (const item of checks) {
  console.log(`${item.pass ? "通过" : "阻断"}：[${item.kind}] ${item.name} —— ${item.detail}`);
}
console.log(`汇总：${checks.length - failed.length}/${checks.length} 通过，${failed.length} 项待完成`);

if (strict && failed.length > 0) {
  console.error("商店提审门禁失败：上述阻断项完成前不得生成正式提审包。");
  process.exit(1);
}

if (!strict && failed.length > 0) {
  console.log("当前为非严格审计：仅报告外部阻断，不影响日常开发构建。");
}
