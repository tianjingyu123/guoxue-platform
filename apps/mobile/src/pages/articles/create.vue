<template>
  <view class="page v0-page" data-v0-route="articles/create">
          <view class="min-h-screen bg-background flex flex-col">
            <view class="sticky top-0 z-50 bg-white border-b border-muted">
              <view class="flex items-center justify-between px-4 h-12">
                <view class="v0-btn" @click={() => router.back()} class="p-2 -ml-2">
                  <ArrowLeft class="w-5 h-5 text-foreground" />
                </view>
                <text class="font-medium text-foreground">写文章</text>
                <view class="w-9" />
              </view>
            </view>
            <view class="flex-1 flex flex-col items-center justify-center p-6">
              <Crown class="w-16 h-16 text-gold mb-4" />
              <text class="h2" class="text-lg font-semibold text-foreground mb-2">暂无发布权限</text>
              <text class="text-sm text-muted-foreground text-center mb-6">
                根据平台规则，只有圈主和嘉宾才能发布文章。<text />
                您可以创建自己的圈子成为圈主。
              </text>
              <Link 
                href="/circles/create"
                class="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-medium"
              >
                <Plus class="w-5 h-5" />
                创建圈子
              </Link>
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
    // TODO: 集成真实 API - V0 路由: articles/create
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