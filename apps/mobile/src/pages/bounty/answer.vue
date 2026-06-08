<template>
  <view class="page v0-page" data-v0-route="bounty/answer">
          <view class="min-h-screen bg-background">
            <view class="sticky top-0 z-10 bg-background border-b border-border">
              <view class="flex items-center h-14 px-4">
                <view class="v0-btn" @click={() => router.back()} class="p-2 -ml-2">
                  <ChevronLeft class="w-5 h-5" />
                </view>
                <text class="ml-2 font-medium">回答悬赏</text>
              </view>
            </view>
            <view class="p-4 space-y-4">
              <view class="animate-pulse space-y-3">
                <view class="h-24 bg-muted rounded-2xl" />
                <view class="h-48 bg-muted rounded-2xl" />
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
    // TODO: 集成真实 API - V0 路由: bounty/answer
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