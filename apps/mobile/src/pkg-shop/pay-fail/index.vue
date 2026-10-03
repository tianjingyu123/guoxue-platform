<template>
  <view class="result-redirect">
    <app-loading />
    <text>正在核对订单最新状态…</text>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import AppLoading from '@/components/common/app-loading.vue'
import { redirectTo } from '@/utils/router'

// 兼容旧支付失败深链，统一由查单页判断最终状态和可用操作。
onLoad((query) => {
  const orderId = String(query?.orderId || '').trim()
  redirectTo(`/shop/pay-timeout${orderId ? `?orderId=${encodeURIComponent(orderId)}` : ''}`)
})
</script>

<style scoped>
.result-redirect {
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
