<template>
  <view class="redirect-state">
    <app-loading />
    <text>正在打开交易申诉…</text>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import AppLoading from '@/components/common/app-loading.vue'
import { redirectTo } from '@/utils/router'

// 保留旧页面直达链接，但所有申诉都进入已接通后台的同一流程。
onLoad((query) => {
  const orderId = String(query?.orderId || query?.id || '').trim()
  redirectTo(`/orders/dispute${orderId ? `?orderId=${encodeURIComponent(orderId)}` : ''}`)
})
</script>

<style scoped>
.redirect-state {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  background: #FAF8F5;
  color: #555;
  font-size: 28rpx;
}
</style>
