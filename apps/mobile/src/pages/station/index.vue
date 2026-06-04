<template>
  <view class="page">
    <!-- 自定义导航栏 -->
    <view class="nav-bar" :style="{ background: station.theme?.primaryColor || '#C41E3A' }">
      <view class="nav-content">
        <view class="nav-left">
          <image v-if="station.logo" :src="station.logo" class="nav-logo" mode="aspectFill" />
          <text class="nav-name">{{ station.name || '国学分站' }}</text>
        </view>
        <text class="nav-share" @click="handleShare">📤</text>
      </view>
    </view>

    <!-- Banner 轮播 -->
    <scroll-view scroll-x class="banner-scroll" :show-scrollbar="false" @scroll="onBannerScroll">
      <view class="banner-track">
        <view
          v-for="(banner, idx) in banners"
          :key="banner.id || idx"
          class="banner-item"
          @click="goBannerLink(banner)"
        >
          <image :src="banner.image || banner.cover" class="banner-img" mode="aspectFill" />
          <view class="banner-overlay">
            <text class="banner-title">{{ banner.title }}</text>
          </view>
        </view>
      </view>
      <!-- 指示器 -->
      <view class="banner-dots">
        <text v-for="(_, idx) in banners" :key="idx" class="dot" :class="{ active: currentBanner === idx }" />
      </view>
    </scroll-view>

    <!-- 特色功能入口 -->
    <view class="features-grid">
      <view
        v-for="feature in features"
        :key="feature.id || feature.path"
        class="feature-item"
        @click="goFeature(feature)"
      >
        <view class="feature-icon-wrap" :style="{ background: feature.color + '20' || '#F5F0E8' }">
          <text class="feature-icon">{{ feature.icon }}</text>
          <text v-if="feature.badge" class="feature-badge">{{ feature.badge }}</text>
        </view>
        <text class="feature-label">{{ feature.label }}</text>
      </view>
    </view>

    <!-- 站长推荐 -->
    <view class="section" v-if="recommends.length > 0">
      <view class="section-header">
        <view class="section-header-left">
          <image v-if="station.master?.avatar" :src="station.master.avatar" class="master-avatar" mode="aspectFill" />
          <text class="section-title">站长推荐</text>
        </view>
        <text class="section-more" @click="goMore">更多 ›</text>
      </view>
      <scroll-view scroll-x class="recommend-scroll" show-scrollbar="false">
        <view
          v-for="item in recommends"
          :key="item.id"
          class="recommend-card"
          @click="goDetail(item.type, item.id)"
        >
          <image :src="item.cover" class="rec-cover" mode="aspectFill" />
          <view v-if="item.tag" class="rec-tag" :style="{ background: station.theme?.primaryColor || '#C41E3A' }">
            <text>{{ item.tag }}</text>
          </view>
          <text class="rec-title">{{ item.title }}</text>
          <view class="rec-price">
            <text v-if="item.price !== undefined" :style="{ color: station.theme?.primaryColor || '#C41E3A' }">
              {{ item.price > 0 ? '¥' + item.price : '免费' }}
            </text>
            <text v-if="item.originalPrice" class="rec-original">¥{{ item.originalPrice }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 精选内容 Feed -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">精选内容</text>
      </view>
      <DataState
        :is-loading="feedLoading && feedList.length === 0"
        :error="feedError"
        :is-empty="!feedLoading && feedList.length === 0"
        empty-icon="📭"
        empty-title="暂无内容"
        skeleton-type="feed"
        @retry="fetchFeed"
      >
        <view v-for="item in feedList" :key="item.id" class="feed-item" @click="goDetail(item.type, item.id)">
          <view class="feed-left">
            <image :src="item.cover" class="feed-cover" mode="aspectFill" />
            <text v-if="item.isLive" class="feed-live-badge">● 直播中</text>
          </view>
          <view class="feed-right">
            <text class="feed-type">{{ typeLabels[item.type] || item.type }}</text>
            <text class="feed-title">{{ item.title }}</text>
            <view class="feed-meta">
              <image v-if="item.author?.avatar" :src="item.author.avatar" class="feed-author-avatar" mode="aspectFill" />
              <text class="feed-author">{{ item.author?.nickname || '' }}</text>
            </view>
            <view class="feed-stats">
              <text>👁 {{ formatCount(item.stats?.views) }}</text>
              <text>❤ {{ formatCount(item.stats?.likes) }}</text>
            </view>
          </view>
        </view>
      </DataState>
      <view v-if="hasMoreFeed" class="load-more" @click="loadMoreFeed">
        <text>加载更多</text>
      </view>
    </view>

    <DataState
      :is-loading="loading"
      :error="loadError"
      :is-empty="false"
      skeleton-type="detail"
      @retry="fetchData"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { stationApi } from '../../api'
import DataState from '../../components/DataState.vue'

const loading = ref(true)
const loadError = ref<string | null>(null)
const station = ref<any>({ name: '国学分站' })
const banners = ref<any[]>([])
const features = ref<any[]>([])
const recommends = ref<any[]>([])
const feedList = ref<any[]>([])
const feedLoading = ref(false)
const feedError = ref<string | null>(null)
const hasMoreFeed = ref(true)
const feedPage = ref(1)
const currentBanner = ref(0)

const typeLabels: Record<string, string> = {
  article: '文章',
  video: '视频',
  course: '课程',
  live: '直播',
  product: '商品',
}

function getStationCode(): string {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  return page?.options?.code || page?.options?.stationCode || 'guoxue001'
}

onMounted(() => {
  fetchData()
  fetchFeed()
})

async function fetchData() {
  const code = getStationCode()
  loading.value = true; loadError.value = null
  try {
    const [brandRes, detailRes]: any[] = await Promise.all([
      stationApi.getBrand(code).catch(() => ({})),
      stationApi.detail(code).catch(() => ({})),
    ])
    const info = brandRes || detailRes || {}
    station.value = {
      name: info.name || info.brandName || '国学分站',
      logo: info.logo || '',
      theme: info.theme || { primaryColor: '#C41E3A' },
      master: info.master || {},
      description: info.description || '',
    }
    banners.value = info.banners || []
    features.value = (info.features || []).map((f: any) => ({
      ...f,
      icon: f.icon || featureIconMap[f.path] || '📚',
    }))
    recommends.value = info.recommends || info.hotCourses || []
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
    // Mock data
    station.value = { name: '翰林书院', logo: '', theme: { primaryColor: '#C41E3A' }, master: { avatar: '' } }
    features.value = [
      { id: '1', icon: '📚', label: '课程', path: '/pages/courses/index', color: '#C41E3A' },
      { id: '2', icon: '🎤', label: '直播', path: '/pages/live/index', color: '#C9A96E' },
      { id: '3', icon: '👥', label: '圈子', path: '/pages/circles/index', color: '#4A90D9' },
      { id: '4', icon: '🛒', label: '商城', path: '/pages/shop/index', color: '#52C41A' },
      { id: '5', icon: '🔮', label: '排盘', path: '/pages/paipan/index', color: '#9B59B6' },
    ]
  } finally {
    loading.value = false
  }
}

const featureIconMap: Record<string, string> = {
  '/courses': '📚',
  '/live': '🎤',
  '/circles': '👥',
  '/shop': '🛒',
  '/paipan': '🔮',
  '/articles': '📝',
  '/videos': '🎬',
}

async function fetchFeed(reset = true) {
  if (reset) { feedPage.value = 1; hasMoreFeed.value = true }
  feedLoading.value = true; feedError.value = null
  try {
    const params: any = { page: feedPage.value, pageSize: 10 }
    const res: any = await stationApi.discover(params)
    const items = Array.isArray(res) ? res : res?.list || res?.data || []
    if (reset) {
      feedList.value = items
    } else {
      const ids = new Set(feedList.value.map((r: any) => r.id))
      feedList.value.push(...items.filter((r: any) => !ids.has(r.id)))
    }
    hasMoreFeed.value = items.length >= 10
  } catch (e: any) {
    feedError.value = e?.errMsg || e?.message || '加载失败'
    if (reset) feedList.value = []
  } finally {
    feedLoading.value = false
  }
}

function loadMoreFeed() {
  if (!hasMoreFeed.value || feedLoading.value) return
  feedPage.value++
  fetchFeed(false)
}

function onBannerScroll(e: any) {
  const scrollLeft = e.detail?.scrollLeft || 0
  currentBanner.value = Math.round(scrollLeft / 375)
}

function goBannerLink(banner: any) {
  if (banner.link) uni.navigateTo({ url: banner.link })
}

function goFeature(feature: any) {
  if (feature.path) uni.navigateTo({ url: feature.path })
}

function goDetail(type: string, id: string) {
  const map: Record<string, string> = {
    course: '/pages/courses/index?id=',
    live: '/pages/live/live-room?id=',
    article: '/pages/articles/index?id=',
    video: '/pages/videos/index?id=',
    product: '/pages/shop/product?id=',
  }
  const base = map[type] || '/pages/detail/index?id='
  uni.navigateTo({ url: base + id })
}

function goMore() {
  uni.navigateTo({ url: '/pages/courses/index' })
}

function handleShare() {
  uni.showActionSheet({
    itemList: ['分享给好友', '生成海报'],
    success: (res) => {
      if (res.tapIndex === 0) {
        uni.showToast({ title: '分享功能开发中', icon: 'none' })
      } else {
        uni.showToast({ title: '海报功能开发中', icon: 'none' })
      }
    },
  })
}

function formatCount(n: number | undefined): string {
  if (!n) return '0'
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  return String(n)
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 40rpx; }

.nav-bar { padding: 60rpx 24rpx 20rpx; }
.nav-content { display: flex; align-items: center; justify-content: space-between; }
.nav-left { display: flex; align-items: center; gap: 12rpx; }
.nav-logo { width: 48rpx; height: 48rpx; border-radius: 12rpx; }
.nav-name { font-size: 34rpx; font-weight: bold; color: #fff; }
.nav-share { font-size: 36rpx; }

.banner-scroll { position: relative; }
.banner-track { display: flex; }
.banner-item { position: relative; width: 375rpx; flex-shrink: 0; }
.banner-img { width: 100%; height: 320rpx; }
.banner-overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 40rpx 24rpx 20rpx; background: linear-gradient(transparent, rgba(0,0,0,0.5)); }
.banner-title { font-size: 28rpx; font-weight: 600; color: #fff; }
.banner-dots { position: absolute; bottom: 12rpx; left: 50%; transform: translateX(-50%); display: flex; gap: 8rpx; }
.dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: rgba(255,255,255,0.4); }
.dot.active { width: 28rpx; border-radius: 6rpx; background: #fff; }

.features-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16rpx; padding: 24rpx; background: #fff; margin: 0 24rpx; border-radius: 16rpx; margin-top: -20rpx; position: relative; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06); }
.feature-item { text-align: center; }
.feature-icon-wrap { width: 88rpx; height: 88rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 8rpx; position: relative; }
.feature-icon { font-size: 40rpx; }
.feature-badge { position: absolute; top: -4rpx; right: -4rpx; font-size: 18rpx; background: #C41E3A; color: #fff; padding: 2rpx 8rpx; border-radius: 12rpx; }
.feature-label { font-size: 22rpx; color: #666; }

.section { padding: 24rpx; }
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.section-header-left { display: flex; align-items: center; gap: 12rpx; }
.master-avatar { width: 40rpx; height: 40rpx; border-radius: 50%; }
.section-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.section-more { font-size: 26rpx; color: #C41E3A; }

.recommend-scroll { display: flex; gap: 20rpx; }
.recommend-card { width: 240rpx; flex-shrink: 0; }
.rec-cover { width: 100%; height: 180rpx; border-radius: 12rpx; }
.rec-tag { position: absolute; top: 8rpx; left: 8rpx; padding: 4rpx 12rpx; border-radius: 8rpx; font-size: 20rpx; color: #fff; }
.rec-title { font-size: 26rpx; color: #2C2C2C; display: block; margin-top: 8rpx; line-height: 1.3; }
.rec-price { display: flex; align-items: center; gap: 8rpx; margin-top: 4rpx; font-size: 24rpx; font-weight: 600; }
.rec-original { font-size: 20rpx; color: #ccc; text-decoration: line-through; }

.feed-item { display: flex; gap: 16rpx; background: #fff; border-radius: 16rpx; padding: 16rpx; margin-bottom: 16rpx; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04); }
.feed-left { position: relative; width: 240rpx; height: 180rpx; flex-shrink: 0; }
.feed-cover { width: 100%; height: 100%; border-radius: 12rpx; }
.feed-live-badge { position: absolute; top: 8rpx; left: 8rpx; font-size: 20rpx; color: #fff; background: #C41E3A; padding: 4rpx 12rpx; border-radius: 8rpx; }
.feed-right { flex: 1; display: flex; flex-direction: column; }
.feed-type { font-size: 22rpx; color: #C9A96E; margin-bottom: 4rpx; }
.feed-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.feed-meta { display: flex; align-items: center; gap: 8rpx; margin-top: 8rpx; }
.feed-author-avatar { width: 32rpx; height: 32rpx; border-radius: 50%; }
.feed-author { font-size: 22rpx; color: #999; }
.feed-stats { display: flex; gap: 16rpx; margin-top: 8rpx; font-size: 22rpx; color: #999; }

.load-more { text-align: center; padding: 24rpx 0; font-size: 26rpx; color: #C9A96E; }
</style>
