<template>
  <view class="page">
    <!-- AI 搜索弹窗（公共组件，待 AI 搜索后端接入，本批不动） -->
    <AiSearchModal :is-open="aiOpen" context="文章" @close="aiOpen = false" />

    <!-- 顶部导航 -->
    <view class="header">
      <view class="nav-bar">
        <view
          class="nav-btn"
          role="button"
          aria-label="返回上一页"
          tabindex="0"
          @tap="goBack"
          @keydown="activateOnKeyboard($event, goBack)"
        >
          <AppIcon name="arrow-left" :size="44" color="#2C2C2C" />
        </view>
        <text class="nav-title">文章</text>
        <view class="flex-1" />
        <view
          class="ai-btn"
          role="button"
          aria-label="打开文章 AI 搜索"
          tabindex="0"
          @tap="aiOpen = true"
          @keydown="activateOnKeyboard($event, () => aiOpen = true)"
        >
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
            aria-label="搜索文章标题或内容"
            placeholder="搜索文章标题或内容"
            placeholder-class="search-ph"
          />
          <view
            v-if="searchQuery"
            class="search-clear"
            role="button"
            aria-label="清空文章搜索"
            tabindex="0"
            @tap="searchQuery = ''"
            @keydown="activateOnKeyboard($event, () => searchQuery = '')"
          >
            <AppIcon name="x" :size="16" color="#999" />
          </view>
        </view>
      </view>

      <!-- 分类 Tab（全部 + 热门标签真连） -->
      <scroll-view scroll-x class="cat-scroll">
        <view class="cat-row" role="tablist" aria-label="文章分类">
          <view
            class="cat-chip"
            :class="{ active: activeTag === '' }"
            role="tab"
            :aria-selected="activeTag === '' ? 'true' : 'false'"
            :tabindex="activeTag === '' ? 0 : -1"
            @tap="selectTag('')"
            @keydown="onCategoryKeydown($event, '')"
          >
            <text class="cat-label" :class="{ active: activeTag === '' }">全部</text>
          </view>
          <view
            v-for="tag in hotTags"
            :key="tag.id"
            class="cat-chip"
            :class="{ active: activeTag === tag.name }"
            role="tab"
            :aria-selected="activeTag === tag.name ? 'true' : 'false'"
            :tabindex="activeTag === tag.name ? 0 : -1"
            @tap="selectTag(tag.name)"
            @keydown="onCategoryKeydown($event, tag.name)"
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
        <view
          class="sort-trigger"
          role="button"
          aria-haspopup="true"
          :aria-expanded="showSortMenu ? 'true' : 'false'"
          tabindex="0"
          @tap="showSortMenu = !showSortMenu"
          @keydown="activateOnKeyboard($event, () => showSortMenu = !showSortMenu)"
        >
          <text class="sort-text">{{ sortBy === 'latest' ? '最新发布' : '最受欢迎' }}</text>
          <AppIcon name="chevron-down" :size="16" color="#2C2C2C" :class="{ flip: showSortMenu }" />
        </view>
        <view v-if="showSortMenu" class="sort-menu" role="radiogroup" aria-label="文章排序方式">
          <view
            class="sort-option"
            :class="{ active: sortBy === 'latest' }"
            role="radio"
            :aria-checked="sortBy === 'latest' ? 'true' : 'false'"
            tabindex="0"
            @tap="selectSort('latest')"
            @keydown="activateOnKeyboard($event, () => selectSort('latest'))"
          >最新发布</view>
          <view
            class="sort-option"
            :class="{ active: sortBy === 'popular' }"
            role="radio"
            :aria-checked="sortBy === 'popular' ? 'true' : 'false'"
            tabindex="0"
            @tap="selectSort('popular')"
            @keydown="activateOnKeyboard($event, () => selectSort('popular'))"
          >最受欢迎</view>
        </view>
      </view>
    </view>

    <!-- 文章列表 -->
    <scroll-view scroll-y class="list-scroll">
      <view class="list">
        <station-pinned-rail board="article" :inset="false" />

        <!-- loading -->
        <view v-if="loading" class="state" role="status" aria-live="polite" aria-label="正在加载文章">
          <AppLoading />
        </view>

        <!-- error -->
        <view v-else-if="error" class="state" role="alert" aria-live="polite">
          <view class="state-icon"><AppIcon name="alert-circle" :size="32" color="#C41E3A" /></view>
          <text class="state-text">{{ error }}</text>
          <view
            class="retry-btn"
            role="button"
            tabindex="0"
            @tap="loadList"
            @keydown="activateOnKeyboard($event, loadList)"
          ><text class="retry-text">重试</text></view>
        </view>

        <!-- 列表 -->
        <template v-else-if="displayArticles.length > 0">
          <view
            v-for="article in displayArticles"
            :key="article.id"
            class="article-card"
            :class="`article-card--${resolvedLayout(article).toLowerCase()}`"
            data-content-card
            role="link"
            :aria-label="`阅读文章：${article.title}`"
            tabindex="0"
            @tap="navigateToContent(`/articles/${article.id}`, $event)"
            @keydown="openArticleOnKeyboard($event, article.id)"
          >
            <view v-if="resolvedLayout(article) === 'FEATURE'" class="article-feature-cover">
              <smart-cover
                :src="articleImages(article)[0]"
                :title="article.title"
                type="default"
              />
              <view class="article-feature-shade" />
              <view class="article-feature-label">
                <text>本期策划</text>
              </view>
              <view class="article-feature-copy">
                <text v-if="article.tags?.[0]" class="article-feature-kicker">{{ article.tags[0] }}</text>
                <text class="article-feature-title">{{ article.title }}</text>
                <text v-if="article.excerpt" class="article-feature-excerpt">{{ article.excerpt }}</text>
              </view>
            </view>

            <view v-else class="article-main">
              <view class="article-copy">
                <text v-if="article.tags?.[0]" class="article-kicker">{{ article.tags[0] }}</text>
                <view class="article-title-row">
                  <text class="article-title">{{ article.title }}</text>
                </view>
                <text v-if="article.excerpt" class="article-excerpt">{{ article.excerpt }}</text>
              </view>

              <!-- 单图：头条式右侧横图。 -->
              <view v-if="resolvedLayout(article) === 'SINGLE' || resolvedLayout(article) === 'COLUMN'" class="article-cover-single">
                <smart-cover
                  :src="articleImages(article)[0]"
                  :title="article.title"
                  type="default"
                />
              </view>
            </view>

            <!-- 多图：按真实图片数量平铺，两图与三图均有独立比例。 -->
            <view
              v-if="resolvedLayout(article) === 'GALLERY'"
              class="article-gallery"
              :class="`article-gallery--${Math.min(articleImages(article).length, 3)}`"
            >
              <view
                v-for="(image, imageIndex) in articleImages(article)"
                :key="`${article.id}-${imageIndex}`"
                class="article-gallery-item"
              >
                <smart-cover :src="image" :title="article.title" type="default" />
              </view>
            </view>

            <view class="article-foot">
              <text class="article-source">{{ article.user?.nickname || article.circle?.name || '国学平台' }}</text>
              <text class="article-meta">{{ formatCount(article.viewCount) }} 阅读</text>
              <text class="article-meta">{{ readingMinutes(article.excerpt) }} 分钟读完</text>
              <text class="article-date">{{ formatDate(article.createdAt) }}</text>
            </view>
          </view>

          <view
            v-if="hasMore"
            class="load-more"
            role="button"
            :aria-busy="loadingMore ? 'true' : 'false'"
            :aria-disabled="loadingMore ? 'true' : 'false'"
            tabindex="0"
            @tap="loadMore"
            @keydown="activateOnKeyboard($event, loadMore)"
          >
            <text class="load-more-text">{{ loadingMore ? '加载中...' : '点击加载更多' }}</text>
          </view>
          <view v-else class="load-more" role="status">
            <text class="load-more-text">没有更多了</text>
          </view>
        </template>

        <!-- empty -->
        <view v-else class="empty" role="status" aria-live="polite">
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
import { ref, computed, nextTick } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import AppLoading from '@/components/common/app-loading.vue'
import AiSearchModal from '@/components/common/ai-search-modal.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import StationPinnedRail from '@/components/station/station-pinned-rail.vue'
import { goBack, navigateToContent } from '@/utils/router'
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

function activateOnKeyboard(event: KeyboardEvent, action: () => unknown) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  void action()
}

function onCategoryKeydown(event: KeyboardEvent, current: string) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    selectTag(current)
    return
  }
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  event.preventDefault()
  const categories = ['', ...hotTags.value.map((tag) => tag.name)]
  const currentIndex = Math.max(0, categories.indexOf(current))
  const direction = event.key === 'ArrowRight' ? 1 : -1
  const nextCategory = categories[(currentIndex + direction + categories.length) % categories.length] ?? ''
  selectTag(nextCategory)
  void nextTick(() => {
    document.querySelector<HTMLElement>('.cat-chip[aria-selected="true"]')?.focus()
  })
}

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

function openArticleOnKeyboard(event: KeyboardEvent, id: string) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  navigateToContent(`/articles/${id}`, event)
}

function articleImages(article: ArticleListItem): string[] {
  const seen = new Set<string>()
  return [...(article.images || []), article.cover || '']
    .map((image) => image.trim())
    .filter((image) => image && !seen.has(image) && !!seen.add(image))
    .slice(0, 3)
}

function resolvedLayout(article: ArticleListItem): 'FEATURE' | 'SINGLE' | 'GALLERY' | 'COLUMN' {
  if (article.layout && article.layout !== 'AUTO') return article.layout
  const count = articleImages(article).length
  if (count >= 3) return 'GALLERY'
  if (count === 2) return 'FEATURE'
  return 'SINGLE'
}

function readingMinutes(excerpt?: string | null) {
  return Math.max(3, Math.min(12, Math.ceil((excerpt?.length || 80) / 55) + 2))
}

function formatCount(value: number) {
  if (value >= 10000) return `${(value / 10000).toFixed(value >= 100000 ? 0 : 1)}万`
  return String(value || 0)
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
  width: 88rpx;
  height: 88rpx;
  margin-left: -16rpx;
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
  background: #fff;
}
.list {
  padding: 0 28rpx;
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
.article-card {
  position: relative;
  padding: 32rpx 4rpx 26rpx;
  background: #fff;
  border-bottom: 1rpx solid #e9e6e1;
}
.article-card::before {
  content: "";
  position: absolute;
  left: 4rpx;
  top: 34rpx;
  width: 3rpx;
  height: 34rpx;
  border-radius: 999rpx;
  background: #c41e3a;
  opacity: 0;
}
.article-card--column {
  padding-left: 24rpx;
}
.article-card--column::before { opacity: 1; }
.article-main {
  display: flex;
  align-items: stretch;
  gap: 24rpx;
}
.article-feature-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  border-radius: 20rpx;
  background: #202b34;
  box-shadow: 0 14rpx 34rpx rgba(29, 36, 42, 0.14);
}
.article-feature-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(15, 24, 31, 0.02) 26%, rgba(15, 24, 31, 0.9) 100%);
}
.article-feature-label {
  position: absolute;
  left: 20rpx;
  top: 20rpx;
  padding: 7rpx 14rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.56);
  border-radius: 999rpx;
  background: rgba(27, 35, 42, 0.46);
  backdrop-filter: blur(10rpx);
}
.article-feature-label text {
  color: #fff;
  font-size: 20rpx;
  letter-spacing: 2rpx;
}
.article-feature-copy {
  position: absolute;
  left: 24rpx;
  right: 24rpx;
  bottom: 24rpx;
  display: flex;
  flex-direction: column;
}
.article-feature-kicker {
  margin-bottom: 8rpx;
  color: #efc879;
  font-size: 21rpx;
  letter-spacing: 3rpx;
}
.article-feature-title {
  color: #fff;
  font-family: var(--font-serif, "Songti SC", "STSong", serif);
  font-size: 38rpx;
  font-weight: 700;
  line-height: 1.34;
  text-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.24);
}
.article-feature-excerpt {
  margin-top: 8rpx;
  color: rgba(255, 255, 255, 0.78);
  font-size: 23rpx;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.article-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.article-kicker {
  align-self: flex-start;
  margin-bottom: 10rpx;
  padding: 3rpx 10rpx;
  border: 1rpx solid rgba(196, 30, 58, 0.32);
  border-radius: 4rpx;
  color: #b51b34;
  font-size: 20rpx;
  line-height: 1.35;
}
.article-cover-single {
  width: 220rpx;
  height: 148rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
  overflow: hidden;
  background: #f2efe9;
}
.article-title-row {
  display: flex;
  align-items: flex-start;
}
.article-title {
  font-family: var(--font-serif, "Songti SC", "STSong", "SimSun", serif);
  font-size: 34rpx;
  font-weight: 700;
  letter-spacing: 0.5rpx;
  color: #24211d;
  line-height: 1.42;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.article-excerpt {
  margin-top: 12rpx;
  font-size: 25rpx;
  color: #6b665f;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.article-card--single .article-excerpt {
  -webkit-line-clamp: 1;
}
.article-card--column .article-excerpt {
  -webkit-line-clamp: 3;
}
.article-card--column .article-cover-single {
  width: 176rpx;
  height: 204rpx;
  border-radius: 8rpx 18rpx 18rpx 8rpx;
}
.article-card--column .article-kicker {
  border: 0;
  border-radius: 0;
  padding: 0;
  color: #8a6f3d;
  letter-spacing: 3rpx;
}
.article-gallery {
  display: flex;
  gap: 10rpx;
  margin-top: 20rpx;
  overflow: hidden;
}
.article-gallery-item {
  flex: 1;
  min-width: 0;
  height: 142rpx;
  overflow: hidden;
  border-radius: 6rpx;
  background: #f2efe9;
}
.article-gallery--2 .article-gallery-item {
  height: 196rpx;
}
.article-foot {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 18rpx;
  min-width: 0;
}
.article-source {
  max-width: 260rpx;
  font-size: 22rpx;
  color: #8a6f3d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.article-meta {
  font-size: 22rpx;
  color: #a09b94;
  white-space: nowrap;
}
.article-date {
  margin-left: auto;
  font-size: 22rpx;
  color: #aaa49d;
  white-space: nowrap;
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
