<template>
  <view class="page">
    <DataState
      :is-loading="loading"
      :error="error"
      :is-empty="false"
      skeleton-type="detail"
      @retry="initLoad"
    >
      <template v-if="product">
        <!-- 轮播图 -->
        <swiper
          class="swiper"
          indicator-dots
          :indicator-active-color="'#C41E3A'"
          :indicator-color="'rgba(255,255,255,0.5)'"
          autoplay
          interval="3000"
          circular
        >
          <swiper-item
            v-for="(img, i) in images"
            :key="i"
          >
            <image
              :src="img"
              class="swiper-img"
              mode="aspectFill"
              @click="previewImg(images, i)"
            />
          </swiper-item>
        </swiper>

        <!-- 返回按钮 -->
        <view
          class="nav-back"
          @click="goBack"
        >
          <text class="nav-back-icon">
            ‹
          </text>
        </view>

        <!-- 价格区 -->
        <view class="price-section">
          <view class="price-row">
            <view class="price-group">
              <text class="price-symbol">
                ¥
              </text>
              <text class="price">
                {{ toYuan(currentPrice) }}
              </text>
              <text
                v-if="originalPrice && originalPrice > currentPrice"
                class="origin"
              >
                ¥{{ toYuan(originalPrice) }}
              </text>
            </view>
            <view
              class="share-btn"
              @click="onShare"
            >
              <text class="share-icon">
                📤
              </text>
              <text class="share-text">
                分享
              </text>
            </view>
          </view>
          <text class="title">
            {{ product.title }}
          </text>
          <view class="sales-row">
            <text class="sales">
              已售 {{ formatSales(product.sales || 0) }}
            </text>
            <text class="stock">
              库存 {{ product.stock || 0 }}
            </text>
          </view>

          <!-- 优惠券提示 -->
          <view
            v-if="availableCoupons.length"
            class="coupon-tip"
            @click="goCoupons"
          >
            <text class="coupon-tip-icon">
              🎫
            </text>
            <text class="coupon-tip-text">
              领券更优惠 · {{ availableCoupons.length }} 张可用
            </text>
            <text class="coupon-tip-arrow">
              ›
            </text>
          </view>
        </view>

        <!-- SKU 选择入口 -->
        <view
          class="spec-section"
          @click="showSkuPanel = true"
        >
          <text class="spec-label">
            已选
          </text>
          <text class="spec-val">
            {{ selectedSku ? selectedSku.name : '请选择规格' }}
          </text>
          <text class="spec-arrow">
            ›
          </text>
        </view>

        <!-- 商品描述（富文本） -->
        <view class="desc-section">
          <view class="section-title">
            <text class="section-title-bar" />
            <text>商品详情</text>
          </view>
          <rich-text
            :nodes="product.detail || '暂无详情'"
            class="desc-html"
          />
        </view>

        <!-- 评价列表 -->
        <view class="review-section">
          <view
            class="section-title"
            @click="showAllReviews"
          >
            <text class="section-title-bar" />
            <text>商品评价</text>
            <text class="section-badge">
              {{ reviewTotal }}
            </text>
            <text class="section-more">
              查看全部 ›
            </text>
          </view>
          <view
            v-if="reviews.length === 0"
            class="no-review"
          >
            <text class="no-review-icon">
              📝
            </text>
            <text class="no-review-text">
              暂无评价，快来第一个评价吧
            </text>
          </view>
          <view
            v-for="rv in reviews.slice(0, 3)"
            :key="rv.id"
            class="review-item"
          >
            <view class="review-header">
              <image
                v-if="rv.avatar"
                :src="rv.avatar"
                class="review-avatar"
              />
              <view
                v-else
                class="review-avatar-plc"
              >
                {{ rv.nickname?.charAt(0) || '?' }}
              </view>
              <view class="review-user-info">
                <text class="review-user">
                  {{ rv.nickname || '匿名用户' }}
                </text>
                <view class="review-stars">
                  <text
                    v-for="s in 5"
                    :key="s"
                    class="star"
                    :class="{ active: s <= rv.rating }"
                  >
                    ★
                  </text>
                </view>
              </view>
              <text class="review-time">
                {{ formatTime(rv.createdAt) }}
              </text>
            </view>
            <text class="review-content">
              {{ rv.content }}
            </text>
            <view
              v-if="rv.images?.length"
              class="review-images"
            >
              <image
                v-for="(img, i) in rv.images.slice(0, 3)"
                :key="i"
                :src="img"
                mode="aspectFill"
                class="review-img"
                @click="previewImg(rv.images, i)"
              />
            </view>
          </view>
        </view>

        <!-- 推荐商品 -->
        <view
          v-if="relatedProducts.length"
          class="related-section"
        >
          <view class="section-title">
            <text class="section-title-bar" />
            <text>猜你喜欢</text>
          </view>
          <scroll-view
            scroll-x
            class="related-scroll"
            show-scrollbar="false"
          >
            <view
              v-for="rp in relatedProducts"
              :key="rp.id"
              class="related-card"
              @click="goProduct(rp.id)"
            >
              <image
                :src="rp.cover"
                class="related-img"
                mode="aspectFill"
              />
              <view class="related-body">
                <text class="related-name">
                  {{ rp.title }}
                </text>
                <text class="related-price">
                  ¥{{ toYuan(rp.price) }}
                </text>
              </view>
            </view>
          </scroll-view>
        </view>
      </template>
    </DataState>

    <!-- SKU 选择面板（底部弹出） -->
    <view
      v-if="showSkuPanel"
      class="mask"
      @click="showSkuPanel = false"
    >
      <view
        class="sku-panel"
        @click.stop
      >
        <view class="panel-header">
          <image
            :src="images[0] || product?.cover"
            class="panel-thumb"
            mode="aspectFill"
          />
          <view class="panel-header-info">
            <text class="panel-price">
              ¥{{ toYuan(currentPrice) }}
            </text>
            <text class="panel-stock">
              库存 {{ selectedSku?.stock || product?.stock || 0 }} 件
            </text>
            <text
              v-if="selectedSku"
              class="panel-selected"
            >
              已选: {{ selectedSku.name }}
            </text>
          </view>
          <text
            class="panel-close"
            @click="showSkuPanel = false"
          >
            ✕
          </text>
        </view>
        <scroll-view
          scroll-y
          class="panel-body"
        >
          <text class="panel-label">
            选择规格
          </text>
          <view class="panel-list">
            <view
              v-for="sku in (product?.skus || [])"
              :key="sku.id"
              class="panel-item"
              :class="{ selected: selectedSku?.id === sku.id }"
              @click="selectSku(sku)"
            >
              {{ sku.name }}
            </view>
          </view>
        </scroll-view>
        <view
          class="panel-confirm"
          @click="showSkuPanel = false"
        >
          确定
        </view>
      </view>
    </view>

    <!-- 底部固定栏 -->
    <view
      v-if="product"
      class="bottom-bar"
    >
      <view class="bar-left">
        <view
          class="bar-icon"
          @click="onCollect"
        >
          <text :class="['collect-star', { active: isCollected }]">
            {{ isCollected ? '★' : '☆' }}
          </text>
          <text class="bar-icon-text">
            {{ isCollected ? '已收藏' : '收藏' }}
          </text>
        </view>
        <view
          class="bar-icon"
          @click="goCart"
        >
          <text class="bar-icon-emoji">
            🛒
          </text>
          <text class="bar-icon-text">
            购物车
          </text>
        </view>
      </view>
      <view class="bar-right">
        <view
          class="btn-cart"
          @click="onAddToCart"
        >
          <text>加入购物车</text>
        </view>
        <view
          class="btn-buy"
          @click="onBuyNow"
        >
          <text>立即购买</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { shopApi, interactApi } from '../../api'
import DataState from '../../components/DataState.vue'
import type { ProductItem, ProductSku, ProductReview } from '../../types'

const product = ref<ProductItem | null>(null)
const selectedSku = ref<ProductSku | null>(null)
const showSkuPanel = ref(false)
const isCollected = ref(false)
const availableCoupons = ref<any[]>([])
const relatedProducts = ref<ProductItem[]>([])

// 评价
const reviews = ref<ProductReview[]>([])
const reviewTotal = ref(0)

const loading = ref(false)
const error = ref<string | null>(null)

const images = computed(() => {
  if (!product.value) return []
  const imgs = product.value.images || []
  return imgs.length ? imgs : [product.value.cover].filter(Boolean)
})

const currentPrice = computed(() => {
  if (selectedSku.value) return selectedSku.value.price
  return product.value?.price || 0
})

const originalPrice = computed(() => {
  if (selectedSku.value) return selectedSku.value.originalPrice
  return product.value?.originalPrice
})

const token = computed(() => uni.getStorageSync('token') || '')

onMounted(() => {
  initLoad()
})

async function initLoad() {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const id = page?.$page?.options?.id || page?.options?.id
  if (!id) {
    error.value = '缺少商品ID'
    return
  }
  loading.value = true
  error.value = null
  try {
    product.value = await shopApi.productDetail(id)
    await Promise.all([
      fetchReviews(id),
      fetchCoupons(),
      checkCollected(id),
    ])
    fetchRelated()
  } catch (e: any) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function selectSku(sku: ProductSku) {
  selectedSku.value = sku
}

function toYuan(fen: number): string {
  return (fen / 100).toFixed(2)
}

function formatSales(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '万'
  return String(n)
}

// ===== 收藏 =====
async function checkCollected(productId: string) {
  if (!token.value) return
  try {
    const data = await interactApi.myCollects()
    if (Array.isArray(data)) {
      isCollected.value = data.some((c: any) => c.targetType === 'PRODUCT' && c.targetId === productId)
    }
  } catch { /* skip */ }
}

async function onCollect() {
  if (!token.value) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  try {
    await interactApi.toggleCollect('PRODUCT', product.value!.id)
    isCollected.value = !isCollected.value
    uni.showToast({ title: isCollected.value ? '已收藏' : '已取消收藏', icon: 'success' })
  } catch {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

// ===== 加入购物车 / 立即购买 =====
async function onAddToCart() {
  if (!token.value) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  if (product.value?.skus?.length && !selectedSku.value) {
    showSkuPanel.value = true
    uni.showToast({ title: '请选择规格', icon: 'none' })
    return
  }
  try {
    await shopApi.addToCart({
      productId: product.value!.id,
      skuId: selectedSku.value?.id,
      quantity: 1,
    })
    uni.showToast({ title: '已加入购物车', icon: 'success' })
  } catch (e: any) {
    uni.showToast({ title: e.message || '加入购物车失败', icon: 'none' })
  }
}

async function onBuyNow() {
  if (!token.value) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  if (product.value?.skus?.length && !selectedSku.value) {
    showSkuPanel.value = true
    uni.showToast({ title: '请选择规格', icon: 'none' })
    return
  }
  try {
    await shopApi.addToCart({
      productId: product.value!.id,
      skuId: selectedSku.value?.id,
      quantity: 1,
    })
    uni.navigateTo({ url: '/pages/shop/checkout' })
  } catch (e: any) {
    uni.showToast({ title: e.message || '操作失败', icon: 'none' })
  }
}

// ===== 评价 =====
async function fetchReviews(productId: string) {
  try {
    const data = await shopApi.listReviews(productId, { page: 1, pageSize: 10 })
    if (data) {
      reviews.value = data.reviews || data.list || data.data || []
      reviewTotal.value = data.total || reviews.value.length
    }
  } catch { /* skip */ }
}

function showAllReviews() {
  uni.navigateTo({ url: `/pages/shop/reviews?productId=${product.value?.id}` })
}

// ===== 优惠券 =====
async function fetchCoupons() {
  try {
    const data = await shopApi.listCoupons()
    const list = data?.coupons || data?.data || []
    availableCoupons.value = list.filter((c: any) => !c.isClaimed)
  } catch { /* skip */ }
}

function goCoupons() {
  uni.navigateTo({ url: '/pages/shop/coupons' })
}

// ===== 相关推荐 =====
async function fetchRelated() {
  try {
    const data = await shopApi.products({ page: 1, pageSize: 8 })
    const list: ProductItem[] = Array.isArray(data) ? data : (data.list || data.items || data.data || [])
    relatedProducts.value = list.filter(p => p.id !== product.value?.id).slice(0, 6)
  } catch { /* skip */ }
}

// ===== 共享功能 =====
function previewImg(imgs: string[], index: number) {
  uni.previewImage({ urls: imgs, current: index })
}

function formatTime(d: string) {
  if (!d) return ''
  const date = new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function onShare() {
  if (!product.value) return
  uni.setClipboardData({
    data: `【热卜国学】${product.value.title} — ¥${toYuan(product.value.price)}，快来看看！`,
    success: () => uni.showToast({ title: '链接已复制', icon: 'success' }),
  })
}

function goProduct(id: string) {
  uni.navigateTo({ url: `/pages/shop/product-detail?id=${id}` })
}

function goCart() {
  uni.navigateTo({ url: '/pages/shop/cart' })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 120rpx;
}

/* ===== 返回按钮 ===== */
.nav-back {
  position: fixed;
  top: calc(20rpx + env(safe-area-inset-top));
  left: 24rpx;
  z-index: 100;
  width: 64rpx;
  height: 64rpx;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-back-icon {
  font-size: 48rpx;
  color: #fff;
  line-height: 1;
}

/* ===== 轮播 ===== */
.swiper {
  width: 100%;
  height: 720rpx;
}
.swiper-img {
  width: 100%;
  height: 100%;
}

/* ===== 价格区 ===== */
.price-section {
  background: #fff;
  padding: 24rpx 28rpx;
  margin-bottom: 12rpx;
}
.price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.price-group {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}
.price-symbol {
  font-size: 28rpx;
  font-weight: bold;
  color: #C41E3A;
}
.price {
  font-size: 48rpx;
  font-weight: bold;
  color: #C41E3A;
}
.origin {
  font-size: 26rpx;
  color: #bbb;
  text-decoration: line-through;
  margin-left: 8rpx;
}
.share-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 24rpx;
  border: 1rpx solid #E8E0D5;
  border-radius: 28rpx;
}
.share-icon {
  font-size: 24rpx;
}
.share-text {
  font-size: 24rpx;
  color: #999;
}

.title {
  font-size: 30rpx;
  color: #2C2C2C;
  font-weight: 600;
  display: block;
  margin: 16rpx 0 10rpx;
  line-height: 1.5;
}

.sales-row {
  display: flex;
  gap: 24rpx;
}
.sales, .stock {
  font-size: 22rpx;
  color: #bbb;
}

/* ===== 优惠券 ===== */
.coupon-tip {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 20rpx;
  background: linear-gradient(135deg, #fef5f0, #fdf0e8);
  border: 1rpx solid #f0d5c0;
  border-radius: 12rpx;
  padding: 18rpx 24rpx;
}
.coupon-tip-icon {
  font-size: 32rpx;
}
.coupon-tip-text {
  font-size: 24rpx;
  color: #C41E3A;
  flex: 1;
  font-weight: 500;
}
.coupon-tip-arrow {
  font-size: 32rpx;
  color: #C9A96E;
}

/* ===== 规格选择 ===== */
.spec-section {
  background: #fff;
  padding: 24rpx 28rpx;
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}
.spec-label {
  font-size: 26rpx;
  color: #888;
  width: 80rpx;
}
.spec-val {
  flex: 1;
  font-size: 26rpx;
  color: #2C2C2C;
}
.spec-arrow {
  font-size: 36rpx;
  color: #ccc;
}

/* ===== 通用区块标题 ===== */
.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #2C2C2C;
  padding: 8rpx 0 16rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.section-title-bar {
  display: inline-block;
  width: 6rpx;
  height: 28rpx;
  background: #C41E3A;
  border-radius: 3rpx;
  flex-shrink: 0;
}
.section-badge {
  font-size: 22rpx;
  color: #C9A96E;
  font-weight: normal;
  background: #F5F0E8;
  padding: 4rpx 16rpx;
  border-radius: 16rpx;
}
.section-more {
  margin-left: auto;
  font-size: 22rpx;
  color: #C9A96E;
  font-weight: normal;
}

/* ===== 商品详情 ===== */
.desc-section {
  background: #fff;
  padding: 24rpx 28rpx;
  margin-bottom: 12rpx;
}
.desc-html {
  font-size: 26rpx;
  color: #555;
  line-height: 1.8;
}

/* ===== 评价 ===== */
.review-section {
  background: #fff;
  padding: 24rpx 28rpx;
  margin-bottom: 12rpx;
}
.no-review {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 32rpx 0;
  color: #bbb;
  font-size: 26rpx;
}
.no-review-icon {
  font-size: 48rpx;
}
.no-review-text {
  font-size: 24rpx;
  color: #bbb;
}
.review-item {
  padding: 20rpx 0;
  border-top: 1rpx solid #F5F0E8;
}
.review-header {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-bottom: 12rpx;
}
.review-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  flex-shrink: 0;
}
.review-avatar-plc {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #C41E3A;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: bold;
  flex-shrink: 0;
}
.review-user-info {
  flex: 1;
}
.review-user {
  font-size: 24rpx;
  color: #2C2C2C;
  font-weight: 500;
  display: block;
}
.review-stars {
  display: flex;
  gap: 2rpx;
  margin-top: 4rpx;
}
.star {
  font-size: 20rpx;
  color: #E8E0D5;
}
.star.active {
  color: #C9A96E;
}
.review-time {
  font-size: 20rpx;
  color: #ccc;
  flex-shrink: 0;
}
.review-content {
  font-size: 26rpx;
  color: #555;
  line-height: 1.6;
}
.review-images {
  display: flex;
  gap: 10rpx;
  margin-top: 12rpx;
}
.review-img {
  width: 140rpx;
  height: 140rpx;
  border-radius: 8rpx;
}

/* ===== 推荐商品 ===== */
.related-section {
  background: #fff;
  padding: 24rpx 28rpx;
  margin-bottom: 12rpx;
}
.related-scroll {
  white-space: nowrap;
  padding-bottom: 8rpx;
}
.related-card {
  display: inline-block;
  width: 240rpx;
  background: #F5F0E8;
  border-radius: 12rpx;
  overflow: hidden;
  margin-right: 16rpx;
  vertical-align: top;
}
.related-img {
  width: 100%;
  height: 240rpx;
}
.related-body {
  padding: 14rpx 16rpx 18rpx;
}
.related-name {
  font-size: 24rpx;
  color: #2C2C2C;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.related-price {
  font-size: 28rpx;
  font-weight: bold;
  color: #C41E3A;
  display: block;
  margin-top: 8rpx;
}

/* ===== SKU 面板 ===== */
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 200;
  display: flex;
  align-items: flex-end;
}
.sku-panel {
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  width: 100%;
  padding: 28rpx 28rpx 40rpx;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}
.panel-header {
  display: flex;
  gap: 20rpx;
  align-items: flex-start;
  margin-bottom: 24rpx;
}
.panel-thumb {
  width: 160rpx;
  height: 160rpx;
  border-radius: 16rpx;
  flex-shrink: 0;
}
.panel-header-info {
  flex: 1;
}
.panel-price {
  font-size: 40rpx;
  font-weight: bold;
  color: #C41E3A;
  display: block;
}
.panel-stock {
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
  display: block;
}
.panel-selected {
  font-size: 22rpx;
  color: #C41E3A;
  margin-top: 8rpx;
  display: block;
}
.panel-close {
  font-size: 36rpx;
  color: #bbb;
  padding: 8rpx;
  flex-shrink: 0;
}
.panel-body {
  flex: 1;
  overflow-y: auto;
}
.panel-label {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 16rpx;
  display: block;
}
.panel-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.panel-item {
  padding: 14rpx 32rpx;
  border: 1rpx solid #E8E0D5;
  border-radius: 36rpx;
  font-size: 24rpx;
  color: #666;
  background: #F5F0E8;
}
.panel-item.selected {
  border-color: #C41E3A;
  color: #C41E3A;
  background: #fef5f5;
  font-weight: 600;
}
.panel-confirm {
  text-align: center;
  padding: 24rpx;
  background: linear-gradient(135deg, #C41E3A, #A01830);
  color: #fff;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: bold;
  box-shadow: 0 4rpx 20rpx rgba(196, 30, 58, 0.25);
  margin-top: auto;
}

/* ===== 底部固定栏 ===== */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  background: #fff;
  border-top: 1rpx solid #E8E0D5;
  padding: 12rpx 24rpx;
  padding-bottom: calc(12rpx + env(safe-area-inset-bottom));
  gap: 20rpx;
  z-index: 50;
}
.bar-left {
  display: flex;
  gap: 24rpx;
  flex-shrink: 0;
}
.bar-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  min-width: 56rpx;
}
.collect-star {
  font-size: 36rpx;
  color: #bbb;
}
.collect-star.active {
  color: #C9A96E;
}
.bar-icon-emoji {
  font-size: 36rpx;
}
.bar-icon-text {
  font-size: 20rpx;
  color: #999;
}
.bar-right {
  flex: 1;
  display: flex;
  gap: 16rpx;
}
.btn-cart {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  border: 1rpx solid #C9A96E;
  border-radius: 44rpx;
  color: #C9A96E;
  font-size: 26rpx;
  font-weight: 600;
}
.btn-buy {
  flex: 1.5;
  text-align: center;
  padding: 20rpx 0;
  background: linear-gradient(135deg, #C41E3A, #A01830);
  border-radius: 44rpx;
  color: #fff;
  font-size: 26rpx;
  font-weight: 600;
  box-shadow: 0 4rpx 20rpx rgba(196, 30, 58, 0.3);
}
</style>
