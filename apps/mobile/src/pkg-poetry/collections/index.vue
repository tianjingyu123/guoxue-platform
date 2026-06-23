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

      <view v-if="!filtered.length" class="pl-empty">
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
import { ref, computed } from 'vue'
import { navigateBack } from '@/utils/router'

const statusBarHeight = ref(0)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 0
} catch (e) {}

interface PoetryItem {
  id: string
  title: string
  author: string
  authorAvatar: string
  dynasty: string
  excerpt: string
  category: string
  likes: number
  liked: boolean
  collectedAt: string
}

const items = ref<PoetryItem[]>([
  { id: '1', title: '乾卦·象辞', author: '文王', authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40', dynasty: '西周', excerpt: '天行健，君子以自强不息。', category: '易经', likes: 8640, liked: true, collectedAt: '2024-01-20' },
  { id: '2', title: '测字诗', author: '邵雍', authorAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=40', dynasty: '宋', excerpt: '一阴一阳之谓道，继之者善也，成之者性也。', category: '易理', likes: 5280, liked: true, collectedAt: '2024-01-18' },
  { id: '3', title: '清平乐·命理感怀', author: '陈抟', authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40', dynasty: '五代', excerpt: '无极生太极，太极动而生阳，静而生阴…', category: '道学', likes: 3960, liked: false, collectedAt: '2024-01-15' },
  { id: '4', title: '堪舆赋', author: '郭璞', authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40', dynasty: '晋', excerpt: '气乘风则散，界水则止。古人聚之使不散，行之使有止，故谓之风水。', category: '风水', likes: 2840, liked: true, collectedAt: '2024-01-12' },
  { id: '5', title: '八字论命赋', author: '徐子平', authorAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=40', dynasty: '宋', excerpt: '五行者，金木水火土是也，各有生克制化之理。', category: '八字', likes: 2160, liked: false, collectedAt: '2024-01-10' },
])

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
</style>
