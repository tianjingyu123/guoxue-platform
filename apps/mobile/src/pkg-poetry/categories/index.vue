<template>
  <view class="pc-page">
    <!-- 顶栏 -->
    <view class="pc-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="pc-header-row">
        <view class="pc-back" @tap="goBack">
          <app-icon name="arrow-left" :size="40" color="var(--foreground)" />
        </view>
        <text class="pc-title">诗词分类</text>
      </view>
    </view>

    <view class="pc-main">
      <view v-if="loading" class="pc-loading"><text class="pc-loading-text">分类加载中...</text></view>
      <view v-else-if="error" class="pc-error">
        <text class="pc-error-text">{{ error }}</text>
        <view class="pc-retry" @tap="fetchCategories"><text class="pc-retry-text">重试</text></view>
      </view>
      <view v-else v-for="cat in categories" :key="cat.id" class="pc-item" @tap="toCategory(cat.id)">
        <text class="pc-emoji">{{ cat.icon }}</text>
        <view class="pc-body">
          <view class="pc-head">
            <text class="pc-name">{{ cat.name }}</text>
            <text class="pc-count">{{ cat.count.toLocaleString() }} 首</text>
          </view>
          <text class="pc-desc">{{ cat.desc }}</text>
          <view class="pc-subs">
            <text v-for="s in cat.subCategories" :key="s" class="pc-sub">{{ s }}</text>
          </view>
        </view>
        <app-icon name="chevron-right" :size="28" color="var(--muted-foreground)" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { poetryApi, type PoemCategory } from '@/lib/poetry-data'

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch (e) {}

const loading = ref(true)
const error = ref('')
const categories = ref<PoemCategory[]>([])

async function fetchCategories() {
  loading.value = true
  error.value = ''
  try {
    categories.value = await poetryApi.categories()
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => { fetchCategories() })

function goBack() {
  navigateBack()
}
function toCategory(id: string) {
  navigateTo(`/poetry/categories/${id}`)
}
</script>

<style scoped>
.pc-page {
  min-height: 100vh;
  background: var(--background);
}
.pc-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--background);
  border-bottom: 2rpx solid var(--border);
}
.pc-header-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 0 32rpx;
  height: 96rpx;
}
.pc-back {
  display: flex;
  align-items: center;
  justify-content: center;
}
.pc-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--foreground);
}
.pc-main {
  padding: 32rpx 32rpx 160rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.pc-item {
  display: flex;
  align-items: center;
  gap: 32rpx;
  padding: 32rpx;
  background: var(--card);
  border: 2rpx solid var(--border);
  border-radius: 24rpx;
}
.pc-emoji {
  font-size: 56rpx;
  flex-shrink: 0;
}
.pc-body {
  flex: 1;
  min-width: 0;
}
.pc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 4rpx;
}
.pc-name {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--foreground);
}
.pc-count {
  font-size: 22rpx;
  color: var(--muted-foreground);
}
.pc-desc {
  display: block;
  font-size: 22rpx;
  color: var(--muted-foreground);
  margin-bottom: 16rpx;
}
.pc-subs {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.pc-sub {
  font-size: 20rpx;
  padding: 2rpx 16rpx;
  border-radius: 999rpx;
  background: var(--muted);
  color: var(--muted-foreground);
}
/* 加载/错误态 */
.pc-loading { display: flex; align-items: center; justify-content: center; padding: 120rpx 48rpx; }
.pc-loading-text { font-size: 28rpx; color: var(--muted-foreground); }
.pc-error { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 120rpx 48rpx; gap: 24rpx; }
.pc-error-text { font-size: 28rpx; color: #e74c3c; text-align: center; }
.pc-retry { padding: 16rpx 48rpx; background: var(--primary); border-radius: 24rpx; }
.pc-retry-text { font-size: 28rpx; color: #fff; font-weight: 600; }
</style>
