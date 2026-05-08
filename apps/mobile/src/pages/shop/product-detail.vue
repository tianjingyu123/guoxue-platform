<template>
  <view class="page" v-if="product">
    <!-- 商品轮播图 -->
    <swiper class="swiper" indicator-dots autoplay :interval="3000">
      <swiper-item v-for="(img, i) in images" :key="i">
        <image :src="img" class="swiper-img" mode="aspectFill" />
      </swiper-item>
    </swiper>

    <!-- 商品信息 -->
    <view class="info-section">
      <view class="price-row">
        <text class="price">¥{{ selectedSku ? selectedSku.price : product.price }}</text>
        <text v-if="product.originalPrice && product.originalPrice > product.price" class="origin">¥{{ product.originalPrice }}</text>
        <view class="share-btn" @click="onShare">
          <text>↗ 分享</text>
        </view>
      </view>
      <text class="title">{{ product.title }}</text>
      <text class="sales">已售 {{ product.soldCount || product.salesCount || 0 }} | 库存 {{ selectedSku ? selectedSku.stock : (product.stock || 0) }}</text>
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
      <text class="section-title">商品详情</text>
      <rich-text :nodes="product.detail || '暂无详情'" class="desc-html" />
    </view>

    <!-- 推荐商品 -->
    <view class="related-section" v-if="relatedProducts.length">
      <text class="section-title">猜你喜欢</text>
      <scroll-view scroll-x class="related-scroll">
        <view v-for="rp in relatedProducts" :key="rp.id" class="related-card" @click="goProduct(rp.id)">
          <image :src="rp.cover || rp.images?.[0]" class="related-img" mode="aspectFill" />
          <text class="related-name">{{ rp.title }}</text>
          <text class="related-price">¥{{ rp.price }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- 商品评价 -->
    <view class="review-section">
      <text class="section-title">商品评价（{{ reviewTotal }}）</text>
      <view v-if="reviews.length === 0" class="no-review">暂无评价</view>
      <view v-for="item in reviews" :key="item.id" class="review-item">
        <view class="review-header">
          <text class="review-user">{{ item.userId ? '用户' : '匿名' }}</text>
          <text class="review-rating">{{ '★'.repeat(item.rating) }}{{ '☆'.repeat(5 - item.rating) }}</text>
          <text class="review-time">{{ formatTime(item.createdAt) }}</text>
        </view>
        <text class="review-content">{{ item.content }}</text>
        <view v-if="item.images && item.images.length" class="review-images">
          <image v-for="(img, i) in item.images" :key="i" :src="img" mode="aspectFill" class="review-img" @click="previewImg(item.images, i)" />
        </view>
      </view>
      <view class="review-more" @click="showReviewPanel = true" v-if="reviews.length > 0">
        <text>查看全部评价</text>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <view class="btn-collect" :class="{ collected: isCollected }" @click="onCollect">
        {{ isCollected ? '已收藏' : '收藏' }}
      </view>
      <view class="btn-buy" @click="onBuy">立即购买</view>
    </view>

    <!-- SKU选择面板 -->
    <view v-if="showSkuPanel" class="mask" @click="showSkuPanel = false">
      <view class="panel" @click.stop>
        <view class="panel-header">
          <image :src="images[0]" class="panel-thumb" mode="aspectFill" />
          <view class="panel-price">¥{{ selectedSku ? selectedSku.price : product.price }}</view>
        </view>
        <text class="panel-label">选择规格</text>
        <view class="panel-list">
          <view v-for="sku in product.skus || []" :key="sku.id" class="panel-item" :class="{ selected: selectedSku?.id === sku.id }" @click="selectSku(sku)">
            {{ sku.specText || Object.values(sku.specs || {}).join('/') }}
          </view>
        </view>
        <view class="panel-confirm" @click="showSkuPanel = false">确定</view>
      </view>
    </view>

    <!-- 评价全列表弹窗 -->
    <view v-if="showReviewPanel" class="mask" @click="showReviewPanel = false">
      <view class="panel review-full-panel" @click.stop>
        <view class="panel-header">
          <text class="panel-title">全部评价（{{ reviewTotal }}）</text>
          <text class="panel-close" @click="showReviewPanel = false">关闭</text>
        </view>
        <scroll-view scroll-y class="review-scroll">
          <view v-if="allReviews.length === 0" class="no-review">暂无评价</view>
          <view v-for="item in allReviews" :key="item.id" class="review-item">
            <view class="review-header">
              <text class="review-user">{{ item.userId ? '用户' : '匿名' }}</text>
              <text class="review-rating">{{ '★'.repeat(item.rating) }}{{ '☆'.repeat(5 - item.rating) }}</text>
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
          <text class="section-title">发表评价</text>
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
  <view v-else class="loading-page">加载中...</view>
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

// 评价
const reviews = ref<any[]>([]);
const allReviews = ref<any[]>([]);
const reviewTotal = ref(0);
const showReviewPanel = ref(false);
const newRating = ref(5);
const newReviewContent = ref('');

// 登录 token
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

/** 检查是否已收藏 */
async function checkCollected(productId: string) {
  if (!token.value) return;
  try {
    const data = await interactApi.myCollects();
    if (data && Array.isArray(data)) {
      isCollected.value = data.some((c: any) => c.targetType === "PRODUCT" && c.targetId === productId);
    }
  } catch { /* 忽略 */ }
}

/** 收藏/取消收藏 */
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

/** 立即购买 */
async function onBuy() {
  if (!token.value) {
    uni.showToast({ title: "请先登录", icon: "none" });
    return;
  }
  try {
    // 构造正确的下单参数，与后端 CreateOrderDto 匹配
    const orderData: any = {
      type: "PRODUCT",
      targetId: product.value.id,
      amount: selectedSku.value ? Number(selectedSku.value.price) : Number(product.value.price),
    };
    if (selectedSku.value?.id) {
      orderData.skuId = selectedSku.value.id;
    }
    const result = await shopApi.createOrder(orderData);
    const orderId = result?.id || result?.orderId;
    if (orderId) {
      uni.showToast({ title: "下单成功", icon: "success" });
      // 跳转到支付
      uni.navigateTo({ url: `/pages/orders/order-detail?id=${orderId}` });
    } else {
      uni.showToast({ title: "下单成功", icon: "success" });
    }
  } catch (e: any) {
    uni.showToast({ title: e.message || "下单失败，请重试", icon: "none" });
  }
}

/** 获取评价列表 */
async function fetchReviews(productId: string) {
  try {
    const data = await shopApi.listReviews(productId, { page: 1, pageSize: 10 });
    if (data) {
      reviews.value = data.reviews || [];
      reviewTotal.value = data.total || 0;
    }
  } catch { /* 忽略 */ }
}

/** 查看全部评价（带分页） */
async function loadAllReviews() {
  try {
    const data = await shopApi.listReviews(product.value.id, { page: 1, pageSize: 100 });
    if (data) {
      allReviews.value = data.reviews || [];
    }
  } catch { /* 忽略 */ }
}

/** 监听评价面板打开，加载全部评价 */
watch(showReviewPanel, (val) => {
  if (val && allReviews.value.length === 0) {
    loadAllReviews();
  }
});

/** 提交评价 */
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
    // 刷新评价
    fetchReviews(product.value.id);
    if (showReviewPanel.value) loadAllReviews();
  } catch {
    uni.showToast({ title: "提交失败", icon: "none" });
  }
}

/** 图片预览 */
function previewImg(imgs: string[], index: number) {
  uni.previewImage({ urls: imgs, current: index });
}

/** 格式化时间 */
function formatTime(d: string) {
  if (!d) return "";
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** 获取可用优惠券 */
async function fetchCoupons() {
  try {
    const data = await shopApi.listCoupons();
    const list = data?.coupons || data?.data || [];
    availableCoupons.value = list.filter((c: any) => !c.claimed);
  } catch { /* */ }
}

/** 获取推荐商品 */
async function fetchRelated() {
  try {
    const data = await shopApi.products({ page: 1, limit: 6 });
    const list = data?.products || data?.data || [];
    relatedProducts.value = list.filter((p: any) => p.id !== product.value?.id).slice(0, 5);
  } catch { /* */ }
}

/** 领券中心 */
function goCoupons() {
  uni.navigateTo({ url: "/pages/shop/coupons" });
}

/** 分享 */
function onShare() {
  uni.showToast({ title: "已复制分享链接", icon: "success" });
}

/** 跳转商品详情 */
function goProduct(id: string) {
  uni.navigateTo({ url: `/pages/shop/product-detail?id=${id}` });
}

</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 60px; }
.swiper { width: 100%; height: 360px; }
.swiper-img { width: 100%; height: 100%; }
.info-section { background: #fff; padding: 14px; margin-bottom: 8px; }
.price-row { display: flex; align-items: baseline; gap: 8px; }
.price { font-size: 24px; font-weight: bold; color: #d03050; }
.origin { font-size: 14px; color: #999; text-decoration: line-through; }
.share-btn { margin-left: auto; font-size: 13px; color: #C41E3A; padding: 4px 12px; border: 1px solid #C41E3A; border-radius: 14px; }
.title { font-size: 16px; color: #333; font-weight: bold; display: block; margin: 6px 0; }
.sales { font-size: 12px; color: #999; }
.coupon-tip { display: flex; align-items: center; gap: 6px; margin-top: 10px; background: #fef5f0; border: 1px solid #f5d5c0; border-radius: 8px; padding: 8px 12px; }
.coupon-tip-icon { font-size: 16px; }
.coupon-tip-text { font-size: 13px; color: #d03050; flex: 1; }
.coupon-tip-arrow { font-size: 18px; color: #d03050; }
.spec-section { background: #fff; padding: 14px; display: flex; align-items: center; margin-bottom: 8px; }
.label { font-size: 14px; color: #666; width: 60px; }
.spec-val { flex: 1; font-size: 14px; color: #333; }
.arrow { font-size: 20px; color: #ccc; }
.desc-section { background: #fff; padding: 14px; margin-bottom: 8px; }
.section-title { font-size: 16px; font-weight: bold; color: #333; display: block; margin-bottom: 10px; }
.desc-html { font-size: 14px; color: #555; line-height: 1.7; }

/* 推荐商品 */
.related-section { background: #fff; padding: 14px; margin-bottom: 8px; }
.related-scroll { white-space: nowrap; display: flex; gap: 10px; }
.related-card { display: inline-block; width: 120px; background: #fafaf6; border-radius: 8px; overflow: hidden; }
.related-img { width: 120px; height: 120px; }
.related-name { font-size: 12px; color: #333; padding: 6px 8px; display: block; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; white-space: normal; }
.related-price { font-size: 14px; font-weight: bold; color: #d03050; padding: 0 8px 8px; display: block; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; display: flex; background: #fff; border-top: 1px solid #eee; padding: 8px 14px; gap: 10px; z-index: 50; }
.btn-collect { flex: 1; text-align: center; padding: 10px; border: 1px solid #C41E3A; border-radius: 20px; color: #C41E3A; font-size: 15px; }
.btn-collect.collected { background: #F5F0E8; border-color: #C41E3A; color: #C41E3A; }
.btn-buy { flex: 2; text-align: center; padding: 10px; background: #C41E3A; border-radius: 20px; color: #fff; font-size: 15px; }

/* 评价区域 */
.review-section { background: #fff; padding: 14px; margin-bottom: 8px; }
.no-review { text-align: center; color: #999; padding: 20px 0; font-size: 14px; }
.review-item { padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
.review-item:last-child { border-bottom: none; }
.review-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.review-user { font-size: 13px; color: #333; font-weight: bold; }
.review-rating { font-size: 13px; color: #f5a623; }
.review-time { font-size: 11px; color: #999; margin-left: auto; }
.review-content { font-size: 14px; color: #555; line-height: 1.5; }
.review-images { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
.review-img { width: 70px; height: 70px; border-radius: 4px; }
.review-more { text-align: center; padding: 10px 0; color: #C41E3A; font-size: 14px; }

/* 评价面板 */
.review-full-panel { max-height: 80vh; display: flex; flex-direction: column; }
.review-scroll { max-height: 50vh; overflow-y: auto; }
.submit-review-area { border-top: 1px solid #eee; padding-top: 12px; margin-top: 8px; }
.star-select { display: flex; gap: 4px; margin-bottom: 8px; }
.star { font-size: 24px; color: #ddd; }
.star.active { color: #f5a623; }
.review-textarea { width: 100%; min-height: 80px; border: 1px solid #ddd; border-radius: 8px; padding: 8px; font-size: 14px; box-sizing: border-box; }
.submit-row { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
.char-count { font-size: 12px; color: #999; }
.btn-submit { padding: 8px 24px; background: #C41E3A; color: #fff; border-radius: 18px; font-size: 14px; }

/* 面板通用 */
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100; display: flex; align-items: flex-end; }
.panel { background: #fff; border-radius: 16px 16px 0 0; width: 100%; padding: 16px; }
.panel-header { display: flex; gap: 12px; align-items: center; margin-bottom: 14px; }
.panel-thumb { width: 80px; height: 80px; border-radius: 8px; }
.panel-price { font-size: 20px; font-weight: bold; color: #d03050; }
.panel-title { font-size: 16px; font-weight: bold; color: #333; }
.panel-close { font-size: 14px; color: #C41E3A; margin-left: auto; }
.panel-label { font-size: 14px; color: #666; margin-bottom: 8px; display: block; }
.panel-list { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.panel-item { padding: 6px 14px; border: 1px solid #ddd; border-radius: 16px; font-size: 13px; color: #333; }
.panel-item.selected { border-color: #C41E3A; color: #C41E3A; background: #F5F0E8; }
.panel-confirm { text-align: center; padding: 12px; background: #C41E3A; color: #fff; border-radius: 22px; font-size: 16px; }
.loading-page { text-align: center; padding: 100px 0; color: #999; }
</style>
