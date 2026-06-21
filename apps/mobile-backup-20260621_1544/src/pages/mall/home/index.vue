<script setup lang="ts">
/** 商城首页 - 从原型 app/mall/page.tsx 1:1 迁移 */
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import ProductCard from '@/components/cards/product-card.vue'
import LiveCard from '@/components/cards/live-card.vue'
import MarketingZone from '@/components/mall/marketing-zone.vue'
import ErrorState from '@/components/common/error-state.vue'
import { navigateTo, toastComingSoon } from '@/utils/router'
import {
  mallQuickEntries, mallBanners, mallCommerceLives, mallCategories as staticCategories, cartCount,
  shopApi,
} from '@/lib/shop-data'

const bannerIndex = ref(0)
const loading = ref(true)
const error = ref('')
const categories = ref([...staticCategories])
const products = ref<any[]>([])

async function loadHome() {
  loading.value = true
  error.value = ''
  const [catRes, prodRes] = await Promise.allSettled([
    shopApi.getCategoryTree(),
    shopApi.getProducts({ page: 1, pageSize: 10 }),
  ])
  categories.value = catRes.status === 'fulfilled' && (catRes.value as any[])?.length
    ? catRes.value as any[]
    : staticCategories
  products.value = prodRes.status === 'fulfilled' ? ((prodRes.value as any)?.items || prodRes.value || []) : []
  if (catRes.status === 'rejected' && prodRes.status === 'rejected') {
    error.value = '加载失败'
  }
  loading.value = false
}

onMounted(() => { loadHome() })

function onBannerChange(e: { detail: { current: number } }) { bannerIndex.value = e.detail.current }

function goSearch() { toastComingSoon() }
function goCart() { navigateTo('/shop/cart') }
function goCategory(id: string) { navigateTo(id === 'all' ? '/mall/category' : `/mall/category?cat=${id}`) }
</script>

<template>
  <view class="page">
    <!-- 顶部搜索栏 -->
    <view class="topbar">
      <view
        class="search-bar"
        @tap="goSearch"
      >
        <AppIcon
          name="search"
          :size="28"
          color="#999999"
        />
        <view class="ai-badge">
          <AppIcon
            name="sparkles"
            :size="18"
            color="#c41e3a"
          />
          <text class="ai-txt">
            AI
          </text>
        </view>
        <text class="search-ph">
          搜索商品...
        </text>
      </view>
      <view
        class="cart-btn"
        @tap="goCart"
      >
        <AppIcon
          name="shopping-cart"
          :size="36"
          color="#666666"
        />
        <text
          v-if="cartCount > 0"
          class="cart-badge"
        >
          {{ cartCount }}
        </text>
      </view>
    </view>

    <!-- 加载骨架 -->
    <view
      v-if="loading"
      class="body"
    >
      <view class="sk-quick-grid">
        <view
          v-for="i in 4"
          :key="i"
          class="sk-quick-item"
        >
          <view class="sk-circle" /><view class="sk-line sk-w3" />
        </view>
      </view>
      <view class="sk-section">
        <view class="sk-sec-head">
          <view class="sk-line sk-w4" />
        </view>
        <view class="sk-live-rail">
          <view
            v-for="i in 3"
            :key="i"
            class="sk-live-card"
          >
            <view class="sk-img" />
          </view>
        </view>
      </view>
      <view class="sk-banner" />
      <view class="sk-section">
        <view class="sk-sec-head">
          <view class="sk-line sk-w4" />
        </view>
        <view class="sk-cat-grid">
          <view
            v-for="i in 8"
            :key="i"
            class="sk-cat-item"
          >
            <view class="sk-circle sk-sm" /><view class="sk-line sk-w3" />
          </view>
        </view>
      </view>
      <view class="sk-section">
        <view class="sk-guess-head">
          <view class="sk-line sk-w4" />
        </view>
        <view class="sk-prod-grid">
          <view
            v-for="i in 4"
            :key="i"
            class="sk-prod-card"
          >
            <view class="sk-img" /><view class="sk-line" /><view class="sk-line sk-w6" />
          </view>
        </view>
      </view>
    </view>

    <error-state
      v-else-if="error"
      :message="error"
      @retry="loadHome"
    />

    <view
      v-else
      class="body"
    >
      <!-- 核心功能快捷入口 -->
      <view class="quick-grid">
        <view
          v-for="entry in mallQuickEntries"
          :key="entry.id"
          class="quick-item"
          @tap="navigateTo(entry.href)"
        >
          <view class="quick-icon">
            <AppIcon
              :name="entry.icon"
              :size="36"
              color="#c41e3a"
            />
          </view>
          <text class="quick-label">
            {{ entry.label }}
          </text>
          <text
            v-if="entry.state"
            class="quick-state"
          >
            {{ entry.state }}
          </text>
          <text
            v-if="entry.badge"
            class="quick-bdg"
          >
            {{ entry.badge }}
          </text>
        </view>
      </view>

      <!-- 电商直播 -->
      <view class="section">
        <view class="sec-head">
          <view class="sec-head-l">
            <AppIcon
              name="radio"
              :size="28"
              color="#ef4444"
            />
            <text class="sec-title">
              直播带货
            </text>
            <view class="live-dot" />
          </view>
          <view
            class="sec-more"
            @tap="toastComingSoon"
          >
            <text class="sec-more-txt">
              更多
            </text>
            <AppIcon
              name="chevron-right"
              :size="24"
              color="#999999"
            />
          </view>
        </view>
        <scroll-view
          class="live-rail"
          scroll-x
          :show-scrollbar="false"
        >
          <view class="live-rail-inner">
            <view
              v-for="live in mallCommerceLives"
              :key="live.id"
              class="live-cell"
            >
              <LiveCard
                :data="{
                  id: live.id, title: live.title, host: live.host, viewers: live.viewers,
                  reservations: live.reservations, status: live.status,
                  scheduledTime: live.scheduledTime, liveType: 'commerce',
                }"
              />
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- Banner 轮播 -->
      <view class="banner">
        <swiper
          class="banner-swiper"
          circular
          autoplay
          :interval="4000"
          :duration="500"
          @change="onBannerChange"
        >
          <swiper-item
            v-for="b in mallBanners"
            :key="b.id"
          >
            <view
              class="banner-slide"
              :style="{ background: `linear-gradient(90deg, ${b.from}, ${b.to})` }"
              @tap="navigateTo(b.href)"
            >
              <text class="banner-title">
                {{ b.title }}
              </text>
              <text class="banner-sub">
                {{ b.subtitle }}
              </text>
            </view>
          </swiper-item>
        </swiper>
        <view class="dots">
          <view
            v-for="(b, i) in mallBanners"
            :key="b.id"
            class="dot"
            :class="i === bannerIndex ? 'dot-on' : ''"
          />
        </view>
      </view>

      <!-- 营销活动区 -->
      <MarketingZone />

      <!-- 商品分类 -->
      <view class="section">
        <view class="sec-head">
          <text class="sec-title">
            商品分类
          </text>
          <view
            class="sec-more"
            @tap="navigateTo('/mall/category')"
          >
            <text class="sec-more-txt">
              全部分类
            </text>
            <AppIcon
              name="chevron-right"
              :size="24"
              color="#999999"
            />
          </view>
        </view>
        <view class="cat-grid">
          <view
            v-for="cat in categories"
            :key="cat.id"
            class="cat-item"
            @tap="goCategory(cat.id)"
          >
            <text class="cat-emoji">
              {{ cat.icon }}
            </text>
            <text class="cat-name">
              {{ cat.name }}
            </text>
          </view>
        </view>
      </view>

      <!-- 猜你喜欢 -->
      <view class="section">
        <view class="guess-head">
          <view class="guess-line" />
          <AppIcon
            name="sparkles"
            :size="26"
            color="#c41e3a"
          />
          <text class="guess-title">
            猜你喜欢
          </text>
          <view class="guess-line" />
        </view>
        <view
          v-if="!products.length"
          class="empty-guess"
        >
          <view class="empty-guess-icon">
            <app-icon
              name="sparkles"
              :size="80"
              color="#CCCCCC"
            />
          </view>
          <text class="empty-guess-text">
            暂无推荐商品
          </text>
          <view
            class="empty-guess-btn"
            @tap="navigateTo('/mall/category')"
          >
            <text class="empty-guess-btn-text">
              浏览分类
            </text>
          </view>
        </view>
        <view
          v-else
          class="prod-grid"
        >
          <view
            v-for="p in products"
            :key="p.id"
            class="prod-cell"
          >
            <ProductCard :data="p" />
          </view>
        </view>
      </view>
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
.ai-txt { font-size: 18rpx; color: #c41e3a; font-weight: 600; line-height: 1; }
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
.cat-emoji { font-size: 48rpx; line-height: 1; }
.cat-name { font-size: 24rpx; color: var(--text-strong); }

/* 猜你喜欢 */
.guess-head { display: flex; align-items: center; justify-content: center; gap: 16rpx; margin-bottom: 24rpx; }
.guess-line { width: 64rpx; height: 2rpx; background: var(--border); }
.guess-title { font-size: 30rpx; font-weight: 600; color: var(--text-strong); }
.prod-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; }

/* 骨架屏 */
.sk-quick-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24rpx; }
.sk-quick-item { display: flex; flex-direction: column; align-items: center; gap: 12rpx; padding: 24rpx 0; border-radius: 24rpx; background: #f5f1eb; }
.sk-circle { width: 80rpx; height: 80rpx; border-radius: 50%; background: #e8e0d5; }
.sk-circle.sk-sm { width: 56rpx; height: 56rpx; }
.sk-section { display: flex; flex-direction: column; gap: 20rpx; }
.sk-sec-head { display: flex; align-items: center; }
.sk-w3 { width: 30%; }
.sk-w4 { width: 40%; }
.sk-w6 { width: 60%; }
.sk-live-rail { display: flex; gap: 20rpx; }
.sk-live-card { width: 240rpx; flex-shrink: 0; }
.sk-live-card .sk-img { width: 100%; aspect-ratio: 1; border-radius: 16rpx; background: #e8e0d5; }
.sk-banner { width: 100%; height: 220rpx; border-radius: 24rpx; background: #e8e0d5; }
.sk-cat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24rpx; }
.sk-cat-item { display: flex; flex-direction: column; align-items: center; gap: 12rpx; padding: 20rpx 0; border-radius: 16rpx; background: #f5f1eb; }
.sk-prod-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; }
.sk-prod-card { background: #f5f1eb; border-radius: 16rpx; padding: 16rpx; display: flex; flex-direction: column; gap: 12rpx; }
.sk-prod-card .sk-img { width: 100%; aspect-ratio: 1; border-radius: 12rpx; background: #e8e0d5; }

.sk-line { height: 24rpx; background: #e8e0d5; border-radius: 8rpx; }
.sk-img { background: #e8e0d5; border-radius: 12rpx; }

/* 空态 */
.empty-guess { display: flex; flex-direction: column; align-items: center; padding: 128rpx 0; }
.empty-guess-icon { width: 160rpx; height: 160rpx; border-radius: 50%; background: #F5F5F5; display: flex; align-items: center; justify-content: center; margin-bottom: 32rpx; }
.empty-guess-text { font-size: 28rpx; color: #CCCCCC; margin-bottom: 32rpx; }
.empty-guess-btn { padding: 16rpx 48rpx; background: #C41E3A; border-radius: 999rpx; }
.empty-guess-btn-text { font-size: 28rpx; color: #fff; }
</style>
