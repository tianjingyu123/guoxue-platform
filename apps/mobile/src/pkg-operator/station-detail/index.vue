<script setup lang="ts">
/** 分站版首页（A类逐像素，对齐原型 app/station/[id]/page.tsx）
 *  分站品牌栏 + 搜索Header + Hero轮播(站长信息) + 站长寄语 + 十宫格 +
 *  站长精选 + 为你推荐Feed流 + 回到顶部 + 底部导航 */
import { ref, computed, onMounted } from 'vue'
import QuickEntryGrid from '@/components/home/quick-entry-grid.vue'
import FeedCard from '@/components/home/feed-card.vue'
import BackTop from '@/components/home/back-top.vue'
import BottomNav from '@/components/bottom-nav/bottom-nav.vue'
import { homeApi, type RenderItem } from '@/lib/home-data'
import { stationDetailApi } from '@/lib/station-detail-data'
import { navigateTo } from '@/utils/router'

const loading = ref(true)
const error = ref('')
const isEmpty = ref(false)

// 分站配置对象，模板裸访问多字段，保留 any
const station = ref<any>({})
const featuredTypeConfig = ref<Record<string, { icon: string; label: string }>>({})
const theme = computed(() => station.value.themeColor || '#C41E3A')

// Hero 轮播
const heroIndex = ref(0)
function onHeroChange(e: { detail: { current: number } }) {
  heroIndex.value = e.detail.current
}

// 为你推荐 Feed（复用主首页瀑布流，通过API异步获取）
const feedLoading = ref(true)
const feedError = ref('')
const renderItems = ref<RenderItem[]>([])

async function fetchFeed() {
  feedLoading.value = true
  feedError.value = ''
  try {
    const res = await homeApi.getHome()
    renderItems.value = res.feed
  } catch (e) {
    feedError.value = '加载失败，请检查网络后重试'
  } finally {
    feedLoading.value = false
  }
}

function retryFeed() {
  fetchFeed()
}

onMounted(async () => {
  await loadStationData()
  fetchFeed()
})

async function loadStationData() {
  loading.value = true
  error.value = ''
  try {
    const [config, typeConfig] = await Promise.all([
      stationDetailApi.getStationConfig(),
      stationDetailApi.getFeaturedTypeConfig(),
    ])
    station.value = config || {}
    featuredTypeConfig.value = typeConfig || {}
    isEmpty.value = !config || Object.keys(config).length === 0
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function retry() {
  await loadStationData()
  if (!renderItems.value.length) fetchFeed()
}

const leftCol = computed<RenderItem[]>(() => renderItems.value.filter((_, i) => i % 2 === 0))
const rightCol = computed<RenderItem[]>(() => renderItems.value.filter((_, i) => i % 2 === 1))

// 回到顶部
const showBackTop = ref(false)
const scrollTopVal = ref(0)
function onScroll(e: { detail: { scrollTop: number } }) {
  showBackTop.value = e.detail.scrollTop > 1200
}
function backToTop() {
  scrollTopVal.value = scrollTopVal.value === 0 ? 1 : 0
  setTimeout(() => (scrollTopVal.value = 0), 30)
}

function toastSoon() {
  uni.showToast({ title: '敬请期待', icon: 'none' })
}
</script>

<template>
  <view class="sd">
    <!-- 固定顶部：品牌栏 + 搜索栏 -->
    <view class="sd-fixed-top" :style="{ paddingTop: 'var(--status-bar-height, 0px)' }">
      <!-- 分站品牌栏 -->
      <view class="sd-brandbar" :style="{ background: theme }">
        <view class="sd-brandbar-left">
          <view class="sd-brand-logo"><text class="sd-brand-logo-txt">{{ station.name?.charAt(0) }}</text></view>
          <text class="sd-brand-name">{{ station.name }}</text>
          <text class="sd-brand-tag">热卜国学</text>
        </view>
        <view class="sd-brandbar-my" @tap="toastSoon"><text class="sd-brandbar-my-txt">我的分站 ›</text></view>
      </view>
      <!-- 搜索 Header -->
      <view class="sd-header">
        <!-- 死入口大扫除：搜索框 → 全局搜索页（真实已注册页） -->
        <view class="sd-search" @tap="navigateTo('/search')">
          <app-icon name="search" :size="32" color="#999" />
          <text class="sd-search-ph">搜索课程、圈子、文章...</text>
        </view>
        <view class="sd-bell" @tap="toastSoon">
          <app-icon name="bell" :size="40" color="#1f1f1f" />
          <view class="sd-bell-dot" />
        </view>
      </view>
    </view>

    <scroll-view
      scroll-y
      class="sd-scroll"
      :scroll-top="scrollTopVal"
      :scroll-with-animation="true"
      @scroll="onScroll"
    >
      <!-- 三态：加载中 -->
      <view v-if="loading" class="state-loading"><text class="state-loading-text">加载中...</text></view>
      <!-- 三态：错误 -->
      <view v-else-if="error" class="state-error">
        <text class="state-error-text">{{ error }}</text>
        <view class="state-retry-btn" @tap="retry"><text>重试</text></view>
      </view>
      <!-- 三态：空数据 -->
      <view v-else-if="isEmpty" class="state-empty">
        <text class="state-empty-text">暂无数据</text>
      </view>
      <template v-else>
      <!-- Hero Banner -->
      <view class="sd-hero">
        <view class="sd-hero-card">
          <swiper
            class="sd-hero-swiper"
            :circular="station.heroImages.length > 1"
            :autoplay="station.heroImages.length > 1"
            :interval="5000"
            :duration="500"
            @change="onHeroChange"
          >
            <swiper-item v-for="(img, i) in station.heroImages" :key="i">
              <image lazy-load class="sd-hero-img" :src="img" mode="aspectFill" />
            </swiper-item>
          </swiper>
          <view class="sd-hero-mask" />
          <view class="sd-hero-master">
            <view class="sd-hero-avatar" :style="{ background: theme }">
              <image lazy-load v-if="station.masterAvatar" class="sd-hero-avatar-img" :src="station.masterAvatar" mode="aspectFill" />
              <text v-else class="sd-hero-avatar-txt">{{ station.masterName.charAt(0) }}</text>
            </view>
            <view class="sd-hero-meta">
              <text class="sd-hero-name">{{ station.name }}</text>
              <text v-if="station.memberCount != null || station.contentCount != null" class="sd-hero-stat">
                <text v-if="station.memberCount != null">{{ station.memberCount }} 成员</text>
                <text v-if="station.memberCount != null && station.contentCount != null"> · </text>
                <text v-if="station.contentCount != null">{{ station.contentCount }} 内容</text>
              </text>
            </view>
          </view>
          <view v-if="station.heroImages.length > 1" class="sd-hero-dots">
            <view
              v-for="(img, i) in station.heroImages"
              :key="i"
              class="sd-hero-dot"
              :class="{ active: i === heroIndex }"
            />
          </view>
        </view>
        <!-- 站长寄语 -->
        <view class="sd-welcome" :style="{ background: theme + '1a' }" @tap="toastSoon">
          <view class="sd-welcome-left">
            <app-icon name="sparkles" :size="32" :color="theme" />
            <text class="sd-welcome-txt" :style="{ color: theme }">欢迎来到{{ station.masterName }}的国学小站</text>
          </view>
          <app-icon name="chevron-right" :size="32" color="#999" />
        </view>
      </view>

      <!-- 十宫格 -->
      <quick-entry-grid />

      <!-- 站长精选（后端无该端点，有数据才展示） -->
      <view v-if="station.featured && station.featured.length" class="sd-featured">
        <view class="sd-featured-head">
          <view class="sd-featured-title">
            <view class="sd-featured-bar" :style="{ background: theme }" />
            <text class="sd-featured-title-txt">{{ station.masterName }}精选</text>
            <view class="sd-featured-badge" :style="{ background: theme + '26' }">
              <text class="sd-featured-badge-txt" :style="{ color: theme }">站长推荐</text>
            </view>
          </view>
          <view class="sd-featured-more" @tap="toastSoon">
            <text class="sd-featured-more-txt">查看全部</text>
            <app-icon name="chevron-right" :size="24" color="#999" />
          </view>
        </view>

        <view class="sd-featured-list">
          <view
            v-for="item in station.featured.slice(0, 3)"
            :key="item.id"
            class="sd-fcard"
            :style="{ borderColor: theme + '4d', background: theme + '0d' }"
            @tap="toastSoon"
          >
            <view class="sd-fcard-main">
              <view class="sd-fcard-cover">
                <image lazy-load v-if="item.cover" class="sd-fcard-cover-img" :src="item.cover" mode="aspectFill" />
                <view v-else class="sd-fcard-cover-ph" :style="{ background: theme + '33' }">
                  <app-icon :name="featuredTypeConfig[item.type].icon" :size="56" :color="theme" />
                </view>
              </view>
              <view class="sd-fcard-info">
                <view class="sd-fcard-tags">
                  <view class="sd-fcard-type" :style="{ background: theme + '26' }">
                    <text class="sd-fcard-type-txt" :style="{ color: theme }">{{ featuredTypeConfig[item.type].label }}</text>
                  </view>
                  <text v-if="item.price !== undefined && item.price > 0" class="sd-fcard-price">¥{{ item.price }}</text>
                  <text v-if="item.originalPrice" class="sd-fcard-original">¥{{ item.originalPrice }}</text>
                </view>
                <text class="sd-fcard-title">{{ item.title }}</text>
                <view v-if="item.recommendation" class="sd-fcard-rec">
                  <app-icon name="quote" :size="24" color="#999" />
                  <text class="sd-fcard-rec-txt">{{ item.recommendation }}</text>
                </view>
              </view>
            </view>
            <view class="sd-fcard-foot">
              <text class="sd-fcard-foot-txt">{{ station.masterName }} 推荐</text>
            </view>
          </view>
        </view>
      </view>
      </template>

      <!-- 为你推荐 -->
      <view class="sd-recommend-head">
        <text class="sd-recommend-title">为你推荐</text>
      </view>

      <!-- Feed 加载骨架 -->
      <view v-if="feedLoading" class="sd-feed skeleton">
        <view class="sk-block" style="height: 400rpx; width: 50%; flex-shrink: 0; border-radius: 16rpx;" />
        <view class="sk-block" style="height: 300rpx; width: 50%; flex-shrink: 0; border-radius: 16rpx; margin-top: 40rpx;" />
      </view>

      <!-- Feed 错误 -->
      <view v-else-if="feedError" class="error-state" style="margin: 32rpx; padding: 48rpx 0;">
        <text class="error-text">{{ feedError }}</text>
        <view class="retry-btn" @tap="retryFeed">
          <text class="retry-text">点击重试</text>
        </view>
      </view>

      <!-- Feed 正常 -->
      <view v-else class="sd-feed">
        <view class="sd-feed-col">
          <feed-card v-for="ri in leftCol" :key="ri.key" :data="ri" />
        </view>
        <view class="sd-feed-col">
          <feed-card v-for="ri in rightCol" :key="ri.key" :data="ri" />
        </view>
      </view>

      <view class="sd-end">
        <view class="sd-end-line" /><text class="sd-end-text">已经到底了</text><view class="sd-end-line" />
      </view>
    </scroll-view>

    <back-top :visible="showBackTop" @tap="backToTop" />
    <bottom-nav active="home" />
  </view>
</template>

<style scoped lang="scss">
.sd { min-height: 100vh; background: var(--bg-paper, #faf8f5); }

/* 固定顶部 */
.sd-fixed-top { position: fixed; top: 0; left: 0; right: 0; z-index: 50; }
.sd-brandbar { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 32rpx; }
.sd-brandbar-left { display: flex; align-items: center; gap: 12rpx; }
.sd-brand-logo { width: 48rpx; height: 48rpx; border-radius: 12rpx; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; }
.sd-brand-logo-txt { color: #ffffff; font-size: 24rpx; font-weight: 700; }
.sd-brand-name { color: #ffffff; font-weight: 500; font-size: 28rpx; }
.sd-brand-tag { color: rgba(255,255,255,0.6); font-size: 20rpx; margin-left: 8rpx; }
.sd-brandbar-my-txt { color: rgba(255,255,255,0.85); font-size: 24rpx; }

.sd-header { height: 88rpx; display: flex; align-items: center; padding: 0 32rpx; background: var(--bg-paper, #faf8f5); border-bottom: 1rpx solid var(--line, #e8e0d5); }
.sd-search { flex: 1; height: 64rpx; display: flex; align-items: center; gap: 16rpx; padding: 0 24rpx; border-radius: 999rpx; background: var(--bg-soft, #f0ebe3); }
.sd-search-ph { font-size: 26rpx; color: var(--text-soft, #999); }
.sd-bell { position: relative; padding: 16rpx; margin-left: 24rpx; }
.sd-bell-dot { position: absolute; top: 12rpx; right: 12rpx; width: 16rpx; height: 16rpx; border-radius: 999rpx; background: #ef4444; }

.sd-scroll { position: absolute; top: calc(176rpx + var(--status-bar-height, 0px)); bottom: 112rpx; left: 0; right: 0; }

/* Hero */
.sd-hero { margin: 24rpx 32rpx 0; }
.sd-hero-card { position: relative; width: 100%; aspect-ratio: 2 / 1; border-radius: 24rpx; overflow: hidden; }
.sd-hero-swiper { width: 100%; height: 100%; }
.sd-hero-img { width: 100%; height: 100%; }
.sd-hero-mask { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.6), transparent 60%); }
.sd-hero-master { position: absolute; bottom: 24rpx; left: 24rpx; right: 24rpx; display: flex; align-items: center; gap: 16rpx; }
.sd-hero-avatar { width: 64rpx; height: 64rpx; border-radius: 999rpx; border: 4rpx solid #ffffff; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.sd-hero-avatar-img { width: 100%; height: 100%; }
.sd-hero-avatar-txt { color: #ffffff; font-size: 24rpx; font-weight: 700; }
.sd-hero-meta { display: flex; flex-direction: column; }
.sd-hero-name { color: #ffffff; font-size: 28rpx; font-weight: 500; }
.sd-hero-stat { color: rgba(255,255,255,0.7); font-size: 20rpx; }
.sd-hero-dots { position: absolute; bottom: 24rpx; right: 24rpx; display: flex; gap: 8rpx; }
.sd-hero-dot { width: 12rpx; height: 12rpx; border-radius: 999rpx; background: rgba(255,255,255,0.5); transition: all 0.3s; }
.sd-hero-dot.active { width: 32rpx; background: #ffffff; }

.sd-welcome { margin-top: 16rpx; padding: 20rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: space-between; }
.sd-welcome-left { display: flex; align-items: center; gap: 16rpx; }
.sd-welcome-txt { font-size: 24rpx; }

/* 站长精选 */
.sd-featured { margin: 32rpx; }
.sd-featured-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.sd-featured-title { display: flex; align-items: center; gap: 16rpx; }
.sd-featured-bar { width: 8rpx; height: 32rpx; border-radius: 999rpx; }
.sd-featured-title-txt { font-size: 28rpx; font-weight: 500; color: var(--text-strong, #1f1f1f); }
.sd-featured-badge { padding: 2rpx 12rpx; border-radius: 8rpx; }
.sd-featured-badge-txt { font-size: 20rpx; }
.sd-featured-more { display: flex; align-items: center; gap: 4rpx; }
.sd-featured-more-txt { font-size: 24rpx; color: var(--text-soft, #999); }

.sd-featured-list { display: flex; flex-direction: column; gap: 24rpx; }
.sd-fcard { padding: 24rpx; border-radius: 24rpx; border: 1rpx solid; }
.sd-fcard-main { display: flex; gap: 24rpx; }
.sd-fcard-cover { width: 160rpx; height: 160rpx; border-radius: 16rpx; overflow: hidden; flex-shrink: 0; background: var(--bg-soft, #f0ebe3); }
.sd-fcard-cover-img { width: 100%; height: 100%; }
.sd-fcard-cover-ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.sd-fcard-info { flex: 1; min-width: 0; }
.sd-fcard-tags { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; }
.sd-fcard-type { padding: 2rpx 12rpx; border-radius: 8rpx; }
.sd-fcard-type-txt { font-size: 20rpx; }
.sd-fcard-price { font-size: 24rpx; font-weight: 500; color: var(--brand-red, var(--brand)); }
.sd-fcard-original { font-size: 20rpx; color: var(--text-soft, #999); text-decoration: line-through; }
.sd-fcard-title { display: block; font-size: 28rpx; font-weight: 500; color: var(--text-strong, #1f1f1f); margin-bottom: 8rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sd-fcard-rec { display: flex; align-items: flex-start; gap: 8rpx; margin-top: 12rpx; }
.sd-fcard-rec-txt { flex: 1; font-size: 22rpx; font-style: italic; color: var(--text-soft, #999); line-height: 1.4; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.sd-fcard-foot { display: flex; justify-content: flex-end; margin-top: 16rpx; padding-top: 16rpx; border-top: 1rpx solid rgba(0,0,0,0.06); }
.sd-fcard-foot-txt { font-size: 20rpx; color: var(--text-soft, #999); }

/* 为你推荐 */
.sd-recommend-head { padding: 8rpx 32rpx 0; }
.sd-recommend-title { font-size: 26rpx; font-weight: 500; color: var(--text-soft, #999); }
.sd-feed { display: flex; gap: 12rpx; padding: 24rpx 32rpx 0; }
.sd-feed-col { flex: 1; min-width: 0; }

.sd-end { display: flex; align-items: center; justify-content: center; gap: 24rpx; padding: 48rpx 0 64rpx; }
.sd-end-line { width: 60rpx; height: 1rpx; background: var(--line, #e8e0d5); }
.sd-end-text { font-size: 24rpx; color: var(--text-soft, #999); }

/* 骨架屏 */
.skeleton { gap: 12rpx; }
.sk-block {
  background: linear-gradient(90deg, #e8e0d5 25%, #f0ebe3 50%, #e8e0d5 75%);
  background-size: 200% 100%;
  animation: sk-shimmer 1.5s infinite;
}
@keyframes sk-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* 错误状态 */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
}
.error-text { font-size: 28rpx; color: var(--text-soft, #999); }
.retry-btn {
  padding: 16rpx 48rpx; border-radius: 999rpx;
  background: var(--brand-brown, #8B6B4A);
}
.retry-text { font-size: 28rpx; color: #ffffff; }

/* 三态 */
.state-loading, .state-error, .state-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 120rpx 32rpx; }
.state-loading-text { font-size: 28rpx; color: #999; }
.state-error-text { font-size: 28rpx; color: #ef4444; text-align: center; margin-bottom: 24rpx; }
.state-empty-text { font-size: 28rpx; color: #999; }
.state-retry-btn { padding: 16rpx 48rpx; background: #7c3aed; border-radius: 12rpx; }
.state-retry-btn text { font-size: 26rpx; color: #fff; }
</style>
