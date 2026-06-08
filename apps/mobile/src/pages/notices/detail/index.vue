<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">notices</text>
      <text class="v0-route">V0: notices/[id]</text>
    </view>
          <view class="min-h-screen bg-background">
            <!--   -->
            <view class="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
              <view class="flex items-center justify-between px-4 h-14">
                <BackButton fallbackUrl="/notices" />
                <text class="text-lg font-semibold">公告详情</text>
                <view class="w-10" />
              </view>
            </view>
    
            <view class="p-4 space-y-4">
              <Skeleton class="h-8 w-3/4" />
              <view class="flex items-center gap-4">
                <Skeleton class="h-5 w-20" />
                <Skeleton class="h-5 w-32" />
              </view>
              <Skeleton class="h-40 w-full" />
              <view class="space-y-2">
                <Skeleton class="h-4 w-full" />
                <Skeleton class="h-4 w-full" />
                <Skeleton class="h-4 w-3/4" />
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
  const icons: Record<string, React.ReactNode> = {

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