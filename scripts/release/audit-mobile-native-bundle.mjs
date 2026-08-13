import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function parseArguments(argv) {
  const options = {
    manifest: "apps/mobile/src/manifest.json",
    bundle: "apps/mobile/dist/build/app/app-service.js",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument !== "--manifest" && argument !== "--bundle") {
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

export async function auditMobileNativeBundle({ manifest, bundle }) {
  const manifestPath = resolve(manifest);
  const bundlePath = resolve(bundle);
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

  return { manifestPath, bundlePath };
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
