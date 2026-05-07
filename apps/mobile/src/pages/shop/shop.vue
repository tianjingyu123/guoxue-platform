<template>
  <view class="page">
    <view class="search-bar">
      <input class="search-input" v-model="keyword" placeholder="搜索商品" @confirm="onSearch" />
    </view>
    <scroll-view scroll-x class="tags-row">
      <text v-for="t in tags" :key="t.value" class="tag" :class="{ active: activeTag === t.value }" @click="switchTag(t.value)">{{ t.label }}</text>
    </scroll-view>
    <view class="product-grid" v-if="products.length">
      <view v-for="p in products" :key="p.id" class="product-card" @click="goDetail(p.id)">
        <image :src="p.cover || p.images?.[0]" class="p-cover" mode="aspectFill" />
        <view class="p-info">
          <text class="p-title">{{ p.title }}</text>
          <view class="p-price-row">
            <text class="p-price">¥{{ p.price }}</text>
            <text v-if="p.originalPrice && p.originalPrice > p.price" class="p-original">¥{{ p.originalPrice }}</text>
          </view>
          <text class="p-sales">{{ p.soldCount || 0 }}人已购</text>
        </view>
      </view>
    </view>
    <view v-else class="empty">暂无商品</view>
    <view v-if="loading" class="loading">加载中...</view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { shopApi } from "../../api";

const products = ref<any[]>([]);
const keyword = ref("");
const activeTag = ref("all");
const loading = ref(false);
const page = ref(1);
const tags = [
  { label: "全部", value: "all" },
  { label: "开运好物", value: "kaiyun" },
  { label: "文房雅器", value: "wenfang" },
  { label: "茶道香道", value: "chaxiang" },
  { label: "国学书籍", value: "books" },
];

onMounted(() => fetchProducts());

async function fetchProducts() {
  loading.value = true;
  try {
    const data = await shopApi.products({ keyword: keyword.value, page: page.value, limit: 20 });
    products.value = data.products || data.data || data || [];
  } finally { loading.value = false; }
}

function switchTag(v: string) { activeTag.value = v; page.value = 1; fetchProducts(); }
function onSearch() { page.value = 1; fetchProducts(); }
function goDetail(id: string) { uni.navigateTo({ url: `/pages/shop/product-detail?id=${id}` }); }
</script>

<style>
.page { padding: 12px; background: #f5f0e6; min-height: 100vh; }
.search-bar { margin-bottom: 10px; }
.search-input { background: #fff; border-radius: 20px; padding: 8px 16px; font-size: 14px; border: 1px solid #ddd; }
.tags-row { white-space: nowrap; margin-bottom: 12px; display: flex; gap: 8px; }
.tag { display: inline-block; padding: 4px 12px; border-radius: 14px; background: #fff; font-size: 13px; color: #666; }
.tag.active { background: #8b4513; color: #fff; }
.product-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.product-card { width: calc(50% - 4px); background: #fff; border-radius: 8px; overflow: hidden; }
.p-cover { width: 100%; height: 180px; }
.p-info { padding: 8px; }
.p-title { font-size: 14px; color: #333; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.p-price-row { display: flex; align-items: baseline; gap: 6px; margin-top: 4px; }
.p-price { font-size: 17px; font-weight: bold; color: #d03050; }
.p-original { font-size: 12px; color: #999; text-decoration: line-through; }
.p-sales { font-size: 11px; color: #999; margin-top: 2px; }
.empty { text-align: center; padding: 60px 0; color: #999; }
.loading { text-align: center; padding: 20px; color: #999; font-size: 13px; }
</style>
