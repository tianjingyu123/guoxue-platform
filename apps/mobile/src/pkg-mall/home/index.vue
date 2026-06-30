<script setup lang="ts">
/** 商城首页 - 从原型 app/mall/page.tsx 1:1 迁移 */
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import ProductCard from '@/components/cards/product-card.vue'
import LiveCard from '@/components/cards/live-card.vue'
import MarketingZone from '@/components/mall/marketing-zone.vue'
import { navigateTo, toastComingSoon } from '@/utils/router'
import { shopApi } from '@/lib/shop-data'

const loading = ref(true)
const error = ref(false)
const mallQuickEntries = ref<any[]>([])
const mallBanners = ref<any[]>([])
const mallCommerceLives = ref<any[]>([])
const mallCategories = ref<any[]>([])
const mallProducts = ref<any[]>([])
const cartCount = ref(0)

const bannerIndex = ref(0)

async function fetchData() {
  loading.value = true
  error.value = false
  try {
    const data = await shopApi.getMallHome()
    mallQuickEntries.value = data.quickEntries || []
    mallBanners.value = data.banners || []
    mallCommerceLives.value = data.lives || []
    mallCategories.value = data.categories || []
    mallProducts.value = data.products || []
  } catch (e) {
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(() => { fetchData() })

function onBannerChange(e: { detail: { current: number } }) { bannerIndex.value = e.detail.current }

function goCart() { navigateTo('/shop/cart') }
function goCategory(id: string) { navigateTo(id === 'all' ? '/mall/category' : `/mall/category?cat=${id}`) }
</script>

<template>
  <view class="page">
    <!-- 顶部搜索栏 -->
    <view class="topbar">
      <search-bar default-tab="product" placeholder="搜索商品..." />
      <view class="cart-btn" @tap="goCart">
        <AppIcon name="shopping-cart" :size="36" color="#666666" />
        <text v-if="cartCount > 0" class="cart-badge">{{ cartCount }}</text>
      </view>
    </view>

    <view class="body">
      <!-- 加载中 -->
      <view v-if="loading" class="state-wrap">
        <view class="state-spinner" />
        <text class="state-text">加载中...</text>
      </view>
      <!-- 加载失败 -->
      <view v-else-if="error" class="state-wrap">
        <view class="state-icon"><AppIcon name="alert-circle" :size="56" color="#c41e3a" /></view>
        <text class="state-text">加载失败，请重试</text>
        <view class="state-retry" @tap="fetchData"><text class="state-retry-text">点击重试</text></view>
      </view>
      <!-- 内容 -->
      <template v-else>
      <!-- 核心功能快捷入口 -->
      <view class="quick-grid">
        <view v-for="entry in mallQuickEntries" :key="entry.id" class="quick-item" @tap="navigateTo(entry.href)">
          <view class="quick-icon"><AppIcon :name="entry.icon" :size="36" color="#c41e3a" /></view>
          <text class="quick-label">{{ entry.label }}</text>
          <text v-if="entry.state" class="quick-state">{{ entry.state }}</text>
          <text v-if="entry.badge" class="quick-bdg">{{ entry.badge }}</text>
        </view>
      </view>

      <!-- 电商直播（暂无实时直播聚合时隐藏） -->
      <view v-if="mallCommerceLives.length" class="section">
        <view class="sec-head">
          <view class="sec-head-l">
            <AppIcon name="radio" :size="28" color="#ef4444" />
            <text class="sec-title">直播带货</text>
            <view class="live-dot" />
          </view>
          <view class="sec-more" @tap="toastComingSoon">
            <text class="sec-more-txt">更多</text>
            <AppIcon name="chevron-right" :size="24" color="#999999" />
          </view>
        </view>
        <scroll-view class="live-rail" scroll-x :show-scrollbar="false">
          <view class="live-rail-inner">
            <view v-for="live in mallCommerceLives" :key="live.id" class="live-cell">
              <LiveCard :data="{
                id: live.id, title: live.title, host: live.host, viewers: live.viewers,
                reservations: live.reservations, status: live.status,
                scheduledTime: live.scheduledTime, liveType: 'commerce',
              }" />
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- Banner 轮播 -->
      <view class="banner">
        <swiper class="banner-swiper" circular autoplay :interval="4000" :duration="500" @change="onBannerChange">
          <swiper-item v-for="b in mallBanners" :key="b.id">
            <view class="banner-slide" :style="{ background: `linear-gradient(90deg, ${b.from}, ${b.to})` }" @tap="navigateTo(b.href)">
              <text class="banner-title">{{ b.title }}</text>
              <text class="banner-sub">{{ b.subtitle }}</text>
            </view>
          </swiper-item>
        </swiper>
        <view class="dots">
          <view v-for="(b, i) in mallBanners" :key="b.id" class="dot" :class="i === bannerIndex ? 'dot-on' : ''" />
        </view>
      </view>

      <!-- 营销活动区 -->
      <MarketingZone />

      <!-- 商品分类 -->
      <view class="section">
        <view class="sec-head">
          <text class="sec-title">商品分类</text>
          <view class="sec-more" @tap="navigateTo('/mall/category')">
            <text class="sec-more-txt">全部分类</text>
            <AppIcon name="chevron-right" :size="24" color="#999999" />
          </view>
        </view>
        <view class="cat-grid">
          <view v-for="cat in mallCategories" :key="cat.id" class="cat-item" @tap="goCategory(cat.id)">
            <view class="cat-emoji"><AppIcon :name="cat.icon" :size="40" color="#c41e3a" /></view>
            <text class="cat-name">{{ cat.name }}</text>
          </view>
        </view>
      </view>

      <!-- 猜你喜欢 -->
      <view class="section">
        <view class="guess-head">
          <view class="guess-line" />
          <AppIcon name="sparkles" :size="26" color="#c41e3a" />
          <text class="guess-title">猜你喜欢</text>
          <view class="guess-line" />
        </view>
        <view class="prod-grid">
          <view v-for="p in mallProducts" :key="p.id" class="prod-cell">
            <ProductCard :data="p" />
          </view>
        </view>
      </view>
      </template>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper); padding-bottom: 48rpx; }

/* 顶栏 */
.topbar {
  position: sticky; top: 0; z-index: 30;
  display: flex; align-items: center; gap: 16rpx;
  padding: 24rpx 32rpx; padding-top: calc(24rpx + var(--status-bar-height, 0px));
  background: #faf8f5; border-bottom: 2rpx solid #e8e0d5;
}
.search-bar { flex: 1; display: flex; align-items: center; height: 72rpx; padding: 0 24rpx; border-radius: 999rpx; background: #f5f1eb; }
.ai-badge { display: flex; align-items: center; gap: 2rpx; margin: 0 12rpx; padding: 2rpx 12rpx; border-radius: 999rpx; background: rgba(196,30,58,0.15); }
.ai-txt { font-size: 18rpx; color: var(--brand); font-weight: 600; line-height: 1; }
.search-ph { font-size: 26rpx; color: #999999; }
.cart-btn { position: relative; width: 72rpx; height: 72rpx; border-radius: 999rpx; background: #f5f1eb; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cart-badge { position: absolute; top: -4rpx; right: -4rpx; min-width: 32rpx; height: 32rpx; padding: 0 6rpx; border-radius: 999rpx; background: var(--brand); color: #fff; font-size: 18rpx; font-weight: 600; display: flex; align-items: center; justify-content: center; }

.body { padding: 32rpx; display: flex; flex-direction: column; gap: 40rpx; }

/* 快捷入口 */
.quick-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24rpx; }
.quick-item { position: relative; display: flex; flex-direction: column; align-items: center; gap: 12rpx; padding: 24rpx 0; border-radius: 24rpx; background: var(--card); }
.quick-icon { width: 80rpx; height: 80rpx; border-radius: 999rpx; background: var(--secondary); display: flex; align-items: center; justify-content: center; }
.quick-label { font-size: 24rpx; color: var(--text-strong); }
.quick-state { position: absolute; top: 12rpx; right: 16rpx; padding: 2rpx 8rpx; border-radius: 999rpx; background: var(--brand); color: #fff; font-size: 16rpx; font-weight: 500; line-height: 1.4; }
.quick-bdg { position: absolute; top: 16rpx; right: 36rpx; width: 32rpx; height: 32rpx; border-radius: 999rpx; background: var(--brand); color: #fff; font-size: 18rpx; display: flex; align-items: center; justify-content: center; }

/* section 通用 */
.section { display: flex; flex-direction: column; }
.sec-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.sec-head-l { display: flex; align-items: center; gap: 12rpx; }
.sec-title { font-size: 30rpx; font-weight: 600; color: var(--text-strong); }
.live-dot { width: 12rpx; height: 12rpx; border-radius: 999rpx; background: #ef4444; }
.sec-more { display: flex; align-items: center; }
.sec-more-txt { font-size: 22rpx; color: var(--muted-foreground); }

/* 直播 rail */
.live-rail { width: 100%; }
.live-rail-inner { display: flex; gap: 20rpx; padding-bottom: 8rpx; }
.live-cell { flex-shrink: 0; width: 240rpx; }

/* banner */
.banner-swiper { width: 100%; height: 220rpx; border-radius: 24rpx; overflow: hidden; }
.banner-slide { width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; padding: 32rpx; }
.banner-title { color: #fff; font-size: 40rpx; font-weight: 700; }
.banner-sub { color: rgba(255,255,255,0.8); font-size: 26rpx; margin-top: 8rpx; }
.dots { display: flex; justify-content: center; gap: 12rpx; margin-top: 20rpx; }
.dot { width: 12rpx; height: 12rpx; border-radius: 999rpx; background: rgba(0,0,0,0.18); transition: all 0.2s; }
.dot-on { width: 32rpx; background: var(--brand); }

/* 分类 */
.cat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24rpx; }
.cat-item { display: flex; flex-direction: column; align-items: center; gap: 12rpx; padding: 20rpx 0; border-radius: 16rpx; background: var(--card); }
.cat-emoji { display: flex; align-items: center; justify-content: center; line-height: 1; }
.cat-name { font-size: 24rpx; color: var(--text-strong); }

/* 猜你喜欢 */
.guess-head { display: flex; align-items: center; justify-content: center; gap: 16rpx; margin-bottom: 24rpx; }
.guess-line { width: 64rpx; height: 2rpx; background: var(--border); }
.guess-title { font-size: 30rpx; font-weight: 600; color: var(--text-strong); }
.prod-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; }

/* 三态：加载/错误 */
.state-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 120rpx 0; }
.state-spinner { width: 64rpx; height: 64rpx; border: 4rpx solid var(--border); border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.state-icon { width: 120rpx; height: 120rpx; border-radius: 50%; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; margin-bottom: 24rpx; }
.state-text { font-size: 26rpx; color: var(--text-soft); margin-top: 20rpx; }
.state-retry { margin-top: 32rpx; padding: 16rpx 48rpx; border-radius: 999rpx; background: var(--brand); }
.state-retry-text { font-size: 26rpx; color: #fff; font-weight: 500; }
</style>
