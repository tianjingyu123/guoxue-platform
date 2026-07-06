import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";
import { resolve } from "path";

export default defineConfig({
  plugins: [uni()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
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
  base: '/h5/',
  server: {
    port: 5173,
    allowedHosts: ['api.rebugx.cn', '.rebugx.cn'],
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
