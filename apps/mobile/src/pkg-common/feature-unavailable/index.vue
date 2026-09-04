<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import type { ClientModule } from '@/lib/client-module-policy'

const module = ref<ClientModule>('live')
const labels: Record<ClientModule, string> = { live: '直播', merchant: '商家服务', shop: '商城交易', member: '会员服务', video: '短视频', circle: '圈子', ai: '智能服务' }
const label = computed(() => labels[module.value] || '该功能')

onLoad((query) => {
  const value = String(query?.module || '') as ClientModule
  if (Object.prototype.hasOwnProperty.call(labels, value)) module.value = value
})

function goHome() {
  uni.reLaunch({ url: '/pages/index/index' })
}
</script>

<template>
  <view class="page">
    <view class="card">
      <view class="icon"><AppIcon name="shield-check" :size="64" color="#A64A42" /></view>
      <text class="title">{{ label }}暂未开放</text>
      <text class="desc">该板块正在进行服务调整，历史订单和已有权益不受影响。开放时间请以平台公告为准。</text>
      <view class="button" role="button" tabindex="0" @tap="goHome" @keydown.enter="goHome">
        <text class="button-text">返回首页</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; box-sizing: border-box; display: flex; align-items: center; justify-content: center; padding: calc(48rpx + env(safe-area-inset-top)) 32rpx calc(48rpx + env(safe-area-inset-bottom)); background: #faf8f5; }
.card { width: 100%; max-width: 640rpx; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; padding: 64rpx 42rpx; border: 2rpx solid rgba(166, 74, 66, 0.12); border-radius: 32rpx; background: #fff; box-shadow: 0 16rpx 48rpx rgba(58, 45, 36, 0.07); }
.icon { width: 112rpx; height: 112rpx; display: flex; align-items: center; justify-content: center; border-radius: 56rpx; background: rgba(166, 74, 66, 0.08); }
.title { margin-top: 34rpx; color: #302923; font-size: 36rpx; font-weight: 700; }
.desc { margin-top: 20rpx; color: #776d64; font-size: 27rpx; line-height: 1.75; text-align: center; }
.button { width: 100%; margin-top: 44rpx; padding: 24rpx 0; border-radius: 48rpx; background: #a64a42; text-align: center; }
.button-text { color: #fff; font-size: 29rpx; font-weight: 600; }
</style>
