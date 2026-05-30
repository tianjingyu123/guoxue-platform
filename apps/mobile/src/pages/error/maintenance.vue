<template>
  <view class="page">
    <view class="error-zone">
      <text class="error-icon">🔧</text>
      <text class="error-title">系统维护中</text>
      <text class="error-desc">{{ message || '系统正在升级维护，请稍后再来' }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
const message = ref('')
onMounted(() => {
  message.value = (getCurrentPages().pop()?.options || {}).message || ''
})
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
.error-zone { text-align: center; padding: 40px; }
.error-icon { font-size: 64px; display: block; }
.error-title { font-size: 20px; font-weight: bold; display: block; margin-top: 16px; }
.error-desc { font-size: 14px; color: #666; display: block; margin-top: 8px; }
</style>
