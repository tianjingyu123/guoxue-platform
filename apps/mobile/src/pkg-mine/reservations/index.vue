<template>
  <!-- 「我的预约」与「预约记录」(bookings) 文案功能重复，收敛为单一 bookings 页，本页仅作薄重定向防断链 -->
  <view class="page">
    <text class="tip">正在前往预约记录…</text>
  </view>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { redirectTo } from '@/utils/router'

onMounted(() => {
  redirectTo('/mine/bookings')
})
</script>

<style scoped>
.page { min-height: 100vh; background: #FAF8F5; display: flex; align-items: center; justify-content: center; }
.tip { font-size: 28rpx; color: #8A8478; }
</style>
