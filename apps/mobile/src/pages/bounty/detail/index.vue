<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">悬赏</text>
      <text class="v0-route">V0: bounty/[id]</text>
    </view>
          <view class="min-h-screen bg-background">
            <view class="sticky top-0 z-10 bg-background border-b border-border">
              <view class="flex items-center justify-between px-4 h-14">
                <view class="v0-btn" @click={() => router.back()} class="p-2 -ml-2">
                  <ChevronLeft class="w-5 h-5" />
                </view>
                <text class="font-medium">悬赏详情</text>
                <view class="w-9" />
              </view>
            </view>
            <view class="p-4 space-y-4">
              <view class="animate-pulse space-y-3">
                <view class="h-6 bg-muted rounded w-3/4" />
                <view class="h-4 bg-muted rounded w-1/2" />
                <view class="h-32 bg-muted rounded-xl" />
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
      const mockBounty: BountyDetail = {
    const configs: Record<string, { label: string; color: string; bg: string }> = {

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