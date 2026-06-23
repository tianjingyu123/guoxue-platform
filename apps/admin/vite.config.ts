import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig(({ command }) => ({
  // 生产构建时部署在 /admin/ 子路径下，开发时用根路径
  base: command === "build" ? "/admin/" : "/",
  plugins: [vue()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
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
    chunkSizeWarningLimit: 1000,
  },
}));
