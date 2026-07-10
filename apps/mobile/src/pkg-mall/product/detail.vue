<script setup lang="ts">
/** 商品详情页 - 从原型 app/mall/product/[id]/page.tsx 1:1 迁移 */
import { ref, computed } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { useShare } from '@/composables/useShare'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateBack, navigateTo } from '@/utils/router'
import { shopApi } from '@/lib/shop-data'
import { track } from '@/composables/useTrack'
import { recommendApi } from '@/lib/recommend-data'
import type { RecommendItem } from '@/components/common/recommend-section.vue'
import { formatPrice } from '@/utils/format'

const loading = ref(true)
const error = ref(false)
// 赋值来自 getProduct():ProductDetail，但模板主体在 v-else 块内裸访问 product.xxx，
// 收敛为 ProductDetail|null 会触发大量模板 null 报错（需逐处 ?. 或重构 v-if），故保留 any
const product = ref<any>(null)
const swiperIndex = ref(0)
const isFavorite = ref(false)
const cartCount = ref(0)
const showSpecPanel = ref(false)
const specAction = ref<'cart' | 'buy'>('cart')
const selectedSpecs = ref<Record<string, string>>({ 版本: 'standard', 数量: '1' })
const submitting = ref(false)
const recItems = ref<RecommendItem[]>([])

async function fetchData(productId?: string) {
  loading.value = true
  error.value = false
  try {
    const data = await shopApi.getProduct(productId || '1')
    product.value = data
    // 底栏收藏态/购物车角标（未登录/失败静默降级，不阻塞详情渲染）
    shopApi.isProductFavorited(String(data.id)).then((v) => { isFavorite.value = v })
    shopApi.getCart()
      .then((res: { items?: Array<{ quantity: number }> }) => { cartCount.value = (res.items || []).reduce((s: number, i: { quantity: number }) => s + i.quantity, 0) })
      .catch(() => {})
    // 详情加载成功后拉取推荐（内置降级，无需 try/catch）
    recItems.value = await recommendApi.getForScene('product_detail', String(product.value?.id ?? productId ?? '1'))
  } catch (e) {
    error.value = true
  } finally {
    loading.value = false
  }
}

onLoad((query) => {
  const id = (query?.id as string) || '1'
  fetchData(id)
})

// 微信原生分享（好友 / 朋友圈）
const { toAppMessage, toTimeline } = useShare()
onShareAppMessage(() => toAppMessage({
  title: product.value?.title || '精选好物',
  path: `/mall/product/${product.value?.id || '1'}`,
  cover: product.value?.images?.[0],
}))
onShareTimeline(() => toTimeline({
  title: product.value?.title || '精选好物',
  path: `/mall/product/${product.value?.id || '1'}`,
  cover: product.value?.images?.[0],
}))

const discount = computed(() => {
  if (!product.value) return 0
  return Math.round((1 - product.value.price / product.value.originalPrice) * 100)
})
const currentPrice = computed(() => {
  if (!product.value) return 0
  const v = product.value.specs.find((s: any) => s.name === '版本')?.options.find((o: any) => o.id === selectedSpecs.value['版本'])
  return v?.price || product.value.price
})
const currentStock = computed(() => {
  if (!product.value) return 0
  const v = product.value.specs.find((s: any) => s.name === '版本')?.options.find((o: any) => o.id === selectedSpecs.value['版本'])
  return v?.stock || product.value.stock
})
const selectedSpecLabels = computed(() => {
  if (!product.value) return '请选择规格'
  return Object.entries(selectedSpecs.value)
    .map(([k, v]) => product.value.specs.find((s: any) => s.name === k)?.options.find((o: any) => o.id === v)?.label)
    .filter(Boolean)
    .join('、')
})
const previewReviews = computed(() => {
  if (!product.value) return []
  return product.value.reviews.slice(0, 2)
})

function onSwiperChange(e: { detail: { current: number } }) { swiperIndex.value = e.detail.current }
function selectSpec(name: string, id: string) { selectedSpecs.value = { ...selectedSpecs.value, [name]: id } }
function openSpecPanel(action: 'cart' | 'buy') { specAction.value = action; showSpecPanel.value = true }
async function addToCart() {
  if (submitting.value || !product.value) return
  submitting.value = true
  try {
    const qty = Number(selectedSpecs.value['数量']) || 1
    const res = await shopApi.addToCart(String(product.value.id), qty)
    cartCount.value = (res.items || []).reduce((s, i) => s + i.quantity, 0)
    showSpecPanel.value = false
    uni.showToast({ title: '已加入购物车', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '加入失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
function buyNow() {
  if (!product.value) return
  // F3 电商漏斗埋点：购买点击（D-T1）
  track.custom('buy_click', { type: 'product', id: product.value.id })
  // 实物商品必须经结算页确认收货地址/优惠券后再建单（此前直接 createOrder 跳过了地址确认）
  const qty = Number(selectedSpecs.value['数量']) || 1
  showSpecPanel.value = false
  navigateTo(`/shop/checkout?productId=${product.value.id}&quantity=${qty}`)
}
function goReviews() { navigateTo('/mall/product/reviews') }
function goCart() { navigateTo('/shop/cart') }
function goService() { navigateTo('/customer-service') }

/** 购物车角标显示（超 99 显示 99+） */
const cartBadge = computed(() => (cartCount.value > 99 ? '99+' : String(cartCount.value)))

/** 收藏/取消收藏（持久化到 interaction/collect·乐观更新+失败回滚+防重复） */
const favSubmitting = ref(false)
async function toggleFavorite() {
  if (!product.value || favSubmitting.value) return
  favSubmitting.value = true
  const prev = isFavorite.value
  isFavorite.value = !prev
  try {
    isFavorite.value = await shopApi.toggleProductFavorite(String(product.value.id))
    uni.showToast({ title: isFavorite.value ? '已收藏' : '已取消收藏', icon: 'none' })
  } catch (e) {
    isFavorite.value = prev
    uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
  } finally {
    favSubmitting.value = false
  }
}
</script>

<template>
  <view class="page">
    <customer-service-fab />
    <!-- 加载中 -->
    <view v-if="loading" class="state-wrap">
      <view class="state-spinner" />
      <text class="state-text">加载中...</text>
    </view>
    <!-- 加载失败 -->
    <view v-else-if="error" class="state-wrap">
      <view class="state-icon"><AppIcon name="alert-circle" :size="56" color="#c41e3a" /></view>
      <text class="state-text">加载失败，请重试</text>
      <view class="state-retry" @tap="fetchData()"><text class="state-retry-text">点击重试</text></view>
    </view>
    <!-- 内容 -->
    <template v-else>
    <!-- 图片轮播 -->
    <view class="carousel">
      <view class="nav-btn nav-back" @tap="navigateBack()"><AppIcon name="chevron-left" :size="40" color="#1f1f1f" /></view>
      <view class="nav-btn nav-share"><AppIcon name="share-2" :size="32" color="#1f1f1f" /></view>
      <swiper class="swiper" circular @change="onSwiperChange">
        <swiper-item v-for="(src, i) in product.images" :key="i">
          <view class="slide">
            <image lazy-load class="slide-img" :src="src" mode="aspectFill" />
            <view v-if="i === 0 && product.hasVideo" class="play-wrap">
              <view class="play-btn"><AppIcon name="play" :size="48" color="#1f1f1f" /></view>
            </view>
          </view>
        </swiper-item>
      </swiper>
      <view class="indicator">{{ swiperIndex + 1 }} / {{ product.images.length }}</view>
    </view>

    <!-- 价格区 -->
    <view class="card price-card">
      <view class="price-row">
        <text class="price-now">¥{{ formatPrice(product.price) }}</text>
        <!-- 划线价/折扣仅在有真实原价(高于售价)时显示，避免"¥2 ¥2 0% OFF"无意义展示 -->
        <template v-if="product.originalPrice > product.price">
          <text class="price-orig">¥{{ formatPrice(product.originalPrice) }}</text>
          <text class="price-off">{{ discount }}% OFF</text>
        </template>
      </view>
      <text class="p-title"><text v-if="product.isOfficialSelfOwned" class="p-official">官方自营</text>{{ product.title }}</text>
      <text class="p-sub">{{ product.subtitle }}</text>
      <view class="p-meta">
        <text>销量 {{ product.sales }}</text>
        <text>库存 {{ product.stock }}</text>
      </view>
      <view class="coupon-entry">
        <view class="coupon-left">
          <text class="coupon-badge">券</text>
          <text class="coupon-text">满{{ formatPrice(product.coupon.threshold) }}减{{ formatPrice(product.coupon.value) }}</text>
        </view>
        <view class="coupon-claim"><text class="coupon-claim-text">领取</text><AppIcon name="chevron-right" :size="26" color="var(--brand)" /></view>
      </view>
    </view>

    <!-- 进店入口（自营/未开通商家 merchant 为 null 时整块不渲染） -->
    <view v-if="product.merchant" class="card store-entry" hover-class="card-press" @tap="navigateTo('/shop/store/' + product.merchant.id)">
      <view class="store-entry-l">
        <image lazy-load v-if="product.merchant.shopLogo" class="store-entry-logo" :src="product.merchant.shopLogo" mode="aspectFill" />
        <view v-else class="store-entry-logo store-entry-logo-ph"><AppIcon name="store" :size="36" color="var(--brand)" /></view>
        <text class="store-entry-name">{{ product.merchant.shopName }}</text>
      </view>
      <view class="store-entry-btn"><text class="store-entry-btn-text">进店</text><AppIcon name="chevron-right" :size="28" color="var(--brand)" /></view>
    </view>

    <!-- 规格入口 -->
    <view class="card spec-entry" hover-class="card-press" @tap="openSpecPanel('cart')">
      <view class="spec-entry-l"><text class="spec-label">规格</text><text class="spec-val">{{ selectedSpecLabels }}</text></view>
      <AppIcon name="chevron-right" :size="32" color="var(--text-soft)" />
    </view>

    <!-- 服务保障 -->
    <view class="card">
      <text class="card-title">服务保障</text>
      <view class="guard-grid">
        <view class="guard-item"><view class="guard-icon"><AppIcon name="shield" :size="32" color="var(--brand)" /></view><view><text class="guard-name">正品保障</text><text class="guard-desc">假一赔十</text></view></view>
        <view class="guard-item"><view class="guard-icon"><AppIcon name="truck" :size="32" color="var(--brand)" /></view><view><text class="guard-name">急速发货</text><text class="guard-desc">48小时内</text></view></view>
        <view class="guard-item"><view class="guard-icon"><AppIcon name="refresh-cw" :size="32" color="var(--brand)" /></view><view><text class="guard-name">7天退换</text><text class="guard-desc">无理由退换</text></view></view>
        <view class="guard-item"><view class="guard-icon"><AppIcon name="award" :size="32" color="var(--brand)" /></view><view><text class="guard-name">品质认证</text><text class="guard-desc">平台严选</text></view></view>
      </view>
    </view>

    <!-- 商品评价 -->
    <view class="card">
      <view class="review-head">
        <view class="review-head-l"><text class="card-title">商品评价</text><text class="review-count">({{ product.reviewCount }})</text></view>
        <view class="review-rating"><text class="rating-num">{{ product.rating }}</text><AppIcon name="star" :size="26" color="var(--gold, #c9a96e)" fill /></view>
      </view>
      <view class="tag-row">
        <text v-for="t in product.tags" :key="t" class="rv-tag">{{ t }}</text>
      </view>
      <view class="review-list">
        <view v-for="r in previewReviews" :key="r.id" class="review-item">
          <view class="rv-top">
            <image lazy-load class="rv-avatar" :src="r.user.avatar" mode="aspectFill" />
            <view class="rv-user">
              <text class="rv-name">{{ r.user.name }}</text>
              <view class="rv-stars">
                <AppIcon v-for="i in 5" :key="i" name="star" :size="24" :color="i <= r.rating ? 'var(--gold, #c9a96e)' : '#d4d4d4'" :fill="i <= r.rating" />
              </view>
            </view>
            <text class="rv-date">{{ r.date }}</text>
          </view>
          <text class="rv-content">{{ r.content }}</text>
          <view v-if="r.images.length" class="rv-imgs">
            <image lazy-load v-for="(img, ii) in r.images" :key="ii" class="rv-img" :src="img" mode="aspectFill" />
          </view>
          <view class="rv-foot"><text class="rv-spec">{{ r.spec }}</text><view class="rv-like"><AppIcon name="thumbs-up" :size="24" color="var(--text-soft)" /><text class="rv-like-num">{{ r.likes }}</text></view></view>
        </view>
      </view>
      <view class="view-all" hover-class="card-press" @tap="goReviews"><text class="view-all-text">查看全部评价</text><AppIcon name="chevron-right" :size="26" color="var(--text-soft)" /></view>
    </view>

    <!-- 商品详情（富文本 HTML·rich-text 渲染·含图文）
         图片区通栏到屏幕边（无左右 padding/圆角割裂），详情多图上下无缝拼接展示整体效果 -->
    <view class="desc-section">
      <view class="desc-head"><text class="card-title">商品详情</text></view>
      <rich-text v-if="product.description" class="desc" :nodes="product.description" />
      <text v-else class="desc desc-empty">暂无详情</text>
    </view>

    <!-- 推荐：经常一起购买 -->
    <recommend-section title="经常一起购买" :items="recItems" />

    <!-- 底部操作栏 -->
    <view class="action-bar">
      <view class="action-icons">
        <view class="action-ico" hover-class="card-press" @tap="goService">
          <AppIcon name="message-circle" :size="44" color="var(--text-strong)" />
          <text class="action-ico-text">客服</text>
        </view>
        <view class="action-ico" hover-class="card-press" @tap="goCart">
          <view class="action-ico-wrap">
            <AppIcon name="shopping-cart" :size="44" color="var(--text-strong)" />
            <text v-if="cartCount > 0" class="cart-badge">{{ cartBadge }}</text>
          </view>
          <text class="action-ico-text">购物车</text>
        </view>
        <view class="action-ico" :class="{ 'action-ico-on': isFavorite }" hover-class="card-press" @tap="toggleFavorite">
          <AppIcon name="heart" :size="44" :color="isFavorite ? 'var(--brand)' : 'var(--text-strong)'" :fill="isFavorite" />
          <text class="action-ico-text" :class="{ 'action-ico-text-on': isFavorite }">{{ isFavorite ? '已收藏' : '收藏' }}</text>
        </view>
      </view>
      <view class="action-btns">
        <view class="btn-cart" hover-class="card-press" @tap="openSpecPanel('cart')"><text class="btn-cart-text">加入购物车</text></view>
        <view class="btn-buy" hover-class="card-press" @tap="openSpecPanel('buy')"><text class="btn-buy-text">立即购买</text></view>
      </view>
    </view>

    <!-- 规格面板 -->
    <view v-if="showSpecPanel" class="mask" @tap="showSpecPanel = false" />
    <view v-if="showSpecPanel" class="spec-panel">
      <view class="sp-head">
        <view class="sp-thumb"><image lazy-load class="sp-thumb-img" :src="product.images[0]" mode="aspectFill" /></view>
        <view class="sp-info">
          <text class="sp-price">¥{{ formatPrice(currentPrice) }}</text>
          <text class="sp-stock">库存 {{ currentStock }} 件</text>
          <text class="sp-selected">已选：{{ selectedSpecLabels || '请选择规格' }}</text>
        </view>
      </view>
      <view class="sp-body">
        <view v-for="grp in product.specs" :key="grp.name" class="sp-group">
          <text class="sp-group-name">{{ grp.name }}</text>
          <view class="sp-opts">
            <view v-for="opt in grp.options" :key="opt.id" class="sp-opt" :class="{ 'sp-opt-on': selectedSpecs[grp.name] === opt.id }" @tap="selectSpec(grp.name, opt.id)">
              <text class="sp-opt-text" :class="{ 'sp-opt-text-on': selectedSpecs[grp.name] === opt.id }">{{ opt.label }}{{ opt.price > 0 && grp.name === '版本' ? ` ¥${formatPrice(opt.price)}` : '' }}</text>
            </view>
          </view>
        </view>
      </view>
      <view class="sp-actions">
        <view class="sp-btn-cart" hover-class="card-press" @tap="addToCart"><text class="sp-btn-cart-text">加入购物车</text></view>
        <view class="sp-btn-buy" hover-class="card-press" @tap="buyNow"><text class="sp-btn-buy-text">立即购买</text></view>
      </view>
    </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg, #f5f5f5); padding-bottom: 130rpx; }
.card-press { opacity: 0.85; }
/* 轮播 */
.carousel { position: relative; }
.nav-btn { position: absolute; top: calc(28rpx + var(--status-bar-height, 0px)); z-index: 20; width: 64rpx; height: 64rpx; border-radius: 50%; background: rgba(255,255,255,0.8); display: flex; align-items: center; justify-content: center; }
.nav-back { left: 28rpx; }
.nav-share { right: 28rpx; }
.swiper { width: 100%; height: 750rpx; }
.slide { position: relative; width: 100%; height: 100%; background: var(--surface-sunken); }
.slide-img { width: 100%; height: 100%; }
.play-wrap { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.play-btn { width: 100rpx; height: 100rpx; border-radius: 50%; background: rgba(255,255,255,0.8); display: flex; align-items: center; justify-content: center; }
.indicator { position: absolute; bottom: 28rpx; right: 28rpx; padding: 4rpx 18rpx; border-radius: 999rpx; background: rgba(255,255,255,0.8); font-size: 22rpx; color: var(--text-strong); }
/* 营销位 */
.mkt { padding: 28rpx 28rpx 0; display: flex; flex-direction: column; gap: 16rpx; }
/* 卡片通用 */
.card { margin: 24rpx 28rpx 0; padding: 28rpx; background: var(--surface); border-radius: 24rpx; }
.card-title { font-size: 28rpx; font-weight: 500; color: var(--text-strong); }
/* 价格 */
.price-row { display: flex; align-items: baseline; gap: 12rpx; }
.price-now { font-size: 44rpx; font-weight: 700; color: var(--brand); }
.price-orig { font-size: 24rpx; color: var(--text-soft); text-decoration: line-through; }
.price-off { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 8rpx; background: rgba(196,30,58,0.1); color: var(--brand); }
.p-title { display: block; font-size: 34rpx; font-weight: 600; color: var(--text-strong); margin-top: 18rpx; line-height: 1.4; }
.p-official { display: inline-block; font-size: 22rpx; font-weight: 600; color: #fff; background: var(--brand); padding: 2rpx 12rpx; border-radius: 8rpx; margin-right: 10rpx; vertical-align: middle; }
.p-sub { display: block; font-size: 26rpx; color: var(--text-soft); margin-top: 6rpx; }
.p-meta { display: flex; gap: 28rpx; margin-top: 18rpx; font-size: 22rpx; color: var(--text-soft); }
.coupon-entry { display: flex; align-items: center; justify-content: space-between; margin-top: 18rpx; padding: 14rpx 18rpx; border-radius: 12rpx; background: rgba(196,30,58,0.05); border: 1rpx solid rgba(196,30,58,0.2); }
.coupon-left { display: flex; align-items: center; gap: 12rpx; }
.coupon-badge { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 6rpx; background: var(--brand); color: #fff; }
.coupon-text { font-size: 26rpx; color: var(--text-strong); }
.coupon-claim { display: flex; align-items: center; }
.coupon-claim-text { font-size: 22rpx; color: var(--brand); }
/* 规格入口 */
.spec-entry { display: flex; align-items: center; justify-content: space-between; }
.spec-entry-l { display: flex; align-items: center; gap: 12rpx; }
.spec-label { font-size: 26rpx; color: var(--text-soft); }
.spec-val { font-size: 26rpx; color: var(--text-strong); }
/* 进店入口 */
.store-entry { display: flex; align-items: center; justify-content: space-between; }
.store-entry-l { display: flex; align-items: center; gap: 16rpx; min-width: 0; }
.store-entry-logo { width: 64rpx; height: 64rpx; border-radius: 50%; flex-shrink: 0; background: var(--surface-sunken); }
.store-entry-logo-ph { display: flex; align-items: center; justify-content: center; background: rgba(196,30,58,0.08); }
.store-entry-name { font-size: 28rpx; font-weight: 500; color: var(--text-strong); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.store-entry-btn { display: flex; align-items: center; gap: 4rpx; flex-shrink: 0; padding: 8rpx 20rpx; border-radius: 999rpx; border: 1rpx solid var(--brand); }
.store-entry-btn-text { font-size: 24rpx; color: var(--brand); }
/* 服务保障 */
.guard-grid { display: flex; flex-wrap: wrap; margin-top: 24rpx; }
.guard-item { width: 50%; display: flex; align-items: center; gap: 14rpx; margin-bottom: 20rpx; }
.guard-icon { width: 56rpx; height: 56rpx; border-radius: 50%; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.guard-name { display: block; font-size: 22rpx; font-weight: 500; color: var(--text-strong); }
.guard-desc { display: block; font-size: 18rpx; color: var(--text-soft); }
/* 评价 */
.review-head { display: flex; align-items: center; justify-content: space-between; }
.review-head-l { display: flex; align-items: center; gap: 10rpx; }
.review-count { font-size: 26rpx; color: var(--text-soft); }
.review-rating { display: flex; align-items: center; gap: 6rpx; }
.rating-num { font-size: 26rpx; font-weight: 500; color: var(--gold, #c9a96e); }
.tag-row { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 20rpx; }
.rv-tag { font-size: 20rpx; padding: 4rpx 16rpx; border-radius: 999rpx; border: 1rpx solid var(--border, #e5e5e5); color: var(--text-soft); }
.review-list { margin-top: 8rpx; }
.review-item { padding: 20rpx 0; border-bottom: 1rpx solid var(--border, #eee); }
.rv-top { display: flex; align-items: center; gap: 12rpx; }
.rv-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; background: var(--surface-sunken); }
.rv-user { flex: 1; }
.rv-name { font-size: 24rpx; color: var(--text-strong); }
.rv-stars { display: flex; gap: 2rpx; margin-top: 2rpx; }
.rv-date { font-size: 20rpx; color: var(--text-soft); }
.rv-content { display: block; font-size: 26rpx; color: var(--text-strong); margin-top: 14rpx; line-height: 1.5; }
.rv-imgs { display: flex; gap: 12rpx; margin-top: 14rpx; }
.rv-img { width: 110rpx; height: 110rpx; border-radius: 12rpx; }
.rv-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 14rpx; }
.rv-spec { font-size: 20rpx; color: var(--text-soft); }
.rv-like { display: flex; align-items: center; gap: 6rpx; }
.rv-like-num { font-size: 20rpx; color: var(--text-soft); }
.view-all { display: flex; align-items: center; justify-content: center; gap: 6rpx; margin-top: 16rpx; padding: 16rpx 0; }
.view-all-text { font-size: 26rpx; color: var(--text-soft); }
/* 详情：图片通栏（section 无左右 margin/padding/圆角），标题与文字简介保留内边距。
   注意不加 white-space: pre-line —— HTML 源码里的换行符会被渲染成多余空白行（图片间的另一层"缝"） */
.desc-section { margin-top: 24rpx; background: var(--surface); overflow: hidden; }
.desc-head { padding: 28rpx 28rpx 8rpx; }
.desc { display: block; font-size: 26rpx; color: var(--text); line-height: 1.7; }
.desc-empty { padding: 0 28rpx 28rpx; color: var(--text-soft); }
/* 底部操作栏 */
.action-bar { position: fixed; bottom: 0; left: 0; right: 0; z-index: 30; background: var(--surface); border-top: 1rpx solid var(--border, #eee); padding: 16rpx 28rpx calc(16rpx + env(safe-area-inset-bottom)); display: flex; align-items: center; gap: 24rpx; }
/* 左侧图标组：每项 ≥88rpx 触达区·图标+文字·收藏激活有浅红底衬（X5 防御：内容层 relative+z-index） */
.action-icons { display: flex; gap: 8rpx; }
.action-ico { position: relative; z-index: 1; min-width: 88rpx; min-height: 88rpx; padding: 8rpx 4rpx; border-radius: 16rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6rpx; }
.action-ico-on { background: var(--brand-soft, rgba(196, 30, 58, 0.08)); }
.action-ico-wrap { position: relative; display: flex; }
.action-ico-text { position: relative; z-index: 1; font-size: 20rpx; line-height: 1; color: var(--text-strong); }
.action-ico-text-on { color: var(--brand); font-weight: 500; }
.cart-badge { position: absolute; top: -10rpx; right: -14rpx; z-index: 2; min-width: 30rpx; height: 30rpx; padding: 0 6rpx; border-radius: 999rpx; background: var(--brand); color: #fff; font-size: 18rpx; font-weight: 600; line-height: 1; display: flex; align-items: center; justify-content: center; border: 2rpx solid var(--surface, #fff); box-sizing: border-box; }
.action-btns { flex: 1; display: flex; gap: 16rpx; }
.btn-cart { flex: 1; height: 80rpx; border-radius: 999rpx; background: var(--gold, #c9a96e); display: flex; align-items: center; justify-content: center; }
.btn-cart-text { font-size: 26rpx; font-weight: 500; color: #fff; }
.btn-buy { flex: 1; height: 80rpx; border-radius: 999rpx; background: var(--brand); display: flex; align-items: center; justify-content: center; }
.btn-buy-text { font-size: 26rpx; font-weight: 500; color: #fff; }
/* 规格面板 */
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 40; }
.spec-panel { position: fixed; bottom: 0; left: 0; right: 0; z-index: 50; background: var(--surface); border-radius: 32rpx 32rpx 0 0; max-height: 80vh; padding: 28rpx 28rpx calc(28rpx + env(safe-area-inset-bottom)); }
.sp-head { display: flex; gap: 24rpx; padding-bottom: 28rpx; border-bottom: 1rpx solid var(--border, #eee); }
.sp-thumb { width: 160rpx; height: 160rpx; border-radius: 16rpx; overflow: hidden; background: var(--surface-sunken); }
.sp-thumb-img { width: 100%; height: 100%; }
.sp-info { flex: 1; }
.sp-price { font-size: 44rpx; font-weight: 700; color: var(--brand); }
.sp-stock { display: block; font-size: 24rpx; color: var(--text-soft); margin-top: 8rpx; }
.sp-selected { display: block; font-size: 24rpx; color: var(--text-soft); margin-top: 4rpx; }
.sp-body { padding: 28rpx 0; }
.sp-group { margin-bottom: 28rpx; }
.sp-group-name { font-size: 26rpx; font-weight: 500; color: var(--text-strong); }
.sp-opts { display: flex; flex-wrap: wrap; gap: 16rpx; margin-top: 16rpx; }
.sp-opt { padding: 14rpx 28rpx; border-radius: 12rpx; background: var(--surface-sunken); }
.sp-opt-on { background: var(--brand); }
.sp-opt-text { font-size: 26rpx; color: var(--text-strong); }
.sp-opt-text-on { color: #fff; }
.sp-actions { display: flex; gap: 20rpx; padding-top: 28rpx; border-top: 1rpx solid var(--border, #eee); }
.sp-btn-cart { flex: 1; height: 88rpx; border-radius: 999rpx; background: var(--gold, #c9a96e); display: flex; align-items: center; justify-content: center; }
.sp-btn-cart-text { font-size: 28rpx; font-weight: 500; color: #fff; }
.sp-btn-buy { flex: 1; height: 88rpx; border-radius: 999rpx; background: var(--brand); display: flex; align-items: center; justify-content: center; }
.sp-btn-buy-text { font-size: 28rpx; font-weight: 500; color: #fff; }

/* 三态：加载/错误 */
.state-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 200rpx 0; min-height: 60vh; }
.state-spinner { width: 64rpx; height: 64rpx; border: 4rpx solid var(--border); border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.state-icon { width: 120rpx; height: 120rpx; border-radius: 50%; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; margin-bottom: 24rpx; }
.state-text { font-size: 26rpx; color: var(--text-soft); margin-top: 20rpx; }
.state-retry { margin-top: 32rpx; padding: 16rpx 48rpx; border-radius: 999rpx; background: var(--brand); }
.state-retry-text { font-size: 26rpx; color: #fff; font-weight: 500; }
</style>

<style lang="scss">
/* H5 端 rich-text 渲染为真实 DOM，但 scoped 样式吃不到其内部节点 → 用非 scoped 块 + 页面独有类名限定，
   作为数据层行内样式注入（@/utils/rich-content）之外的 CSS 兜底：详情多图无缝拼接 */
.desc-section .desc img {
  display: block;
  width: 100%;
  height: auto;
  margin: 0;
  padding: 0;
  border: 0;
  vertical-align: top;
}
.desc-section .desc p {
  margin: 0;
  /* 文字段落保留左右内边距；纯图片段落已被行内 padding:0 覆盖 → 图片仍通栏到屏幕边 */
  padding: 0 28rpx;
  box-sizing: border-box;
}
</style>
