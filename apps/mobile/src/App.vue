<template>
  <view class="app">
    <router-view />
  </view>
</template>

<script setup lang="ts">
import { onMounted } from "vue";

onMounted(() => {
  // V0 全局初始化逻辑
});
</script>

<style lang="scss">
@use "@/styles/tokens.scss";

page {
  background: var(--bg-paper, #FAF8F5);
  font-family: var(--font-sans, 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif);
  color: var(--text-ink, #2C2C2C);
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
}

.app {
  min-height: 100vh;
  background: var(--bg-paper, #FAF8F5);
}
</style>
