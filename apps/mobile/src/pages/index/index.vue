<script setup lang="ts">
/** 首页（1:1 迁移自原型 app/page.tsx）：今日小语 + Header + Banner + 十宫格 +
 *  排盘引导卡 + 营销卡 + AI推荐瀑布流Feed + 回到顶部 + 底部导航 */
import { ref, computed, onMounted } from 'vue'
import AppHeader from '@/components/app-header/app-header.vue'
import BottomNav from '@/components/bottom-nav/bottom-nav.vue'
import QuickEntryGrid from '@/components/home/quick-entry-grid.vue'
import HomeBanner from '@/components/home/home-banner.vue'
import DailyVerse from '@/components/home/daily-verse.vue'
import PaipanGuideCard from '@/components/home/paipan-guide-card.vue'
import MarketingCard from '@/components/home/marketing-card.vue'
import FeedCard from '@/components/home/feed-card.vue'
import BackTop from '@/components/home/back-top.vue'
import { homeApi, defaultBanners, type RenderItem, type BannerItem } from '@/lib/home-data'

// 后台可控显隐（原型同名常量）
const SHOW_PAIPAN_CARD = true
const SHOW_MARKETING_CARD = true

// 页面状态
const loading = ref(true)
const error = ref('')
const page = ref(1)
const total = ref(0)
const hasMore = computed(() => renderItems.value.length < total.value)
const loadingMore = ref(false)

// 数据
const banners = ref<BannerItem[]>(defaultBanners)
const renderItems = ref<RenderItem[]>([])

// 等效 react-masonry-css 轮询分列：偶数索引→左列，奇数索引→右列
const leftCol = computed<RenderItem[]>(() => renderItems.value.filter((_, i) => i % 2 === 0))
const rightCol = computed<RenderItem[]>(() => renderItems.value.filter((_, i) => i % 2 === 1))

// 回到顶部
const showBackTop = ref(false)
const scrollTopVal = ref(0)
function onScroll(e: any) {
  showBackTop.value = e.detail.scrollTop > 900
}
function backToTop() {
  scrollTopVal.value = scrollTopVal.value === 0 ? 1 : 0
  setTimeout(() => (scrollTopVal.value = 0), 30)
}

// 触底加载更多
async function onScrollToLower() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  try {
    const next = page.value + 1
    const more = await homeApi.loadMore(next, 20)
    if (more.items.length) {
      renderItems.value = [...renderItems.value, ...more.items]
      total.value = more.total
      page.value = next
    }
  } finally {
    loadingMore.value = false
  }
}

// 下拉刷新
const refresherTriggered = ref(false)
async function onRefresh() {
  refresherTriggered.value = true
  try {
    page.value = 1
    const data = await homeApi.getHome({ page: 1, pageSize: 20 })
    banners.value = data.banners
    renderItems.value = data.feed
    total.value = data.total
  } finally {
    refresherTriggered.value = false
  }
}

onMounted(async () => {
  try {
    const data = await homeApi.getHome({ page: 1, pageSize: 20 })
    banners.value = data.banners
    renderItems.value = data.feed
    total.value = data.total
  } catch (e: any) {
    error.value = '加载失败'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <view class="home">
    <!-- 今日小语（每日一次浮层） -->
    <daily-verse />

    <app-header />

    <!-- 加载骨架屏 -->
    <view v-if="loading" class="loading">
      <view class="sk-banner" />
      <view class="sk-grid">
        <view v-for="i in 10" :key="i" class="sk-icon" />
      </view>
      <view class="sk-card" />
      <view class="sk-card sk-card-sm" />
      <view class="sk-feed">
        <view class="sk-col">
          <view v-for="i in 4" :key="'l'+i" class="sk-feed-item" :style="{ height: (280 + (i % 3) * 120) + 'rpx' }" />
        </view>
        <view class="sk-col">
          <view v-for="i in 4" :key="'r'+i" class="sk-feed-item" :style="{ height: (320 + (i % 3) * 80) + 'rpx' }" />
        </view>
      </view>
    </view>

    <!-- 错误态 -->
    <view v-else-if="error" class="error">
      <text class="error-icon">!</text>
      <text class="error-text">{{ error }}</text>
      <view class="retry-btn" @tap="onRefresh"><text class="retry-text">点击重试</text></view>
    </view>

    <!-- 正常内容 -->
    <scroll-view
      v-else
      scroll-y
      class="content"
      :scroll-top="scrollTopVal"
      :scroll-with-animation="true"
      :refresher-enabled="true"
      :refresher-triggered="refresherTriggered"
      refresher-background="#FAF8F5"
      @scroll="onScroll"
      @scrolltolower="onScrollToLower"
      @refresherrefresh="onRefresh"
    >
      <!-- Banner 轮播 -->
      <home-banner :banners="banners" />

      <!-- 十宫格功能入口 -->
      <quick-entry-grid />

      <!-- 排盘引导大卡 -->
      <paipan-guide-card v-if="SHOW_PAIPAN_CARD" />

      <!-- 营销/活动入口大卡 -->
      <marketing-card v-if="SHOW_MARKETING_CARD" />

      <!-- AI 推荐瀑布流 Feed（双列） -->
      <view v-if="renderItems.length" class="feed">
        <view class="col">
          <feed-card v-for="ri in leftCol" :key="ri.key" :data="ri" />
        </view>
        <view class="col">
          <feed-card v-for="ri in rightCol" :key="ri.key" :data="ri" />
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="loadingMore" class="loading-more">
        <text class="loading-more-text">加载中...</text>
      </view>

      <!-- 到底提示 -->
      <view v-if="!hasMore && renderItems.length > 0" class="end">
        <view class="end-line" /><text class="end-text">已经到底了</text><view class="end-line" />
      </view>

      <!-- 底部安全距离 -->
      <view class="bottom-safe" />
    </scroll-view>

    <back-top :visible="showBackTop" @tap="backToTop" />
    <bottom-nav active="home" />
  </view>
</template>

<style scoped lang="scss">
.home { min-height: 100vh; background: var(--bg-paper, #faf8f5); }
.content { position: absolute; top: 132rpx; bottom: 112rpx; left: 0; right: 0; }
.feed {
  display: flex; gap: 12rpx;
  padding: 12rpx 32rpx 0;
}
.col { flex: 1; min-width: 0; }
.end {
  display: flex; align-items: center; justify-content: center; gap: 24rpx;
  padding: 48rpx 0 64rpx;
}
.end-line { width: 60rpx; height: 1rpx; background: var(--line, #e8e0d5); }
.end-text { font-size: 24rpx; color: var(--text-soft, #999); }

/* 加载骨架屏 */
.loading { padding: 0 32rpx; }
.sk-banner { height: 280rpx; border-radius: 24rpx; background: var(--line-soft, #f2efea); margin-top: 24rpx; margin-bottom: 32rpx; }
.sk-grid { display: flex; flex-wrap: wrap; gap: 24rpx; margin-bottom: 32rpx; }
.sk-icon { width: calc(20% - 19.2rpx); aspect-ratio: 1; border-radius: 20rpx; background: var(--line-soft, #f2efea); }
.sk-card { height: 160rpx; border-radius: 24rpx; background: var(--line-soft, #f2efea); margin-bottom: 24rpx; }
.sk-card-sm { height: 120rpx; }
.sk-feed { display: flex; gap: 12rpx; }
.sk-col { flex: 1; display: flex; flex-direction: column; gap: 12rpx; }
.sk-feed-item { border-radius: 24rpx; background: var(--line-soft, #f2efea); }

/* 错误态 */
.error { display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 300rpx; }
.error-icon { width: 96rpx; height: 96rpx; border-radius: 50%; background: rgba(196,30,58,0.1); color: #C41E3A; font-size: 48rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-bottom: 24rpx; text-align: center; line-height: 96rpx; }
.error-text { font-size: 28rpx; color: #999; margin-bottom: 32rpx; }
.retry-btn { padding: 16rpx 48rpx; background: #C41E3A; border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }

/* 加载更多 */
.loading-more { display: flex; justify-content: center; padding: 32rpx; }
.loading-more-text { font-size: 24rpx; color: #999; }

/* 底部安全区 */
.bottom-safe { height: 40rpx; }
</style>
