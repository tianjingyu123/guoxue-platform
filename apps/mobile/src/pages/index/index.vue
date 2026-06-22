<script setup lang="ts">
/** 首页（V0响应式改造）：今日小语 + Header + Banner + 十宫格 +
 *  排盘引导卡 + 营销卡 + AI推荐瀑布流Feed(响应式多列) + 回到顶部 + 底部导航 */
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
import ResponsiveGrid from '@/components/layout/responsive-grid.vue'
import { homeApi, type RenderItem } from '@/lib/home-data'

// 后台可控显隐（原型同名常量）
const SHOW_PAIPAN_CARD = true
const SHOW_MARKETING_CARD = true

const feedItems = ref<RenderItem[]>([])
const feedLoading = ref(true)
const feedError = ref(false)

onMounted(async () => {
  try {
    const data = await homeApi.getHomeData()
    feedItems.value = data.feed || []
    feedError.value = false
  } catch {
    feedError.value = true
  } finally {
    feedLoading.value = false
  }
})

// 回到顶部
const showBackTop = ref(false)
const scrollTopVal = ref(0)
function onScroll(e: any) {
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
    <!-- 今日小语（每日一次浮层） -->
    <daily-verse />

    <app-header />

    <scroll-view
      scroll-y
      class="content"
      :scroll-top="scrollTopVal"
      :scroll-with-animation="true"
      @scroll="onScroll"
    >
      <!-- Banner 轮播 -->
      <home-banner :banners="defaultBanners" />

      <!-- 十宫格功能入口 -->
      <quick-entry-grid />

      <!-- 排盘引导大卡 -->
      <paipan-guide-card v-if="SHOW_PAIPAN_CARD" />

      <!-- 营销/活动入口大卡 -->
      <marketing-card v-if="SHOW_MARKETING_CARD" />

      <!-- AI 推荐瀑布流 Feed（响应式多列） -->
      <responsive-grid :mobileCols="2" :tabletCols="3" :desktopCols="4" :gap="12">
        <feed-card
          v-for="ri in feedItems"
          :key="ri.key"
          :data="ri"
        />
      </responsive-grid>

      <!-- 到底提示 -->
      <view class="end">
        <view class="end-line" /><text class="end-text">
          已经到底了
        </text><view class="end-line" />
      </view>
    </scroll-view>

    <back-top
      :visible="showBackTop"
      @tap="backToTop"
    />
    <bottom-nav active="home" />
  </view>
</template>

<style scoped lang="scss">
.home {
  min-height: 100vh;
  background: var(--bg-paper, #faf8f5);
  position: relative;
}
.content { position: absolute; top: calc(176rpx + var(--status-bar-height, 0)); bottom: 112rpx; left: 0; right: 0; }
.end {
  display: flex; align-items: center; justify-content: center; gap: 24rpx;
  padding: 48rpx 0 64rpx;
}
.end-line { width: 60rpx; height: 1rpx; background: var(--line, #e8e0d5); }
.end-text { font-size: 24rpx; color: var(--text-soft, #999); }
</style>
