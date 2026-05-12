<template>
  <view class="page">
    <!-- 顶部横幅 -->
    <swiper class="banner-swiper" autoplay circular interval="3000" v-if="banners.length">
      <swiper-item v-for="(b, i) in banners" :key="i">
        <image :src="b.image" class="banner-img" mode="aspectFill" @click="goDetail(b.productId)" />
        <view class="banner-tag">{{ b.tag }}</view>
      </swiper-item>
    </swiper>

    <!-- 快捷入口 -->
    <view class="quick-row">
      <view class="quick-item" @click="goCoupons">
        <text class="quick-icon">🎫</text>
        <text class="quick-label">领券中心</text>
      </view>
      <view class="quick-item" @click="goOrders">
        <text class="quick-icon">📦</text>
        <text class="quick-label">我的订单</text>
      </view>
      <view class="quick-item" @click="goVip">
        <text class="quick-icon">👑</text>
        <text class="quick-label">会员中心</text>
      </view>
      <view class="quick-item" @click="goEarnings">
        <text class="quick-icon">💰</text>
        <text class="quick-label">推广收益</text>
      </view>
    </view>

    <!-- 搜索栏 -->
    <view class="search-bar">
      <input class="search-input" v-model="keyword" placeholder="搜索国学好物..." @confirm="onSearch" />
      <text class="search-btn" @click="onSearch">搜索</text>
    </view>

    <!-- 分类标签 -->
    <scroll-view scroll-x class="tags-row">
      <text
        v-for="t in tags"
        :key="t.value"
        class="tag"
        :class="{ active: activeTag === t.value }"
        @click="switchTag(t.value)"
      >{{ t.label }}</text>
    </scroll-view>

    <!-- 商品网格 -->
    <view class="product-grid" v-if="products.length">
      <view v-for="p in products" :key="p.id" class="product-card" @click="goDetail(p.id)">
        <view class="p-cover-wrap">
          <image :src="p.cover || p.images?.[0]" class="p-cover" mode="aspectFill" />
          <view v-if="p.tag" class="p-tag">{{ p.tag }}</view>
        </view>
        <view class="p-info">
          <text class="p-title">{{ p.title }}</text>
          <view class="p-tags-row" v-if="p.labels?.length">
            <text v-for="lb in p.labels" :key="lb" class="p-label">{{ lb }}</text>
          </view>
          <view class="p-price-row">
            <text class="p-price">¥{{ p.price }}</text>
            <text v-if="p.originalPrice && p.originalPrice > p.price" class="p-original">¥{{ p.originalPrice }}</text>
          </view>
          <view class="p-meta">
            <text class="p-sales">{{ p.soldCount || 0 }}人已购</text>
            <text class="p-rating" v-if="p.rating">★ {{ p.rating }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="!loading && products.length === 0" class="empty">
      <text class="empty-icon">📭</text>
      <text>暂无商品</text>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>
    <view v-if="loadingMore" class="loading">
      <text>加载更多...</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { shopApi } from "../../api";

const products = ref<any[]>([]);
const keyword = ref("");
const activeTag = ref("all");
const loading = ref(false);
const loadingMore = ref(false);
const page = ref(1);
const totalPages = ref(1);

const tags = [
  { label: "全部", value: "all" },
  { label: "开运好物", value: "kaiyun" },
  { label: "文房雅器", value: "wenfang" },
  { label: "茶道香道", value: "chaxiang" },
  { label: "国学书籍", value: "books" },
  { label: "服装饰品", value: "clothing" },
];

const banners = [
  { image: "/static/banner-shop-1.png", tag: "限时特惠", productId: "" },
  { image: "/static/banner-shop-2.png", tag: "新品上市", productId: "" },
];

onMounted(() => fetchProducts());

async function fetchProducts(append = false) {
  if (!append) loading.value = true;
  else loadingMore.value = true;
  try {
    const data = await shopApi.products({
      keyword: keyword.value,
      tag: activeTag.value !== "all" ? activeTag.value : undefined,
      page: page.value,
      limit: 12,
    });
    const list = data.products || data.data || [];
    totalPages.value = data.totalPages || 1;
    if (append) {
      products.value = [...products.value, ...list];
    } else {
      products.value = list;
    }
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
}

function switchTag(v: string) {
  activeTag.value = v;
  page.value = 1;
  fetchProducts();
}

function onSearch() {
  page.value = 1;
  fetchProducts();
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/shop/product-detail?id=${id}` });
}

function goCoupons() {
  uni.navigateTo({ url: "/pages/shop/coupons" });
}

function goOrders() {
  uni.navigateTo({ url: "/pages/orders/orders" });
}

function goVip() {
  uni.navigateTo({ url: "/pages/vip/vip" });
}

function goEarnings() {
  uni.navigateTo({ url: "/pages/station/earnings" });
}
</script>

<style scoped>
.page {
  padding: 0;
  background: #F5F0E8;
  min-height: 100vh;
}

/* 横幅 */
.banner-swiper {
  width: 100%;
  height: 160px;
}
.banner-img {
  width: 100%;
  height: 100%;
}
.banner-tag {
  position: absolute;
  bottom: 10px;
  left: 12px;
  background: rgba(0,0,0,0.5);
  color: #fff;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 10px;
}

/* 快捷入口 */
.quick-row {
  display: flex;
  justify-content: space-around;
  padding: 14px 8px;
  background: #fff;
  margin: 0 0 8px;
}
.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.quick-icon {
  font-size: 28px;
}
.quick-label {
  font-size: 12px;
  color: #666;
}

/* 搜索栏 */
.search-bar {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  background: #fff;
  margin-bottom: 8px;
}
.search-input {
  flex: 1;
  background: #F5F0E8;
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 14px;
  border: 1px solid #E8E0D5;
}
.search-btn {
  background: #C41E3A;
  color: #fff;
  padding: 8px 18px;
  border-radius: 20px;
  font-size: 14px;
  line-height: 22px;
}

/* 分类标签 */
.tags-row {
  white-space: nowrap;
  padding: 8px 12px;
  background: #fff;
  margin-bottom: 8px;
  display: flex;
  gap: 8px;
}
.tag {
  display: inline-block;
  padding: 5px 14px;
  border-radius: 14px;
  background: #F5F0E8;
  font-size: 13px;
  color: #666;
}
.tag.active {
  background: #C41E3A;
  color: #fff;
}

/* 商品网格 */
.product-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 8px;
}
.product-card {
  width: calc(50% - 4px);
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.p-cover-wrap {
  position: relative;
}
.p-cover {
  width: 100%;
  height: 180px;
}
.p-tag {
  position: absolute;
  top: 6px;
  left: 6px;
  background: #C41E3A;
  color: #fff;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
}
.p-info {
  padding: 10px;
}
.p-title {
  font-size: 14px;
  color: #333;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  line-height: 1.4;
}
.p-tags-row {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}
.p-label {
  font-size: 10px;
  color: #C9A96E;
  border: 1px solid #C9A96E;
  border-radius: 3px;
  padding: 0 4px;
}
.p-price-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 6px;
}
.p-price {
  font-size: 18px;
  font-weight: bold;
  color: #C41E3A;
}
.p-original {
  font-size: 12px;
  color: #999;
  text-decoration: line-through;
}
.p-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
}
.p-sales {
  font-size: 11px;
  color: #999;
}
.p-rating {
  font-size: 11px;
  color: #e6a23c;
}

.empty {
  text-align: center;
  padding: 60px 0;
  color: #999;
}
.empty-icon {
  font-size: 40px;
  display: block;
  margin-bottom: 8px;
}
.loading {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 13px;
}
</style>
