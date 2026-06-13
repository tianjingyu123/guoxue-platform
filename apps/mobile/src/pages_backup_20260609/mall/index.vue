<template>
  <view class="mall-page">
    <!-- 顶部搜索栏 -->
    <view class="header-sticky">
      <view class="search-row">
        <view class="search-box" @click="goSearch">
          <text class="search-icon">🔍</text>
          <text class="search-placeholder">搜索商品</text>
        </view>
        <text class="header-cart" @click="goCart">🛒</text>
      </view>
    </view>

    <!-- 功能快捷入口 -->
    <view class="quick-grid">
      <view v-for="e in quickEntries" :key="e.id" class="quick-item" @click="goPage(e.href)">
        <view class="quick-icon-wrap">
          <text class="quick-icon">{{ e.icon }}</text>
        </view>
        <text class="quick-label">{{ e.name }}</text>
        <view v-if="e.badge" class="quick-badge">{{ e.badge }}</view>
      </view>
    </view>

    <!-- 直播带货 -->
    <view class="section">
      <view class="section-header">
        <view class="section-title-row">
          <text class="live-dot">🔴</text>
          <text class="section-title">直播带货</text>
        </view>
        <text class="section-more" @click="goPage('/pages/live/index?type=commerce')">更多 ›</text>
      </view>
      <scroll-view scroll-x class="live-scroll" :show-scrollbar="false">
        <view class="live-row">
          <view v-for="live in commerceLives" :key="live.id" class="live-card" @click="goLive(live.id)">
            <view class="live-cover" :class="live.orientation === 'horizontal' ? 'live-cover-h' : ''">
              <text class="live-cover-icon">📡</text>
              <view v-if="live.isLive" class="live-status">直播中</view>
              <view v-else class="live-status upcoming">预约</view>
            </view>
            <text class="live-title">{{ live.title }}</text>
            <text class="live-host">{{ live.host }}</text>
            <text v-if="live.isLive" class="live-viewers">{{ fmtN(live.viewers || 0) }} 观看</text>
            <text v-else class="live-time">{{ live.time }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- Banner轮播 -->
    <view class="banner-section">
      <view class="banner-wrap" @touchstart="touchStart" @touchend="touchEnd">
        <view class="banner-track" :style="{ transform: `translateX(-${bannerIdx * 100}%)` }">
          <view
            v-for="(b, i) in banners"
            :key="i"
            class="banner-slide"
            :style="{ background: b.bg }"
          >
            <text class="banner-title">{{ b.title }}</text>
            <text class="banner-sub">{{ b.subtitle }}</text>
          </view>
        </view>
      </view>
      <view class="banner-dots">
        <view
          v-for="(_, i) in banners"
          :key="i"
          class="banner-dot"
          :class="{ active: i === bannerIdx }"
        />
      </view>
    </view>

    <!-- Loading -->
    <view v-if="loading" class="load-area">
      <LoadingSkeleton v-for="i in 4" :key="i" type="card" />
    </view>

    <!-- Error -->
    <view v-else-if="err" class="err-area">
      <EmptyState icon="📡" title="加载失败" :description="err" action-text="重试" @action="fetchData" />
    </view>

    <!-- 内容 -->
    <view v-else>
      <!-- 商品分类 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">商品分类</text>
          <text class="section-more" @click="goPage('/pages/mall/category/index')">全部分类 ›</text>
        </view>
        <view class="cat-grid">
          <view
            v-for="cat in categories"
            :key="cat.id"
            class="cat-item"
            @click="goCategory(cat.id)"
          >
            <text class="cat-icon">{{ cat.icon }}</text>
            <text class="cat-name">{{ cat.name }}</text>
          </view>
        </view>
      </view>

      <!-- 为你推荐 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">为你推荐</text>
        </view>
        <view class="product-grid">
          <view
            v-for="p in products"
            :key="p.id"
            class="product-card"
            @click="goProduct(p.id)"
          >
            <image
              v-if="p.cover"
              :src="p.cover"
              class="product-cover"
              mode="aspectFill"
            />
            <view v-else class="product-cover-plain">
              <text class="product-cover-emoji">🛍</text>
            </view>
            <view v-if="p.tag" class="product-tag">
              <text class="tag-text">{{ p.tag }}</text>
            </view>
            <view class="product-info">
              <text class="product-title">{{ p.title }}</text>
              <view class="product-price-row">
                <text class="product-price">¥{{ p.price }}</text>
                <text v-if="p.originalPrice" class="product-original">¥{{ p.originalPrice }}</text>
              </view>
              <text class="product-sales">{{ fmtN(p.sales || 0) }} 件已售</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
import { shopApi } from '../../api'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'

const quickEntries = [
  { id: 'orders', name: '我的订单', icon: '📋', href: '/pages/orders/index' },
  { id: 'cart', name: '购物车', icon: '🛒', href: '/pages/cart/index' },
  { id: 'coupons', name: '优惠券', icon: '🎫', href: '/pages/coupons/index' },
  { id: 'favorites', name: '我的收藏', icon: '❤️', href: '/pages/favorites/index' },
]

const banners = [
  { title: '新人专享', subtitle: '首单立减20元', bg: 'linear-gradient(135deg, #C41E3A, #E85D6E)' },
  { title: '国学典籍', subtitle: '周易全系列8折', bg: 'linear-gradient(135deg, #C9A96E, #D4B88C)' },
  { title: '开运饰品', subtitle: '买二赠一', bg: 'linear-gradient(135deg, #2563EB, #4F46E5)' },
]

const categories = [
  { id: 'books', name: '书籍', icon: '📚' },
  { id: 'culture', name: '文创', icon: '🎨' },
  { id: 'jewelry', name: '饰品', icon: '📿' },
  { id: 'peripheral', name: '周边', icon: '🎁' },
  { id: 'tools', name: '工具', icon: '🧭' },
  { id: 'incense', name: '香道', icon: '🕯️' },
  { id: 'tea', name: '茶器', icon: '🍵' },
  { id: 'all', name: '全部', icon: '⋯' },
]

interface LiveItem {
  id: number; title: string; host: string; viewers?: number
  isLive: boolean; orientation: string; time?: string; reservations?: number
}

interface ProductItem {
  id: number; title: string; cover?: string; price: number
  originalPrice?: number; sales?: number; tag?: string
}

const commerceLives = ref<LiveItem[]>([
  { id: 1, title: '开光吉祥物专场', host: '福缘阁主', viewers: 8920, isLive: true, orientation: 'vertical' },
  { id: 2, title: '周易古籍珍藏版专场', host: '古籍书阁', viewers: 4150, isLive: true, orientation: 'horizontal' },
  { id: 3, title: '手工罗盘制作与售卖', host: '匠心堂', time: '明天14:00', reservations: 526, isLive: false, orientation: 'vertical' },
])

const loading = ref(true)
const err = ref<string | null>(null)
const products = ref<ProductItem[]>([])

const bannerIdx = ref(0)
let bannerTimer: ReturnType<typeof setInterval> | null = null
let touchStartX = 0

function fmtN(n: number) {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

function startBanner() {
  bannerTimer = setInterval(() => {
    bannerIdx.value = (bannerIdx.value + 1) % banners.length
  }, 4000)
}

function touchStart(e: any) {
  touchStartX = e.touches?.[0]?.clientX || 0
}

function touchEnd(e: any) {
  const dx = (e.changedTouches?.[0]?.clientX || 0) - touchStartX
  if (dx > 50) bannerIdx.value = (bannerIdx.value - 1 + banners.length) % banners.length
  else if (dx < -50) bannerIdx.value = (bannerIdx.value + 1) % banners.length
}

async function fetchData() {
  loading.value = true; err.value = null
  try {
    const data = await shopApi.list({ page: 1, pageSize: 20 }) as any
    const list = Array.isArray(data) ? data : (data?.products || data?.data || [])
    products.value = list.map((p: any) => ({
      id: p.id,
      title: p.title || p.name,
      cover: p.cover || p.image,
      price: p.price,
      originalPrice: p.originalPrice,
      sales: p.sales || p.soldCount,
      tag: p.tag,
    }))
  } catch (e: any) { err.value = e.errMsg || '加载失败' }
  finally { loading.value = false }
}

function goSearch() { uni.navigateTo({ url: '/pages/search/index?type=product' }) }
function goCart() { uni.navigateTo({ url: '/pages/cart/index' }) }
function goPage(href: string) { uni.navigateTo({ url: href }) }
function goCategory(id: string) { uni.navigateTo({ url: `/pages/mall/category/index?cat=${id}` }) }
function goProduct(id: number) { uni.navigateTo({ url: `/pages/mall/product/id-detail/index?id=${id}` }) }
function goLive(id: number) { uni.navigateTo({ url: `/pages/live/index?id=${id}` }) }

onMounted(() => { fetchData(); startBanner() })
onUnmounted(() => { if (bannerTimer) clearInterval(bannerTimer) })
onPullDownRefresh(() => {
  fetchData().finally(() => setTimeout(() => uni.stopPullDownRefresh(), 500))
})
</script>

<style scoped>
.mall-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 120rpx; }

/* Header */
.header-sticky {
  position: sticky; top: 0; z-index: 30;
  background: #FAF8F5; border-bottom: 1px solid #E8E0D5;
}
.search-row {
  display: flex; align-items: center; gap: 16rpx;
  padding: 16rpx 24rpx;
}
.search-box {
  flex: 1; display: flex; align-items: center;
  height: 72rpx; background: #F5F1EB; border-radius: 40rpx; padding: 0 24rpx;
}
.search-icon { font-size: 28rpx; margin-right: 12rpx; color: #999; }
.search-placeholder { font-size: 26rpx; color: #999; }
.header-cart { font-size: 40rpx; padding: 8rpx; }

/* 快捷入口 */
.quick-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16rpx; padding: 24rpx; }
.quick-item {
  display: flex; flex-direction: column; align-items: center; gap: 10rpx;
  padding: 20rpx 0; border-radius: 20rpx; background: #fff;
  position: relative; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03);
}
.quick-icon-wrap {
  width: 80rpx; height: 80rpx; border-radius: 50%;
  background: #F5F1EB; display: flex; align-items: center; justify-content: center;
}
.quick-icon { font-size: 36rpx; }
.quick-label { font-size: 22rpx; color: #333; }
.quick-badge {
  position: absolute; top: 8rpx; right: 24rpx;
  min-width: 32rpx; height: 32rpx; border-radius: 16rpx;
  background: #C41E3A; color: #fff; font-size: 18rpx;
  display: flex; align-items: center; justify-content: center;
}

/* 区块 */
.section { padding: 0 24rpx 24rpx; }
.section-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 16rpx;
}
.section-title-row { display: flex; align-items: center; gap: 8rpx; }
.live-dot { font-size: 16rpx; }
.section-title { font-size: 30rpx; font-weight: 700; color: #2C2C2C; }
.section-more { font-size: 24rpx; color: #C9A96E; }

/* 直播 */
.live-scroll { white-space: nowrap; }
.live-row { display: flex; gap: 16rpx; }
.live-card { flex-shrink: 0; width: 260rpx; }
.live-cover {
  width: 260rpx; height: 180rpx; border-radius: 16rpx;
  background: linear-gradient(135deg, #2C2C2C, #444);
  display: flex; align-items: center; justify-content: center;
  position: relative; overflow: hidden;
}
.live-cover-h { height: 160rpx; }
.live-cover-icon { font-size: 48rpx; }
.live-status {
  position: absolute; top: 10rpx; left: 10rpx;
  font-size: 20rpx; color: #fff; background: #C41E3A;
  padding: 2rpx 12rpx; border-radius: 8rpx;
}
.live-status.upcoming { background: #C9A96E; }
.live-title { font-size: 24rpx; font-weight: 500; color: #333; margin-top: 10rpx; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.live-host { font-size: 20rpx; color: #888; display: block; }
.live-viewers { font-size: 20rpx; color: #C41E3A; }
.live-time { font-size: 20rpx; color: #C9A96E; }

/* Banner */
.banner-section { padding: 0 24rpx 24rpx; }
.banner-wrap { overflow: hidden; border-radius: 20rpx; }
.banner-track { display: flex; transition: transform 0.4s ease; }
.banner-slide {
  flex: 0 0 100%; min-width: 0; aspect-ratio: 2.5/1;
  display: flex; flex-direction: column; justify-content: center; padding: 32rpx;
}
.banner-title { font-size: 38rpx; font-weight: 700; color: #fff; }
.banner-sub { font-size: 26rpx; color: rgba(255,255,255,0.8); margin-top: 8rpx; }
.banner-dots { display: flex; justify-content: center; gap: 10rpx; margin-top: 16rpx; }
.banner-dot {
  width: 12rpx; height: 12rpx; border-radius: 50%;
  background: rgba(201,169,110,0.3); transition: all 0.3s;
}
.banner-dot.active { width: 32rpx; border-radius: 6rpx; background: #C41E3A; }

/* Loading / Error */
.load-area { padding: 24rpx; }
.err-area { padding: 80rpx 24rpx; }

/* 分类 */
.cat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16rpx; }
.cat-item {
  display: flex; flex-direction: column; align-items: center; gap: 8rpx;
  padding: 20rpx 0; border-radius: 16rpx; background: #fff;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03);
}
.cat-icon { font-size: 44rpx; }
.cat-name { font-size: 22rpx; color: #333; }

/* 商品网格 */
.product-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; }
.product-card {
  background: #fff; border-radius: 16rpx; overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.05); position: relative;
}
.product-cover { width: 100%; aspect-ratio: 1; display: block; }
.product-cover-plain {
  width: 100%; aspect-ratio: 1; background: linear-gradient(135deg, #F5F0E8, #EDE5D5);
  display: flex; align-items: center; justify-content: center;
}
.product-cover-emoji { font-size: 64rpx; }
.product-tag {
  position: absolute; top: 0; left: 0; margin: 12rpx;
}
.tag-text {
  font-size: 18rpx; color: #fff; background: #C41E3A;
  padding: 2rpx 12rpx; border-radius: 8rpx;
}
.product-info { padding: 16rpx; }
.product-title {
  font-size: 26rpx; font-weight: 500; color: #333; line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden; margin-bottom: 8rpx;
}
.product-price-row { display: flex; align-items: baseline; gap: 8rpx; }
.product-price { font-size: 28rpx; font-weight: 700; color: #C41E3A; }
.product-original { font-size: 22rpx; color: #999; text-decoration: line-through; }
.product-sales { font-size: 20rpx; color: #999; margin-top: 4rpx; }
</style>
