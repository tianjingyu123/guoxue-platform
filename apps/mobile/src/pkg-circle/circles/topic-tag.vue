<template>
  <view class="topic-tag">
    <!-- 顶部导航 -->
    <view class="header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="header-inner">
        <view class="nav-btn" @tap="onBack">
          <app-icon name="arrow-left" :size="36" color="#2C2C2C" />
        </view>
        <text class="header-title">话题</text>
        <view class="nav-btn" />
      </view>
    </view>

    <!-- 话题信息区（仅展示真实字段：标签名 + 真实内容总数） -->
    <view class="topic-info">
      <view class="tag-head">
        <view class="hash-box">
          <app-icon name="hash" :size="34" color="#C41E3A" />
        </view>
        <text class="tag-name">#{{ tagName }}#</text>
      </view>
      <view class="tag-stats">
        <text class="stat-item"><text class="stat-num">{{ total }}</text> 篇内容</text>
      </view>
    </view>

    <!-- 排序切换（客户端排序：最新=后端默认 createdAt 倒序；最热=按点赞数） -->
    <view class="sort-bar">
      <view class="sort-tabs">
        <view class="sort-tab" :class="{ active: sortBy === 'latest' }" @tap="sortBy = 'latest'">
          <text class="sort-text">最新发布</text>
        </view>
        <view class="sort-tab" :class="{ active: sortBy === 'hot' }" @tap="sortBy = 'hot'">
          <text class="sort-text">最受欢迎</text>
        </view>
      </view>
    </view>

    <!-- loading -->
    <view v-if="loading" class="state">
      <app-icon name="loader-2" :size="40" color="#C41E3A" class="spin" />
      <text class="state-txt">加载中...</text>
    </view>

    <!-- error -->
    <view v-else-if="error" class="state">
      <text class="state-txt">加载失败，请稍后重试</text>
      <view class="retry" @tap="reload"><text class="retry-txt">重试</text></view>
    </view>

    <!-- empty -->
    <view v-else-if="sortedContent.length === 0" class="state">
      <app-icon name="hash" :size="64" color="#D8D2C8" />
      <text class="state-txt">该话题下暂无内容</text>
    </view>

    <!-- 内容列表 -->
    <view v-else class="content-list">
      <view v-for="item in sortedContent" :key="item.id" class="content-item" @tap="onItemTap(item)">
        <view class="article-card">
          <view class="article-body">
            <view class="type-badge" :class="badgeClass(item.type)">
              <text class="badge-text" :style="{ color: badgeColor(item.type) }">{{ typeLabel(item.type) }}</text>
            </view>
            <text class="article-title">{{ item.title }}</text>
            <text v-if="item.excerpt" class="article-excerpt">{{ item.excerpt }}</text>
            <view class="item-foot">
              <view class="author-mini">
                <view class="avatar-mini" :style="{ background: avatarBg(item.author || '佚') }">
                  <text class="avatar-mini-text">{{ (item.author || '佚').charAt(0) }}</text>
                </view>
                <text class="author-mini-name">{{ item.author || '佚名' }}</text>
                <text v-if="item.dynasty" class="dynasty-tag">{{ item.dynasty }}</text>
              </view>
              <view class="meta-mini">
                <view class="meta-cell"><app-icon name="heart" :size="22" color="#999999" /><text class="meta-mini-text">{{ item.likeCount }}</text></view>
                <view class="meta-cell"><app-icon name="eye" :size="22" color="#999999" /><text class="meta-mini-text">{{ formatNum(item.viewCount) }}</text></view>
                <text class="meta-mini-text">{{ relTime(item.createdAt) }}</text>
              </view>
            </view>
          </view>
          <view v-if="item.cover" class="article-cover">
            <image lazy-load :src="item.cover" class="cover-img" mode="aspectFill" />
          </view>
        </view>
      </view>
    </view>

    <!-- 加载更多 -->
    <view v-if="!loading && !error && sortedContent.length > 0 && hasMore" class="load-more" @tap="loadMore">
      <view v-if="loadingMore" class="loading-row">
        <app-icon name="loader-2" :size="28" color="#999999" class="spin" />
        <text class="load-text">加载中...</text>
      </view>
      <text v-else class="load-text">点击加载更多</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { navigateBack, navigateTo } from '@/utils/router'
import { tagApi, type TagContentItem } from '@/lib/article-data'

const statusBarHeight = ref(20)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 20
} catch (e) {}

// 读取 onLoad 参数 tag（话题名）
function readTagParam(): string {
  try {
    const pages = getCurrentPages()
    const cur: any = pages[pages.length - 1]
    const raw = (cur && cur.options && (cur.options.tag || cur.options.name)) || ''
    try { return decodeURIComponent(raw) } catch { return raw }
  } catch (e) {
    return ''
  }
}

const tagName = ref(readTagParam() || '话题')
const sortBy = ref<'latest' | 'hot'>('latest')

const contentList = ref<TagContentItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const loading = ref(true)
const error = ref(false)
const loadingMore = ref(false)

const hasMore = computed(() => contentList.value.length < total.value)

const sortedContent = computed(() => {
  const arr = [...contentList.value]
  if (sortBy.value === 'hot') arr.sort((a, b) => b.likeCount - a.likeCount)
  return arr
})

async function reload() {
  loading.value = true
  error.value = false
  page.value = 1
  try {
    const res = await tagApi.posts(tagName.value, 1, pageSize)
    contentList.value = res.items
    total.value = res.total
  } catch (e) {
    error.value = true
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  try {
    const next = page.value + 1
    const res = await tagApi.posts(tagName.value, next, pageSize)
    contentList.value = contentList.value.concat(res.items)
    total.value = res.total
    page.value = next
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loadingMore.value = false
  }
}

reload()

function formatNum(n: number) {
  return (n || 0).toLocaleString()
}

function relTime(iso: string) {
  const t = new Date(iso).getTime()
  if (!t) return ''
  const diff = Date.now() - t
  const h = Math.floor(diff / 3600000)
  if (h < 1) return '刚刚'
  if (h < 24) return `${h}小时前`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}天前`
  return new Date(iso).toLocaleDateString('zh-CN')
}

const TYPE_MAP: Record<string, { label: string; cls: string; color: string }> = {
  ARTICLE: { label: '文章', cls: 'badge-article', color: '#3b82f6' },
  POEM: { label: '诗词', cls: 'badge-poem', color: '#a855f7' },
  CLASSIC: { label: '典籍', cls: 'badge-classic', color: '#22c55e' },
}
function typeLabel(t: string) { return TYPE_MAP[t]?.label || '内容' }
function badgeClass(t: string) { return TYPE_MAP[t]?.cls || 'badge-article' }
function badgeColor(t: string) { return TYPE_MAP[t]?.color || '#3b82f6' }

const avatarColors = ['#C41E3A', '#C9A96E', '#2563eb', '#059669', '#d97706']
function avatarBg(name: string) {
  let sum = 0
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i)
  return avatarColors[sum % avatarColors.length]
}

function onBack() { navigateBack() }
function onItemTap(item: TagContentItem) { navigateTo(`/content/${item.id}`) }
</script>

<style scoped>
.topic-tag {
  min-height: 100vh;
  background: #FAF8F5;
  padding-bottom: 48rpx;
}
.header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(250, 248, 245, 0.95);
  border-bottom: 1rpx solid #EFEAE3;
}
.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  height: 112rpx;
}
.nav-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.header-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2C2C2C;
}
.topic-info {
  padding: 40rpx 32rpx;
  border-bottom: 1rpx solid #EFEAE3;
}
.tag-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.hash-box {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  background: rgba(196, 30, 58, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.tag-name {
  font-size: 40rpx;
  font-weight: 700;
  color: #2C2C2C;
}
.tag-stats {
  display: flex;
  align-items: center;
  gap: 32rpx;
}
.stat-item {
  font-size: 28rpx;
  color: #999999;
}
.stat-num {
  font-weight: 600;
  color: #2C2C2C;
}
.sort-bar {
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid #EFEAE3;
}
.sort-tabs {
  display: inline-flex;
  gap: 16rpx;
}
.sort-tab {
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  background: #F0EBE3;
}
.sort-tab.active {
  background: var(--brand);
}
.sort-text {
  font-size: 26rpx;
  color: #2C2C2C;
}
.sort-tab.active .sort-text {
  color: #FFFFFF;
}
.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  padding: 140rpx 0;
}
.state-txt {
  font-size: 26rpx;
  color: #999999;
}
.retry {
  padding: 12rpx 48rpx;
  border-radius: 999rpx;
  background: var(--brand);
}
.retry-txt {
  font-size: 26rpx;
  color: #FFFFFF;
}
.content-list {
  background: #FFFFFF;
}
.content-item {
  border-bottom: 1rpx solid #EFEAE3;
}
.article-card {
  padding: 32rpx;
  display: flex;
  gap: 24rpx;
}
.article-body {
  flex: 1;
  min-width: 0;
}
.type-badge {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  margin-bottom: 12rpx;
}
.badge-article { background: rgba(59, 130, 246, 0.1); }
.badge-poem { background: rgba(168, 85, 247, 0.1); }
.badge-classic { background: rgba(34, 197, 94, 0.1); }
.badge-text {
  font-size: 20rpx;
}
.article-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
  line-height: 1.4;
  margin-bottom: 12rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.article-excerpt {
  font-size: 24rpx;
  color: #999999;
  line-height: 1.5;
  margin-bottom: 16rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.article-cover {
  width: 192rpx;
  height: 128rpx;
  border-radius: 16rpx;
  background: #F2EFEA;
  flex-shrink: 0;
  overflow: hidden;
}
.cover-img {
  width: 100%;
  height: 100%;
}
.item-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.author-mini {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.avatar-mini {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.avatar-mini-text {
  font-size: 20rpx;
  color: #FFFFFF;
}
.author-mini-name {
  font-size: 24rpx;
  color: #999999;
}
.dynasty-tag {
  font-size: 18rpx;
  padding: 0 8rpx;
  border-radius: 6rpx;
  background: rgba(201, 169, 110, 0.2);
  color: #C9A96E;
}
.meta-mini {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.meta-cell {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.meta-mini-text {
  font-size: 24rpx;
  color: #999999;
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx 0;
}
.loading-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.load-text {
  font-size: 28rpx;
  color: #999999;
}
</style>
