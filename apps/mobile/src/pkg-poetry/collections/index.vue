<template>
  <view class="pl-page">
    <!-- 顶栏 -->
    <view class="pl-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="pl-header-row">
        <view class="pl-back" @tap="goBack">
          <app-icon name="arrow-left" :size="40" color="var(--foreground)" />
        </view>
        <text class="pl-title">诗词集锦</text>
        <text class="pl-count">{{ items.length }} 首</text>
      </view>
    </view>

    <view class="pl-main">
      <!-- 搜索 -->
      <view class="pl-search">
        <app-icon name="search" :size="32" color="var(--muted-foreground)" class="pl-search-icon" />
        <input v-model="search" class="pl-search-input" placeholder="搜索诗词" />
      </view>

      <view v-if="loading" class="pl-loading"><text class="pl-loading-text">收藏加载中...</text></view>
      <view v-else-if="error" class="pl-error">
        <text class="pl-error-text">{{ error }}</text>
        <view class="pl-retry" @tap="fetchCollections"><text class="pl-retry-text">重试</text></view>
      </view>
      <view v-else-if="!filtered.length" class="pl-empty">
        <text class="pl-empty-text">暂无收藏</text>
      </view>
      <view v-else class="pl-list">
        <view v-for="poem in filtered" :key="poem.id" class="pl-item">
          <view class="pl-item-head">
            <view class="pl-item-info">
              <view class="pl-item-titlerow">
                <text class="pl-item-title">{{ poem.title }}</text>
                <text class="pl-cat" :class="catClass(poem.category)">{{ poem.category }}</text>
              </view>
              <view class="pl-author">
                <image class="pl-avatar" :src="poem.authorAvatar" mode="aspectFill" />
                <text class="pl-author-text">{{ poem.author }} · {{ poem.dynasty }}</text>
              </view>
            </view>
            <view class="pl-like" :class="{ 'pl-like-on': poem.liked }" @tap="toggleLike(poem.id)">
              <app-icon name="heart" :size="28" :color="poem.liked ? '#ef4444' : 'var(--muted-foreground)'" :fill="poem.liked" />
              <text class="pl-like-text" :style="{ color: poem.liked ? '#ef4444' : 'var(--muted-foreground)' }">{{ poem.likes }}</text>
            </view>
          </view>
          <text class="pl-excerpt">{{ poem.excerpt }}</text>
          <text class="pl-time">收藏于 {{ poem.collectedAt }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { navigateBack } from '@/utils/router'
import { poetryApi, type CollectionItem } from '@/lib/poetry-data'

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch (e) {}

const loading = ref(true)
const error = ref('')
const items = ref<CollectionItem[]>([])

async function fetchCollections() {
  loading.value = true
  error.value = ''
  try {
    items.value = await poetryApi.collections()
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => { fetchCollections() })

const search = ref('')

const filtered = computed(() =>
  items.value.filter(
    (p) => p.title.includes(search.value) || p.author.includes(search.value) || p.category.includes(search.value),
  ),
)

function catClass(cat: string) {
  const map: Record<string, string> = {
    易经: 'pl-cat-amber',
    易理: 'pl-cat-amber',
    道学: 'pl-cat-blue',
    风水: 'pl-cat-green',
    八字: 'pl-cat-red',
  }
  return map[cat] || 'pl-cat-muted'
}

function toggleLike(id: string) {
  items.value = items.value.map((p) =>
    p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p,
  )
}

function goBack() {
  navigateBack()
}
</script>

<style scoped>
.pl-page {
  min-height: 100vh;
  background: var(--background);
}
.pl-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--background);
  border-bottom: 2rpx solid var(--border);
}
.pl-header-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 0 32rpx;
  height: 96rpx;
}
.pl-back {
  display: flex;
  align-items: center;
  justify-content: center;
}
.pl-title {
  flex: 1;
  font-size: 32rpx;
  font-weight: 600;
  color: var(--foreground);
}
.pl-count {
  font-size: 22rpx;
  color: var(--muted-foreground);
}
.pl-main {
  padding: 32rpx 32rpx 160rpx;
}
.pl-search {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 32rpx;
}
.pl-search-icon {
  position: absolute;
  left: 24rpx;
  z-index: 1;
}
.pl-search-input {
  width: 100%;
  height: 80rpx;
  padding: 0 32rpx 0 72rpx;
  border-radius: 16rpx;
  background: var(--card);
  border: 2rpx solid var(--border);
  font-size: 28rpx;
  color: var(--foreground);
}
.pl-empty {
  text-align: center;
  padding: 128rpx 0;
}
.pl-empty-text {
  font-size: 26rpx;
  color: var(--muted-foreground);
}
.pl-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.pl-item {
  padding: 32rpx;
  background: var(--card);
  border: 2rpx solid var(--border);
  border-radius: 24rpx;
}
.pl-item-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24rpx;
  margin-bottom: 24rpx;
}
.pl-item-info {
  flex: 1;
  min-width: 0;
}
.pl-item-titlerow {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 4rpx;
}
.pl-item-title {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--foreground);
}
.pl-cat {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
}
.pl-cat-amber {
  background: #fffbeb;
  color: #b45309;
}
.pl-cat-blue {
  background: #eff6ff;
  color: #1d4ed8;
}
.pl-cat-green {
  background: #f0fdf4;
  color: #15803d;
}
.pl-cat-red {
  background: #fef2f2;
  color: #b91c1c;
}
.pl-cat-muted {
  background: var(--muted);
  color: var(--muted-foreground);
}
.pl-author {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.pl-avatar {
  width: 32rpx;
  height: 32rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
}
.pl-author-text {
  font-size: 22rpx;
  color: var(--muted-foreground);
}
.pl-like {
  display: flex;
  align-items: center;
  gap: 4rpx;
  flex-shrink: 0;
}
.pl-like-text {
  font-size: 22rpx;
}
.pl-excerpt {
  display: block;
  font-size: 28rpx;
  font-style: italic;
  line-height: 1.7;
  color: var(--foreground);
  border-left: 4rpx solid rgba(196, 30, 58, 0.4);
  padding-left: 24rpx;
}
.pl-time {
  display: block;
  font-size: 20rpx;
  color: var(--muted-foreground);
  margin-top: 16rpx;
}
/* 加载/错误态 */
.pl-loading { display: flex; align-items: center; justify-content: center; padding: 120rpx 48rpx; }
.pl-loading-text { font-size: 28rpx; color: var(--muted-foreground); }
.pl-error { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 120rpx 48rpx; gap: 24rpx; }
.pl-error-text { font-size: 28rpx; color: #ef4444; text-align: center; }
.pl-retry { padding: 16rpx 48rpx; background: var(--primary); border-radius: 24rpx; }
.pl-retry-text { font-size: 28rpx; color: #fff; font-weight: 600; }
</style>
