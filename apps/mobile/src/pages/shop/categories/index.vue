<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">categories</text>
      <text class="v0-route">V0: shop/categories</text>
    </view>
          <view class="min-h-screen bg-[#FAF8F5]">
            <view class="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3">
              <view class="h-6 w-24 bg-gray-200 rounded animate-pulse mx-auto" />
            </view>
            <view class="flex h-[calc(100vh-52px)]">
              <view class="w-24 bg-[#F5F2EF] border-r border-[#E8E3DB] p-2 space-y-2">
                {[...Array(8)].map((_, i) => (
                  <view key={i} class="h-12 bg-gray-200 rounded animate-pulse" />
                ))}
              </view>
              <view class="flex-1 p-4">
                <view class="grid grid-cols-2 gap-3">
                  {[...Array(6)].map((_, i) => (
                    <view key={i} class="bg-white rounded-xl p-3 animate-pulse">
                      <view class="aspect-square bg-gray-200 rounded-lg mb-2" />
                      <view class="h-4 bg-gray-200 rounded w-3/4 mb-1" />
                      <view class="h-4 bg-gray-200 rounded w-1/2" />
                    </view>
                  ))}
                </view>
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
const mockCategories: ProductCategory[] = [

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