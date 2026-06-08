<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">预约</text>
      <text class="v0-route">V0: circles/[id]/booking</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5]">
          <view class="h-14 bg-white" />
          <view class="p-4 space-y-4">
            <view class="h-6 w-24 bg-gray-200 rounded animate-pulse" />
            <view class="flex gap-3 overflow-x-auto pb-2">
              {[1, 2, 3].map(i => (
                <view key={i} class="w-32 h-40 bg-gray-200 rounded-xl animate-pulse flex-shrink-0" />
              ))}
            </view>
            <view class="h-6 w-24 bg-gray-200 rounded animate-pulse mt-6" />
            <view class="h-48 bg-gray-200 rounded-xl animate-pulse" />
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
const mockExperts: Expert[] = [
const mockSlots: TimeSlot[] = [
    const days: (Date | null)[] = []
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"]

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