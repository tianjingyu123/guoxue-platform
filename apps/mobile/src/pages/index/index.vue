<template>
  <view class="page">
    <!-- 搜索栏 -->
    <view class="search-bar-wrapper" @click="goSearch">
      <SearchBar disabled placeholder="搜索经典、诗词、课程..." />
    </view>

    <!-- Banner轮播 -->
    <swiper
      class="banner-swiper"
      circular
      autoplay
      interval="4000"
      indicator-dots
      indicator-color="rgba(255,255,255,0.4)"
      indicator-active-color="#8b4513"
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

    <!-- 4个分类快捷入口 -->
    <view class="entrance-grid">
      <view class="entrance-item" @click="goPage('/pages/classics/classics')">
        <view class="entrance-icon-wrap">
          <text class="entrance-icon">📖</text>
        </view>
        <text class="entrance-label">古籍经典</text>
      </view>
      <view class="entrance-item" @click="goPage('/pages/poetry/poetry')">
        <view class="entrance-icon-wrap">
          <text class="entrance-icon">🌸</text>
        </view>
        <text class="entrance-label">诗词赏析</text>
      </view>
      <view class="entrance-item" @click="goPage('/pages/courses/courses')">
        <view class="entrance-icon-wrap">
          <text class="entrance-icon">📚</text>
        </view>
        <text class="entrance-label">国学课程</text>
      </view>
      <view class="entrance-item" @click="goPage('/pages/bazi/bazi')">
        <view class="entrance-icon-wrap">
          <text class="entrance-icon">☰</text>
        </view>
        <text class="entrance-label">八字排盘</text>
      </view>
    </view>

    <!-- 顶部频道Tab -->
    <view class="channel-tabs">
      <view
        v-for="ch in channels"
        :key="ch.key"
        class="channel-tab"
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

    <!-- 双列瀑布流 -->
    <view v-else-if="list.length > 0" class="feed-grid">
      <view
        v-for="(item, idx) in list"
        :key="item._type + '-' + item.id + '-' + idx"
        class="feed-card"
        :class="'type-' + item._type"
        @click="goItem(item)"
      >
        <!-- ===== 文章卡片 ===== -->
        <template v-if="item._type === 'article'">
          <view v-if="item.cover" class="card-cover-wrap">
            <image :src="item.cover" class="card-cover" mode="aspectFill" />
            <view class="card-badge-top badge-article">文章</view>
          </view>
          <view class="card-body" :class="{ 'no-cover': !item.cover }">
            <text class="card-title">{{ item.title }}</text>
            <view class="card-meta-line">
              <text v-if="item.author" class="meta-author">{{ item.author }}</text>
              <text v-if="item.dynasty" class="meta-dynasty">{{ item.dynasty }}</text>
              <text class="meta-time">{{ formatTime(item.createdAt) }}</text>
            </view>
            <text class="card-excerpt" v-if="item.excerpt">{{ item.excerpt }}</text>
          </view>
          <view class="card-footer">
            <text class="meta-stat">👁 {{ item.viewCount ?? 0 }}</text>
            <text class="meta-stat">👍 {{ item.likeCount ?? 0 }}</text>
            <text class="meta-stat" v-if="item.collectCount !== undefined">⭐ {{ item.collectCount }}</text>
          </view>
        </template>

        <!-- ===== 短视频卡片 ===== -->
        <template v-else-if="item._type === 'video'">
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

        <!-- ===== 圈子推荐卡片 ===== -->
        <template v-else-if="item._type === 'circle'">
          <view v-if="item.cover" class="card-cover-wrap">
            <image :src="item.cover" class="card-cover" mode="aspectFill" />
            <view class="card-badge-top badge-circle">圈子</view>
          </view>
          <view class="card-body" :class="{ 'no-cover': !item.cover }">
            <text class="card-title">{{ item.name || item.title }}</text>
            <text class="card-extra" v-if="item.memberCount !== undefined">👥 {{ item.memberCount }}人</text>
            <text class="card-excerpt" v-if="item.intro">{{ item.intro }}</text>
          </view>
          <view class="card-footer" v-if="item.memberCount || item.postCount">
            <text class="meta-stat" v-if="item.memberCount">成员 {{ item.memberCount }}</text>
            <text class="meta-stat" v-if="item.postCount">帖子 {{ item.postCount }}</text>
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
import { ref, computed, onMounted, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import SearchBar from '../../components/SearchBar.vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { contentApi, circleApi, videoApi, shopApi, liveApi } from '../../api'

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

// ===== Banner 数据 =====
const banners = [
  {
    icon: '📜',
    title: '国学经典',
    sub: '品读四书五经，传承中华文化',
    bg: 'linear-gradient(135deg, #8b4513, #a0522d)',
  },
  {
    icon: '🌸',
    title: '诗词欣赏',
    sub: '唐诗宋词，感受千年风雅',
    bg: 'linear-gradient(135deg, #6b3a1f, #c4943a)',
  },
  {
    icon: '🧘',
    title: '修身养性',
    sub: '以文化人，以德润身',
    bg: 'linear-gradient(135deg, #5a3a1a, #8b6914)',
  },
]

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
      // 推荐：文章 + 圈子混排
      const [articleData, circleData] = await Promise.all([
        contentApi.feed({ page: state.page, pageSize: 8 }).catch(() => ({ list: [] })),
        circleApi.list({ page: Math.ceil(state.page / 2), pageSize: 4 }).catch(() => ({ circles: [] })),
      ])

      const articles: FeedItem[] = extractList(articleData, 'list')
        .slice(0, 6)
        .map((a: any) => ({
          ...a,
          _type: 'article' as const,
          heatScore: calcHeat(a.viewCount || 0, a.likeCount || 0, a.createdAt),
        }))

      const circles: FeedItem[] = extractList(circleData, 'circles')
        .slice(0, 3)
        .map((c: any) => ({
          ...c,
          _type: 'circle' as const,
          title: c.name || c.title,
          heatScore: calcHeat(c.memberCount || 0, c.postCount || 0, c.createdAt),
        }))

      const merged = interleave(articles, circles)
      merged.sort((a, b) => (b.heatScore || 0) - (a.heatScore || 0))

      if (reset) {
        state.list = merged
      } else {
        appendUnique(state.list, merged)
      }
      state.hasMore = articles.length >= 6
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

// ===== 生命周期 =====
onMounted(() => {
  fetchFeed(true)
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
  padding: 12px;
  background: #f5f0e6;
  min-height: 100vh;
}

/* ===== 搜索栏 ===== */
.search-bar-wrapper {
  margin-bottom: 12px;
}

/* ===== Banner轮播 ===== */
.banner-swiper {
  width: 100%;
  height: 160px;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 14px;
}
.banner-slide {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 0 20px;
  box-sizing: border-box;
}
.banner-icon {
  font-size: 48px;
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

/* ===== 功能入口 ===== */
.entrance-grid {
  display: flex;
  justify-content: space-around;
  background: #fff;
  border-radius: 12px;
  padding: 16px 4px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.entrance-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
}
.entrance-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #f5f0e6;
  display: flex;
  align-items: center;
  justify-content: center;
}
.entrance-icon {
  font-size: 24px;
}
.entrance-label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

/* ===== 频道Tab ===== */
.channel-tabs {
  display: flex;
  align-items: center;
  gap: 0;
  background: #fff;
  border-radius: 10px;
  padding: 4px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.channel-tab {
  flex: 1;
  text-align: center;
  padding: 8px 0;
  border-radius: 8px;
  font-size: 14px;
  color: #666;
  transition: all 0.2s;
}
.channel-tab.active {
  background: #8b4513;
  color: #fff;
  font-weight: bold;
}
.channel-tab:active {
  opacity: 0.7;
}

/* ===== 下拉刷新 ===== */
.refresh-tip {
  text-align: center;
  font-size: 12px;
  color: #c4943a;
  padding: 6px 0;
}

/* ===== 双列瀑布流容器 ===== */
.feed-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 4px;
}

/* ===== Feed卡片基础 ===== */
.feed-card {
  width: calc(50% - 4px);
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  transition: transform 0.15s;
  box-sizing: border-box;
}
.feed-card:active {
  transform: scale(0.98);
}

/* ===== 封面容器（相对定位，用于角标） ===== */
.card-cover-wrap {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: #f0e8d8;
}
.feed-card.type-article .card-cover-wrap {
  max-height: 150px;
}
.feed-card.type-video .card-cover-wrap {
  max-height: 180px;
}
.feed-card.type-live .card-cover-wrap {
  max-height: 180px;
}
.feed-card.type-product .card-cover-wrap {
  max-height: 180px;
}
.feed-card.type-circle .card-cover-wrap {
  max-height: 140px;
}

.card-cover {
  width: 100%;
  height: 100%;
  display: block;
  min-height: 100px;
}

/* ===== 通用左上角类型标签 ===== */
.card-badge-top {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
  font-size: 10px;
  padding: 2px 10px;
  border-radius: 10px;
  font-weight: bold;
}
.badge-article {
  background: #8b4513;
  color: #fff;
}
.badge-circle {
  background: #2e7d32;
  color: #fff;
}

/* ===== 直播中角标 ===== */
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

/* ===== 视频时长角标 ===== */
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

/* ===== 卡片内容区 ===== */
.card-body {
  padding: 10px 10px 0;
}
.card-body.no-cover {
  padding-top: 12px;
}

.card-title {
  font-size: 14px;
  font-weight: bold;
  color: #333;
  display: block;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-meta-line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #999;
  margin: 4px 0;
  overflow: hidden;
}
.meta-author {
  color: #8b4513;
  max-width: 70px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.meta-dynasty {
  color: #8b4513;
  font-size: 10px;
  background: #f5f0e6;
  padding: 1px 6px;
  border-radius: 3px;
  flex-shrink: 0;
}
.meta-time {
  margin-left: auto;
  flex-shrink: 0;
  color: #bbb;
}

.card-excerpt {
  font-size: 12px;
  color: #888;
  margin-top: 4px;
  display: block;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
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

/* 商品价格 */
.card-price {
  display: block;
  font-size: 16px;
  font-weight: bold;
  color: #e53935;
  margin-top: 6px;
}

/* ===== 卡片底部 ===== */
.card-footer {
  display: flex;
  gap: 10px;
  padding: 8px 10px 10px;
  font-size: 11px;
  color: #bbb;
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
  color: #c4943a;
}
.no-more {
  text-align: center;
  color: #ccc;
  padding: 16px 0;
  font-size: 12px;
}
</style>
