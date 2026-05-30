<template>
  <view class="page" v-if="product">
    <!-- 返回按钮 -->
    <view class="nav-back" @click="goBack">
      <text class="nav-back-icon">‹</text>
    </view>

    <!-- 商品轮播图 -->
    <swiper class="swiper" indicator-dots autoplay :interval="3000" circular>
      <swiper-item v-for="(img, i) in images" :key="i">
        <image :src="img" class="swiper-img" mode="aspectFill" @click="previewImg(images, i)" />
      </swiper-item>
    </swiper>

    <!-- 商品信息 -->
    <view class="info-section">
      <view class="price-row">
        <view class="price-group">
          <text class="price">¥{{ selectedSku ? selectedSku.price : product.price }}</text>
          <text v-if="product.originalPrice && product.originalPrice > (selectedSku ? selectedSku.price : product.price)" class="origin">¥{{ product.originalPrice }}</text>
        </view>
        <view class="share-btn" @click="onShare">
          <text>📤 分享</text>
        </view>
      </view>
      <text class="title">{{ product.title }}</text>
      <view class="sales-row">
        <text class="sales">已售 {{ product.soldCount || product.salesCount || 0 }}</text>
        <text class="stock">库存 {{ selectedSku ? selectedSku.stock : (product.stock || 0) }}</text>
      </view>

      <!-- 优惠券提示 -->
      <view v-if="availableCoupons.length" class="coupon-tip" @click="goCoupons">
        <text class="coupon-tip-icon">🎫</text>
        <text class="coupon-tip-text">领券更优惠 · {{ availableCoupons.length }} 张可用</text>
        <text class="coupon-tip-arrow">›</text>
      </view>
    </view>

    <!-- 规格选择 -->
    <view class="spec-section" @click="showSkuPanel = true">
      <text class="label">规格</text>
      <text class="spec-val">{{ selectedSku ? selectedSku.specText : '请选择规格' }}</text>
      <text class="arrow">›</text>
    </view>

    <!-- 商品详情 -->
    <view class="desc-section">
      <view class="section-title">
        商品详情
      </view>
      <rich-text :nodes="product.detail || '暂无详情'" class="desc-html" />
    </view>

    <!-- 推荐商品 -->
    <view class="related-section" v-if="relatedProducts.length">
      <view class="section-title">猜你喜欢</view>
      <scroll-view scroll-x class="related-scroll" show-scrollbar="false">
        <view v-for="rp in relatedProducts" :key="rp.id" class="related-card" @click="goProduct(rp.id)">
          <image :src="rp.cover || rp.images?.[0]" class="related-img" mode="aspectFill" />
          <view class="related-body">
            <text class="related-name">{{ rp.title }}</text>
            <text class="related-price">¥{{ rp.price }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 商品评价 -->
    <view class="review-section">
      <view class="section-title">
        商品评价
        <text class="section-badge">{{ reviewTotal }}</text>
      </view>
      <view v-if="reviews.length === 0" class="no-review">
        <text class="no-review-icon">📝</text>
        <text>暂无评价，快来第一个评价吧</text>
      </view>
      <view v-for="item in reviews" :key="item.id" class="review-item">
        <view class="review-header">
          <view class="review-user-avatar">
            <text>👤</text>
          </view>
          <view class="review-user-info">
            <text class="review-user">{{ item.userId ? '用户' : '匿名' }}</text>
            <text class="review-rating">{{ '★'.repeat(item.rating) }}{{ '☆'.repeat(5 - item.rating) }}</text>
          </view>
          <text class="review-time">{{ formatTime(item.createdAt) }}</text>
        </view>
        <text class="review-content">{{ item.content }}</text>
        <view v-if="item.images && item.images.length" class="review-images">
          <image v-for="(img, i) in item.images" :key="i" :src="img" mode="aspectFill" class="review-img" @click="previewImg(item.images, i)" />
        </view>
      </view>
      <view class="review-more" @click="showReviewPanel = true" v-if="reviewTotal > 3">
        <text>查看全部 {{ reviewTotal }} 条评价 ›</text>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <view class="btn-collect" :class="{ collected: isCollected }" @click="onCollect">
        <text>{{ isCollected ? '★ 已收藏' : '☆ 收藏' }}</text>
      </view>
      <view class="btn-cart" @click="onAddToCart">
        <text>加入购物车</text>
      </view>
      <view class="btn-buy" @click="onBuyNow">
        <text>立即购买</text>
      </view>
    </view>

    <!-- SKU选择面板 -->
    <view v-if="showSkuPanel" class="mask" @click="showSkuPanel = false">
      <view class="panel" @click.stop>
        <view class="panel-header">
          <image :src="images[0]" class="panel-thumb" mode="aspectFill" />
          <view class="panel-header-info">
            <text class="panel-price">¥{{ selectedSku ? selectedSku.price : product.price }}</text>
            <text class="panel-stock">库存: {{ selectedSku ? selectedSku.stock : (product.stock || 0) }}</text>
            <text class="panel-selected" v-if="selectedSku">已选: {{ selectedSku.specText }}</text>
          </view>
          <text class="panel-close-btn" @click="showSkuPanel = false">✕</text>
        </view>
        <text class="panel-label">选择规格</text>
        <view class="panel-list">
          <view
            v-for="sku in product.skus || []"
            :key="sku.id"
            class="panel-item"
            :class="{ selected: selectedSku?.id === sku.id }"
            @click="selectSku(sku)"
          >
            {{ sku.specText || Object.values(sku.specs || {}).join('/') }}
          </view>
        </view>
        <view class="panel-confirm" @click="showSkuPanel = false">确定</view>
      </view>
    </view>

    <!-- 评价全列表弹窗 -->
    <view v-if="showReviewPanel" class="mask" @click="showReviewPanel = false">
      <view class="panel review-full-panel" @click.stop>
        <view class="review-panel-header">
          <text class="panel-title">全部评价（{{ reviewTotal }}）</text>
          <text class="panel-close" @click="showReviewPanel = false">✕</text>
        </view>
        <scroll-view scroll-y class="review-scroll">
          <view v-if="allReviews.length === 0" class="no-review">
            <text>暂无评价</text>
          </view>
          <view v-for="item in allReviews" :key="item.id" class="review-item">
            <view class="review-header">
              <view class="review-user-avatar"><text>👤</text></view>
              <view class="review-user-info">
                <text class="review-user">{{ item.userId ? '用户' : '匿名' }}</text>
                <text class="review-rating">{{ '★'.repeat(item.rating) }}{{ '☆'.repeat(5 - item.rating) }}</text>
              </view>
              <text class="review-time">{{ formatTime(item.createdAt) }}</text>
            </view>
            <text class="review-content">{{ item.content }}</text>
            <view v-if="item.images && item.images.length" class="review-images">
              <image v-for="(img, i) in item.images" :key="i" :src="img" mode="aspectFill" class="review-img" @click="previewImg(item.images, i)" />
            </view>
          </view>
        </scroll-view>

        <!-- 提交评价 -->
        <view class="submit-review-area" v-if="token">
          <text class="submit-title">发表评价</text>
          <view class="star-select">
            <text v-for="s in 5" :key="s" class="star" :class="{ active: s <= newRating }" @click="newRating = s">{{ s <= newRating ? '★' : '☆' }}</text>
          </view>
          <textarea v-model="newReviewContent" class="review-textarea" placeholder="分享您的使用体验..." :maxlength="500" />
          <view class="submit-row">
            <text class="char-count">{{ newReviewContent.length }}/500</text>
            <view class="btn-submit" @click="submitReview">提交评价</view>
          </view>
        </view>
      </view>
    </view>
  </view>
  <view v-else class="loading-page">
    <text class="loading-text">加载中...</text>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { shopApi, interactApi } from "../../api";

const product = ref<any>(null);
const selectedSku = ref<any>(null);
const showSkuPanel = ref(false);
const isCollected = ref(false);
const availableCoupons = ref<any[]>([]);
const relatedProducts = ref<any[]>([]);

const reviews = ref<any[]>([]);
const allReviews = ref<any[]>([]);
const reviewTotal = ref(0);
const showReviewPanel = ref(false);
const newRating = ref(5);
const newReviewContent = ref('');

const token = computed(() => uni.getStorageSync("token") || "");

const images = computed(() => {
  if (!product.value) return [];
  const imgs = product.value.images || [];
  return imgs.length ? imgs : [product.value.cover].filter(Boolean);
});

onMounted(async () => {
  const pages = getCurrentPages();
  const id = (pages[pages.length - 1] as any).options?.id;
  if (id) {
    product.value = await shopApi.productDetail(id);
    await fetchReviews(id);
    await checkCollected(id);
    fetchCoupons();
    fetchRelated();
  }
});

function selectSku(sku: any) {
  selectedSku.value = sku;
}

async function checkCollected(productId: string) {
  if (!token.value) return;
  try {
    const data = await interactApi.myCollects();
    if (data && Array.isArray(data)) {
      isCollected.value = data.some((c: any) => c.targetType === "PRODUCT" && c.targetId === productId);
    }
  } catch { /* skip */ }
}

async function onCollect() {
  if (!token.value) {
    uni.showToast({ title: "请先登录", icon: "none" });
    return;
  }
  try {
    await interactApi.toggleCollect("PRODUCT", product.value.id);
    isCollected.value = !isCollected.value;
    uni.showToast({
      title: isCollected.value ? "已收藏" : "已取消收藏",
      icon: "success",
    });
  } catch {
    uni.showToast({ title: "操作失败", icon: "none" });
  }
}

async function onAddToCart() {
  if (!token.value) {
    uni.showToast({ title: "请先登录", icon: "none" });
    return;
  }
  if (product.value.skus?.length && !selectedSku.value) {
    showSkuPanel.value = true;
    uni.showToast({ title: "请选择规格", icon: "none" });
    return;
  }
  try {
    await shopApi.addToCart({
      productId: product.value.id,
      skuId: selectedSku.value?.id,
      quantity: 1,
    });
    uni.showToast({ title: "已加入购物车", icon: "success" });
    uni.showTabBarRedDot({ index: 3 }); // "我的"tab红点提示
  } catch (e: any) {
    uni.showToast({ title: e.message || "加入购物车失败", icon: "none" });
  }
}

async function onBuyNow() {
  if (!token.value) {
    uni.showToast({ title: "请先登录", icon: "none" });
    return;
  }
  if (product.value.skus?.length && !selectedSku.value) {
    showSkuPanel.value = true;
    uni.showToast({ title: "请选择规格", icon: "none" });
    return;
  }
  // 先加入购物车再跳转结算
  try {
    await shopApi.addToCart({
      productId: product.value.id,
      skuId: selectedSku.value?.id,
      quantity: 1,
    });
    uni.navigateTo({ url: "/pages/shop/checkout" });
  } catch (e: any) {
    uni.showToast({ title: e.message || "操作失败", icon: "none" });
  }
}

async function fetchReviews(productId: string) {
  try {
    const data = await shopApi.listReviews(productId, { page: 1, pageSize: 10 });
    if (data) {
      reviews.value = data.reviews || [];
      reviewTotal.value = data.total || 0;
    }
  } catch { /* skip */ }
}

async function loadAllReviews() {
  try {
    const data = await shopApi.listReviews(product.value.id, { page: 1, pageSize: 100 });
    if (data) {
      allReviews.value = data.reviews || [];
    }
  } catch { /* skip */ }
}

watch(showReviewPanel, (val) => {
  if (val && allReviews.value.length === 0) {
    loadAllReviews();
  }
});

async function submitReview() {
  if (!newReviewContent.value.trim()) {
    uni.showToast({ title: "请输入评价内容", icon: "none" });
    return;
  }
  try {
    await shopApi.createReview(product.value.id, {
      rating: newRating.value,
      content: newReviewContent.value.trim(),
    });
    uni.showToast({ title: "评价成功", icon: "success" });
    newReviewContent.value = '';
    newRating.value = 5;
    fetchReviews(product.value.id);
    if (showReviewPanel.value) loadAllReviews();
  } catch {
    uni.showToast({ title: "提交失败", icon: "none" });
  }
}

function previewImg(imgs: string[], index: number) {
  uni.previewImage({ urls: imgs, current: index });
}

function formatTime(d: string) {
  if (!d) return "";
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

async function fetchCoupons() {
  try {
    const data = await shopApi.listCoupons();
    const list = data?.coupons || data?.data || [];
    availableCoupons.value = list.filter((c: any) => !c.claimed);
  } catch { /* */ }
}

async function fetchRelated() {
  try {
    const data = await shopApi.products({ page: 1, limit: 6 });
    const list = data?.products || data?.data || [];
    relatedProducts.value = list.filter((p: any) => p.id !== product.value?.id).slice(0, 5);
  } catch { /* */ }
}

function goCoupons() {
  uni.navigateTo({ url: "/pages/shop/coupons" });
}

function onShare() {
  if (!product.value) return;
  uni.setClipboardData({
    data: `【热卜国学】${product.value.title} — ¥${product.value.price}，快来看看！`,
    success: () => uni.showToast({ title: "链接已复制", icon: "success" }),
  });
}

function goProduct(id: string) {
  uni.navigateTo({ url: `/pages/shop/product-detail?id=${id}` });
}

function goBack() {
  uni.navigateBack();
}
</script>

<style>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 70px;
}

/* ===== 返回按钮 ===== */
.nav-back {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 100;
  width: 34px;
  height: 34px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: calc(env(safe-area-inset-top));
}
.nav-back-icon {
  font-size: 26px;
  color: #fff;
  line-height: 1;
}

/* ===== 轮播 ===== */
.swiper {
  width: 100%;
  height: 360px;
}
.swiper-img {
  width: 100%;
  height: 100%;
}

/* ===== 商品信息 ===== */
.info-section {
  background: #fff;
  padding: 16px;
  margin-bottom: 8px;
  border-radius: 0;
}
.price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.price-group {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.price {
  font-size: 26px;
  font-weight: bold;
  color: #C41E3A;
}
.origin {
  font-size: 14px;
  color: #bbb;
  text-decoration: line-through;
}
.share-btn {
  font-size: 12px;
  color: #C9A96E;
  padding: 6px 14px;
  border: 1px solid #E8E0D5;
  border-radius: 16px;
}
.title {
  font-size: 16px;
  color: #2C2C2C;
  font-weight: 600;
  display: block;
  margin: 10px 0 6px;
  line-height: 1.5;
}
.sales-row {
  display: flex;
  gap: 16px;
}
.sales, .stock {
  font-size: 12px;
  color: #bbb;
}

/* ===== 优惠券提示 ===== */
.coupon-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  background: linear-gradient(135deg, #fef5f0, #fdf0e8);
  border: 1px solid #f0d5c0;
  border-radius: 10px;
  padding: 10px 14px;
}
.coupon-tip-icon {
  font-size: 18px;
}
.coupon-tip-text {
  font-size: 13px;
  color: #C41E3A;
  flex: 1;
  font-weight: 500;
}
.coupon-tip-arrow {
  font-size: 18px;
  color: #C9A96E;
}

/* ===== 规格 ===== */
.spec-section {
  background: #fff;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}
.label {
  font-size: 14px;
  color: #888;
  width: 50px;
}
.spec-val {
  flex: 1;
  font-size: 14px;
  color: #2C2C2C;
}
.arrow {
  font-size: 18px;
  color: #ccc;
}

/* ===== 商品详情 ===== */
.desc-section {
  background: #fff;
  padding: 16px;
  margin-bottom: 8px;
}
.section-title {
  font-size: 15px;
  font-weight: bold;
  color: #2C2C2C;
  padding: 4px 0 8px 8px;
  border-left: 3px solid #C41E3A;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.section-badge {
  font-size: 11px;
  color: #C9A96E;
  font-weight: normal;
  background: #F5F0E8;
  padding: 1px 8px;
  border-radius: 8px;
}
.desc-html {
  font-size: 14px;
  color: #555;
  line-height: 1.8;
}

/* ===== 推荐商品 ===== */
.related-section {
  background: #fff;
  padding: 16px;
  margin-bottom: 8px;
}
.related-scroll {
  white-space: nowrap;
}
.related-card {
  display: inline-block;
  width: 130px;
  background: #F5F0E8;
  border-radius: 10px;
  overflow: hidden;
  margin-right: 10px;
  vertical-align: top;
}
.related-img {
  width: 100%;
  height: 130px;
}
.related-body {
  padding: 8px 10px 10px;
}
.related-name {
  font-size: 12px;
  color: #2C2C2C;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.related-price {
  font-size: 15px;
  font-weight: bold;
  color: #C41E3A;
  display: block;
  margin-top: 4px;
}

/* ===== 评价 ===== */
.review-section {
  background: #fff;
  padding: 16px;
  margin-bottom: 8px;
}
.no-review {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 0;
  color: #bbb;
  font-size: 13px;
}
.no-review-icon {
  font-size: 32px;
}
.review-item {
  padding: 12px 0;
  border-bottom: 1px solid #F5F0E8;
}
.review-item:last-child {
  border-bottom: none;
}
.review-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.review-user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #F5F0E8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}
.review-user-info {
  flex: 1;
}
.review-user {
  font-size: 13px;
  color: #2C2C2C;
  font-weight: 500;
  display: block;
}
.review-rating {
  font-size: 11px;
  color: #C9A96E;
}
.review-time {
  font-size: 11px;
  color: #ccc;
  flex-shrink: 0;
}
.review-content {
  font-size: 14px;
  color: #555;
  line-height: 1.6;
}
.review-images {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.review-img {
  width: 75px;
  height: 75px;
  border-radius: 6px;
}
.review-more {
  text-align: center;
  padding: 12px 0 4px;
  color: #C41E3A;
  font-size: 13px;
}

/* ===== 底部操作栏 ===== */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: #fff;
  border-top: 1px solid #E8E0D5;
  padding: 8px 12px;
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
  gap: 8px;
  z-index: 50;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
}
.btn-collect {
  width: 80px;
  text-align: center;
  padding: 10px 0;
  border: 1px solid #E8E0D5;
  border-radius: 22px;
  color: #999;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.btn-collect.collected {
  border-color: #C9A96E;
  color: #C9A96E;
  background: #F5F0E8;
}
.btn-cart {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  border: 1px solid #C41E3A;
  border-radius: 22px;
  color: #C41E3A;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-buy {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  border-radius: 22px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(196, 30, 58, 0.3);
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
.panel {
  background: #fff;
  border-radius: 16px 16px 0 0;
  width: 100%;
  padding: 20px 16px 24px;
  max-height: 70vh;
  overflow-y: auto;
}
.panel-header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 16px;
}
.panel-thumb {
  width: 90px;
  height: 90px;
  border-radius: 10px;
  flex-shrink: 0;
}
.panel-header-info {
  flex: 1;
}
.panel-price {
  font-size: 22px;
  font-weight: bold;
  color: #C41E3A;
  display: block;
}
.panel-stock {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
  display: block;
}
.panel-selected {
  font-size: 12px;
  color: #C41E3A;
  margin-top: 4px;
  display: block;
}
.panel-close-btn {
  font-size: 18px;
  color: #bbb;
  padding: 4px;
  flex-shrink: 0;
}
.panel-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
  display: block;
}
.panel-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}
.panel-item {
  padding: 8px 18px;
  border: 1px solid #E8E0D5;
  border-radius: 20px;
  font-size: 13px;
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
  padding: 14px;
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  color: #fff;
  border-radius: 24px;
  font-size: 16px;
  font-weight: bold;
  box-shadow: 0 4px 12px rgba(196, 30, 58, 0.25);
}

/* ===== 评价面板 ===== */
.review-full-panel {
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}
.review-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.panel-title {
  font-size: 16px;
  font-weight: bold;
  color: #2C2C2C;
}
.panel-close {
  font-size: 18px;
  color: #bbb;
  padding: 4px;
}
.review-scroll {
  flex: 1;
  max-height: 40vh;
  overflow-y: auto;
}

/* ===== 提交评价 ===== */
.submit-review-area {
  border-top: 1px solid #E8E0D5;
  padding-top: 14px;
  margin-top: 10px;
}
.submit-title {
  font-size: 14px;
  font-weight: bold;
  color: #2C2C2C;
  display: block;
  margin-bottom: 8px;
}
.star-select {
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
}
.star {
  font-size: 26px;
  color: #E8E0D5;
}
.star.active {
  color: #C9A96E;
}
.review-textarea {
  width: 100%;
  min-height: 80px;
  border: 1px solid #E8E0D5;
  border-radius: 8px;
  padding: 10px;
  font-size: 14px;
  box-sizing: border-box;
  background: #F5F0E8;
}
.submit-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}
.char-count {
  font-size: 12px;
  color: #bbb;
}
.btn-submit {
  padding: 8px 24px;
  background: #C41E3A;
  color: #fff;
  border-radius: 18px;
  font-size: 14px;
}

/* ===== 加载页 ===== */
.loading-page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #F5F0E8;
}
.loading-text {
  font-size: 15px;
  color: #bbb;
}
</style>
