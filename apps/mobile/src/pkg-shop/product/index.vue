<template>
  <view class="pd-page">
    <!-- 顶部导航 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-btn" hover-class="nav-hover" @tap="goBack">
        <app-icon name="chevron-left" :size="36" color="#2C2C2C" />
      </view>
      <view class="nav-actions">
        <view class="nav-btn" hover-class="nav-hover" @tap="toggleFavorite">
          <app-icon name="heart" :size="34" :color="isFavorite ? '#C41E3A' : '#2C2C2C'" :fill="isFavorite" />
        </view>
        <view class="nav-btn" hover-class="nav-hover">
          <app-icon name="share-2" :size="32" color="#2C2C2C" />
        </view>
      </view>
    </view>

    <!-- 加载态 -->
    <view v-if="loading" class="loading-zone">
      <view class="sk-gallery" />
      <view class="sk-block" />
      <view class="sk-block" />
      <view class="sk-block" />
    </view>

    <!-- 错误态 -->
    <view v-else-if="error" class="error-zone">
      <text class="error-text">{{ error }}</text>
      <view class="error-retry" @tap="fetchProductData()"><text>重试</text></view>
    </view>

    <template v-else-if="product">
    <!-- 图片轮播 -->
    <view class="gallery" @tap="showImageViewer = true">
      <swiper class="gallery-swiper" :current="currentImage" @change="onSwiperChange" :circular="true">
        <swiper-item v-for="(img, i) in product.images" :key="i">
          <image lazy-load class="gallery-img" :src="img" mode="aspectFill" />
        </swiper-item>
      </swiper>
      <view class="gallery-dots">
        <view
          v-for="(img, i) in product.images"
          :key="i"
          class="dot"
          :class="{ 'dot-active': i === currentImage }"
          @tap.stop="currentImage = i"
        />
      </view>
      <view v-if="product.isHot" class="hot-tag">热销</view>
    </view>

    <!-- 价格信息 -->
    <view class="price-card">
      <view class="price-row">
        <text class="price-now">¥{{ formatPrice(currentPrice) }}</text>
        <text class="price-old">¥{{ formatPrice(currentOriginalPrice) }}</text>
        <text v-if="savedAmount > 0" class="save-tag">省¥{{ savedAmount }}</text>
      </view>
      <text class="p-title">{{ product.name }}</text>
      <view class="p-meta">
        <view class="meta-item">
          <app-icon name="star" :size="28" color="#C9A96E" :fill="true" />
          <text class="meta-text">{{ product.rating }}</text>
        </view>
        <text class="meta-text">已售{{ product.sales }}+</text>
        <text class="meta-text">{{ product.shipping }}</text>
      </view>
    </view>

    <!-- SKU 选择入口 -->
    <view class="sku-entry" hover-class="cell-hover" @tap="openSku('cart')">
      <text class="entry-label">已选</text>
      <view class="entry-value">
        <text class="entry-text">{{ selectedSku ? selectedSku.name : '请选择规格' }} x{{ quantity }}</text>
        <app-icon name="chevron-right" :size="30" color="#999999" />
      </view>
    </view>

    <!-- 规格参数（后端无独立规格参数表时隐藏） -->
    <view v-if="product.specs.length" class="block">
      <text class="block-title">规格参数</text>
      <view class="specs">
        <view v-for="(spec, i) in product.specs" :key="i" class="spec-item">
          <text class="spec-name">{{ spec.name }}</text>
          <text class="spec-value">{{ spec.value }}</text>
        </view>
      </view>
    </view>

    <!-- 评价预览 -->
    <view class="block">
      <view class="block-head">
        <text class="block-title">用户评价 ({{ product.reviewCount }})</text>
        <view class="more-link" hover-class="link-hover" @tap="goReviews">
          <text class="more-text">查看全部</text>
          <app-icon name="chevron-right" :size="28" color="#C41E3A" />
        </view>
      </view>
      <view class="rating-summary">
        <text class="rating-num">{{ product.rating }}</text>
        <view class="stars">
          <app-icon
            v-for="s in 5"
            :key="s"
            name="star"
            :size="26"
            :color="s <= Math.round(product.rating) ? '#C9A96E' : '#DDDDDD'"
            :fill="s <= Math.round(product.rating)"
          />
        </view>
      </view>
      <view class="reviews">
        <view v-for="rv in reviews" :key="rv.id" class="review">
          <view class="rv-head">
            <image lazy-load class="rv-avatar" :src="rv.avatar" mode="aspectFill" />
            <view class="rv-info">
              <text class="rv-name">{{ rv.userName }}</text>
              <view class="rv-stars">
                <app-icon
                  v-for="s in 5"
                  :key="s"
                  name="star"
                  :size="20"
                  :color="s <= rv.rating ? '#C9A96E' : '#DDDDDD'"
                  :fill="s <= rv.rating"
                />
                <text v-if="rv.skuName" class="rv-sku">{{ rv.skuName }}</text>
              </view>
            </view>
          </view>
          <text class="rv-content">{{ rv.content }}</text>
          <view v-if="rv.images && rv.images.length" class="rv-images">
            <image lazy-load v-for="(img, i) in rv.images" :key="i" class="rv-img" :src="img" mode="aspectFill" />
          </view>
          <view v-if="rv.reply" class="rv-reply">
            <text class="rv-reply-label">商家回复：</text>
            <text class="rv-reply-text">{{ rv.reply }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 商品详情 -->
    <view class="block">
      <text class="block-title">商品详情</text>
      <text class="desc-text">{{ product.description }}</text>
    </view>

    <!-- 养生保健类商品：专业医疗免责声明 -->
    <view v-if="isHealthProduct" class="disc-wrap">
      <disclaimer variant="medical" tone="card" />
    </view>

    <!-- 底部购买栏 -->
    <view class="buy-bar" :style="{ paddingBottom: safeBottom + 'px' }">
      <view class="bar-icon" hover-class="link-hover" @tap="goCart">
        <app-icon name="shopping-cart" :size="44" color="#666666" />
        <text class="bar-icon-text">购物车</text>
        <view v-if="cartAdded" class="cart-badge">
          <app-icon name="check" :size="20" color="#fff" />
        </view>
      </view>
      <view class="bar-btn btn-cart btn-press" @tap="openSku('cart')">
        <text class="bar-btn-text">加入购物车</text>
      </view>
      <view class="bar-btn btn-buy btn-press" @tap="openSku('buy')">
        <text class="bar-btn-text">立即购买</text>
      </view>
    </view>

    <!-- 飞入购物车动画小球 -->
    <view v-if="flyBall" class="fly-ball fly-to-cart">
      <app-icon name="shopping-cart" :size="28" color="#fff" />
    </view>

    <!-- SKU 选择面板 -->
    <view v-if="showSkuPanel" class="mask mask-fade-in" @tap="showSkuPanel = false">
      <view class="sku-panel sheet-slide-up" @tap.stop>
        <view class="sku-top">
          <image lazy-load class="sku-cover" :src="selectedSku ? selectedSku.image : product.images[0]" mode="aspectFill" />
          <view class="sku-top-info">
            <text class="sku-price">¥{{ formatPrice(selectedSku ? selectedSku.price : product.price) }}</text>
            <text class="sku-stock">库存 {{ selectedSku ? selectedSku.stock : product.stock }}</text>
            <text class="sku-selected">已选：{{ selectedSku ? selectedSku.name : '' }}</text>
          </view>
          <view class="sku-close" hover-class="nav-hover" @tap="showSkuPanel = false">
            <app-icon name="x" :size="40" color="#999999" />
          </view>
        </view>
        <view class="sku-body">
          <text class="sku-label">规格</text>
          <view class="sku-options">
            <view
              v-for="sku in product.skus"
              :key="sku.id"
              class="sku-opt"
              :class="{ 'sku-opt-active': selectedSku && selectedSku.id === sku.id, 'sku-opt-disabled': sku.stock === 0 }"
              hover-class="opt-hover"
              @tap="sku.stock > 0 && selectSku(sku)"
            >
              {{ sku.name }}
            </view>
          </view>
          <view class="qty-row">
            <text class="sku-label">数量</text>
            <view class="qty-stepper">
              <view class="qty-btn tap-press" :class="{ 'qty-btn-disabled': quantity <= 1 }" @tap="decQty">
                <app-icon name="minus" :size="28" :color="quantity <= 1 ? '#CCCCCC' : '#666666'" />
              </view>
              <text class="qty-num">{{ quantity }}</text>
              <view class="qty-btn tap-press" @tap="incQty">
                <app-icon name="plus" :size="28" color="#666666" />
              </view>
            </view>
          </view>
        </view>
        <view class="sku-foot" :style="{ paddingBottom: (safeBottom + 16) + 'px' }">
          <view class="sku-submit" :class="buyMode === 'cart' ? 'submit-cart' : 'submit-buy'" hover-class="btn-hover" @tap="confirmSku">
            <text class="sku-submit-text">{{ buyMode === 'cart' ? '加入购物车' : '立即购买' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 加购成功提示 -->
    <view v-if="addedToast" class="toast">
      <app-icon name="check" :size="28" color="#4ADE80" />
      <text class="toast-text">已加入购物车</text>
    </view>

    <!-- 图片浏览器 -->
    <view v-if="showImageViewer" class="viewer" @tap="showImageViewer = false">
      <view class="viewer-close" @tap.stop="showImageViewer = false">
        <app-icon name="x" :size="44" color="#fff" />
      </view>
      <swiper class="viewer-swiper" :current="currentImage" @change="onSwiperChange" :circular="true">
        <swiper-item v-for="(img, i) in product.images" :key="i" class="viewer-item">
          <image lazy-load class="viewer-img" :src="img" mode="aspectFit" />
        </swiper-item>
      </swiper>
      <view class="viewer-dots">
        <view
          v-for="(img, i) in product.images"
          :key="i"
          class="vdot"
          :class="{ 'vdot-active': i === currentImage }"
        />
      </view>
    </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { goBack, navigateTo } from '@/utils/router'
import { shopApi, type ShopProductSku } from '@/lib/shop-data'
import { track } from '@/composables/useTrack'
import Disclaimer from '@/components/compliance/disclaimer.vue'
import { formatPrice } from '@/utils/format'

const statusBarHeight = ref(0)
const safeBottom = ref(0)

const loading = ref(true)
const error = ref('')
// 商品详情：null 初值 + 模板 v-else-if 块裸访问 product.images/specs/skus 等，收敛触发大量 possibly-null，保留 any
const product = ref<any>(null)
const reviews = ref<any[]>([]) // 评价预览：本页未导入 ShopProductReview，模板裸访问，保留 any
const productId = ref('1')
// view_content 埋点防重复标记（重试/刷新只上报一次）
const viewTracked = ref(false)

const currentImage = ref(0)
const isFavorite = ref(false)
const showSkuPanel = ref(false)
const selectedSku = ref<ShopProductSku | null>(null)
const quantity = ref(1)
const buyMode = ref<'cart' | 'buy'>('cart')
const showImageViewer = ref(false)
const cartAdded = ref(false)
const addedToast = ref(false)
const flyBall = ref(false)

const currentPrice = computed(() => selectedSku.value?.price ?? product.value?.price ?? 0)
const currentOriginalPrice = computed(() => selectedSku.value?.originalPrice ?? product.value?.originalPrice ?? 0)
/** 节省金额：两位小数取整，避免浮点误差（209.3 vs 299 → 89.7 而非 89.6999…） */
const savedAmount = computed(() => Math.max(0, Math.round((currentOriginalPrice.value - currentPrice.value) * 100) / 100))

// 养生保健类商品：需展示专业医疗免责声明
const healthKeywords = ['养生', '保健', '中医', '理疗', '艾灸', '推拿', '经络', '食疗', '针灸', '健康', '调理']
const isHealthProduct = computed(() => {
  const p = product.value
  if (!p) return false
  const text = `${p.name} ${p.category} ${p.description} ${(p.tags || []).join(' ')}`
  return healthKeywords.some((kw) => text.includes(kw))
})

async function fetchProductData() {
  if (!productId.value || productId.value === '1') {
    // 缺少/非法商品 ID：显式落错误态，避免卡在骨架屏白屏
    loading.value = false
    error.value = '商品不存在'
    return
  }
  error.value = ''
  loading.value = true
  try {
    const result = await shopApi.getShopProductDetail(productId.value)
    product.value = result.product
    reviews.value = result.reviews || []
    selectedSku.value = product.value?.skus?.[0] || null
    // 内容浏览埋点：详情加载成功才上报（真实标题），每次进入页面只上报一次（重试不重复）
    if (!viewTracked.value && product.value) {
      viewTracked.value = true
      track.custom('view_content', { type: 'product', id: productId.value, title: product.value.name })
    }
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onLoad(async (q) => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 0
    safeBottom.value = info.safeAreaInsets ? info.safeAreaInsets.bottom : 0
  } catch (e) {
    statusBarHeight.value = 0
  }
  if (q && q.id) {
    productId.value = String(q.id)
    await fetchProductData()
  } else {
    loading.value = false
    error.value = '商品不存在'
  }
})

function onSwiperChange(e: { detail: { current: number } }) {
  currentImage.value = e.detail.current
}
function toggleFavorite() {
  isFavorite.value = !isFavorite.value
}
function openSku(mode: 'cart' | 'buy') {
  buyMode.value = mode
  showSkuPanel.value = true
}
function selectSku(sku: ShopProductSku) {
  selectedSku.value = sku
  if (product.value?.images) {
    const idx = product.value.images.findIndex((img: string) => img === sku.image)
    if (idx >= 0) currentImage.value = idx
  }
}
function decQty() {
  if (quantity.value > 1) quantity.value--
}
function incQty() {
  const max = selectedSku.value?.stock ?? product.value?.stock ?? 99
  if (quantity.value < max) quantity.value++
}
function confirmSku() {
  if (buyMode.value === 'cart') {
    showSkuPanel.value = false
    // 飞入购物车动画：小球从屏幕中下部飞向左下角购物车图标
    try {
      const info = uni.getSystemInfoSync()
      const w = info.windowWidth || 375
      const h = info.windowHeight || 667
      flyBall.value = true
      // 目标：左下角购物车（约 x=36px, 底部上方约 56px）相对小球初始中心位置的位移
      const ball = document?.querySelector?.('.fly-ball') as HTMLElement | null
      if (ball) {
        ball.style.setProperty('--fly-x', `${36 - w / 2}px`)
        ball.style.setProperty('--fly-y', `${h - 56 - (h - 120)}px`)
      }
    } catch (e) {
      flyBall.value = true
    }
    setTimeout(() => {
      flyBall.value = false
      cartAdded.value = true
      addedToast.value = true
      setTimeout(() => (addedToast.value = false), 1600)
    }, 600)
  } else {
    navigateTo(`/shop/checkout?productId=${productId.value}&skuId=${selectedSku.value?.id}&quantity=${quantity.value}`)
  }
}
function goReviews() {
  navigateTo(`/shop/reviews?productId=${productId.value}`)
}
function goCart() {
  navigateTo('/shop/cart')
}
</script>

<style scoped lang="scss">
.pd-page {
  min-height: 100vh;
  background: #faf8f5;
  padding-bottom: 130rpx;
}
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
  box-sizing: border-box;
}
.nav-actions {
  display: flex;
  gap: 16rpx;
}
.nav-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-hover {
  background: rgba(0, 0, 0, 0.1);
}
.gallery {
  position: relative;
  width: 100%;
  height: 750rpx;
  background: #fff;
}
.gallery-swiper {
  width: 100%;
  height: 100%;
}
.gallery-img {
  width: 100%;
  height: 100%;
}
.gallery-dots {
  position: absolute;
  bottom: 24rpx;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10rpx;
}
.dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.2);
  transition: all 0.3s;
}
.dot-active {
  width: 28rpx;
  border-radius: 6rpx;
  background: var(--brand);
}
.hot-tag {
  position: absolute;
  top: 120rpx;
  left: 0;
  padding: 6rpx 20rpx;
  background: linear-gradient(90deg, var(--brand), #e85a71);
  color: #fff;
  font-size: 22rpx;
  border-radius: 0 30rpx 30rpx 0;
}
.price-card {
  background: #fff;
  padding: 28rpx 24rpx;
}
.price-row {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin-bottom: 12rpx;
}
.price-now {
  font-size: 48rpx;
  font-weight: 700;
  color: var(--brand);
}
.price-old {
  font-size: 26rpx;
  color: #999;
  text-decoration: line-through;
}
.save-tag {
  font-size: 22rpx;
  color: var(--brand);
  background: #fff0f0;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}
.p-title {
  display: block;
  font-size: 34rpx;
  font-weight: 500;
  color: #2c2c2c;
  line-height: 1.5;
  margin-bottom: 16rpx;
}
.p-meta {
  display: flex;
  align-items: center;
  gap: 28rpx;
}
.meta-item {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.meta-text {
  font-size: 26rpx;
  color: #666;
}
.sku-entry {
  margin-top: 16rpx;
  background: #fff;
  padding: 28rpx 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cell-hover {
  background: #f7f4f0;
}
.entry-label {
  font-size: 28rpx;
  color: #666;
}
.entry-value {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.entry-text {
  font-size: 28rpx;
  color: #2c2c2c;
}
.block {
  margin-top: 16rpx;
  background: #fff;
  padding: 28rpx 24rpx;
}
.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.block-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.more-link {
  display: flex;
  align-items: center;
}
.link-hover {
  opacity: 0.6;
}
.more-text {
  font-size: 26rpx;
  color: var(--brand);
}
.specs {
  display: flex;
  flex-wrap: wrap;
  margin-top: 8rpx;
}
.spec-item {
  width: 50%;
  display: flex;
  margin-bottom: 16rpx;
}
.spec-name {
  width: 130rpx;
  font-size: 26rpx;
  color: #999;
}
.spec-value {
  flex: 1;
  font-size: 26rpx;
  color: #666;
}
.rating-summary {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #e8e3db;
  margin-bottom: 24rpx;
}
.rating-num {
  font-size: 44rpx;
  font-weight: 700;
  color: var(--brand);
}
.stars {
  display: flex;
  gap: 2rpx;
}
.reviews {
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}
.review {
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid #e8e3db;
}
.review:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.rv-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 14rpx;
}
.rv-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #f0ece4;
}
.rv-info {
  flex: 1;
}
.rv-name {
  display: block;
  font-size: 26rpx;
  color: #2c2c2c;
}
.rv-stars {
  display: flex;
  align-items: center;
  gap: 2rpx;
  margin-top: 4rpx;
}
.rv-sku {
  font-size: 22rpx;
  color: #999;
  margin-left: 12rpx;
}
.rv-content {
  display: block;
  font-size: 28rpx;
  color: #666;
  line-height: 1.6;
  margin-bottom: 14rpx;
}
.rv-reply {
  margin-top: 12rpx;
  padding: 14rpx 18rpx;
  background: #FAF6EF;
  border-radius: 12rpx;
}
.rv-reply-label {
  font-size: 25rpx;
  color: #C9A96E;
  font-weight: 600;
}
.rv-reply-text {
  font-size: 25rpx;
  color: #666;
  line-height: 1.6;
}
.rv-images {
  display: flex;
  gap: 12rpx;
}
.rv-img {
  width: 120rpx;
  height: 120rpx;
  border-radius: 10rpx;
  background: #f0ece4;
}
.desc-text {
  display: block;
  font-size: 28rpx;
  color: #666;
  line-height: 1.7;
  margin-top: 12rpx;
}
.disc-wrap {
  margin-top: 16rpx;
  padding: 0 24rpx;
}
.buy-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 40;
  background: #fff;
  border-top: 1rpx solid #e8e3db;
  padding: 16rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.bar-icon {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.bar-icon-text {
  font-size: 20rpx;
  color: #666;
  margin-top: 2rpx;
}
.cart-badge {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
}
.bar-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-cart {
  background: linear-gradient(90deg, #c9a96e, #d4b87a);
}
.btn-buy {
  background: linear-gradient(90deg, var(--brand), #e85a71);
}
.bar-btn-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #fff;
}
.btn-hover {
  opacity: 0.85;
}
.mask {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
}
.sku-panel {
  width: 100%;
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}
.sku-top {
  display: flex;
  gap: 20rpx;
  padding: 28rpx 24rpx;
  border-bottom: 1rpx solid #e8e3db;
}
.sku-cover {
  width: 150rpx;
  height: 150rpx;
  border-radius: 16rpx;
  background: #f0ece4;
}
.sku-top-info {
  flex: 1;
}
.sku-price {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: var(--brand);
}
.sku-stock {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin: 8rpx 0;
}
.sku-selected {
  font-size: 26rpx;
  color: #666;
}
.sku-close {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sku-body {
  flex: 1;
  padding: 28rpx 24rpx;
  overflow-y: auto;
}
.sku-label {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  margin-bottom: 20rpx;
}
.sku-options {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 40rpx;
}
.sku-opt {
  padding: 14rpx 32rpx;
  border-radius: 30rpx;
  font-size: 26rpx;
  color: #666;
  border: 1rpx solid #e8e3db;
}
.sku-opt-active {
  border-color: var(--brand);
  background: #fff0f0;
  color: var(--brand);
}
.sku-opt-disabled {
  color: #ccc;
  text-decoration: line-through;
}
.opt-hover {
  opacity: 0.7;
}
.qty-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.qty-row .sku-label {
  margin-bottom: 0;
}
.qty-stepper {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.qty-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  border: 1rpx solid #e8e3db;
  display: flex;
  align-items: center;
  justify-content: center;
}
.qty-num {
  min-width: 60rpx;
  text-align: center;
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.sku-foot {
  padding: 16rpx 24rpx;
}
.sku-submit {
  height: 84rpx;
  border-radius: 42rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.submit-cart {
  background: linear-gradient(90deg, #c9a96e, #d4b87a);
}
.submit-buy {
  background: linear-gradient(90deg, var(--brand), #e85a71);
}
.sku-submit-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #fff;
}
.fly-ball {
  position: fixed;
  left: 50%;
  bottom: 120rpx;
  z-index: 75;
  width: 64rpx;
  height: 64rpx;
  margin-left: -32rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--brand), #e85a71);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6rpx 20rpx rgba(196, 30, 58, 0.4);
}
.toast {
  position: fixed;
  top: 160rpx;
  left: 50%;
  transform: translateX(-50%);
  z-index: 70;
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 16rpx 28rpx;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 40rpx;
}
.toast-text {
  font-size: 26rpx;
  color: #fff;
}
.viewer {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.viewer-close {
  position: absolute;
  top: 60rpx;
  right: 32rpx;
  z-index: 2;
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.viewer-swiper {
  width: 100%;
  height: 80vh;
}
.viewer-item {
  display: flex;
  align-items: center;
  justify-content: center;
}
.viewer-img {
  width: 100%;
  height: 100%;
}
.viewer-dots {
  position: absolute;
  bottom: 60rpx;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12rpx;
}
.vdot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
}
.vdot-active {
  width: 28rpx;
  border-radius: 6rpx;
  background: #fff;
}

/* 加载态 */
.loading-zone { padding-top: 120rpx; display: flex; flex-direction: column; gap: 16rpx; }
.sk-gallery { width: 100%; height: 750rpx; background: #ececec; }
.sk-block { margin: 16rpx; height: 200rpx; background: #ececec; border-radius: 16rpx; }

/* 错误态 */
.error-zone { min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 32rpx; }
.error-text { font-size: 28rpx; color: #999999; }
.error-retry { padding: 16rpx 56rpx; background: var(--brand); border-radius: 40rpx; }
.error-retry text { color: #FFFFFF; font-size: 28rpx; }
</style>
