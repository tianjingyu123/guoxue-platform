<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">我的</text>
      <text class="v0-route">V0: mine/edit-profile</text>
    </view>
          <view class="min-h-screen bg-[#FAF8F5]">
            <view class="sticky top-0 z-10 bg-white border-b border-[#E8E3DB]">
              <view class="flex items-center justify-between h-14 px-4">
                <view class="w-20 h-5 bg-muted rounded animate-pulse" />
                <view class="w-10 h-5 bg-muted rounded animate-pulse" />
              </view>
            </view>
            <view class="p-4 space-y-6">
              <view class="flex justify-center">
                <view class="w-24 h-24 rounded-full bg-muted animate-pulse" />
              </view>
              <view class="space-y-4">
                <view class="h-14 bg-muted rounded-xl animate-pulse" />
                <view class="h-32 bg-muted rounded-xl animate-pulse" />
              </view>
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
const defaultInterests = [
    const newErrors: Record<string, string> = {}

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