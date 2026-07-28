import { defineConfig, loadEnv, type Plugin } from "vite";
import uni from "@dcloudio/vite-plugin-uni";
import { resolve } from "path";

const LEGACY_PUBLIC_ORIGIN = "https://api.rebugx.cn";

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, "");
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const publicAssetOrigin =
    env.VITE_PUBLIC_ASSET_ORIGIN || env.VITE_API_URL || LEGACY_PUBLIC_ORIGIN;

  return {
    plugins: [rewriteLegacyPublicAssets(publicAssetOrigin), uni()],
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
    },
    base: "/h5/",
    server: {
      port: 5173,
      allowedHosts: ["api.rebugx.cn", ".rebugx.cn"],
      proxy: {
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
      },
    },
  };
});
