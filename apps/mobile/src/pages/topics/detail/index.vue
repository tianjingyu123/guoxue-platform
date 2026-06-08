<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">话题</text>
      <text class="v0-route">V0: topics/[id]</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5]">
          <view class="h-48 bg-gradient-to-br from-[#C41E3A]/20 to-[#C9A96E]/20 animate-pulse" />
          <view class="px-4 -mt-8">
            <view class="bg-white rounded-2xl p-4 shadow-sm">
              <view class="h-6 w-32 bg-[#F2EFEA] rounded animate-pulse mb-2" />
              <view class="h-4 w-full bg-[#F2EFEA] rounded animate-pulse mb-4" />
              <view class="flex gap-4">
                <view class="h-8 w-20 bg-[#F2EFEA] rounded animate-pulse" />
                <view class="h-8 w-20 bg-[#F2EFEA] rounded animate-pulse" />
              </view>
            </view>
          </view>
          <view class="px-4 mt-4 space-y-3">
            {[1, 2, 3].map(i => (
              <view key={i} class="bg-white rounded-xl p-4 animate-pulse">
                <view class="flex gap-3 mb-3">
                  <view class="w-10 h-10 bg-[#F2EFEA] rounded-full" />
                  <view class="flex-1">
                    <view class="h-4 w-24 bg-[#F2EFEA] rounded mb-1" />
                    <view class="h-3 w-16 bg-[#F2EFEA] rounded" />
                  </view>
                </view>
                <view class="h-4 w-full bg-[#F2EFEA] rounded mb-2" />
                <view class="h-4 w-2/3 bg-[#F2EFEA] rounded" />
              </view>
            ))}
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
const mockTopic: Topic = {
const mockPosts: TopicPost[] = [

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