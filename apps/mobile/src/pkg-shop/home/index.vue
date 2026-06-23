<script setup lang="ts">
/** 购物板块首页 - 从原型 app/shop/page.tsx 1:1 迁移 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, toastComingSoon } from '@/utils/router'
import { shopApi } from '@/lib/shop-data'

const loading = ref(true)
const error = ref('')
const data = ref<any>(null)
const bannerIndex = ref(0)

// 秒杀倒计时（距结束 2 小时）
const endTime = ref(0)
const cd = ref({ hours: '00', minutes: '00', seconds: '00' })
let timer: ReturnType<typeof setInterval> | null = null
function tick() {
  const diff = Math.max(0, endTime.value - Date.now())
  cd.value = {
    hours: String(Math.floor(diff / 3600000)).padStart(2, '0'),
    minutes: String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0'),
    seconds: String(Math.floor((diff % 60000) / 1000)).padStart(2, '0'),
  }
}

async function fetchHomeData() {
  error.value = ''
  loading.value = true
  try {
    data.value = await shopApi.getHome()
    if (data.value?.flashSale?.durationSec) {
      endTime.value = Date.now() + data.value.flashSale.durationSec * 1000
    }
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
    tick(); timer = setInterval(tick, 1000)
  }
}

onMounted(() => { fetchHomeData() })
onUnmounted(() => { if (timer) clearInterval(timer) })

function onBannerChange(e: { detail: { current: number } }) { bannerIndex.value = e.detail.current }
function goSearch() { toastComingSoon() }
const groupPct = computed(() => {
  if (!data.value?.groupBuy) return 0
  return Math.round((data.value.groupBuy.currentMembers / data.value.groupBuy.minMembers) * 100)
})
</script>

<template>
  <!-- 错误态 -->
  <view v-if="error" class="err-page">
    <text class="err-text">{{ error }}</text>
    <view class="err-retry" @tap="fetchHomeData()"><text>重试</text></view>
  </view>

  <!-- 骨架屏 -->
  <view v-else-if="loading" class="sk-page">
    <view class="sk-bar" />
    <view class="sk-banner" />
    <view class="sk-grid">
      <view v-for="i in 8" :key="i" class="sk-cat">
        <view class="sk-cat-icon" />
        <view class="sk-cat-txt" />
      </view>
    </view>
    <view class="sk-block" />
    <view class="sk-prod-grid">
      <view v-for="i in 4" :key="i" class="sk-prod" />
    </view>
  </view>

  <view v-else class="page">
    <!-- 顶部搜索栏 -->
    <view class="topbar">
      <view class="search-bar" @tap="goSearch">
        <AppIcon name="search" :size="28" color="#999999" />
        <text class="search-ph">搜索商品</text>
      </view>
      <view class="top-btn" @tap="navigateTo('/shop/cart')">
        <AppIcon name="shopping-bag" :size="36" color="#666666" />
        <text class="top-badge">3</text>
      </view>
      <view class="top-btn" @tap="toastComingSoon">
        <AppIcon name="bell" :size="36" color="#666666" />
        <view class="top-dot" />
      </view>
    </view>

    <!-- Banner 轮播 -->
    <view class="banner">
      <swiper class="banner-swiper" circular autoplay :interval="4000" :duration="500" @change="onBannerChange">
        <swiper-item v-for="b in data.banners" :key="b.id">
          <view class="banner-slide" @tap="navigateTo(b.link)">
            <text class="banner-title">{{ b.title }}</text>
          </view>
        </swiper-item>
      </swiper>
      <view class="dots">
        <view v-for="(b, i) in data.banners" :key="b.id" class="dot" :class="i === bannerIndex ? 'dot-on' : ''" />
      </view>
    </view>

    <!-- 快捷活动入口 -->
    <view class="quick-row">
      <view
        v-for="action in data.quickActions" :key="action.id"
        class="quick-card" hover-class="quick-press"
        :style="{ background: `linear-gradient(135deg, ${action.from}, ${action.to})` }"
        @tap="navigateTo(action.link)"
      >
        <AppIcon :name="action.icon" :size="36" color="#ffffff" />
        <text class="quick-name">{{ action.name }}</text>
      </view>
    </view>

    <!-- 分类图标网格 -->
    <view class="cat-grid">
      <view v-for="cat in data.categories" :key="cat.id" class="cat-item" @tap="navigateTo(`/shop/category/${cat.id}`)">
        <view class="cat-icon"><AppIcon :name="cat.icon" :size="44" color="#c41e3a" /></view>
        <text class="cat-name">{{ cat.name }}</text>
      </view>
    </view>

    <!-- 秒杀专区 -->
    <view class="block">
      <view class="seckill" @tap="navigateTo(`/shop/flash-sale/${data.flashSale.id}`)">
        <view class="seckill-head">
          <view class="seckill-head-l">
            <AppIcon name="flame" :size="32" color="#FFD700" />
            <text class="seckill-title">{{ data.flashSale.title }}</text>
          </view>
          <view class="seckill-cd">
            <AppIcon name="clock" :size="26" color="#ffffff" />
            <text class="cd-num">{{ cd.hours }}</text>
            <text class="cd-colon">:</text>
            <text class="cd-num">{{ cd.minutes }}</text>
            <text class="cd-colon">:</text>
            <text class="cd-num">{{ cd.seconds }}</text>
          </view>
        </view>
        <scroll-view class="seckill-rail" scroll-x :show-scrollbar="false">
          <view class="seckill-rail-inner">
            <view
              v-for="p in data.flashSale.products" :key="p.id" class="seckill-item"
              @tap.stop="navigateTo(`/shop/product/${p.id}`)"
            >
              <image class="seckill-img" :src="p.cover" mode="aspectFill" />
              <text class="seckill-price">¥{{ p.price }}</text>
              <text class="seckill-orig">¥{{ p.originalPrice }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 拼团专区 -->
    <view class="block">
      <view class="group" @tap="navigateTo(`/shop/group-buy/${data.groupBuy.id}`)">
        <view class="group-head">
          <view class="group-head-l">
            <AppIcon name="users" :size="32" color="#c41e3a" />
            <text class="group-title">拼团特惠</text>
            <text class="group-tag">{{ data.groupBuy.title }}</text>
          </view>
          <AppIcon name="chevron-right" :size="28" color="#999999" />
        </view>
        <view class="group-body">
          <image class="group-cover" :src="data.groupBuy.cover" mode="aspectFill" />
          <view class="group-info">
            <text class="group-name">{{ data.groupBuy.productName }}</text>
            <view class="group-price">
              <text class="group-now">¥{{ data.groupBuy.price }}</text>
              <text class="group-orig">¥{{ data.groupBuy.originalPrice }}</text>
            </view>
            <view class="group-progress">
              <view class="group-bar"><view class="group-bar-fill" :style="{ width: groupPct + '%' }" /></view>
              <text class="group-left">还差{{ data.groupBuy.minMembers - data.groupBuy.currentMembers }}人</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 商品推荐 -->
    <view class="block">
      <view class="rec-head">
        <text class="rec-title">为你推荐</text>
        <view class="rec-more" @tap="navigateTo('/shop/products')">
          <text class="rec-more-txt">更多</text>
          <AppIcon name="chevron-right" :size="22" color="#999999" />
        </view>
      </view>
      <view class="rec-grid">
        <view
          v-for="p in data.recProducts" :key="p.id" class="rec-card" hover-class="rec-press"
          @tap="navigateTo(`/shop/product/${p.id}`)"
        >
          <view class="rec-cover">
            <image class="rec-img" :src="p.cover" mode="aspectFill" />
            <text v-if="p.isNew" class="rec-badge rec-badge-new">新品</text>
            <text v-else-if="p.isHot" class="rec-badge rec-badge-hot">热销</text>
          </view>
          <view class="rec-body">
            <text class="rec-name">{{ p.name }}</text>
            <view class="rec-rating">
              <AppIcon name="star" :size="22" color="#C9A96E" :fill="true" />
              <text class="rec-rating-num">{{ p.rating }}</text>
              <text class="rec-sales">{{ p.sales }}人付款</text>
            </view>
            <view class="rec-price">
              <text class="rec-now">¥{{ p.price }}</text>
              <text class="rec-orig">¥{{ p.originalPrice }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="bottom-safe" />
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: #faf8f5; padding-bottom: 40rpx; }

/* 顶栏 */
.topbar {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; gap: 24rpx;
  padding: 24rpx 32rpx; padding-top: calc(24rpx + var(--status-bar-height, 0px));
  background: #fff; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.search-bar { flex: 1; display: flex; align-items: center; gap: 16rpx; height: 72rpx; padding: 0 32rpx; border-radius: 999rpx; background: #faf8f5; }
.search-ph { font-size: 26rpx; color: #999999; }
.top-btn { position: relative; padding: 12rpx; }
.top-badge { position: absolute; top: -2rpx; right: -2rpx; width: 32rpx; height: 32rpx; border-radius: 999rpx; background: #c41e3a; color: #fff; font-size: 18rpx; display: flex; align-items: center; justify-content: center; }
.top-dot { position: absolute; top: 8rpx; right: 8rpx; width: 16rpx; height: 16rpx; border-radius: 999rpx; background: #c41e3a; }

/* banner */
.banner { margin: 32rpx; }
.banner-swiper { width: 100%; height: 224rpx; border-radius: 24rpx; overflow: hidden; }
.banner-slide { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(90deg, #C41E3A, #E85A70); }
.banner-title { color: #fff; font-size: 40rpx; font-weight: 700; }
.dots { display: flex; justify-content: center; gap: 12rpx; margin-top: -28rpx; position: relative; z-index: 2; }
.dot { width: 12rpx; height: 12rpx; border-radius: 999rpx; background: rgba(255,255,255,0.5); transition: all 0.2s; }
.dot-on { width: 32rpx; background: #fff; }

/* 快捷活动入口 */
.quick-row { margin: 32rpx; margin-top: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 16rpx; }
.quick-card { display: flex; flex-direction: column; align-items: center; gap: 12rpx; padding: 24rpx 0; border-radius: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06); }
.quick-press { transform: scale(0.95); }
.quick-name { color: #fff; font-size: 24rpx; font-weight: 500; }

/* 分类网格 */
.cat-grid { margin: 0 32rpx; margin-top: 8rpx; display: grid; grid-template-columns: repeat(4, 1fr); gap: 24rpx; }
.cat-item { display: flex; flex-direction: column; align-items: center; gap: 12rpx; }
.cat-icon { width: 96rpx; height: 96rpx; border-radius: 999rpx; background: #fff; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); display: flex; align-items: center; justify-content: center; }
.cat-name { font-size: 24rpx; color: #2c2c2c; }

.block { margin: 48rpx 32rpx 0; }

/* 秒杀 */
.seckill { background: linear-gradient(90deg, #C41E3A, #E85A70); border-radius: 24rpx; padding: 32rpx; }
.seckill-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.seckill-head-l { display: flex; align-items: center; gap: 12rpx; }
.seckill-title { color: #fff; font-weight: 700; font-size: 30rpx; }
.seckill-cd { display: flex; align-items: center; gap: 8rpx; }
.cd-num { background: rgba(255,255,255,0.2); padding: 4rpx 10rpx; border-radius: 8rpx; color: #fff; font-size: 22rpx; font-family: monospace; }
.cd-colon { color: #fff; font-size: 22rpx; }
.seckill-rail { width: 100%; }
.seckill-rail-inner { display: flex; gap: 24rpx; padding-bottom: 4rpx; }
.seckill-item { flex-shrink: 0; width: 152rpx; background: #fff; border-radius: 16rpx; padding: 16rpx; }
.seckill-img { width: 120rpx; height: 120rpx; margin: 0 auto 12rpx; display: block; border-radius: 12rpx; background: #faf8f5; }
.seckill-price { display: block; text-align: center; color: #C41E3A; font-weight: 700; font-size: 26rpx; }
.seckill-orig { display: block; text-align: center; color: #999999; font-size: 20rpx; text-decoration: line-through; }

/* 拼团 */
.group { background: #fff; border-radius: 24rpx; padding: 32rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.group-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.group-head-l { display: flex; align-items: center; gap: 12rpx; }
.group-title { font-weight: 700; color: #2c2c2c; font-size: 28rpx; }
.group-tag { color: #fff; background: #C41E3A; padding: 2rpx 16rpx; border-radius: 999rpx; font-size: 20rpx; }
.group-body { display: flex; gap: 24rpx; }
.group-cover { width: 152rpx; height: 152rpx; border-radius: 16rpx; background: #faf8f5; flex-shrink: 0; }
.group-info { flex: 1; min-width: 0; }
.group-name { display: block; font-size: 26rpx; color: #2c2c2c; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.group-price { display: flex; align-items: baseline; gap: 16rpx; margin-top: 8rpx; }
.group-now { color: #C41E3A; font-weight: 700; font-size: 36rpx; }
.group-orig { color: #999999; font-size: 22rpx; text-decoration: line-through; }
.group-progress { display: flex; align-items: center; gap: 16rpx; margin-top: 16rpx; }
.group-bar { flex: 1; height: 12rpx; background: #faf8f5; border-radius: 999rpx; overflow: hidden; }
.group-bar-fill { height: 100%; background: linear-gradient(90deg, #C41E3A, #E85A70); border-radius: 999rpx; }
.group-left { font-size: 22rpx; color: #C41E3A; }

/* 推荐 */
.rec-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.rec-title { font-weight: 700; color: #2c2c2c; font-size: 30rpx; }
.rec-more { display: flex; align-items: center; gap: 4rpx; }
.rec-more-txt { font-size: 22rpx; color: #999999; }
.rec-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24rpx; }
.rec-card { background: #fff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.rec-press { transform: scale(0.98); }
.rec-cover { position: relative; width: 100%; padding-bottom: 100%; background: #faf8f5; }
.rec-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.rec-badge { position: absolute; top: 16rpx; left: 16rpx; color: #fff; padding: 2rpx 16rpx; border-radius: 8rpx; font-size: 20rpx; }
.rec-badge-new { background: #1890FF; }
.rec-badge-hot { background: #C41E3A; }
.rec-body { padding: 24rpx; }
.rec-name { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-size: 26rpx; color: #2c2c2c; line-height: 1.4; min-height: 72rpx; }
.rec-rating { display: flex; align-items: center; gap: 6rpx; margin-top: 8rpx; }
.rec-rating-num { font-size: 22rpx; color: #C9A96E; }
.rec-sales { font-size: 22rpx; color: #999999; margin-left: 8rpx; }
.rec-price { display: flex; align-items: baseline; gap: 16rpx; margin-top: 16rpx; }
.rec-now { color: #C41E3A; font-weight: 700; font-size: 30rpx; }
.rec-orig { font-size: 22rpx; color: #999999; text-decoration: line-through; }

.bottom-safe { height: 32rpx; }

/* 骨架屏 */
.sk-page { min-height: 100vh; background: #faf8f5; }
.sk-bar { height: 96rpx; background: #fff; }
.sk-banner { margin: 32rpx; height: 224rpx; border-radius: 24rpx; background: #ececec; }
.sk-grid { margin: 0 32rpx; display: grid; grid-template-columns: repeat(4, 1fr); gap: 24rpx; }
.sk-cat { display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.sk-cat-icon { width: 96rpx; height: 96rpx; border-radius: 999rpx; background: #ececec; }
.sk-cat-txt { width: 80rpx; height: 24rpx; border-radius: 8rpx; background: #ececec; }
.sk-block { margin: 48rpx 32rpx 0; height: 256rpx; border-radius: 24rpx; background: #ececec; }
.sk-prod-grid { margin: 48rpx 32rpx 0; display: grid; grid-template-columns: repeat(2, 1fr); gap: 24rpx; }
.sk-prod { height: 480rpx; border-radius: 24rpx; background: #ececec; }

/* 错误态 */
.err-page { min-height: 100vh; background: #faf8f5; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 32rpx; }
.err-text { font-size: 28rpx; color: #999999; }
.err-retry { padding: 16rpx 56rpx; background: #C41E3A; border-radius: 40rpx; }
.err-retry text { color: #FFFFFF; font-size: 28rpx; }
</style>
