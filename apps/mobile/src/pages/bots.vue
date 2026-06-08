<template>
  <view class="page v0-page" data-v0-route="bots">
          <view class="min-h-screen bg-[#FAF8F5]">
            <view class="bg-gradient-to-r from-[#C41E3A] to-[#A01830] text-white p-4 pb-6">
              <view class="flex items-center gap-3 mb-4">
                <Skeleton class="w-8 h-8 rounded-full bg-white/20" />
                <Skeleton class="h-6 w-32 bg-white/20" />
              </view>
              <Skeleton class="h-10 w-full rounded-full bg-white/20" />
            </view>
            <view class="p-4 space-y-4">
              <view class="flex gap-2 overflow-x-auto pb-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} class="h-8 w-20 rounded-full flex-shrink-0" />
                ))}
              </view>
              <view class="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} class="h-48 rounded-xl" />
                ))}
              </view>
            </view>
          </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)
const isEmpty = ref(false)

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    // TODO: 集成真实 API - V0 路由: bots
    loading.value = false
  } catch (e: any) {
    error.value = e.message || '加载失败'
    loading.value = false
  }
}

onMounted(() => { fetchData() })
onPullDownRefresh(() => { fetchData().finally(() => uni.stopPullDownRefresh()) })
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}

.v0-page {
  padding: 24rpx;
}

/* 按钮样式 */
.v0-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 32rpx;
  border-radius: 12rpx;
  background: #C41E3A;
  color: #FFFFFF;
  font-size: 28rpx;
  font-weight: 500;
}

/* 列表项 */
.v0-li {
  padding: 24rpx;
  border-bottom: 1px solid #E8E0D5;
}

/* 分隔线 */
.hr {
  height: 1px;
  background: #E8E0D5;
  margin: 24rpx 0;
}
</style>