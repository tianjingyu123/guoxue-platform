<template>
  <view class="app">
    <router-view />
  </view>
</template>

<script lang="ts">
export default {
  onLaunch() {
    const options = uni.getLaunchOptionsSync();
    const stationCode = options?.query?.station_code;
    if (stationCode) {
      import('@/store/stationStore').then(({ useStationStore }) => {
        const store = useStationStore();
        store.fetchBrand(stationCode).catch(() => {});
      });
    }
  },
};
</script>

<script setup lang="ts">
import { onMounted } from "vue";
import { useStationStore } from "@/store/stationStore";

const stationStore = useStationStore();

onMounted(async () => {
  // 应用初始化
});
</script>

<style>
/* 全局重置与设计系统 */
page {
  background: #F5F0E8;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: #2C2C2C;
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
}

.app {
  min-height: 100vh;
  background: #F5F0E8;
}

/* ── 通用卡片 ── */
.card {
  background: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

/* ── 通用按钮 ── */
.btn-primary {
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  color: #FFFFFF;
  border: none;
  border-radius: 20px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
}
.btn-primary:active {
  transform: scale(0.98);
}

.btn-gold {
  background: linear-gradient(135deg, #C9A96E, #D4AF37);
  color: #FFFFFF;
  border: none;
  border-radius: 20px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
}

/* ── 文字截断 ── */
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

/* ── 安全区 ── */
.safe-padding-top {
  padding-top: env(safe-area-inset-top);
}
.safe-padding-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

/* ── 无更多 ── */
.no-more {
  text-align: center;
  color: #999999;
  font-size: 12px;
  padding: 20px;
}
</style>
