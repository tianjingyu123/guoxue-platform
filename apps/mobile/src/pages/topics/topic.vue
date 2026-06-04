<template>
  <view class="page">
    <view class="header">
      <view class="header-inner">
        <text class="back-btn" @click="goBack">‹</text>
        <text class="header-title">话题</text>
        <text class="share-btn" @click="handleShare">📤</text>
      </view>
    </view>

    <!-- 话题信息 -->
    <view class="topic-info">
      <view class="ti-left">
        <view class="ti-hash"><text>#</text></view>
        <view><text class="ti-tag">#{{ tag }}#</text><text class="ti-desc">{{ description }}</text></view>
      </view>
      <text class="ti-follow" :class="{ followed: isFollowed }" @click="toggleFollow">{{ isFollowed ? '✓ 已关注' : '+ 关注' }}</text>
    </view>

    <!-- 统计数据 -->
    <view class="topic-stats">
      <text class="ts-item"><text class="ts-num">{{ contentCount.toLocaleString() }}</text><text class="ts-label">篇内容</text></text>
      <text class="ts-item"><text class="ts-num">{{ followCount.toLocaleString() }}</text><text class="ts-label">人关注</text></text>
    </view>

    <!-- 排序栏 -->
    <view class="sort-bar">
      <view class="sort-left">
        <text class="sort-btn" :class="{ active: sortBy === 'latest' }" @click="sortBy = 'latest'">最新发布</text>
        <text class="sort-btn" :class="{ active: sortBy === 'hot' }" @click="sortBy = 'hot'">最受欢迎</text>
      </view>
      <text class="refresh-btn" @click="refresh">{{ isRefreshing ? '刷新中...' : '刷新' }}</text>
    </view>

    <!-- 内容列表 -->
    <view class="content-list">
      <view v-for="item in sortedContent" :key="item.id" class="content-item" @click="goItem(item)">
        <!-- 文章 -->
        <template v-if="item.type === 'article'">
          <view class="ci-left">
            <view class="ci-type-tag blue"><text>📄 文章</text></view>
            <text class="ci-title">{{ item.title }}</text>
            <text class="ci-excerpt">{{ item.excerpt }}</text>
            <view class="ci-meta">
              <text class="ci-author">{{ item.author?.name }}</text>
              <text class="ci-stat">❤ {{ item.likes }}</text>
              <text class="ci-stat">💬 {{ item.comments }}</text>
              <text class="ci-time">{{ item.time }}</text>
            </view>
          </view>
          <view class="ci-thumb"><text>📄</text></view>
        </template>

        <!-- 帖子 -->
        <template v-if="item.type === 'post'">
          <view class="ci-full">
            <view class="ci-user">
              <text class="ci-avatar">{{ (item.author?.name || '?')[0] }}</text>
              <view><text class="ci-author-name">{{ item.author?.name }}</text><text class="ci-time">{{ item.time }}</text></view>
              <text class="ci-type-tag green">💬 帖子</text>
            </view>
            <text class="ci-content">{{ item.content }}</text>
            <view class="ci-stats">
              <text>❤ {{ item.likes }}</text>
              <text>💬 {{ item.comments }}</text>
            </view>
          </view>
        </template>

        <!-- 视频 -->
        <template v-if="item.type === 'video'">
          <view class="ci-left">
            <view class="ci-type-tag purple"><text>🎬 视频</text></view>
            <text class="ci-title">{{ item.title }}</text>
            <view class="ci-meta">
              <text class="ci-author">{{ item.author?.name }}</text>
              <text class="ci-stat">❤ {{ item.likes }}</text>
              <text class="ci-stat">👁 {{ item.views }}</text>
              <text class="ci-time">{{ item.time }}</text>
            </view>
          </view>
          <view class="ci-video-thumb">
            <text class="ci-video-icon">▶</text>
            <text class="ci-duration">{{ item.duration }}</text>
          </view>
        </template>
      </view>
    </view>

    <!-- 加载更多 -->
    <view v-if="sortedContent.length" class="load-more" @click="loadMore">
      <text>{{ isLoadingMore ? '⏳ 加载中...' : '点击加载更多' }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const tag = ref(''); const description = ref(''); const contentCount = ref(0); const followCount = ref(0)
const isFollowed = ref(false); const sortBy = ref<'latest' | 'hot'>('latest'); const isRefreshing = ref(false); const isLoadingMore = ref(false)

interface ContentItem { id: number; type: string; title?: string; excerpt?: string; content?: string; cover?: string; duration?: string; likes: number; comments?: number; views?: number; time: string; author?: { name: string; avatar?: string; isVerified?: boolean } }

const contentList = ref<ContentItem[]>([])

const sortedContent = computed(() => {
  if (sortBy.value === 'hot') return [...contentList.value].sort((a, b) => b.likes - a.likes)
  return contentList.value
})

onMounted(() => {
  const opts = (getCurrentPages().pop()?.options || {})
  tag.value = opts.tag || '国学文化'
  description.value = '分享国学经典，探讨传统文化'
  contentCount.value = 1286; followCount.value = 3560
  uni.setNavigationBarTitle({ title: `#${tag.value}` })
  // Mock data
  contentList.value = [
    { id: 1, type: 'article', title: '从八字看事业转机', excerpt: '今天分享一个真实案例...', likes: 328, comments: 56, time: '2小时前', author: { name: '周易大师', isVerified: true } },
    { id: 2, type: 'post', content: '刚看完一个财运很旺的八字，年柱甲子...', likes: 89, comments: 23, time: '3小时前', author: { name: '命理小白' } },
    { id: 3, type: 'video', title: '实战讲解：如何从八字看婚姻缘分', duration: '05:32', likes: 1256, views: 8900, time: '昨天', author: { name: '玄学研究员', isVerified: true } },
    { id: 4, type: 'article', title: '八字中的食伤生财格局详解', excerpt: '食伤生财是八字中常见的富贵格局...', likes: 456, comments: 78, time: '昨天', author: { name: '易学传承', isVerified: true } },
  ]
})

function toggleFollow() { isFollowed.value = !isFollowed.value }
function refresh() { isRefreshing.value = true; setTimeout(() => isRefreshing.value = false, 1000) }
function loadMore() { isLoadingMore.value = true; setTimeout(() => isLoadingMore.value = false, 1000) }
function goItem(item: ContentItem) { uni.showToast({ title: `查看${item.type}详情` }) }
function handleShare() { uni.showToast({ title: '已复制分享链接' }) }
function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }
.header { background: #fff; border-bottom: 1rpx solid #E5E1DB; position: sticky; top: 0; z-index: 10; }
.header-inner { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; }
.back-btn { font-size: 36rpx; color: #2C2C2C; font-weight: bold; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.share-btn { font-size: 32rpx; color: #999; }
.topic-info { display: flex; justify-content: space-between; align-items: flex-start; padding: 24rpx; background: #fff; }
.ti-left { display: flex; gap: 16rpx; flex: 1; }
.ti-hash { width: 64rpx; height: 64rpx; background: rgba(196,30,58,0.1); border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 36rpx; color: #C41E3A; font-weight: bold; }
.ti-tag { font-size: 36rpx; font-weight: bold; color: #2C2C2C; display: block; }
.ti-desc { font-size: 24rpx; color: #999; margin-top: 8rpx; display: block; }
.ti-follow { padding: 10rpx 28rpx; background: #C41E3A; color: #fff; border-radius: 28rpx; font-size: 24rpx; flex-shrink: 0; }
.ti-follow.followed { background: #f5f0e8; color: #666; }
.topic-stats { padding: 0 24rpx 16rpx; background: #fff; display: flex; gap: 32rpx; }
.ts-item { display: flex; gap: 8rpx; align-items: baseline; }
.ts-num { font-size: 28rpx; font-weight: bold; color: #2C2C2C; }
.ts-label { font-size: 22rpx; color: #999; }
.sort-bar { display: flex; justify-content: space-between; align-items: center; padding: 12rpx 24rpx; background: #fff; border-bottom: 1rpx solid #E5E1DB; }
.sort-left { display: flex; gap: 8rpx; }
.sort-btn { font-size: 24rpx; color: #999; padding: 8rpx 16rpx; }
.sort-btn.active { color: #C41E3A; font-weight: 500; }
.refresh-btn { font-size: 24rpx; color: #C41E3A; }
.content-list { padding: 0; }
.content-item { padding: 20rpx 24rpx; background: #fff; border-bottom: 1rpx solid #f5f5f5; display: flex; gap: 16rpx; }
.ci-left { flex: 1; min-width: 0; }
.ci-type-tag { font-size: 20rpx; display: inline-block; margin-bottom: 8rpx; }
.ci-type-tag.blue { color: #1976d2; }
.ci-type-tag.green { color: #2e7d32; }
.ci-type-tag.purple { color: #7b1fa2; }
.ci-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ci-excerpt { font-size: 24rpx; color: #666; display: block; margin-top: 6rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ci-meta { display: flex; gap: 16rpx; margin-top: 8rpx; font-size: 20rpx; color: #999; align-items: center; }
.ci-author { color: #666; }
.ci-stat { display: flex; align-items: center; gap: 4rpx; }
.ci-time { color: #ccc; }
.ci-thumb { width: 140rpx; height: 100rpx; background: #f5f0e8; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; font-size: 40rpx; flex-shrink: 0; }
.ci-video-thumb { width: 180rpx; background: #f5f0e8; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; position: relative; flex-shrink: 0; }
.ci-video-icon { width: 56rpx; height: 56rpx; background: rgba(0,0,0,0.4); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 24rpx; }
.ci-duration { position: absolute; bottom: 8rpx; right: 8rpx; padding: 2rpx 8rpx; background: rgba(0,0,0,0.6); color: #fff; font-size: 18rpx; border-radius: 6rpx; }
.ci-full { width: 100%; }
.ci-user { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.ci-avatar { width: 48rpx; height: 48rpx; border-radius: 50%; background: #f5f0e8; display: flex; align-items: center; justify-content: center; font-size: 22rpx; color: #C9A96E; }
.ci-author-name { font-size: 24rpx; font-weight: 500; color: #2C2C2C; display: block; }
.ci-content { font-size: 26rpx; color: #2C2C2C; display: block; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }
.ci-stats { display: flex; gap: 20rpx; margin-top: 12rpx; font-size: 22rpx; color: #999; }
.load-more { text-align: center; padding: 24rpx; font-size: 26rpx; color: #999; }
</style>
