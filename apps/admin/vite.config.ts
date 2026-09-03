import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
import { resolve } from "path";

export default defineConfig(({ command, isPreview }) => ({
  // 生产构建及本地 production preview 均使用 /admin/，仅开发服务器使用根路径。
  base: command === "build" || isPreview ? "/admin/" : "/",
  plugins: [
    vue(),
    Components({
      directives: true,
      resolvers: [ElementPlusResolver({ importStyle: "css", directives: true })],
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      // VOD SDK 只用 sha1() 生成断点续传键；替换掉含 eval(Node require) 的旧版 js-sha1。
      "js-sha1": resolve(__dirname, "src/vendor/js-sha1-browser.cjs"),
      // @guoxue/shared 直指源码，避免 CJS dist 产物导致 Rollup 无法静态分析导出
      "@guoxue/shared": resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 8080,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  // 让本地生产构建预览具备与开发服务器一致的联调能力，便于登录后全链路验收。
  preview: {
    host: "127.0.0.1",
    port: 4173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    // 生产环境：代码压缩 + 混淆 + 去除 console
    minify: "terser",
    terserOptions: {
      compress: { drop_console: true, drop_debugger: true },
      mangle: { safari10: true },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/vue') || id.includes('node_modules/vue-router') || id.includes('node_modules/pinia')) return 'vendor';
          if (id.includes('node_modules/element-plus')) return 'element';
          if (id.includes('node_modules/echarts') || id.includes('node_modules/zrender')) return 'echarts';
        },
      },
    },
    // 当前最大公共块约 931 kB；留出有限增长空间，后续越过预算即在构建阶段告警。
    chunkSizeWarningLimit: 950,
  },
}));
