import { createApp } from "vue";
import { createPinia } from "pinia";
import ElementPlus from "element-plus";
import { ElMessage } from "element-plus";
import "element-plus/dist/index.css";
import App from "./App.vue";
import router from "./router";

const app = createApp(App);

// 全局 Vue 错误处理 — 捕获组件内未处理的异常
app.config.errorHandler = (err, _instance, info) => {
  console.error("[全局错误]", info, err);
  // axios 错误已由 API 拦截器统一提示，此处不重复弹出
  if ((err as any)?.response?.status) return;
  const msg = err instanceof Error ? err.message : String(err);
  ElMessage.error(`操作失败：${msg}`);
};

// 全局 Promise 未捕获 rejection（网络异常等）
window.addEventListener("unhandledrejection", (event) => {
  console.error("[未捕获 Promise]", event.reason);
  // 已由 axios 拦截器处理的 401 / 网络错误不再重复提示
  if (event.reason?.response?.status) return;
  ElMessage.error("网络异常，请稍后重试");
});

app.use(createPinia());
app.use(router);
app.use(ElementPlus, { locale: undefined });
app.mount("#app");
