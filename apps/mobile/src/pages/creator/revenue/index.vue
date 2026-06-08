<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">创作者中心</text>
      <text class="v0-route">V0: creator/revenue</text>
    </view>
          <view class="relative h-32 mt-4">
            <svg class="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#C41E3A" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#C41E3A" stopOpacity="0" />
                </linearGradient>
              </defs>
              <!--   -->
              <path
                d={`M0,${100 - ((data.trend[0].amount - minAmount) / range) * 80} ${data.trend.map((p, i) => {
                  const x = (i / (data.trend.length - 1)) * 300
                  const y = 100 - ((p.amount - minAmount) / range) * 80
                  return `L${x},${{ y }}`
                }).join(' ')} L300,100 L0,100 Z`}
                fill="url(#trendGradient)"
              />
              <!--   -->
              <path
                d={`M0,${100 - ((data.trend[0].amount - minAmount) / range) * 80} ${data.trend.map((p, i) => {
                  const x = (i / (data.trend.length - 1)) * 300
                  const y = 100 - ((p.amount - minAmount) / range) * 80
                  return `L${x},${{ y }}`
                }).join(' ')}`}
                fill="none"
                stroke="#C41E3A"
                strokeWidth="2"
              />
            </svg>
            <!--   -->
            <view class="flex justify-between mt-2 text-xs text-muted-foreground">
              <text>{{ data.trend[0]?.date.slice(5) }}</text>
              <text>{{ data.trend[Math.floor(data.trend.length / 2)]?.date.slice(5) }}</text>
              <text>{{ data.trend[data.trend.length - 1]?.date.slice(5) }}</text>
            </view>
          </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const SOURCE_ICONS: Record<RevenueSourceType, React.ReactNode> = {
const SOURCE_COLORS: Record<RevenueSourceType, string> = {

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