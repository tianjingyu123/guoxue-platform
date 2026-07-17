<template>
  <view class="page">
    <!-- AI 搜索弹窗（公共组件，待 AI 搜索后端接入，本批不动） -->
    <AiSearchModal :is-open="aiOpen" context="文章" @close="aiOpen = false" />

    <!-- 顶部导航 -->
    <view class="header">
      <view class="nav-bar">
        <view class="nav-btn" @tap="goBack">
          <AppIcon name="arrow-left" :size="20" color="#2C2C2C" />
        </view>
        <text class="nav-title">文章</text>
        <view class="flex-1" />
        <view class="ai-btn" @tap="aiOpen = true">
          <AppIcon name="sparkles" :size="18" color="#C41E3A" />
          <text class="ai-btn-text">AI搜索</text>
        </view>
      </view>

      <!-- 搜索框 -->
      <view class="search-wrap">
        <view class="search-box">
          <AppIcon name="search" :size="16" color="#999" />
          <input
            v-model="searchQuery"
            class="search-input"
            placeholder="搜索文章标题或内容"
            placeholder-class="search-ph"
          />
          <view v-if="searchQuery" class="search-clear" @tap="searchQuery = ''">
            <AppIcon name="x" :size="16" color="#999" />
          </view>
        </view>
      </view>

      <!-- 分类 Tab（全部 + 热门标签真连） -->
      <scroll-view scroll-x class="cat-scroll">
        <view class="cat-row">
          <view
            class="cat-chip"
            :class="{ active: activeTag === '' }"
            @tap="selectTag('')"
          >
            <text class="cat-label" :class="{ active: activeTag === '' }">全部</text>
          </view>
          <view
            v-for="tag in hotTags"
            :key="tag.id"
            class="cat-chip"
            :class="{ active: activeTag === tag.name }"
            @tap="selectTag(tag.name)"
          >
            <text class="cat-label" :class="{ active: activeTag === tag.name }">{{ tag.name }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 排序栏 -->
    <view class="sort-bar">
      <text class="sort-count">共 {{ total }} 篇文章</text>
      <view class="sort-wrap">
        <view class="sort-trigger" @tap="showSortMenu = !showSortMenu">
          <text class="sort-text">{{ sortBy === 'latest' ? '最新发布' : '最受欢迎' }}</text>
          <AppIcon name="chevron-down" :size="16" color="#2C2C2C" :class="{ flip: showSortMenu }" />
        </view>
        <view v-if="showSortMenu" class="sort-menu">
          <view class="sort-option" :class="{ active: sortBy === 'latest' }" @tap="selectSort('latest')">最新发布</view>
          <view class="sort-option" :class="{ active: sortBy === 'popular' }" @tap="selectSort('popular')">最受欢迎</view>
        </view>
      </view>
    </view>

    <!-- 文章列表 -->
    <scroll-view scroll-y class="list-scroll">
      <view class="list">
        <!-- loading -->
        <view v-if="loading" class="state">
          <AppIcon name="loader-2" :size="28" color="#C41E3A" class="spin" />
          <text class="state-text">加载中...</text>
        </view>

        <!-- error -->
        <view v-else-if="error" class="state">
          <view class="state-icon"><AppIcon name="alert-circle" :size="32" color="#C41E3A" /></view>
          <text class="state-text">{{ error }}</text>
          <view class="retry-btn" @tap="loadList"><text class="retry-text">重试</text></view>
        </view>

        <!-- 列表 -->
        <template v-else-if="displayArticles.length > 0">
          <view
            v-for="article in displayArticles"
            :key="article.id"
            class="article-card"
            @tap="navigateTo(`/articles/${article.id}`)"
          >
            <!-- 封面：有图显图，无图/坏图翻书法兜底（不再露破图/无关 stock 空框） -->
            <view class="article-cover-wrap">
              <smart-cover :src="article.cover" :title="article.title" type="default" deco :deco-size="56" />
            </view>
            <view class="article-body">
              <view class="article-title-row">
                <text class="article-title">{{ article.title }}</text>
              </view>
              <text v-if="article.excerpt" class="article-excerpt">{{ article.excerpt }}</text>
              <view class="article-foot">
                <view class="article-author">
                  <smart-avatar class="author-avatar-img" :src="article.user?.avatar" :name="article.user?.nickname || '匿名'" />
                  <text class="author-name">{{ article.user?.nickname || '匿名' }}</text>
                </view>
                <view class="article-stats">
                  <view class="stat">
                    <AppIcon name="heart" :size="14" color="#999" />
                    <text class="stat-text">{{ article.likeCount }}</text>
                  </view>
                  <view class="stat">
                    <AppIcon name="eye" :size="14" color="#999" />
                    <text class="stat-text">{{ article.viewCount }}</text>
                  </view>
                  <text class="stat-text">{{ formatDate(article.createdAt) }}</text>
                </view>
              </view>
            </view>
          </view>

          <view v-if="hasMore" class="load-more" @tap="loadMore">
            <text class="load-more-text">{{ loadingMore ? '加载中...' : '点击加载更多' }}</text>
          </view>
          <view v-else class="load-more">
            <text class="load-more-text">没有更多了</text>
          </view>
        </template>

        <!-- empty -->
        <view v-else class="empty">
          <view class="empty-icon">
            <AppIcon name="file-text" :size="32" color="#999" />
          </view>
          <text class="empty-text">{{ searchQuery ? '没有匹配的文章' : '暂无相关文章' }}</text>
          <text class="empty-tip">{{ searchQuery ? '换个关键词试试' : '换个分类看看' }}</text>
        </view>
      </view>
      <view class="bottom-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import AiSearchModal from '@/components/common/ai-search-modal.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { goBack, navigateTo } from '@/utils/router'
import { articleApi, tagApi, type ArticleListItem, type HotTag } from '@/lib/article-data'

const searchQuery = ref('')
const activeTag = ref('')          // 空=全部，否则为标签名
const sortBy = ref<'latest' | 'popular'>('latest')
const showSortMenu = ref(false)
const aiOpen = ref(false)

const circleId = ref<string | undefined>(undefined)
const hotTags = ref<HotTag[]>([])
const articles = ref<ArticleListItem[]>([])
const total = ref(0)
const loading = ref(false)
const error = ref('')

const page = ref(1)
const pageSize = 20
const hasMore = ref(false)
const loadingMore = ref(false)

onLoad((q) => {
  if (q?.circleId) circleId.value = q.circleId
  loadTags()
  loadList()
})

async function loadTags() {
  try {
    hotTags.value = await tagApi.hot(12)
  } catch {
    hotTags.value = []   // 标签拉取失败不阻塞列表，降级隐藏
  }
}

async function loadList() {
  loading.value = true
  error.value = ''
  page.value = 1
  try {
    const res = await articleApi.list({
      page: 1,
      pageSize,
      circleId: circleId.value,
      tag: activeTag.value || undefined,
    })
    articles.value = res.items
    total.value = res.total
    hasMore.value = res.items.length >= pageSize
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请稍后重试'
    articles.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  try {
    const next = page.value + 1
    const res = await articleApi.list({
      page: next,
      pageSize,
      circleId: circleId.value,
      tag: activeTag.value || undefined,
    })
    articles.value.push(...res.items)
    page.value = next
    hasMore.value = res.items.length >= pageSize
  } catch {
    // 加载更多失败静默，保留已加载内容
  } finally {
    loadingMore.value = false
  }
}

function selectTag(name: string) {
  if (activeTag.value === name) return
  activeTag.value = name
  loadList()
}

// 搜索 + 排序：对已加载列表前端处理（后端列表接口不支持关键词搜索/排序）
const displayArticles = computed(() => {
  let list = articles.value
  if (searchQuery.value) {
    const kw = searchQuery.value
    list = list.filter((a) => a.title.includes(kw) || (a.excerpt || '').includes(kw))
  }
  return [...list].sort((a, b) => {
    if (sortBy.value === 'popular') return b.likeCount - a.likeCount
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
})

function selectSort(s: 'latest' | 'popular') {
  sortBy.value = s
  showSortMenu.value = false
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays}天前`
  return `${date.getMonth() + 1}-${date.getDate()}`
}
</script>

<style scoped>
.page {
  /* iOS Safari flex bug：用固定 height 才能让 flex:1 滚动子项正确填充(min-height:100vh 会算出高度0致内容空白) */
  height: 100vh;
  background: #faf8f5;
  display: flex;
  flex-direction: column;
}
.flex-1 {
  flex: 1;
}
.header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: rgba(250, 248, 245, 0.96);
  border-bottom: 2rpx solid #ece7df;
}
.nav-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  height: 96rpx;
  padding: 0 24rpx;
}
.nav-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.ai-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(196, 30, 58, 0.08);
}
.ai-btn-text {
  font-size: 24rpx;
  color: var(--brand);
}
.search-wrap {
  padding: 0 24rpx 16rpx;
}
.search-box {
  display: flex;
  align-items: center;
  gap: 12rpx;
  height: 72rpx;
  padding: 0 24rpx;
  background: #f0ebe2;
  border-radius: 999rpx;
}
.search-input {
  flex: 1;
  font-size: 26rpx;
  color: #2c2c2c;
}
.search-ph {
  color: #999;
}
.search-clear {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cat-scroll {
  white-space: nowrap;
  padding: 0 24rpx 16rpx;
}
.cat-row {
  display: inline-flex;
  gap: 8rpx;
}
.cat-chip {
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  background: #f0ebe2;
}
.cat-chip.active {
  background: var(--brand);
}
.cat-label {
  font-size: 26rpx;
  font-weight: 500;
  color: #999;
}
.cat-label.active {
  color: #fff;
}
.sort-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  border-bottom: 2rpx solid #ece7df;
}
.sort-count {
  font-size: 26rpx;
  color: #999;
}
.sort-wrap {
  position: relative;
}
.sort-trigger {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.sort-text {
  font-size: 26rpx;
  color: #2c2c2c;
}
.flip {
  transform: rotate(180deg);
}
.sort-menu {
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 8rpx;
  width: 200rpx;
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.12);
  border: 2rpx solid #ece7df;
  overflow: hidden;
  z-index: 50;
}
.sort-option {
  padding: 24rpx 28rpx;
  font-size: 26rpx;
  color: #2c2c2c;
}
.sort-option.active {
  color: var(--brand);
  font-weight: 500;
}
.list-scroll {
  flex: 1;
  height: 0;
  min-height: 0;
}
.list {
  padding: 24rpx;
}
.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
  gap: 20rpx;
}
.state-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 999rpx;
  background: rgba(196, 30, 58, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}
.state-text {
  font-size: 26rpx;
  color: #999;
}
.retry-btn {
  margin-top: 8rpx;
  padding: 14rpx 48rpx;
  border-radius: 999rpx;
  background: var(--brand);
}
.retry-text {
  font-size: 26rpx;
  color: #fff;
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.article-card {
  display: flex;
  gap: 24rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}
/* 4:3 横图缩略图（头条式口径·规范§五修订=文章缩略图横小图·固定 rpx 宽高非 aspect-ratio，X5 安全） */
.article-cover-wrap {
  width: 176rpx;
  height: 132rpx;
  border-radius: 16rpx;
  flex-shrink: 0;
  overflow: hidden;
}
.article-body {
  flex: 1;
  min-width: 0;
  min-height: 132rpx; /* 与横图齐平兜底：底部作者/数据行 margin-top:auto 沉底 */
  display: flex;
  flex-direction: column;
}
.article-title-row {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
}
.article-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.article-excerpt {
  font-size: 22rpx;
  color: #666;
  line-height: 1.5;
  margin-top: 8rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.article-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 16rpx;
}
.article-author {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.author-avatar-img {
  width: 36rpx;
  height: 36rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
}
.author-name {
  font-size: 22rpx;
  color: #666;
}
.article-stats {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.stat {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.stat-text {
  font-size: 22rpx;
  color: #999;
}
.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx 0;
}
.load-more-text {
  font-size: 26rpx;
  color: #999;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}
.empty-icon {
  width: 128rpx;
  height: 128rpx;
  border-radius: 999rpx;
  background: #f0ebe2;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.empty-text {
  font-size: 28rpx;
  color: #999;
}
.empty-tip {
  font-size: 24rpx;
  color: #bbb;
  margin-top: 8rpx;
}
.bottom-safe {
  height: 48rpx;
}
</style>
