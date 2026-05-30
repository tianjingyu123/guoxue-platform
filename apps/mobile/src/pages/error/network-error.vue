<template>
  <view class="page">
    <view class="error-zone">
      <text class="error-icon">📡</text>
      <text class="error-title">网络连接断开</text>
      <text class="error-desc">请检查您的网络连接后重试</text>
      <button class="btn-retry" @click="retry">重新加载</button>
    </view>
  </view>
</template>

<script setup lang="ts">
function retry() {
  const pages = getCurrentPages()
  const prev = pages[pages.length - 2]
  if (prev) { uni.navigateBack() } else { uni.reLaunch({ url: '/pages/index/index' }) }
}
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
.error-zone { text-align: center; padding: 40px; }
.error-icon { font-size: 64px; display: block; }
.error-title { font-size: 20px; font-weight: bold; display: block; margin-top: 16px; }
.error-desc { font-size: 14px; color: #666; display: block; margin-top: 8px; }
.btn-retry { width: 160px; height: 40px; background: #C41E3A; color: #fff; border-radius: 20px; font-size: 15px; border: none; margin: 20px auto 0; text-align: center; line-height: 40px; }
</style>
