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
import { homeApi, type BannerItem, type RenderItem } from '@/lib/home-data'

// 后台可控显隐（原型同名常量）
const SHOW_PAIPAN_CARD = true
const SHOW_MARKETING_CARD = true

const loading = ref(true)
const error = ref('')
const banners = ref<BannerItem[]>([])
const renderItems = ref<RenderItem[]>([])

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const res = await homeApi.getHome()
    banners.value = res.banners
    renderItems.value = res.feed
  } catch (e) {
    error.value = '加载失败，请检查网络后重试'
  } finally {
    loading.value = false
  }
}

function retry() {
  fetchData()
}

onMounted(() => {
  fetchData()
})

// 等效 react-masonry-css 轮询分列：偶数索引→左列，奇数索引→右列
const leftCol = computed<RenderItem[]>(() => renderItems.value.filter((_, i) => i % 2 === 0))
const rightCol = computed<RenderItem[]>(() => renderItems.value.filter((_, i) => i % 2 === 1))

// 回到顶部
const showBackTop = ref(false)
const scrollTopVal = ref(0)
function onScroll(e: { detail: { scrollTop: number } }) {
  showBackTop.value = e.detail.scrollTop > 900
}
function backToTop() {
  // 通过短暂改变 scroll-top 触发滚动到顶部
  scrollTopVal.value = scrollTopVal.value === 0 ? 1 : 0
  setTimeout(() => (scrollTopVal.value = 0), 30)
}
</script>

<template>
  <view class="home">
    <app-network-bar />
    <customer-service-fab />
    <!-- 今日小语（每日一次浮层） -->
    <daily-verse />

    <app-header />

    <!-- 加载骨架屏 -->
    <view v-if="loading" class="content skeleton">
      <view class="sk-block" style="height: 320rpx; margin: 0 32rpx 24rpx; border-radius: 24rpx;" />
      <view class="sk-block" style="height: 280rpx; margin: 0 32rpx 24rpx; border-radius: 24rpx;" />
      <view class="sk-block" style="height: 400rpx; margin: 0 32rpx 24rpx; border-radius: 24rpx;" />
    </view>

    <!-- 错误状态 -->
    <view v-else-if="error" class="content error-state">
      <view class="error-icon">!</view>
      <text class="error-text">{{ error }}</text>
      <view class="retry-btn" @tap="retry">
        <text class="retry-text">点击重试</text>
      </view>
    </view>

    <!-- 正常内容 -->
    <scroll-view
      v-else
      scroll-y
      class="content"
      :scroll-top="scrollTopVal"
      :scroll-with-animation="true"
      @scroll="onScroll"
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
      <view class="feed">
        <view class="col">
          <feed-card v-for="ri in leftCol" :key="ri.key" :data="ri" />
        </view>
        <view class="col">
          <feed-card v-for="ri in rightCol" :key="ri.key" :data="ri" />
        </view>
      </view>

      <!-- 到底提示 -->
      <view class="end">
        <view class="end-line" /><text class="end-text">已经到底了</text><view class="end-line" />
      </view>
    </scroll-view>

    <back-top :visible="showBackTop" @tap="backToTop" />
    <bottom-nav active="home" />
  </view>
</template>

<style scoped lang="scss">
.home { min-height: 100vh; background: var(--bg-paper, #faf8f5); }
.content { position: absolute; top: calc(176rpx + var(--status-bar-height, 0)); bottom: 112rpx; left: 0; right: 0; }
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

/* 骨架屏 */
.skeleton { padding-top: 24rpx; }
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
  padding-top: 200rpx;
}
.error-icon {
  width: 96rpx; height: 96rpx; border-radius: 999rpx;
  background: var(--bg-soft, #f0ebe3);
  display: flex; align-items: center; justify-content: center;
  font-size: 48rpx; color: var(--text-soft, #999); font-weight: 700;
}
.error-text { font-size: 28rpx; color: var(--text-soft, #999); }
.retry-btn {
  padding: 16rpx 48rpx; border-radius: 999rpx;
  background: var(--brand-brown, #8B6B4A);
}
.retry-text { font-size: 28rpx; color: #ffffff; }
</style>
