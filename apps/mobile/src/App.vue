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
.app {
  min-height: 100vh;
  background: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
</style>
