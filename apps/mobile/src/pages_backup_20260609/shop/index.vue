<template>
  <view class="shop-page">
    <!-- 骨架屏 -->
    <view v-if="loading" class="skeleton-wrap">
      <view class="sk-bar" />
      <view class="sk-banner" />
      <view class="sk-grid4">
        <view v-for="i in 8" :key="i" class="sk-grid-item">
          <view class="sk-circle" />
          <view class="sk-line w-30" />
        </view>
      </view>
      <view class="sk-banner" />
      <view class="sk-grid2">
        <view v-for="i in 4" :key="i" class="sk-card">
          <view class="sk-img" />
          <view class="sk-line w-80" />
          <view class="sk-line w-40" />
        </view>
      </view>
    </view>

    <view v-else class="shop-content">
      <!-- 顶部搜索栏 -->
      <view class="header-sticky">
        <view class="header-row">
          <view class="search-box" @click="goPage('/pages/search/index?from=shop')">
            <text class="search-icon">🔍</text>
            <text class="search-placeholder">搜索商品</text>
          </view>
          <view class="header-icon" @click="goPage('/pages/shop/cart/index')">
            <text class="hi-icon">🛒</text>
            <text class="hi-badge">3</text>
          </view>
          <view class="header-icon">
            <text class="hi-icon">🔔</text>
            <view class="hi-dot" />
          </view>
        </view>
      </view>

      <!-- Banner轮播 -->
      <view class="banner-wrap">
        <swiper :current="currentBanner" @change="onBannerChange" :interval="4000" circular class="banner-swiper">
          <swiper-item v-for="b in banners" :key="b.id" @click="goPage(b.link)">
            <view class="banner-slide">
              <text class="banner-title">{{ b.title }}</text>
            </view>
          </swiper-item>
        </swiper>
        <view class="banner-indicators">
          <view v-for="(b, idx) in banners" :key="idx" class="bi-dot" :class="{ active: idx === currentBanner }" />
        </view>
      </view>

      <!-- 快捷活动入口 -->
      <view class="quick-actions">
        <view v-for="a in quickActions" :key="a.id" class="qa-item" :class="a.color" @click="goPage(a.link)">
          <text class="qa-icon">{{ a.icon }}</text>
          <text class="qa-name">{{ a.name }}</text>
        </view>
      </view>

      <!-- 分类图标网格 -->
      <view class="cat-grid">
        <view v-for="c in categories" :key="c.id" class="cat-item" @click="goPage('/pages/shop/category/index?id=' + c.id)">
          <view class="cat-icon-wrap">
            <text class="cat-icon">{{ c.icon }}</text>
          </view>
          <text class="cat-name">{{ c.name }}</text>
        </view>
      </view>

      <!-- 秒杀专区 -->
      <view class="flash-section" @click="goPage('/pages/shop/flash-sale/index?id=' + flashSale.id)">
        <view class="flash-header">
          <view class="flash-title-row">
            <text class="flash-fire">🔥</text>
            <text class="flash-title">{{ flashSale.title }}</text>
          </view>
          <view class="flash-countdown">
            <text class="fc-num">{{ pad(countdown.hours) }}</text>
            <text>:</text>
            <text class="fc-num">{{ pad(countdown.minutes) }}</text>
            <text>:</text>
            <text class="fc-num">{{ pad(countdown.seconds) }}</text>
          </view>
        </view>
        <scroll-view scroll-x class="flash-products">
          <view v-for="p in flashSale.products" :key="p.id" class="fp-item" @click.stop="goPage('/pages/shop/product/index?id=' + p.id)">
            <view class="fp-img" />
            <text class="fp-price">¥{{ p.price }}</text>
            <text class="fp-original">¥{{ p.originalPrice }}</text>
          </view>
        </scroll-view>
      </view>

      <!-- 拼团专区 -->
      <view class="group-section" @click="goPage('/pages/shop/group-buy/index?id=' + groupBuy.id)">
        <view class="gs-header">
          <view class="gs-title-row">
            <text class="gs-icon">👥</text>
            <text class="gs-title">拼团特惠</text>
            <text class="gs-badge">{{ groupBuy.title }}</text>
          </view>
          <text class="gs-arrow">›</text>
        </view>
        <view class="gs-body">
          <view class="gs-cover" />
          <view class="gs-info">
            <text class="gs-name">{{ groupBuy.productName }}</text>
            <view class="gs-price-row">
              <text class="gs-price">¥{{ groupBuy.price }}</text>
              <text class="gs-original">¥{{ groupBuy.originalPrice }}</text>
            </view>
            <view class="gs-progress">
              <view class="gsp-bar">
                <view class="gsp-fill" :style="{ width: (groupBuy.currentMembers / groupBuy.minMembers * 100) + '%' }" />
              </view>
              <text class="gsp-text">还差{{ groupBuy.minMembers - groupBuy.currentMembers }}人</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 商品推荐 -->
      <view class="recommend-section">
        <view class="rs-header">
          <text class="rs-title">为你推荐</text>
          <text class="rs-more" @click="goPage('/pages/shop/products/index')">更多 ›</text>
        </view>
        <view class="product-grid">
          <view v-for="p in products" :key="p.id" class="product-card" @click="goPage('/pages/shop/product/index?id=' + p.id)">
            <view class="pc-img">
              <text v-if="p.isNew" class="pc-badge new">新品</text>
              <text v-if="p.isHot" class="pc-badge hot">热销</text>
            </view>
            <view class="pc-info">
              <text class="pc-name">{{ p.name }}</text>
              <view class="pc-stats">
                <text class="pc-rating">⭐ {{ p.rating }}</text>
                <text class="pc-sales">{{ p.sales }}人付款</text>
              </view>
              <view class="pc-price-row">
                <text class="pc-price">¥{{ p.price }}</text>
                <text class="pc-original">¥{{ p.originalPrice }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const loading = ref(true)
const currentBanner = ref(0)
const countdown = ref({ hours: 2, minutes: 0, seconds: 0 })

const banners = [
  { id: '1', title: '国学典籍大促', link: '/pages/shop/activity/index?id=1' },
  { id: '2', title: '新品上市', link: '/pages/shop/products/index?tag=new' },
  { id: '3', title: '会员专享', link: '/pages/shop/vip/index' },
]

const quickActions = [
  { id: 'flash', name: '限时秒杀', icon: '⚡', color: 'qa-red', link: '/pages/shop/flash-sale/index' },
  { id: 'group', name: '拼团特惠', icon: '👥', color: 'qa-orange', link: '/pages/shop/group-buy/index' },
  { id: 'coupon', name: '领券中心', icon: '🎫', color: 'qa-pink', link: '/pages/shop/coupons/index' },
  { id: 'points', name: '积分兑换', icon: '🎁', color: 'qa-purple', link: '/pages/shop/exchange/index' },
]

const categories = [
  { id: '1', name: '古籍善本', icon: '📚' },
  { id: '2', name: '文房四宝', icon: '🖌️' },
  { id: '3', name: '香道用品', icon: '🪷' },
  { id: '4', name: '茶道器具', icon: '🍵' },
  { id: '5', name: '命理工具', icon: '🧭' },
  { id: '6', name: '风水摆件', icon: '🏺' },
  { id: '7', name: '养生食品', icon: '🌿' },
  { id: '8', name: '更多分类', icon: '📋' },
]

const flashSale = {
  id: '1',
  title: '限时秒杀',
  products: [
    { id: '1', name: '渊海子平精装版', price: 68, originalPrice: 128 },
    { id: '2', name: '罗盘专业款', price: 199, originalPrice: 399 },
    { id: '3', name: '紫檀木签筒', price: 88, originalPrice: 168 },
  ],
}

const groupBuy = {
  id: '1',
  title: '3人成团',
  productName: '周易全集精装套装',
  price: 299,
  originalPrice: 599,
  minMembers: 3,
  currentMembers: 2,
}

const products = [
  { id: '1', name: '渊海子平（精装典藏版）', price: 128, originalPrice: 168, sales: 2860, rating: 4.9, isHot: true, isNew: false },
  { id: '2', name: '专业风水罗盘', price: 399, originalPrice: 599, sales: 1250, rating: 4.8, isHot: false, isNew: true },
  { id: '3', name: '紫檀木文房套装', price: 688, originalPrice: 888, sales: 560, rating: 4.9, isHot: false, isNew: false },
  { id: '4', name: '沉香线香礼盒', price: 168, originalPrice: 238, sales: 3200, rating: 4.7, isHot: true, isNew: false },
  { id: '5', name: '紫砂茶具套装', price: 458, originalPrice: 658, sales: 890, rating: 4.8, isHot: false, isNew: false },
  { id: '6', name: '黄铜貔貅摆件', price: 299, originalPrice: 399, sales: 1560, rating: 4.6, isHot: false, isNew: true },
]

let countdownTimer: ReturnType<typeof setInterval> | null = null

function pad(n: number) { return String(n).padStart(2, '0') }

function onBannerChange(e: any) { currentBanner.value = e.detail.current }

function goPage(url: string) { uni.navigateTo({ url }) }

onMounted(() => {
  setTimeout(() => { loading.value = false }, 600)

  const endTime = Date.now() + 2 * 3600000
  countdownTimer = setInterval(() => {
    const diff = Math.max(0, endTime - Date.now())
    countdown.value = {
      hours: Math.floor(diff / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    }
  }, 1000)
})

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<style scoped>
.shop-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 40rpx; }

.skeleton-wrap { padding: 0 24rpx; }
.sk-bar { height: 72rpx; background: #fff; border-radius: 36rpx; margin: 14rpx 0; }
.sk-banner { height: 240rpx; border-radius: 20rpx; background: #F0EDE5; margin: 14rpx 0; animation: pulse 1.5s infinite; }
.sk-grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16rpx; margin: 16rpx 0; }
.sk-grid-item { display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.sk-circle { width: 96rpx; height: 96rpx; border-radius: 50%; background: #F0EDE5; }
.sk-line { height: 20rpx; background: #F0EDE5; border-radius: 4rpx; }
.w-30 { width: 60rpx; }
.w-40 { width: 120rpx; }
.w-80 { width: 200rpx; }
.sk-grid2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; margin: 16rpx 0; }
.sk-card { background: #fff; border-radius: 16rpx; padding: 16rpx; }
.sk-img { height: 280rpx; background: #F0EDE5; border-radius: 12rpx; margin-bottom: 12rpx; }
@keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }

.header-sticky { position: sticky; top: 0; z-index: 30; background: #fff; padding: 14rpx 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.header-row { display: flex; align-items: center; gap: 16rpx; }
.search-box { flex: 1; display: flex; align-items: center; height: 64rpx; background: #FAF8F5; border-radius: 32rpx; padding: 0 18rpx; }
.search-icon { font-size: 24rpx; margin-right: 6rpx; }
.search-placeholder { font-size: 24rpx; color: #999; }
.header-icon { position: relative; padding: 8rpx; }
.hi-icon { font-size: 36rpx; }
.hi-badge { position: absolute; top: -2rpx; right: -4rpx; min-width: 28rpx; height: 28rpx; background: #C41E3A; color: #fff; font-size: 18rpx; border-radius: 14rpx; display: flex; align-items: center; justify-content: center; }
.hi-dot { position: absolute; top: 2rpx; right: 2rpx; width: 14rpx; height: 14rpx; background: #C41E3A; border-radius: 50%; }

.banner-wrap { margin: 16rpx 24rpx; position: relative; }
.banner-swiper { height: 240rpx; border-radius: 20rpx; overflow: hidden; }
.banner-slide { height: 100%; background: linear-gradient(135deg, #C41E3A, #E85A70); display: flex; align-items: center; justify-content: center; }
.banner-title { font-size: 36rpx; font-weight: 700; color: #fff; }
.banner-indicators { position: absolute; bottom: 16rpx; left: 50%; transform: translateX(-50%); display: flex; gap: 10rpx; }
.bi-dot { width: 10rpx; height: 10rpx; border-radius: 50%; background: rgba(255,255,255,0.5); transition: all 0.3s; }
.bi-dot.active { width: 28rpx; background: #fff; border-radius: 10rpx; }

.quick-actions { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12rpx; padding: 0 24rpx; margin-bottom: 16rpx; }
.qa-item { padding: 18rpx 0; border-radius: 16rpx; display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.qa-red { background: linear-gradient(135deg, #C41E3A, #F5222D); }
.qa-orange { background: linear-gradient(135deg, #FA8C16, #FFA940); }
.qa-pink { background: linear-gradient(135deg, #EB2F96, #FF85C0); }
.qa-purple { background: linear-gradient(135deg, #722ED1, #B37FEB); }
.qa-icon { font-size: 36rpx; }
.qa-name { font-size: 20rpx; color: #fff; }

.cat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20rpx; padding: 0 24rpx; margin-bottom: 20rpx; }
.cat-item { display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.cat-icon-wrap { width: 96rpx; height: 96rpx; border-radius: 50%; background: #fff; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); display: flex; align-items: center; justify-content: center; }
.cat-icon { font-size: 40rpx; }
.cat-name { font-size: 20rpx; color: #2C2C2C; }

.flash-section { margin: 0 24rpx 14rpx; background: linear-gradient(135deg, #C41E3A, #E85A70); border-radius: 20rpx; padding: 20rpx; }
.flash-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.flash-title-row { display: flex; align-items: center; gap: 8rpx; }
.flash-fire { font-size: 28rpx; }
.flash-title { font-size: 28rpx; font-weight: 700; color: #fff; }
.flash-countdown { display: flex; align-items: center; gap: 4rpx; font-size: 22rpx; color: #fff; }
.fc-num { background: rgba(255,255,255,0.2); padding: 2rpx 8rpx; border-radius: 6rpx; font-size: 22rpx; }

.flash-products { display: flex; gap: 12rpx; white-space: nowrap; }
.fp-item { flex-shrink: 0; width: 160rpx; background: #fff; border-radius: 14rpx; padding: 14rpx; text-align: center; }
.fp-img { width: 128rpx; height: 128rpx; background: #FAF8F5; border-radius: 12rpx; margin: 0 auto 8rpx; }
.fp-price { font-size: 24rpx; font-weight: 700; color: #C41E3A; display: block; }
.fp-original { font-size: 18rpx; color: #999; text-decoration: line-through; }

.group-section { margin: 0 24rpx 14rpx; background: #fff; border-radius: 20rpx; padding: 20rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.gs-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.gs-title-row { display: flex; align-items: center; gap: 8rpx; }
.gs-icon { font-size: 28rpx; color: #C41E3A; }
.gs-title { font-size: 26rpx; font-weight: 700; color: #2C2C2C; }
.gs-badge { font-size: 18rpx; color: #fff; background: #C41E3A; padding: 2rpx 12rpx; border-radius: 20rpx; }
.gs-arrow { font-size: 32rpx; color: #999; }
.gs-body { display: flex; gap: 16rpx; }
.gs-cover { width: 160rpx; height: 160rpx; background: #FAF8F5; border-radius: 14rpx; flex-shrink: 0; }
.gs-info { flex: 1; min-width: 0; }
.gs-name { font-size: 24rpx; font-weight: 500; color: #2C2C2C; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gs-price-row { display: flex; align-items: baseline; gap: 12rpx; margin: 8rpx 0; }
.gs-price { font-size: 36rpx; font-weight: 700; color: #C41E3A; }
.gs-original { font-size: 20rpx; color: #999; text-decoration: line-through; }
.gs-progress { display: flex; align-items: center; gap: 12rpx; }
.gsp-bar { flex: 1; height: 10rpx; background: #FAF8F5; border-radius: 10rpx; overflow: hidden; }
.gsp-fill { height: 100%; background: linear-gradient(90deg, #C41E3A, #E85A70); border-radius: 10rpx; }
.gsp-text { font-size: 20rpx; color: #C41E3A; flex-shrink: 0; }

.recommend-section { padding: 0 24rpx; }
.rs-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; }
.rs-title { font-size: 30rpx; font-weight: 700; color: #2C2C2C; }
.rs-more { font-size: 22rpx; color: #999; }

.product-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14rpx; }
.product-card { background: #fff; border-radius: 16rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.pc-img { aspect-ratio: 1; background: #FAF8F5; position: relative; }
.pc-badge { position: absolute; top: 12rpx; left: 12rpx; font-size: 18rpx; color: #fff; padding: 2rpx 12rpx; border-radius: 4rpx; }
.pc-badge.new { background: #1890FF; }
.pc-badge.hot { background: #C41E3A; }
.pc-info { padding: 16rpx; }
.pc-name { font-size: 24rpx; color: #2C2C2C; display: block; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; min-height: 64rpx; }
.pc-stats { display: flex; align-items: center; gap: 8rpx; margin: 8rpx 0; }
.pc-rating { font-size: 20rpx; color: #C9A96E; }
.pc-sales { font-size: 20rpx; color: #999; }
.pc-price-row { display: flex; align-items: baseline; gap: 8rpx; }
.pc-price { font-size: 28rpx; font-weight: 700; color: #C41E3A; }
.pc-original { font-size: 20rpx; color: #999; text-decoration: line-through; }
</style>
