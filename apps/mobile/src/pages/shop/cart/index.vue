<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">购物车</text>
      <text class="v0-route">V0: shop/cart</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5]">
          <view class="sticky top-0 z-10 bg-white px-4 py-3 flex items-center gap-3 border-b border-[#E8E3DB]">
            <view class="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
            <view class="h-5 w-20 bg-gray-200 rounded animate-pulse" />
          </view>
          <view class="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <view key={i} class="bg-white rounded-2xl p-4 flex gap-3">
                <view class="w-6 h-6 rounded-full bg-gray-200 animate-pulse" />
                <view class="w-20 h-20 rounded-lg bg-gray-200 animate-pulse" />
                <view class="flex-1 space-y-2">
                  <view class="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                  <view class="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
                  <view class="h-4 w-1/3 bg-gray-200 rounded animate-pulse" />
                </view>
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
const mockCartData = {
    const backup = [...items]

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