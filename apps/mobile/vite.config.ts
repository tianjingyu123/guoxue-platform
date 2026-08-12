import { defineConfig, loadEnv, type Plugin } from "vite";
import uni from "@dcloudio/vite-plugin-uni";
import { resolve } from "path";

const LEGACY_PUBLIC_ORIGIN = "https://api.rebugx.cn";
const THIRD_PARTY_PROBE_ORIGIN = "https://example.com";
const RESERVED_PROBE_ORIGIN = "https://example.invalid";
const REQUIRED_PRODUCTION_CLIENT_ENV = [
  "VITE_API_URL",
  "VITE_PUBLIC_H5_URL",
  "VITE_PUBLIC_ASSET_ORIGIN",
] as const;
const EXPLICIT_CLIENT_ENV = [...REQUIRED_PRODUCTION_CLIENT_ENV, "VITE_RELEASE_CHANNEL"] as const;
const FORMAL_RELEASE_CHANNELS = new Set(["formal", "production"]);

const FORMAL_CLIENT_ENV = {
  VITE_API_URL: "https://api.rebugx.cn",
  VITE_PUBLIC_H5_URL: "https://api.rebugx.cn/h5/",
  VITE_PUBLIC_ASSET_ORIGIN: "https://static.rebugx.cn",
} as const;

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export function resolveClientEnv(
  loadedEnv: Record<string, string>,
  explicitEnv: Record<string, string | undefined>,
): Record<string, string> {
  const resolved = { ...loadedEnv };
  for (const key of EXPLICIT_CLIENT_ENV) {
    if (Object.prototype.hasOwnProperty.call(explicitEnv, key)) {
      resolved[key] = explicitEnv[key] || "";
    }
  }
  return resolved;
}

export function validateProductionClientEnv(mode: string, env: Record<string, string>): void {
  if (mode !== "production") return;

  const missing = REQUIRED_PRODUCTION_CLIENT_ENV.filter((key) => !env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`生产客户端构建缺少公开配置：${missing.join(", ")}`);
  }

  for (const key of REQUIRED_PRODUCTION_CLIENT_ENV) {
    let parsed: URL;
    try {
      parsed = new URL(env[key]);
    } catch {
      throw new Error(`生产客户端构建配置 ${key} 不是有效 URL`);
    }
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) {
      throw new Error(`生产客户端构建配置 ${key} 必须是无凭据、查询参数和片段的 HTTPS URL`);
    }
  }

  if (FORMAL_RELEASE_CHANNELS.has(env.VITE_RELEASE_CHANNEL)) {
    const mismatched = Object.entries(FORMAL_CLIENT_ENV)
      .filter(([key, expected]) => env[key] !== expected)
      .map(([key]) => key);
    if (mismatched.length > 0) {
      throw new Error(`正式客户端构建域名不符合发布基线：${mismatched.join(", ")}`);
    }
  }
}

/**
 * 历史演示数据中仍有旧站绝对资源地址。迁移期间不能逐条依赖旧域名，
 * 构建时统一改写到新对象存储/CDN；未配置时才保留现网地址供本地开发。
 */
export function rewriteLegacyPublicAssets(publicAssetOrigin: string): Plugin {
  const targetOrigin = normalizeOrigin(publicAssetOrigin) || LEGACY_PUBLIC_ORIGIN;
  return {
    name: "rewrite-legacy-public-assets",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.replaceAll("\\", "/");
      if (
        !normalizedId.includes("/apps/mobile/src/") ||
        !code.includes(`${LEGACY_PUBLIC_ORIGIN}/assets`)
      ) {
        return null;
      }
      return {
        code: code.replaceAll(`${LEGACY_PUBLIC_ORIGIN}/assets`, `${targetOrigin}/assets`),
        map: null,
      };
    },
  };
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
 * App 原生运行时使用 IIFE 主服务脚本。Android/iOS 云端运行时未提供 AMD define，
 * 因此动态导入必须内联；H5 与小程序仍保留原有分包策略。
 */
export function nativeAppIifeBuildCompatibility(): Plugin {
  return {
    name: "native-app-iife-build-compatibility",
    apply: "build",
    enforce: "post",
    config() {
      if (process.env.UNI_PLATFORM !== "app-harmony" && process.env.UNI_PLATFORM !== "app") return;
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
      if (process.env.UNI_PLATFORM !== "app-harmony" && process.env.UNI_PLATFORM !== "app") return;
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
  const env = resolveClientEnv(loadEnv(mode, __dirname, ""), process.env);
  validateProductionClientEnv(mode, env);
  const isNativeRuntimeApp =
    process.env.UNI_PLATFORM === "app-harmony" || process.env.UNI_PLATFORM === "app";
  const publicAssetOrigin =
    env.VITE_PUBLIC_ASSET_ORIGIN || env.VITE_API_URL || LEGACY_PUBLIC_ORIGIN;
  const devProxyTarget = normalizeOrigin(env.VITE_DEV_PROXY_TARGET || "http://localhost:3000");

  return {
    plugins: [
      rewriteLegacyPublicAssets(publicAssetOrigin),
      rewriteFlvProbeOrigin(),
      uni(),
      nativeAppIifeBuildCompatibility(),
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
        compress: { drop_console: true, drop_debugger: true, passes: 3 },
      },
      // iOS Safari/WebView 对 Vite 动态分包的 modulepreload/CSS preload link 处理与安卓 Chrome 不同，
      // preload 失败会导致整个分包 import 被 reject → 懒加载页(如设置页)在 iOS 白屏(安卓正常)。
      // 关闭 modulePreload：__vitePreload 不再注入会失败的 preload link，改用浏览器原生 import() 直接加载分包。
      modulePreload: false,
      // App 原生运行时的页面脚本使用 IIFE，Rollup 不允许 IIFE 与动态代码拆分同时启用。
      // 仅 App 原生平台内联动态导入；H5 与小程序仍保留原有分包策略。
      rollupOptions: isNativeRuntimeApp
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
      allowedHosts: ["api.rebugx.cn", ".rebugx.cn"],
      proxy: {
        "/api": {
          target: devProxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
