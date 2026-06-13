<template>
  <view class="app">
    <router-view />
  </view>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useStationStore } from "@/store/stationStore";

const stationStore = useStationStore();

onMounted(async () => {
  const options = uni.getLaunchOptionsSync();
  const stationCode = options?.query?.station_code;
  if (stationCode) {
    try { await stationStore.fetchBrand(stationCode); } catch {}
  }
});
</script>

<style>
/* ===== UniApp 全局重置 — 对齐 V0 设计 ===== */

/* 盒模型统一 */
*, ::before, ::after {
  box-sizing: border-box;
}

/* 页面基底 */
page {
  background: #FAF8F5;
  font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
  color: #2C2C2C;
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app {
  min-height: 100vh;
  background: #FAF8F5;
}

/* UniApp 自定义元素重置 */
uni-view { display: block; }
uni-text { display: inline; }
uni-page, uni-page-wrapper, uni-page-body {
  display: block;
  min-height: 100vh;
  background: inherit;
}
uni-page-head { display: none; }

/* 通用工具类 */
.card {
  background: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}
.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.text-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.safe-padding-top { padding-top: env(safe-area-inset-top); }
.safe-padding-bottom { padding-bottom: env(safe-area-inset-bottom); }
</style>
