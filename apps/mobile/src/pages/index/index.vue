<template>
  <view class="page">
    <!-- Header -->
    <view class="header">
      <view class="header-top">
        <text class="logo">🏮 热卜国学</text>
        <view class="header-actions">
          <text class="header-icon" @click="goPage('/pages/notifications/notifications')">🔔</text>
          <text class="header-icon" @click="goPage('/pages/bots/bots')">💬</text>
        </view>
      </view>
      <view class="search-bar" @click="goSearch">
        <text class="search-icon">🔍</text>
        <text class="search-placeholder">搜索课程、命理工具...</text>
      </view>
    </view>

    <!-- Banner轮播 -->
    <swiper
      class="banner-swiper"
      circular
      autoplay
      interval="4000"
      indicator-dots
      indicator-color="rgba(255,255,255,0.4)"
      indicator-active-color="#C9A96E"
    >
      <swiper-item v-for="(banner, idx) in banners" :key="idx">
        <view class="banner-slide" :style="{ background: banner.bg }">
          <text class="banner-icon">{{ banner.icon }}</text>
          <view class="banner-text">
            <text class="banner-title">{{ banner.title }}</text>
            <text class="banner-sub">{{ banner.sub }}</text>
          </view>
        </view>
      </swiper-item>
    </swiper>

    <!-- 快捷工具 -->
    <view class="quick-tools">
      <view class="tool-item" @click="goPage('/pages/bazi/bazi')">
        <text class="tool-icon">🔮</text>
        <text class="tool-name">八字排盘</text>
      </view>
      <view class="tool-item" @click="goPage('/pages/ziwei/ziwei')">
        <text class="tool-icon">⭐</text>
        <text class="tool-name">紫微斗数</text>
      </view>
      <view class="tool-item" @click="goPage('/pages/courses/courses')">
        <text class="tool-icon">📚</text>
        <text class="tool-name">课程学习</text>
      </view>
      <view class="tool-item" @click="goPage('/pages/videos/videos')">
        <text class="tool-icon">🎬</text>
        <text class="tool-name">视频讲解</text>
      </view>
    </view>

    <!-- 频道Tab -->
    <view class="tab-nav">
      <view
        v-for="ch in channels"
        :key="ch.key"
        class="tab-item"
        :class="{ active: currentTab === ch.key }"
        @click="switchTab(ch.key)"
      >
        <text>{{ ch.label }}</text>
      </view>
    </view>

    <!-- 下拉刷新提示 -->
    <view v-if="refreshing" class="refresh-tip">刷新中...</view>

    <!-- 骨架屏 -->
    <LoadingSkeleton v-if="loading && list.length === 0" type="card" />

    <!-- 文章列表（推荐Tab用列表布局） -->
    <view v-if="currentTab === 'recommend' && list.length > 0" class="article-list">
      <view
        v-for="(item, idx) in list"
        :key="item._type + '-' + item.id + '-' + idx"
        class="article-item"
        @click="goItem(item)"
      >
        <view class="article-thumb">
          <text v-if="item.cover">{{ '' }}</text>
          <image v-if="item.cover" :src="item.cover" class="article-thumb-img" mode="aspectFill" />
          <text v-else class="article-thumb-icon">{{ item._type === 'circle' ? '👥' : '📜' }}</text>
        </view>
        <view class="article-content">
          <text class="article-title">{{ item.title || item.name }}</text>
          <view class="article-meta">
            <text v-if="item.author">{{ item.author }}</text>
            <text v-if="item.dynasty" class="meta-tag">{{ item.dynasty }}</text>
            <text v-if="item._type === 'circle'" class="meta-tag">圈子</text>
            <text class="meta-time">{{ formatTime(item.createdAt) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 双列瀑布流（热门/直播Tab） -->
    <view v-else-if="list.length > 0" class="feed-grid">
      <view
        v-for="(item, idx) in list"
        :key="item._type + '-' + item.id + '-' + idx"
        class="feed-card"
        :class="'type-' + item._type"
        @click="goItem(item)"
      >
        <!-- ===== 短视频卡片 ===== -->
        <template v-if="item._type === 'video'">
          <view class="card-cover-wrap">
            <image :src="item.cover" class="card-cover" mode="aspectFill" />
            <view class="card-badge-dur">{{ formatDuration(item.duration) }}</view>
          </view>
          <view class="card-body">
            <text class="card-title">{{ item.title }}</text>
          </view>
          <view class="card-footer">
            <text class="meta-stat">👁 {{ item.viewCount || 0 }}</text>
            <text class="meta-stat">👍 {{ item.likeCount || 0 }}</text>
          </view>
        </template>

        <!-- ===== 直播卡片 ===== -->
        <template v-else-if="item._type === 'live'">
          <view class="card-cover-wrap">
            <image :src="item.cover || item.thumbnail" class="card-cover" mode="aspectFill" />
            <view class="card-badge-live">🔴 直播中</view>
          </view>
          <view class="card-body">
            <text class="card-title">{{ item.title || item.name }}</text>
            <text class="card-extra" v-if="item.anchorName">{{ item.anchorName }}</text>
          </view>
          <view class="card-footer">
            <text class="meta-stat">👁 {{ item.viewerCount || item.viewCount || 0 }} 观看</text>
          </view>
        </template>

        <!-- ===== 商品卡片 ===== -->
        <template v-else-if="item._type === 'product'">
          <view class="card-cover-wrap">
            <image :src="item.cover" class="card-cover" mode="aspectFill" />
          </view>
          <view class="card-body">
            <text class="card-title">{{ item.title || item.name }}</text>
            <text class="card-price">¥{{ item.price ?? 0 }}</text>
          </view>
        </template>
      </view>
    </view>

    <!-- 空状态 -->
    <EmptyState v-else-if="!loading && list.length === 0" :text="'暂无' + currentTabLabel + '内容'" />

    <!-- 加载更多 -->
    <view v-if="loadingMore" class="load-more-indicator">
      <text class="load-more-text">加载更多...</text>
    </view>
    <view v-if="!hasMore && list.length > 0" class="no-more">— 已全部加载 —</view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { contentApi, contentsApi, circleApi, videoApi, shopApi, liveApi, systemApi } from '../../api'

// ===== 类型定义 =====
type ChannelKey = 'recommend' | 'hot' | 'live'

interface Channel {
  key: ChannelKey
  label: string
}

interface TabState {
  list: FeedItem[]
  page: number
  hasMore: boolean
  loaded: boolean
}

interface FeedItem {
  id: string
  _type: 'article' | 'video' | 'live' | 'product' | 'circle'
  title?: string
  name?: string
  cover?: string
  thumbnail?: string
  excerpt?: string
  intro?: string
  duration?: number
  price?: number
  author?: string
  dynasty?: string
  tags?: string[]
  viewerCount?: number
  viewCount?: number
  likeCount?: number
  collectCount?: number
  memberCount?: number
  postCount?: number
  anchorName?: string
  createdAt?: string
  [key: string]: any
}

// ===== Banner 数据（默认兜底） =====
const defaultBanners = [
  { icon: '📜', title: '国学经典', sub: '品读四书五经，传承中华文化', bg: 'linear-gradient(135deg, #C41E3A, #a0522d)' },
  { icon: '🌸', title: '诗词欣赏', sub: '唐诗宋词，感受千年风雅', bg: 'linear-gradient(135deg, #6b3a1f, #C9A96E)' },
  { icon: '🧘', title: '修身养性', sub: '以文化人，以德润身', bg: 'linear-gradient(135deg, #5a3a1a, #8b6914)' },
]
const banners = ref<{ icon: string; title: string; sub: string; bg: string }[]>(defaultBanners)

// ===== 频道配置 =====
const channels: Channel[] = [
  { key: 'recommend', label: '推荐' },
  { key: 'hot', label: '热门' },
  { key: 'live', label: '直播' },
]

// ===== 响应式状态 =====
const currentTab = ref<ChannelKey>('recommend')
const loading = ref(false)
const loadingMore = ref(false)
const refreshing = ref(false)
const fetching = ref(false) // 防并发

const tabData = ref<Record<ChannelKey, TabState>>({
  recommend: { list: [], page: 1, hasMore: true, loaded: false },
  hot: { list: [], page: 1, hasMore: true, loaded: false },
  live: { list: [], page: 1, hasMore: true, loaded: false },
})

// 当前 tab 的派生状态
const list = computed(() => tabData.value[currentTab.value].list)
const hasMore = computed(() => tabData.value[currentTab.value].hasMore)
const currentTabLabel = computed(() => channels.find((c) => c.key === currentTab.value)?.label || '')

// ===== 通用工具函数 =====

/** 从 API 响应中提取数组 */
function extractList(data: any, key: string): any[] {
  if (Array.isArray(data)) return data
  if (data?.[key] && Array.isArray(data[key])) return data[key]
  if (data?.data && Array.isArray(data.data)) return data.data
  if (data?.list && Array.isArray(data.list)) return data.list
  if (data?.items && Array.isArray(data.items)) return data.items
  if (data?.records && Array.isArray(data.records)) return data.records
  return []
}

/** 交错合并两个数组 */
function interleave(a: any[], b: any[]): any[] {
  const result: any[] = []
  const maxLen = Math.max(a.length, b.length)
  for (let i = 0; i < maxLen; i++) {
    if (i < a.length) result.push(a[i])
    if (i < b.length) result.push(b[i])
  }
  return result
}

/** 去重追加 */
function appendUnique(target: FeedItem[], source: FeedItem[]) {
  const existIds = new Set(target.map((x) => x._type + '-' + x.id))
  for (const item of source) {
    if (!existIds.has(item._type + '-' + item.id)) {
      target.push(item)
    }
  }
}

/** 计算热度分数 */
function calcHeat(views: number, likes: number, createdAt?: string): number {
  const base = views * 2 + likes * 5
  if (!createdAt) return base
  try {
    const hours = (Date.now() - new Date(createdAt).getTime()) / 3600000
    const decay = Math.max(0.1, 1 - hours / 720) // 30天衰减到0.1
    return Math.round(base * decay)
  } catch {
    return base
  }
}

/** 视频时长 mm:ss */
function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

/** 时间格式化 */
function formatTime(timeStr?: string): string {
  if (!timeStr) return ''
  const d = new Date(timeStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ===== 数据加载 =====

async function fetchFeed(reset: boolean) {
  if (fetching.value) return
  fetching.value = true

  const key = currentTab.value
  const state = tabData.value[key]

  if (reset) {
    loading.value = true
    state.page = 1
    state.hasMore = true
  }

  try {
    if (key === 'recommend') {
      // 推荐：文章 + 编辑内容 + 圈子混排
      const [articleData, contentsData, circleData] = await Promise.all([
        contentApi.feed({ page: state.page, pageSize: 8 }).catch(() => ({ list: [] })),
        contentsApi.list({ page: state.page, pageSize: 6, status: 'PUBLISHED' }).catch(() => ({ data: [] })),
        circleApi.list({ page: Math.ceil(state.page / 2), pageSize: 4 }).catch(() => ({ circles: [] })),
      ])

      const articles: FeedItem[] = extractList(articleData, 'list')
        .slice(0, 4)
        .map((a: any) => ({
          ...a,
          _type: 'article' as const,
          heatScore: calcHeat(a.viewCount || 0, a.likeCount || 0, a.createdAt),
        }))

      const editorials: FeedItem[] = (contentsData.data || extractList(contentsData, 'data'))
        .slice(0, 4)
        .map((c: any) => ({
          ...c,
          _type: 'editorial' as any,
          id: c.id,
          title: c.title,
          cover: c.cover,
          author: c.author,
          dynasty: c.dynasty,
          excerpt: c.excerpt,
          viewCount: c.viewCount || 0,
          likeCount: c.likeCount || 0,
          tags: c.tags || [],
          createdAt: c.createdAt,
          heatScore: calcHeat(c.viewCount || 0, c.likeCount || 0, c.createdAt),
        }))

      const circles: FeedItem[] = extractList(circleData, 'circles')
        .slice(0, 3)
        .map((c: any) => ({
          ...c,
          _type: 'circle' as const,
          title: c.name || c.title,
          heatScore: calcHeat(c.memberCount || 0, c.postCount || 0, c.createdAt),
        }))

      const merged = interleave(interleave(articles, editorials), circles)
      merged.sort((a, b) => (b.heatScore || 0) - (a.heatScore || 0))

      if (reset) {
        state.list = merged
      } else {
        appendUnique(state.list, merged)
      }
      state.hasMore = articles.length >= 4
    } else if (key === 'hot') {
      // 热门：短视频 + 商品混排
      const [videoData, productData] = await Promise.all([
        videoApi.list({ page: state.page, pageSize: 8, sort: 'hot' }).catch(() => ({ videos: [] })),
        shopApi.products({ page: state.page, pageSize: 4 }).catch(() => ({ products: [] })),
      ])

      const videos: FeedItem[] = extractList(videoData, 'videos')
        .slice(0, 6)
        .map((v: any) => ({
          ...v,
          _type: 'video' as const,
          heatScore: calcHeat(v.viewCount || 0, v.likeCount || 0, v.createdAt),
        }))

      const products: FeedItem[] = extractList(productData, 'products')
        .slice(0, 4)
        .map((p: any) => ({
          ...p,
          _type: 'product' as const,
          title: p.title || p.name,
          heatScore: calcHeat((p.sales || 0) * 3 + (p.viewCount || 0), p.rating || 0, p.createdAt),
        }))

      const merged = interleave(videos, products)
      merged.sort((a, b) => (b.heatScore || 0) - (a.heatScore || 0))

      if (reset) {
        state.list = merged
      } else {
        appendUnique(state.list, merged)
      }
      state.hasMore = videos.length >= 6
    } else if (key === 'live') {
      // 直播：仅直播间
      const roomData = await liveApi
        .rooms({ page: state.page, pageSize: 10, status: 'LIVING' })
        .catch(() => ({ rooms: [] }))

      const rooms: FeedItem[] = extractList(roomData, 'rooms').map((r: any) => ({
        ...r,
        _type: 'live' as const,
        title: r.title || r.name,
        cover: r.cover || r.thumbnail,
        anchorName: r.anchorName || r.anchor?.nickname || r.user?.nickname,
      }))

      if (reset) {
        state.list = rooms
      } else {
        appendUnique(state.list, rooms)
      }
      state.hasMore = rooms.length >= 10
    }

    state.loaded = true
  } catch {
    if (reset) state.list = []
  } finally {
    if (reset) loading.value = false
    loadingMore.value = false
    fetching.value = false
  }
}

// ===== Tab 切换 =====
function switchTab(key: ChannelKey) {
  if (currentTab.value === key) return
  currentTab.value = key
  const state = tabData.value[key]
  if (!state.loaded) {
    fetchFeed(true)
  } else {
    fetchFeed(true) // 后台静默刷新
  }
}

// ===== 导航 =====
function goItem(item: FeedItem) {
  switch (item._type) {
    case 'video':
      uni.navigateTo({ url: `/pages/videos/video-play?id=${item.id}` })
      break
    case 'live':
      uni.navigateTo({ url: `/pages/live/live-room?id=${item.id}` })
      break
    case 'product':
      uni.navigateTo({ url: `/pages/shop/product-detail?id=${item.id}` })
      break
    case 'circle':
      uni.navigateTo({ url: `/pages/circles/circle-detail?id=${item.id}` })
      break
    case 'editorial':
      uni.navigateTo({ url: `/pages/detail/detail?id=${item.id}&type=CONTENT` })
      break
    default:
      uni.navigateTo({ url: `/pages/detail/detail?id=${item.id}&type=ARTICLE` })
      break
  }
}

function goSearch() {
  uni.navigateTo({ url: '/pages/search/search' })
}

function goPage(url: string) {
  uni.navigateTo({ url })
}

// ===== 获取动态 Banner =====
async function fetchBanners() {
  try {
    const data: any = await systemApi.getBanners()
    if (data?.banners?.length) {
      banners.value = data.banners
    }
  } catch { /* 使用默认Banner */ }
}

// ===== 生命周期 =====
onMounted(() => {
  fetchFeed(true)
  fetchBanners()
})

onPullDownRefresh(() => {
  refreshing.value = true
  const key = currentTab.value
  tabData.value[key] = { list: [], page: 1, hasMore: true, loaded: false }
  fetchFeed(true).finally(() => {
    refreshing.value = false
    uni.stopPullDownRefresh()
  })
})

onReachBottom(() => {
  const state = tabData.value[currentTab.value]
  if (!state.hasMore || fetching.value || loadingMore.value) return
  loadingMore.value = true
  state.page++
  fetchFeed(false)
})
</script>

<style>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 60px;
}

/* ===== Header ===== */
.header {
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  padding: 15px 15px 20px;
  padding-top: calc(15px + env(safe-area-inset-top));
  color: #fff;
}
.header-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}
.logo {
  font-size: 20px;
  font-weight: bold;
  letter-spacing: 2px;
  font-family: 'Noto Serif SC', serif;
}
.header-actions {
  display: flex;
  gap: 15px;
  margin-left: auto;
}
.header-icon {
  font-size: 20px;
}
.search-bar {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 10px 15px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.search-icon {
  font-size: 14px;
  opacity: 0.8;
}
.search-placeholder {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}

/* ===== Banner ===== */
.banner-swiper {
  width: 100%;
  height: 140px;
  margin: 15px;
  width: calc(100% - 30px);
  border-radius: 12px;
  overflow: hidden;
}
.banner-slide {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 0 20px;
  box-sizing: border-box;
}
.banner-icon {
  font-size: 40px;
  flex-shrink: 0;
}
.banner-text {
  display: flex;
  flex-direction: column;
}
.banner-title {
  font-size: 22px;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
.banner-sub {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 4px;
}

/* ===== Quick Tools ===== */
.quick-tools {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin: 15px;
}
.tool-item {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 15px 10px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}
.tool-item:active {
  transform: scale(0.98);
}
.tool-icon {
  font-size: 28px;
  display: block;
  margin-bottom: 8px;
}
.tool-name {
  font-size: 12px;
  font-weight: 500;
  color: #2C2C2C;
}

/* ===== Tab Nav ===== */
.tab-nav {
  display: flex;
  gap: 20px;
  margin: 0 15px;
  border-bottom: 1px solid #E8E0D5;
  padding-bottom: 0;
}
.tab-item {
  padding: 12px 0;
  font-size: 14px;
  color: #666666;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}
.tab-item.active {
  color: #C41E3A;
  border-bottom-color: #C41E3A;
  font-weight: 500;
}

/* ===== 下拉刷新 ===== */
.refresh-tip {
  text-align: center;
  font-size: 12px;
  color: #C9A96E;
  padding: 6px 0;
}

/* ===== 文章列表（推荐Tab） ===== */
.article-list {
  margin: 15px;
}
.article-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #E8E0D5;
}
.article-item:last-child {
  border-bottom: none;
}
.article-thumb {
  width: 80px;
  height: 60px;
  background: linear-gradient(135deg, #e8d5c5, #d4c4b0);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
  overflow: hidden;
}
.article-thumb-img {
  width: 100%;
  height: 100%;
}
.article-thumb-icon {
  font-size: 24px;
}
.article-content {
  flex: 1;
  min-width: 0;
}
.article-title {
  font-size: 14px;
  font-weight: 500;
  color: #2C2C2C;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  margin-bottom: 5px;
}
.article-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #999999;
}
.meta-tag {
  background: #F5F0E8;
  color: #C41E3A;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 10px;
}
.meta-time {
  margin-left: auto;
  flex-shrink: 0;
  color: #999999;
}

/* ===== 双列瀑布流 ===== */
.feed-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 15px 4px;
}

.feed-card {
  width: calc(50% - 4px);
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: transform 0.15s;
  box-sizing: border-box;
}
.feed-card:active {
  transform: scale(0.98);
}

/* ===== 封面容器 ===== */
.card-cover-wrap {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: #F5F0E8;
}
.feed-card.type-video .card-cover-wrap,
.feed-card.type-live .card-cover-wrap,
.feed-card.type-product .card-cover-wrap {
  max-height: 160px;
}

.card-cover {
  width: 100%;
  height: 100%;
  display: block;
  min-height: 100px;
}

/* ===== 角标 ===== */
.card-badge-live {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
  font-size: 10px;
  padding: 3px 10px;
  border-radius: 4px;
  font-weight: bold;
  background: #e53935;
  color: #fff;
}

.card-badge-dur {
  position: absolute;
  bottom: 6px;
  right: 6px;
  z-index: 2;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-weight: bold;
}

/* ===== 卡片内容 ===== */
.card-body {
  padding: 10px 10px 0;
}
.card-title {
  font-size: 14px;
  font-weight: 500;
  color: #2C2C2C;
  display: block;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-extra {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-price {
  display: block;
  font-size: 16px;
  font-weight: bold;
  color: #C41E3A;
  margin-top: 6px;
}

.card-footer {
  display: flex;
  gap: 10px;
  padding: 8px 10px 10px;
  font-size: 11px;
  color: #999999;
}
.meta-stat {
  white-space: nowrap;
}

/* ===== 加载更多 ===== */
.load-more-indicator {
  text-align: center;
  padding: 16px 0;
}
.load-more-text {
  font-size: 13px;
  color: #C9A96E;
}
.no-more {
  text-align: center;
  color: #999999;
  padding: 16px 0;
  font-size: 12px;
}
</style>
