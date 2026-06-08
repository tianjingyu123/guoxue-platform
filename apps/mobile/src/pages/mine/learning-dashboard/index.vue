<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">我的</text>
      <text class="v0-route">V0: mine/learning-dashboard</text>
    </view>
        <view class="bg-white rounded-2xl p-4 flex flex-col gap-2 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <view class={cn("w-9 h-9 rounded-xl flex items-center justify-center", color)}>
            {{ icon }}
          </view>
          <view class="text-[22px] font-black text-[#2C2C2C] leading-none">{{ value }}</view>
          <view class="text-[12px] text-[#999]">{{ label }}</view>
          <template v-if="sub">
    view class="text-[11px] text-[#C41E3A] font-medium">{{ sub }}</view>}
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const MOCK: LearningDashboard = {
  const labelIndices = [0, 6, 13, 20, 27, 29]

async function fetchData() {
  loading.value = true
  try { loading.value = false } catch (e: any) { error.value = e.message }
}

onMounted(() => fetchData())
onPullDownRefresh(() => fetchData().finally(() => uni.stopPullDownRefresh()))
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}
.v0-header {
  padding: 24rpx 32rpx;
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  margin-bottom: 24rpx;
}
.v0-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #FFFFFF;
  display: block;
}
.v0-route {
  font-size: 20rpx;
  color: rgba(255,255,255,0.6);
  margin-top: 4rpx;
  display: block;
}
.v0-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 32rpx;
  border-radius: 12rpx;
  background: #C41E3A;
  color: #FFFFFF;
  font-size: 28rpx;
}
.v0-hr {
  height: 1px;
  background: #E8E0D5;
  margin: 24rpx 0;
}
</style>