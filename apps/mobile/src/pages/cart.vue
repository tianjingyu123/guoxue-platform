<template>
  <view class="page v0-page" data-v0-route="cart">
        <view class="space-y-4 p-4">
          {[1, 2].map((group) => (
            <Card key={group} class="p-4 bg-card animate-pulse">
              <view class="flex items-center gap-3 mb-4">
                <view class="w-6 h-6 rounded-full bg-secondary" />
                <view class="h-4 w-24 bg-secondary rounded" />
              </view>
              {[1, 2].map((item) => (
                <view key={item} class="flex gap-3 py-3 border-t border-border/50">
                  <view class="w-5 h-5 rounded bg-secondary" />
                  <view class="w-20 h-20 rounded-lg bg-secondary" />
                  <view class="flex-1 space-y-2">
                    <view class="h-4 w-3/4 bg-secondary rounded" />
                    <view class="h-3 w-1/2 bg-secondary rounded" />
                    <view class="h-4 w-16 bg-secondary rounded" />
                  </view>
                </view>
              ))}
            </Card>
          ))}
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
    // TODO: 集成真实 API - V0 路由: cart
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