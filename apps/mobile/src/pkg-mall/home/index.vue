<script setup lang="ts">
/** 商城首页 - 从原型 app/mall/page.tsx 1:1 迁移 */
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import AppLoading from '@/components/common/app-loading.vue'
import ProductCard from '@/components/cards/product-card.vue'
import LiveCard from '@/components/cards/live-card.vue'
import StationPinnedRail from '@/components/station/station-pinned-rail.vue'
import MarketingZone from '@/pkg-mall/components/marketing-zone.vue'
import { navigateTo } from '@/utils/router'
import { getToken } from '@/utils/storage'
import { shopApi } from '@/lib/shop-data'
import type { MallQuickEntry, MallLive, MallCategory } from '@/lib/shop-data'
import type { ProductCardData } from '@/lib/card-utils'

const loading = ref(true)
const error = ref(false)
const mallQuickEntries = ref<MallQuickEntry[]>([])
const mallCommerceLives = ref<MallLive[]>([])
const mallCategories = ref<MallCategory[]>([])
const mallProducts = ref<ProductCardData[]>([])
const cartCount = ref(0)

const couponCount = computed(() => {
  const count = Number(mallQuickEntries.value.find((entry) => entry.id === 'coupons')?.badge || 0)
  return Number.isFinite(count) ? count : 0
})

const activePromotion = computed(() => {
  const flashSale = mallQuickEntries.value.find((entry) => entry.id === 'seckill' && entry.state)
  if (flashSale) {
    return {
      eyebrow: '限时专场',
      title: '秒杀进行中',
      subtitle: '好物限时选',
      icon: 'zap',
      href: flashSale.href,
    }
  }

  const groupBuy = mallQuickEntries.value.find((entry) => entry.id === 'group' && entry.state)
  if (groupBuy) {
    return {
      eyebrow: '多人同享',
      title: '拼团进行中',
      subtitle: '邀同好一起选',
      icon: 'users',
      href: groupBuy.href,
    }
  }

  return {
    eyebrow: '本周主题',
    title: '典籍文房',
    subtitle: '按品类慢慢逛',
    icon: 'book-open',
    href: '/mall/category',
  }
})

async function fetchData() {
  loading.value = true
  error.value = false
  try {
    const data = await shopApi.getMallHome()
    mallQuickEntries.value = data.quickEntries || []
    mallCommerceLives.value = data.lives || []
    mallCategories.value = data.categories || []
    mallProducts.value = data.products || []
  } catch (e) {
    error.value = true
  } finally {
    loading.value = false
  }
}

/** 购物车数量角标（未登录/失败静默为 0，超 99 显示 99+） */
async function fetchCartCount() {
  // 商城陈列允许游客浏览；购物车角标仅登录后拉取，游客点购物车时再进入登录流程。
  if (!getToken()) {
    cartCount.value = 0
    return
  }
  try {
    const res = await shopApi.getCart(true)
    cartCount.value = (res.items || []).reduce((s, i) => s + i.quantity, 0)
  } catch {
    cartCount.value = 0
  }
}
const cartBadge = computed(() => (cartCount.value > 99 ? '99+' : String(cartCount.value)))

onMounted(() => { fetchData() })
// 角标走 onShow（首次进入也触发）：加购后返回首页角标要跟着变，onMounted 只拉一次会显示陈旧数量
onShow(() => { fetchCartCount() })

// 下拉刷新：重拉商城首页数据与购物车角标
onPullDownRefresh(async () => {
  try {
    await Promise.all([fetchData(), fetchCartCount()])
  } finally {
    uni.stopPullDownRefresh()
  }
})

function goCart() { navigateTo('/shop/cart') }
function goCategory(id: string) { navigateTo(id === 'all' ? '/mall/category' : `/mall/category?cat=${id}`) }
function activateOnKeyboard(event: KeyboardEvent, action: () => unknown) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  void action()
}
</script>

<template>
  <view class="page">
    <app-network-bar />
    <!-- 顶部搜索栏 -->
    <view class="topbar">
      <search-bar default-tab="product" placeholder="搜索商品..." />
      <view
        class="cart-btn"
        role="link"
        :aria-label="cartCount > 0 ? `购物车，共 ${cartCount} 件商品` : '购物车'"
        tabindex="0"
        hover-class="card-press"
        @tap="goCart"
        @keydown="activateOnKeyboard($event, goCart)"
      >
        <AppIcon name="shopping-cart" :size="40" color="var(--brand)" />
        <text class="cart-btn-label">购物车</text>
        <text v-if="cartCount > 0" class="cart-badge">{{ cartBadge }}</text>
      </view>
    </view>

    <view class="body">
      <!-- 加载中 -->
      <view v-if="loading" class="state-wrap" role="status" aria-live="polite" aria-label="商城加载中">
        <AppLoading />
      </view>
      <!-- 加载失败 -->
      <view v-else-if="error" class="state-wrap" role="alert" aria-live="assertive">
        <view class="state-icon"><AppIcon name="alert-circle" :size="56" color="#c41e3a" /></view>
        <text class="state-text">加载失败，请重试</text>
        <view
          class="state-retry"
          role="button"
          aria-label="重新加载商城"
          tabindex="0"
          @tap="fetchData"
          @keydown="activateOnKeyboard($event, fetchData)"
        >
          <text class="state-retry-text">点击重试</text>
        </view>
      </view>
      <!-- 内容 -->
      <template v-else>
      <!-- 核心功能快捷入口 -->
      <view class="quick-grid">
        <view
          v-for="entry in mallQuickEntries"
          :key="entry.id"
          class="quick-item tap-press"
          role="link"
          :aria-label="entry.label"
          tabindex="0"
          @tap="navigateTo(entry.href)"
          @keydown="activateOnKeyboard($event, () => navigateTo(entry.href))"
        >
          <view class="quick-icon"><AppIcon :name="entry.icon" :size="36" color="#c41e3a" /></view>
          <text class="quick-label">{{ entry.label }}</text>
          <text v-if="entry.state" class="quick-state">{{ entry.state }}</text>
          <text v-if="entry.badge" class="quick-bdg">{{ entry.badge }}</text>
        </view>
      </view>

      <station-pinned-rail board="mall" :inset="false" />

      <!-- 电商直播（暂无实时直播聚合时隐藏） -->
      <view v-if="mallCommerceLives.length" class="section">
        <view class="sec-head">
          <view class="sec-head-l">
            <AppIcon name="radio" :size="28" color="#ef4444" />
            <text class="sec-title">直播带货</text>
            <view class="live-dot" />
          </view>
          <!-- 死入口大扫除：更多直播 → 直播广场（真实已注册页） -->
          <view
            class="sec-more"
            role="link"
            aria-label="查看更多直播带货"
            tabindex="0"
            @tap="navigateTo('/pkg-live/plaza/index')"
            @keydown="activateOnKeyboard($event, () => navigateTo('/pkg-live/plaza/index'))"
          >
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

      <!-- 国学特色促销会场：常驻主题、真实权益、实时活动 -->
      <view class="promo-hall">
        <view
          class="promo-main tap-press"
          role="link"
          aria-label="进入国学好物季专题会场"
          tabindex="0"
          @tap="navigateTo('/mall/category')"
          @keydown="activateOnKeyboard($event, () => navigateTo('/mall/category'))"
        >
          <view class="promo-main-copy">
            <text class="promo-kicker">本期雅集</text>
            <text class="promo-title">国学好物季</text>
            <text class="promo-sub">典籍 · 文房 · 茶器 · 国风周边</text>
            <view class="promo-cta">
              <text class="promo-cta-text">进入专题会场</text>
              <AppIcon name="chevron-right" :size="20" color="#6d281f" />
            </view>
          </view>
          <view class="promo-seal" aria-hidden="true">
            <text class="promo-seal-char">雅</text>
            <text class="promo-seal-char">集</text>
            <text class="promo-seal-mini">开市</text>
          </view>
          <view class="promo-orbit promo-orbit-one" />
          <view class="promo-orbit promo-orbit-two" />
        </view>

        <view class="promo-side">
          <view
            class="promo-tile promo-coupon tap-press"
            role="link"
            aria-label="查看优惠券权益"
            tabindex="0"
            @tap="navigateTo('/shop/coupons')"
            @keydown="activateOnKeyboard($event, () => navigateTo('/shop/coupons'))"
          >
            <view class="promo-tile-head">
              <view class="promo-tile-icon"><AppIcon name="ticket" :size="28" color="#9d3b31" /></view>
              <text class="promo-count">{{ couponCount > 0 ? `${couponCount} 张可领` : '查看权益' }}</text>
            </view>
            <text class="promo-tile-title">先领券再逛</text>
            <text class="promo-tile-sub">可用优惠集中看</text>
          </view>

          <view
            class="promo-tile promo-active tap-press"
            role="link"
            :aria-label="`进入活动：${activePromotion.title}`"
            tabindex="0"
            @tap="navigateTo(activePromotion.href)"
            @keydown="activateOnKeyboard($event, () => navigateTo(activePromotion.href))"
          >
            <view class="promo-tile-head">
              <view class="promo-tile-icon promo-tile-icon-dark">
                <AppIcon :name="activePromotion.icon" :size="28" color="#e9c98e" />
              </view>
              <text class="promo-active-state">{{ activePromotion.eyebrow }}</text>
            </view>
            <text class="promo-tile-title promo-tile-title-light">{{ activePromotion.title }}</text>
            <text class="promo-tile-sub promo-tile-sub-light">{{ activePromotion.subtitle }}</text>
          </view>
        </view>
      </view>

      <!-- 营销活动区 -->
      <MarketingZone />

      <!-- 商品分类 -->
      <view class="section">
        <view class="sec-head">
          <text class="sec-title">商品分类</text>
          <view
            class="sec-more"
            role="link"
            aria-label="查看全部商品分类"
            tabindex="0"
            @tap="navigateTo('/mall/category')"
            @keydown="activateOnKeyboard($event, () => navigateTo('/mall/category'))"
          >
            <text class="sec-more-txt">全部分类</text>
            <AppIcon name="chevron-right" :size="24" color="#999999" />
          </view>
        </view>
        <view class="cat-grid">
          <view
            v-for="cat in mallCategories"
            :key="cat.id"
            class="cat-item tap-press"
            role="link"
            :aria-label="`浏览商品分类：${cat.name}`"
            tabindex="0"
            @tap="goCategory(cat.id)"
            @keydown="activateOnKeyboard($event, () => goCategory(cat.id))"
          >
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
/* 购物车入口：品牌浅底+描边圆角底衬·图标+文字标签·≥88rpx 触达区（X5 防御：内容层 relative+z-index） */
.cart-btn { position: relative; min-width: 88rpx; height: 88rpx; padding: 0 8rpx; border-radius: 22rpx; background: var(--brand-soft, rgba(196, 30, 58, 0.08)); border: 2rpx solid rgba(196, 30, 58, 0.18); box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4rpx; flex-shrink: 0; }
.cart-btn-label { position: relative; z-index: 1; font-size: 18rpx; line-height: 1; font-weight: 500; color: var(--brand); }
.cart-badge { position: absolute; top: -10rpx; right: -10rpx; z-index: 2; min-width: 32rpx; height: 32rpx; padding: 0 8rpx; border-radius: 999rpx; background: var(--brand); color: #fff; font-size: 18rpx; font-weight: 600; line-height: 1; display: flex; align-items: center; justify-content: center; border: 2rpx solid #faf8f5; box-sizing: border-box; }
.card-press { opacity: 0.85; }

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

/* 国学好物雅集：主会场 + 两个可行动权益入口 */
.promo-hall {
  display: grid;
  grid-template-columns: minmax(0, 1.42fr) minmax(0, 1fr);
  gap: 14rpx;
  height: 286rpx;
}
.promo-main {
  position: relative;
  min-width: 0;
  overflow: hidden;
  padding: 28rpx;
  border: 2rpx solid rgba(239, 205, 147, 0.2);
  border-radius: 28rpx 10rpx 28rpx 28rpx;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.05), transparent 42%),
    linear-gradient(142deg, #a63d32 0%, #79251f 60%, #5b1e1b 100%);
  box-shadow: 0 14rpx 32rpx rgba(111, 38, 31, 0.18);
}
.promo-main::before,
.promo-main::after {
  content: '';
  position: absolute;
  right: -10rpx;
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  background: var(--bg-paper);
}
.promo-main::before { top: 48rpx; }
.promo-main::after { bottom: 48rpx; }
.promo-main-copy {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.promo-kicker {
  padding: 4rpx 12rpx;
  border: 1rpx solid rgba(250, 226, 178, 0.55);
  border-radius: 999rpx;
  color: #f6dfb2;
  font-size: 18rpx;
  letter-spacing: 0.14em;
}
.promo-title {
  margin-top: 16rpx;
  color: #fff9ed;
  font-family: var(--font-serif);
  font-size: 42rpx;
  font-weight: 800;
  letter-spacing: 0.05em;
}
.promo-sub {
  margin-top: 8rpx;
  color: rgba(255, 242, 220, 0.74);
  font-size: 20rpx;
  white-space: nowrap;
}
.promo-cta {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-top: 22rpx;
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  background: #f3d59d;
}
.promo-cta-text { color: #6d281f; font-size: 20rpx; font-weight: 700; }
.promo-seal {
  position: absolute;
  right: 18rpx;
  bottom: 17rpx;
  z-index: 2;
  width: 78rpx;
  height: 78rpx;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  place-items: center;
  padding: 8rpx;
  border: 3rpx double rgba(255, 230, 182, 0.86);
  color: #f7e4bc;
  transform: rotate(-5deg);
}
.promo-seal-char { font-family: var(--font-serif); font-size: 25rpx; font-weight: 700; line-height: 1; }
.promo-seal-mini { grid-column: 1 / -1; margin-top: -4rpx; font-size: 13rpx; letter-spacing: 0.35em; }
.promo-orbit { position: absolute; border: 1rpx solid rgba(255, 226, 177, 0.12); border-radius: 50%; }
.promo-orbit-one { width: 180rpx; height: 180rpx; right: -54rpx; top: -42rpx; }
.promo-orbit-two { width: 112rpx; height: 112rpx; right: -20rpx; top: -8rpx; }

.promo-side {
  display: grid;
  grid-template-rows: repeat(2, 1fr);
  gap: 14rpx;
  min-width: 0;
}
.promo-tile {
  position: relative;
  min-width: 0;
  overflow: hidden;
  padding: 18rpx 20rpx;
  border-radius: 10rpx 24rpx 24rpx 10rpx;
}
.promo-coupon {
  border: 1rpx solid #ead8bb;
  background: radial-gradient(circle at 100% 0, rgba(187, 58, 47, 0.1), transparent 48%), #fff8e9;
}
.promo-active {
  border: 1rpx solid rgba(209, 173, 112, 0.25);
  background: linear-gradient(135deg, rgba(224, 190, 128, 0.12), transparent 55%), #2f3434;
}
.promo-tile-head { display: flex; align-items: center; justify-content: space-between; gap: 8rpx; }
.promo-tile-icon {
  width: 46rpx;
  height: 46rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14rpx;
  background: #f4dfbe;
}
.promo-tile-icon-dark { background: rgba(248, 224, 178, 0.12); }
.promo-count { color: #9d3b31; font-size: 17rpx; font-weight: 600; white-space: nowrap; }
.promo-active-state { color: #e9c98e; font-size: 17rpx; white-space: nowrap; }
.promo-tile-title {
  display: block;
  margin-top: 8rpx;
  color: #5f2a25;
  font-family: var(--font-serif);
  font-size: 25rpx;
  font-weight: 700;
}
.promo-tile-sub { display: block; margin-top: 2rpx; color: #9a7a62; font-size: 17rpx; white-space: nowrap; }
.promo-tile-title-light { color: #fff4dd; }
.promo-tile-sub-light { color: rgba(255, 239, 209, 0.58); }

@media (prefers-reduced-motion: no-preference) {
  .promo-seal { animation: promo-seal-arrive 520ms cubic-bezier(.2, .75, .2, 1) both; }
}
@keyframes promo-seal-arrive {
  from { opacity: 0; transform: rotate(-12deg) scale(1.22); }
  to { opacity: 1; transform: rotate(-5deg) scale(1); }
}

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
.state-icon { width: 120rpx; height: 120rpx; border-radius: 50%; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; margin-bottom: 24rpx; }
.state-text { font-size: 26rpx; color: var(--text-soft); margin-top: 20rpx; }
.state-retry { margin-top: 32rpx; padding: 16rpx 48rpx; border-radius: 999rpx; background: var(--brand); }
.state-retry-text { font-size: 26rpx; color: #fff; font-weight: 500; }
</style>
