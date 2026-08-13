import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function parseArguments(argv) {
  const options = {
    manifest: "apps/mobile/src/manifest.json",
    bundle: "apps/mobile/dist/build/app/app-service.js",
    nvue: "apps/mobile/dist/build/.nvue/app.js",
    pages: "apps/mobile/src/pages.json",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (
      argument !== "--manifest" &&
      argument !== "--bundle" &&
      argument !== "--nvue" &&
      argument !== "--pages"
    ) {
      throw new Error(`未知参数：${argument}`);
    }
    const value = argv[index + 1];
    if (!value) {
      throw new Error(`参数 ${argument} 缺少路径`);
    }
    options[argument.slice(2)] = value;
    index += 1;
  }

  return options;
}

export async function auditMobileNativeBundle({ manifest, bundle, nvue, pages }) {
  const manifestPath = resolve(manifest);
  const bundlePath = resolve(bundle);
  let nvuePath = resolve(nvue ?? "apps/mobile/dist/build/.nvue/app.js");
  const pagesPath = resolve(pages ?? "apps/mobile/src/pages.json");
  const manifestJson = JSON.parse(await readFile(manifestPath, "utf8"));

  const appPlus = manifestJson["app-plus"] ?? {};
  const modules = appPlus.modules ?? {};
  const nativePlugins = appPlus.nativePlugins ?? {};
  const hasTrtc = Object.keys(nativePlugins).some((name) => name.startsWith("TRTCCloudUniPlugin"));
  if (hasTrtc && Object.hasOwn(modules, "LivePusher")) {
    throw new Error(
      `TRTC 原生插件不能与 DCloud LivePusher 同包：二者包含重复 LiteAV 类：${manifestPath}`,
    );
  }

  if (manifestJson["app-plus"]?.optimization?.codeSplitting === true) {
    throw new Error(
      `App 原生构建禁止启用 app-plus.optimization.codeSplitting：${manifestPath}`,
    );
  }

  const appService = await readFile(bundlePath, "utf8");
  if (/\bdefine\s*\(\s*["']app-service["']/.test(appService)) {
    throw new Error(
      `App 主服务产物使用 AMD define，原生运行时将因 define 未定义而白屏：${bundlePath}`,
    );
  }

  if (hasTrtc) {
    const pagesSource = await readFile(pagesPath, "utf8");
    const mainHostRouteMatch = /"path"\s*:\s*"pkg-live\/host\/index"/.exec(pagesSource);
    const subPackagesMatch = /"subPackages"\s*:/.exec(pagesSource);
    const mainHostRouteIndex = mainHostRouteMatch?.index ?? -1;
    const subPackagesIndex = subPackagesMatch?.index ?? -1;
    if (
      mainHostRouteIndex < 0 ||
      subPackagesIndex < 0 ||
      mainHostRouteIndex > subPackagesIndex ||
      /"path"\s*:\s*"host\/index"/.test(pagesSource.slice(subPackagesIndex))
    ) {
      throw new Error(
        `TRTC 原生 nvue 直播页必须注册在主包，禁止注册为分包页面：${pagesPath}`,
      );
    }

    if (!nvue && !bundlePath.endsWith(resolve("apps/mobile/dist/build/app/app-service.js"))) {
      nvuePath = resolve(bundlePath, "..", "..", ".nvue", "app.js");
    }
    let nvueBundle;
    try {
      nvueBundle = await readFile(nvuePath, "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") {
        throw new Error(`TRTC 原生 nvue 入口不存在，直播间将白屏：${nvuePath}`);
      }
      throw error;
    }
    if (!nvueBundle.includes("TRTCCloudUniPlugin")) {
      throw new Error(`TRTC 原生 nvue 入口未包含插件代码，直播间将白屏：${nvuePath}`);
    }
  }

  return { manifestPath, bundlePath, nvuePath, pagesPath };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const result = await auditMobileNativeBundle(options);
  console.log(`移动端原生脚本门禁通过：${result.bundlePath}`);
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll("\\", "/")}`) {
  main().catch((error) => {
    console.error(`移动端原生脚本门禁失败：${error.message}`);
    process.exitCode = 1;
  });
}
