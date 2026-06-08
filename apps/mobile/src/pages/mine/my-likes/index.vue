<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">我的</text>
      <text class="v0-route">V0: mine/my-likes</text>
    </view>
        <view class="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <view key={i} class="bg-white rounded-lg p-4 animate-pulse">
              <view class="flex items-start gap-3">
                <view class="w-10 h-10 bg-gray-200 rounded-lg flex-shrink-0" />
                <view class="flex-1 min-w-0">
                  <view class="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <view class="flex items-center gap-2">
                    <view class="w-5 h-5 bg-gray-200 rounded-full" />
                    <view class="h-3 bg-gray-200 rounded w-16" />
                    <view class="h-3 bg-gray-200 rounded w-24 ml-auto" />
                  </view>
                </view>
              </view>
            </view>
          ))}
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
  const iconMap: Record<LikeTargetType, React.ReactNode> = {
  const colorMap: Record<LikeTargetType, string> = {
const filterOptions: { label: string; value: LikeTargetType | 'all' }[] = [

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