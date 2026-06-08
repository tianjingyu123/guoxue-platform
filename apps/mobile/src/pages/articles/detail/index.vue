<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">文章</text>
      <text class="v0-route">V0: articles/[id]</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5] animate-pulse">
          <view class="aspect-video bg-[#E8E3DB]" />
          <view class="bg-white -mt-4 rounded-t-[20px] relative z-10 p-4 space-y-4">
            <view class="h-7 bg-[#F2EFEA] rounded w-3/4" />
            <view class="flex items-center gap-3">
              <view class="w-10 h-10 rounded-full bg-[#F2EFEA]" />
              <view class="space-y-2">
                <view class="h-4 w-24 bg-[#F2EFEA] rounded" />
                <view class="h-3 w-16 bg-[#F2EFEA] rounded" />
              </view>
            </view>
            <!--   -->
            <view class="p-3 bg-[#F9F6F2] rounded-lg space-y-2">
              <view class="h-4 w-20 bg-[#E8E3DB] rounded" />
              <view class="h-3 bg-[#E8E3DB] rounded w-full" />
              <view class="h-3 bg-[#E8E3DB] rounded w-4/5" />
            </view>
            <view class="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <view key={i} class="h-4 bg-[#F2EFEA] rounded" :style=" width: `${{ 100 - i * 10 }}%` }} />
              ))}
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
const defaultComments: Comment[] = [

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