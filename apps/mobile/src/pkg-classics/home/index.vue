<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
import FlatCover from '@/components/classics/flat-cover.vue'
import StationPinnedRail from '@/components/station/station-pinned-rail.vue'
import { coverColorForBook } from '@/lib/classics-cover'
import { classicsApi, _mockFilterTypes, fmtReads, type CategoryTile, type BookListItem, type RankBook, type RankItem, type AudioItem, type FeaturedItem } from '@/lib/classics-data'

// 从 API 获取的数据
const libraryStats = ref<{ value: string; label: string }[]>([])
const categories = ref<CategoryTile[]>([])
const todayFeature = ref<any>(null) // 今日推荐详情对象结构随后端，保留 any
const lastReading = ref<any>(null) // 最近阅读详情对象结构随后端，保留 any
const weeklyMinutes = ref(0)
const bookLists = ref<BookListItem[]>([])
const rankingData = ref<RankItem[]>([])
const audioBooks = ref<AudioItem[]>([])
const featuredBooks = ref<FeaturedItem[]>([])
const filterTypes = _mockFilterTypes

const loading = ref(true)
const error = ref('')
const activeType = ref('all')
const refreshingRanking = ref(false)
const rankingSort = ref<'hot' | 'new'>('hot')

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const data = await classicsApi.home()
    libraryStats.value = data.libraryStats
    categories.value = data.categories
    todayFeature.value = data.todayFeature
    lastReading.value = data.lastReading
    weeklyMinutes.value = data.weeklyMinutes
    bookLists.value = data.bookLists
    rankingData.value = data.rankingData
    audioBooks.value = data.audioBooks
    featuredBooks.value = data.featuredBooks
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => { fetchData() })

// 下拉刷新：重拉古籍馆首页
onPullDownRefresh(async () => {
  try {
    await fetchData()
  } finally {
    uni.stopPullDownRefresh()
  }
})

function goSearch() {
  uni.navigateTo({ url: '/pkg-classics/search/index' })
}
function goBookshelf() {
  uni.navigateTo({ url: '/pkg-classics/bookshelf/index' })
}
function goDetail(id: string) {
  uni.navigateTo({ url: `/pkg-classics/detail/index?id=${id}` })
}
function goCategory(cat: string) {
  uni.navigateTo({ url: `/pkg-classics/category/index?cat=${cat}` })
}
function goCollection(id: string) {
  uni.navigateTo({ url: `/pkg-classics/collection/index?id=${id}` })
}
function goAudioList() {
  uni.navigateTo({ url: '/pkg-classics/audiobooks/index' })
}
function goAudio(id: string) {
  uni.navigateTo({ url: `/pkg-classics/audiobooks/player?id=${id}` })
}
function goLists() {
  uni.navigateTo({ url: '/pkg-classics/lists/index' })
}
function goRanking() {
  uni.navigateTo({ url: '/pkg-classics/ranking/index' })
}
function goAI() {
  uni.navigateTo({ url: '/pkg-classics/ai-assistant/index' })
}
function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.switchTab?.({ url: '/pages/index/index' }).catch?.(() => {})
}
async function onRefreshRanking() {
  if (refreshingRanking.value) return
  refreshingRanking.value = true
  try {
    const currentIds = new Set(rankingData.value.map((book) => book.id))
    let sort = rankingSort.value
    let result = await classicsApi.ranking(sort)
    let candidates = result.books.filter((book) => !currentIds.has(book.id))
    if (!candidates.length) {
      sort = sort === 'hot' ? 'new' : 'hot'
      result = await classicsApi.ranking(sort)
      candidates = result.books.filter((book) => !currentIds.has(book.id))
    }
    if (!candidates.length) {
      uni.showToast({ title: '当前已是完整榜单', icon: 'none' })
      return
    }
    rankingData.value = candidates.slice(0, 5).map((book: RankBook): RankItem => ({
      id: book.id,
      title: book.title,
      author: book.author,
      dynasty: book.dynasty,
      desc: book.desc || [book.category, book.dynasty].filter(Boolean).join(' · ') || '典籍推荐',
      reads: Number(book.reads) || 0,
    }))
    rankingSort.value = sort
    uni.showToast({ title: '已换一批', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '榜单更新失败，请重试', icon: 'none' })
  } finally {
    refreshingRanking.value = false
  }
}
</script>

<template>
  <view class="ch-page">
    <!-- 顶部导航 - 苹果式半透明 -->
    <view class="ch-topbar">
      <view class="ch-statusbar" />
      <view class="ch-topbar-inner">
        <view class="ch-circle-btn" @tap="goBack">
          <app-icon name="arrow-left" :size="44" color="#2c2c2c" />
        </view>
        <text class="ch-topbar-title">古籍馆</text>
        <view class="ch-circle-btn" @tap="goBookshelf">
          <app-icon name="book-marked" :size="44" color="#2c2c2c" />
        </view>
      </view>
    </view>

    <view class="ch-main">
      <view v-if="loading" style="text-align:center;padding:128rpx 0;">
        <text style="color:var(--muted-foreground);font-size:28rpx;">加载中...</text>
      </view>
      <view v-else-if="error" style="text-align:center;padding:128rpx 0;">
        <text style="color:#c41e3a;font-size:28rpx;">{{ error }}</text>
        <view style="margin-top:24rpx;" @tap="fetchData()">
          <text style="color:var(--muted-foreground);">重试</text>
        </view>
      </view>
      <template v-else>
      <!-- Hero 大标题 -->
      <view class="ch-hero">
        <text class="ch-hero-kicker">经史子集 · 释道医藏</text>
        <text class="ch-hero-title">千年典籍，尽收一馆</text>
        <view class="ch-hero-stats">
          <view v-for="(s, i) in libraryStats" :key="s.label" class="ch-stat">
            <view v-if="i > 0" class="ch-stat-dot" />
            <text class="ch-stat-val">{{ s.value }}</text>
            <text class="ch-stat-label">{{ s.label }}</text>
          </view>
        </view>
      </view>

      <!-- 搜索栏 -->
      <view class="ch-sec">
        <view class="ch-searchbar" @tap="goSearch">
          <app-icon name="search" :size="36" color="#999999" />
          <text class="ch-search-ph">搜书名、作者、朝代或门类</text>
        </view>
      </view>

      <station-pinned-rail board="ebook" :inset="false" />

      <!-- 今日导读 -->
      <view class="ch-sec">
        <view class="ch-today" @tap="goDetail(todayFeature.id)">
          <view class="ch-today-bg" />
          <view class="ch-today-inner">
            <view>
              <text class="ch-today-tag">{{ todayFeature.tagline }}</text>
              <text class="ch-today-quote">{{ todayFeature.quote }}</text>
              <text class="ch-today-desc">{{ todayFeature.desc }}</text>
            </view>
            <view class="ch-today-foot">
              <FlatCover
                :title="todayFeature.title"
                :label="todayFeature.author.split(' · ')[1]"
                :footer="todayFeature.author.split(' · ')[0]"
                :cover-color="coverColorForBook(todayFeature.title)"
                title-size="36rpx"
                class="ch-today-cover"
              />
              <view class="ch-today-meta">
                <text class="ch-today-name">{{ todayFeature.title }}</text>
                <text class="ch-today-author">{{ todayFeature.author }}</text>
                <view class="ch-today-btn">
                  <app-icon name="book-open" :size="32" color="#6f4521" />
                  <text class="ch-today-btn-txt">立即阅读</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 继续阅读（仅登录且有阅读记录时显示） -->
      <view v-if="lastReading" class="ch-sec">
        <view class="ch-continue" @tap="goDetail(lastReading.id)">
          <FlatCover
            :title="lastReading.title"
            :cover-color="coverColorForBook(lastReading.title)"
            title-size="22rpx"
            class="ch-continue-cover"
          />
          <view class="ch-continue-info">
            <text class="ch-continue-label">继续阅读</text>
            <text class="ch-continue-title">{{ lastReading.title }}</text>
            <view class="ch-continue-prog">
              <view class="ch-prog-track">
                <view class="ch-prog-fill" :style="{ width: lastReading.progress + '%' }" />
              </view>
              <text class="ch-prog-pct">{{ lastReading.progress }}%</text>
            </view>
          </view>
          <view class="ch-continue-week">
            <app-icon name="flame" :size="32" color="#e0894a" />
            <view class="ch-week-meta">
              <text class="ch-week-label">本周</text>
              <text class="ch-week-num">{{ weeklyMinutes }}<text class="ch-week-unit">分</text></text>
            </view>
          </view>
        </view>
      </view>

      <!-- 四库分类 - 彩色瓷砖 -->
      <view class="ch-sec">
        <view class="ch-cat-grid">
          <view
            v-for="cat in categories"
            :key="cat.id"
            class="ch-cat-tile"
            :style="{ background: `linear-gradient(150deg, ${cat.from}, ${cat.to})` }"
            @tap="goCategory(cat.id)"
          >
            <view class="ch-cat-top">
              <text class="ch-cat-name">{{ cat.name }}</text>
              <app-icon :name="cat.icon" :size="40" color="rgba(255,255,255,0.8)" />
            </view>
            <view>
              <text class="ch-cat-desc">{{ cat.desc }}</text>
              <text class="ch-cat-count">{{ cat.count }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 经典书单（后端有书单数据时显示） -->
      <view v-if="bookLists.length" class="ch-block">
        <view class="ch-sec-head">
          <view>
            <text class="ch-sec-title">经典书单</text>
            <text class="ch-sec-sub">名家精选，循路而读</text>
          </view>
          <view class="ch-sec-link" @tap="goLists">
            <text class="ch-sec-link-txt">全部书单</text>
            <app-icon name="chevron-right" :size="28" color="#c41e3a" />
          </view>
        </view>
        <scroll-view scroll-x class="ch-hscroll" :show-scrollbar="false">
          <view class="ch-hscroll-row">
            <view
              v-for="list in bookLists"
              :key="list.id"
              class="ch-list-card"
              @tap="goCollection(list.id)"
            >
              <text class="ch-list-title">{{ list.title }}</text>
              <text class="ch-list-desc">{{ list.desc }} · {{ list.count }} 本</text>
              <view class="ch-list-covers">
                <FlatCover
                  v-for="(b, i) in list.books"
                  :key="i"
                  :title="b.title"
                  :cover-color="coverColorForBook(b.title)"
                  title-size="28rpx"
                  class="ch-list-cover"
                />
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 推荐榜 -->
      <view class="ch-block">
        <view class="ch-sec-head">
          <view>
            <text class="ch-sec-title">推荐榜</text>
            <text class="ch-sec-sub">读者公认的传世经典</text>
          </view>
          <view class="ch-sec-link" @tap="goRanking">
            <text class="ch-sec-link-txt">完整榜单</text>
            <app-icon name="chevron-right" :size="28" color="#c41e3a" />
          </view>
        </view>
        <scroll-view scroll-x class="ch-type-scroll" :show-scrollbar="false">
          <view class="ch-type-row">
            <view
              v-for="t in filterTypes"
              :key="t.id"
              class="ch-type-chip"
              :class="{ 'ch-type-chip--on': activeType === t.id }"
              @tap="activeType = t.id"
            >
              {{ t.name }}
            </view>
          </view>
        </scroll-view>
        <view class="ch-sec-pad">
          <view class="ch-rank-card">
            <view
              v-for="(book, index) in rankingData"
              :key="book.id"
              class="ch-rank-row"
              :class="{ 'ch-rank-row--border': index > 0 }"
              @tap="goDetail(book.id)"
            >
              <text class="ch-rank-num" :class="{ 'ch-rank-num--top': index < 3 }">{{ index + 1 }}</text>
              <FlatCover
                :title="book.title"
                :cover-color="coverColorForBook(book.title)"
                title-size="24rpx"
                class="ch-rank-cover"
              />
              <view class="ch-rank-info">
                <text class="ch-rank-title">{{ book.title }}</text>
                <text class="ch-rank-desc">{{ book.desc }}</text>
                <text class="ch-rank-meta">{{ book.author }} · {{ book.dynasty }} · {{ fmtReads(book.reads) }}人读</text>
              </view>
              <app-icon name="chevron-right" :size="36" color="rgba(0,0,0,0.2)" />
            </view>
          </view>
          <view class="ch-refresh" :class="{ 'ch-refresh--loading': refreshingRanking }" @tap="onRefreshRanking">
            {{ refreshingRanking ? '换批中…' : '换一批' }}
          </view>
        </view>
      </view>

      <!-- 听书（后端有有声书数据时显示） -->
      <view v-if="audioBooks.length" class="ch-block">
        <view class="ch-sec-head">
          <view>
            <text class="ch-sec-title">听书</text>
            <text class="ch-sec-sub">轻松听，不啃厚书</text>
          </view>
          <view class="ch-sec-link" @tap="goAudioList">
            <text class="ch-sec-link-txt">更多</text>
            <app-icon name="chevron-right" :size="28" color="#c41e3a" />
          </view>
        </view>
        <scroll-view scroll-x class="ch-hscroll" :show-scrollbar="false">
          <view class="ch-hscroll-row">
            <view
              v-for="book in audioBooks"
              :key="book.id"
              class="ch-audio-card"
              @tap="goAudio(book.id)"
            >
              <FlatCover
                :title="book.title"
                :cover-color="coverColorForBook(book.title)"
                title-size="24rpx"
                class="ch-audio-cover"
              />
              <view class="ch-audio-info">
                <view>
                  <text class="ch-audio-title">{{ book.title }}</text>
                  <text class="ch-audio-desc">{{ book.desc }}</text>
                </view>
                <view class="ch-audio-foot">
                  <text class="ch-audio-narrator">{{ book.narrator }}</text>
                  <view class="ch-audio-play">
                    <app-icon name="play" :size="28" color="#fff" :fill="true" />
                  </view>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 精选古籍 -->
      <view class="ch-block">
        <view class="ch-sec-head">
          <view>
            <text class="ch-sec-title">精选古籍</text>
            <text class="ch-sec-sub">编辑甄选，值得细读</text>
          </view>
          <view class="ch-sec-link" @tap="goLists">
            <text class="ch-sec-link-txt">更多</text>
            <app-icon name="chevron-right" :size="28" color="#c41e3a" />
          </view>
        </view>
        <view class="ch-sec-pad ch-featured-grid">
          <view
            v-for="book in featuredBooks"
            :key="book.id"
            class="ch-featured-card"
            @tap="goDetail(book.id)"
          >
            <FlatCover
              :title="book.title"
              :cover-color="coverColorForBook(book.title)"
              title-size="28rpx"
              class="ch-featured-cover"
            />
            <view class="ch-featured-info">
              <view>
                <view class="ch-featured-titlerow">
                  <text class="ch-featured-title">{{ book.title }}</text>
                  <text v-if="book.isFree" class="ch-badge-free">免费</text>
                </view>
                <text class="ch-featured-desc">{{ book.desc }}</text>
              </view>
              <text class="ch-featured-author">{{ book.author }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部 AI 入口 -->
      <view class="ch-sec ch-ai-sec">
        <view class="ch-ai-entry" @tap="goAI">
          <view class="ch-ai-icon">
            <app-icon name="sparkles" :size="40" color="#fff" />
          </view>
          <view class="ch-ai-info">
            <text class="ch-ai-title">AI 国学助手</text>
            <text class="ch-ai-desc">不懂就问，白话解读古籍疑难</text>
          </view>
          <app-icon name="chevron-right" :size="36" color="rgba(0,0,0,0.2)" />
        </view>
      </view>
      </template>
    </view>
  </view>
</template>

<style scoped lang="scss">
.ch-page {
  min-height: 100vh;
  background: var(--classics-bg);
  padding-bottom: 160rpx;
}

/* 顶栏 */
.ch-topbar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: color-mix(in srgb, var(--classics-bg) 80%, transparent);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
}
.ch-statusbar {
  height: var(--status-bar-height, 0px);
}
.ch-topbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12rpx;
  height: 96rpx;
}
.ch-circle-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  &:active { transform: scale(0.9); }
}
.ch-topbar-title {
  font-size: 34rpx;
  font-weight: 600;
  color: var(--foreground);
}

.ch-main {
  max-width: 100%;
}

/* Hero */
.ch-hero {
  padding: 24rpx 40rpx 40rpx;
}
.ch-hero-kicker {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  letter-spacing: 1rpx;
  color: var(--brand);
  margin-bottom: 12rpx;
}
.ch-hero-title {
  display: block;
  /* 9 字标题 80rpx 必然折行成"…尽收一/馆"，降到 72rpx 保证一行放下 */
  font-size: 72rpx;
  line-height: 1.1;
  font-weight: 700;
  letter-spacing: -1rpx;
  white-space: nowrap;
  color: var(--foreground);
}
.ch-hero-stats {
  margin-top: 32rpx;
  display: flex;
  align-items: center;
  gap: 32rpx;
}
.ch-stat {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 26rpx;
  color: var(--muted-foreground);
}
.ch-stat-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: rgba(153, 153, 153, 0.4);
}
.ch-stat-val {
  font-weight: 600;
  color: var(--foreground);
}

/* 通用 section */
.ch-sec {
  padding: 0 40rpx 32rpx;
}
.ch-block {
  padding-bottom: 48rpx;
}
.ch-sec-pad {
  padding: 0 40rpx;
}

/* 搜索栏 */
.ch-searchbar {
  display: flex;
  align-items: center;
  gap: 20rpx;
  width: 100%;
  height: 88rpx;
  padding: 0 32rpx;
  border-radius: 32rpx;
  background: var(--card);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  &:active { transform: scale(0.99); }
}
.ch-search-ph {
  font-size: 30rpx;
  color: var(--muted-foreground);
}

/* 今日导读 */
.ch-today {
  position: relative;
  border-radius: 56rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.15);
  &:active { transform: scale(0.99); }
}
.ch-today-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(155deg, #a06a38, #5f3a1a);
}
.ch-today-inner {
  position: relative;
  padding: 48rpx;
  display: flex;
  flex-direction: column;
  gap: 40rpx;
}
.ch-today-tag {
  display: block;
  font-size: 24rpx;
  font-weight: 600;
  letter-spacing: 4rpx;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
}
.ch-today-quote {
  display: block;
  margin-top: 24rpx;
  font-family: var(--font-serif);
  font-size: 48rpx;
  font-weight: 700;
  color: #fff;
  line-height: 1.4;
}
.ch-today-desc {
  display: block;
  margin-top: 24rpx;
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.6;
}
.ch-today-foot {
  display: flex;
  align-items: center;
  gap: 32rpx;
}
.ch-today-cover {
  width: 192rpx;
  flex-shrink: 0;
  box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.3);
}
.ch-today-meta {
  flex: 1;
}
.ch-today-name {
  display: block;
  color: #fff;
  font-weight: 600;
  font-size: 36rpx;
}
.ch-today-author {
  display: block;
  color: rgba(255, 255, 255, 0.7);
  font-size: 26rpx;
  margin-top: 4rpx;
}
.ch-today-btn {
  margin-top: 24rpx;
  display: inline-flex;
  align-items: center;
  gap: 12rpx;
  height: 72rpx;
  padding: 0 40rpx;
  border-radius: 999rpx;
  background: #fff;
}
.ch-today-btn-txt {
  color: #6f4521;
  font-size: 28rpx;
  font-weight: 600;
}

/* 继续阅读 */
.ch-continue {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 20rpx;
  border-radius: 32rpx;
  background: var(--card);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  &:active { transform: scale(0.99); }
}
.ch-continue-cover {
  width: 88rpx;
  flex-shrink: 0;
}
.ch-continue-info {
  min-width: 0;
  flex: 1;
}
.ch-continue-label {
  display: block;
  font-size: 22rpx;
  color: var(--muted-foreground);
}
.ch-continue-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ch-continue-prog {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.ch-prog-track {
  flex: 1;
  height: 8rpx;
  border-radius: 999rpx;
  background: var(--muted);
  overflow: hidden;
  max-width: 280rpx;
}
.ch-prog-fill {
  height: 100%;
  background: var(--brand);
  border-radius: 999rpx;
}
.ch-prog-pct {
  font-size: 22rpx;
  color: var(--brand);
  font-weight: 600;
}
.ch-continue-week {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding-left: 24rpx;
  margin-left: 8rpx;
  border-left: 2rpx solid var(--border);
  flex-shrink: 0;
}
.ch-week-meta {
  text-align: right;
}
.ch-week-label {
  display: block;
  font-size: 20rpx;
  color: var(--muted-foreground);
  line-height: 1;
}
.ch-week-num {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--foreground);
}
.ch-week-unit {
  font-weight: 400;
  color: var(--muted-foreground);
  font-size: 20rpx;
}

/* 四库分类 */
.ch-cat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
}
.ch-cat-tile {
  height: 176rpx;
  border-radius: 48rpx;
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
  &:active { transform: scale(0.97); }
}
.ch-cat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ch-cat-name {
  color: #fff;
  font-weight: 700;
  font-size: 36rpx;
  letter-spacing: 2rpx;
}
.ch-cat-desc {
  display: block;
  color: rgba(255, 255, 255, 0.9);
  font-size: 24rpx;
  font-weight: 500;
}
.ch-cat-count {
  display: block;
  color: rgba(255, 255, 255, 0.6);
  font-size: 22rpx;
}

/* section header */
.ch-sec-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 0 40rpx;
  margin-bottom: 28rpx;
}
.ch-sec-title {
  font-size: 44rpx;
  font-weight: 700;
  letter-spacing: -0.5rpx;
  color: var(--foreground);
}
.ch-sec-sub {
  display: block;
  font-size: 26rpx;
  color: var(--muted-foreground);
  margin-top: 4rpx;
}
.ch-sec-link {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.ch-sec-link-txt {
  font-size: 26rpx;
  color: var(--brand);
  font-weight: 500;
}

/* 横向滚动通用 */
.ch-hscroll {
  white-space: nowrap;
  width: 100%;
}
.ch-hscroll-row {
  display: inline-flex;
  align-items: flex-start;
  gap: 32rpx;
  padding: 0 40rpx 16rpx;
}

/* 书单卡片 */
.ch-list-card {
  flex-shrink: 0;
  width: 520rpx;
  border-radius: 48rpx;
  padding: 40rpx;
  background: var(--card);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  &:active { transform: scale(0.99); }
}
.ch-list-title {
  font-weight: 700;
  font-size: 34rpx;
  color: var(--foreground);
}
.ch-list-desc {
  display: block;
  font-size: 24rpx;
  color: var(--muted-foreground);
  margin-top: 4rpx;
  margin-bottom: 32rpx;
}
.ch-list-covers {
  display: flex;
  align-items: flex-end;
  gap: 20rpx;
}
.ch-list-cover {
  flex: 1;
}

/* 类型筛选 */
.ch-type-scroll {
  white-space: nowrap;
  width: 100%;
  margin-bottom: 24rpx;
}
.ch-type-row {
  display: inline-flex;
  gap: 16rpx;
  padding: 0 40rpx;
}
.ch-type-chip {
  flex-shrink: 0;
  padding: 0 28rpx;
  height: 56rpx;
  line-height: 56rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 500;
  background: var(--secondary);
  color: var(--muted-foreground);
}
.ch-type-chip--on {
  background: var(--primary);
  color: var(--primary-foreground);
}

/* 推荐榜 */
.ch-rank-card {
  border-radius: 48rpx;
  background: var(--card);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  overflow: hidden;
}
.ch-rank-row {
  display: flex;
  align-items: center;
  gap: 28rpx;
  padding: 24rpx;
  &:active { background: rgba(0, 0, 0, 0.03); }
}
.ch-rank-row--border {
  border-top: 2rpx solid rgba(232, 224, 213, 0.6);
}
.ch-rank-num {
  width: 48rpx;
  text-align: center;
  font-weight: 700;
  font-size: 36rpx;
  color: var(--muted-foreground);
  flex-shrink: 0;
}
.ch-rank-num--top {
  color: var(--brand);
}
.ch-rank-cover {
  width: 112rpx;
  flex-shrink: 0;
}
.ch-rank-info {
  flex: 1;
  min-width: 0;
}
.ch-rank-title {
  display: block;
  font-weight: 600;
  font-size: 30rpx;
  color: var(--foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ch-rank-desc {
  display: block;
  font-size: 24rpx;
  color: var(--muted-foreground);
  margin-top: 4rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ch-rank-meta {
  display: block;
  font-size: 22rpx;
  color: rgba(153, 153, 153, 0.7);
  margin-top: 4rpx;
}
.ch-refresh {
  width: 100%;
  margin-top: 24rpx;
  padding: 20rpx 0;
  text-align: center;
  font-size: 28rpx;
  font-weight: 500;
  color: var(--muted-foreground);
  background: var(--card);
  border-radius: 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  &:active { transform: scale(0.99); }
}
.ch-refresh--loading {
  opacity: 0.55;
}

/* 听书 */
.ch-audio-card {
  flex-shrink: 0;
  width: 480rpx;
  height: 248rpx;
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  padding: 24rpx;
  box-sizing: border-box;
  background: var(--card);
  border-radius: 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  &:active { transform: scale(0.99); }
}
.ch-audio-cover {
  width: 112rpx;
  flex-shrink: 0;
  /* 防 flex stretch 拉高封面（.ch-audio-card 未设 align-items，默认 stretch 会拉长变形） */
  align-self: flex-start;
}
.ch-audio-info {
  flex: 1;
  height: 200rpx;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  white-space: normal;
}
.ch-audio-title {
  display: block;
  font-weight: 600;
  font-size: 30rpx;
  color: var(--foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ch-audio-desc {
  display: -webkit-box;
  height: 70rpx;
  font-size: 24rpx;
  color: var(--muted-foreground);
  margin-top: 4rpx;
  line-height: 35rpx;
  overflow: hidden;
  word-break: break-all;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.ch-audio-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ch-audio-narrator {
  font-size: 22rpx;
  color: var(--muted-foreground);
}
.ch-audio-play {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 精选古籍 */
.ch-featured-grid {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.ch-featured-card {
  display: flex;
  gap: 32rpx;
  padding: 32rpx;
  background: var(--card);
  border-radius: 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  &:active { transform: scale(0.99); }
}
.ch-featured-cover {
  width: 128rpx;
  flex-shrink: 0;
  /* 防 flex stretch 拉高封面（.ch-featured-card 未设 align-items，默认 stretch 会拉长变形） */
  align-self: flex-start;
}
.ch-featured-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.ch-featured-titlerow {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.ch-featured-title {
  font-weight: 600;
  font-size: 32rpx;
  color: var(--foreground);
}
.ch-badge-free {
  font-size: 20rpx;
  font-weight: 500;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  background: #d1fae5;
  color: #047857;
}
.ch-featured-desc {
  display: -webkit-box;
  font-size: 24rpx;
  color: var(--muted-foreground);
  margin-top: 8rpx;
  line-height: 1.5;
  max-height: 72rpx;
  overflow: hidden;
  word-break: break-all;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.ch-featured-author {
  font-size: 22rpx;
  color: rgba(153, 153, 153, 0.7);
}

/* AI 入口 */
.ch-ai-sec {
  padding-top: 8rpx;
}
.ch-ai-entry {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 32rpx;
  border-radius: 32rpx;
  background: var(--card);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  &:active { transform: scale(0.99); }
}
.ch-ai-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(150deg, #c8324c, #9e1b30);
}
.ch-ai-info {
  flex: 1;
  min-width: 0;
}
.ch-ai-title {
  display: block;
  font-weight: 600;
  font-size: 30rpx;
  color: var(--foreground);
}
.ch-ai-desc {
  display: block;
  font-size: 24rpx;
  color: var(--muted-foreground);
  margin-top: 4rpx;
}
</style>
