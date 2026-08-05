import { defineConfig, loadEnv, type Plugin } from "vite";
import uni from "@dcloudio/vite-plugin-uni";
import { resolve } from "path";

const THIRD_PARTY_PROBE_ORIGIN = "https://example.com";
const RESERVED_PROBE_ORIGIN = "https://example.invalid";

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

/** 避免 flv.js 的能力探测地址把公网示例域名带入正式 H5 产物。 */
export function rewriteFlvProbeOrigin(): Plugin {
  return {
    name: "rewrite-flv-probe-origin",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.replaceAll("\\", "/");
      if (!normalizedId.includes("/flv.js/") || !code.includes(THIRD_PARTY_PROBE_ORIGIN)) {
        return null;
      }
      return {
        code: code.replaceAll(THIRD_PARTY_PROBE_ORIGIN, RESERVED_PROBE_ORIGIN),
        map: null,
      };
    },
  };
}

/**
 * DCloud 的 App-Harmony 编译器使用 IIFE 页面脚本；当前版本的编译插件会在
 * 合并用户 Vite 配置时覆盖 output 对象，因此需要在 post 阶段重新声明内联动态导入。
 */
export function harmonyIifeBuildCompatibility(): Plugin {
  return {
    name: "harmony-iife-build-compatibility",
    apply: "build",
    enforce: "post",
    config() {
      if (process.env.UNI_PLATFORM !== "app-harmony") return;
      return {
        build: {
          rollupOptions: {
            output: {
              inlineDynamicImports: true,
            },
          },
        },
      };
    },
    configResolved(config) {
      if (process.env.UNI_PLATFORM !== "app-harmony") return;
      const output = config.build.rollupOptions.output;
      const outputs = Array.isArray(output) ? output : output ? [output] : [];
      for (const item of outputs) {
        delete item.manualChunks;
        item.inlineDynamicImports = true;
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const isHarmonyApp = process.env.UNI_PLATFORM === "app-harmony";
  const devProxyTarget = normalizeOrigin(env.VITE_DEV_PROXY_TARGET || "http://localhost:3000");

  return {
    plugins: [
      rewriteFlvProbeOrigin(),
      uni(),
      harmonyIifeBuildCompatibility(),
    ],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
        // 子路径要排在前面：alias 按顺序匹配，"@guoxue/shared" 在前会把
        // "@guoxue/shared/paipan" 拼成 "src/index.ts/paipan"（构建直接 ENOENT）。
        // 🔴 顺序要紧：更具体的在前。且**必须按子模块引**，不能整包引 ——
        // 主包的 lib/paipan/{jieqi,ganzhi} 若 re-export 整个 paipan/index，
        // 会把奇门/六爻/大六壬三个引擎一起拖进主包（实测主包直接顶到 1.96MB / 上限 2MB）。
        "@guoxue/shared/paipan/jieqi": resolve(
          __dirname,
          "../../packages/shared/src/paipan/jieqi.ts",
        ),
        "@guoxue/shared/paipan/ganzhi": resolve(
          __dirname,
          "../../packages/shared/src/paipan/ganzhi.ts",
        ),
        "@guoxue/shared/paipan/qimen-engine": resolve(
          __dirname,
          "../../packages/shared/src/paipan/qimen-engine.ts",
        ),
        "@guoxue/shared/paipan/daliuren-engine": resolve(
          __dirname,
          "../../packages/shared/src/paipan/daliuren-engine.ts",
        ),
        "@guoxue/shared/paipan/liuyao-engine": resolve(
          __dirname,
          "../../packages/shared/src/paipan/liuyao-engine.ts",
        ),
        "@guoxue/shared/paipan/liuyao-data": resolve(
          __dirname,
          "../../packages/shared/src/paipan/liuyao-data.ts",
        ),
        "@guoxue/shared/paipan": resolve(__dirname, "../../packages/shared/src/paipan/index.ts"),
        "@guoxue/shared": resolve(__dirname, "../../packages/shared/src/index.ts"),
      },
    },
    build: {
      minify: "terser",
      terserOptions: {
        compress: { drop_console: true, drop_debugger: true },
      },
      // iOS Safari/WebView 对 Vite 动态分包的 modulepreload/CSS preload link 处理与安卓 Chrome 不同，
      // preload 失败会导致整个分包 import 被 reject → 懒加载页(如设置页)在 iOS 白屏(安卓正常)。
      // 关闭 modulePreload：__vitePreload 不再注入会失败的 preload link，改用浏览器原生 import() 直接加载分包。
      modulePreload: false,
      // App-Harmony 的页面脚本使用 IIFE 输出，Rollup 不允许 IIFE 与动态代码拆分同时启用。
      // 仅鸿蒙 App 内联动态导入；H5、微信小程序与 Android/iOS 仍保留原有分包策略。
      rollupOptions: isHarmonyApp
        ? {
            output: {
              inlineDynamicImports: true,
            },
          }
        : undefined,
    },
    base: "/h5/",
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: devProxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
