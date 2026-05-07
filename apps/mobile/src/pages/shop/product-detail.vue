<template>
  <view class="page" v-if="product">
    <swiper class="swiper" indicator-dots autoplay :interval="3000">
      <swiper-item v-for="(img, i) in images" :key="i">
        <image :src="img" class="swiper-img" mode="aspectFill" />
      </swiper-item>
    </swiper>

    <view class="info-section">
      <view class="price-row">
        <text class="price">¥{{ selectedSku ? selectedSku.price : product.price }}</text>
        <text v-if="product.originalPrice && product.originalPrice > product.price" class="origin">¥{{ product.originalPrice }}</text>
      </view>
      <text class="title">{{ product.title }}</text>
      <text class="sales">已售 {{ product.soldCount || 0 }} | 库存 {{ selectedSku ? selectedSku.stock : (product.stock || 0) }}</text>
    </view>

    <view class="spec-section" @click="showSkuPanel = true">
      <text class="label">规格</text>
      <text class="spec-val">{{ selectedSku ? selectedSku.specText : '请选择规格' }}</text>
      <text class="arrow">›</text>
    </view>

    <view class="desc-section">
      <text class="section-title">商品详情</text>
      <rich-text :nodes="product.description || '暂无详情'" class="desc-html" />
    </view>

    <view class="bottom-bar">
      <view class="btn-collect" @click="onCollect">收藏</view>
      <view class="btn-buy" @click="onBuy">立即购买</view>
    </view>

    <!-- SKU选择面板 -->
    <view v-if="showSkuPanel" class="sku-mask" @click="showSkuPanel = false">
      <view class="sku-panel" @click.stop>
        <view class="sku-header">
          <image :src="images[0]" class="sku-thumb" mode="aspectFill" />
          <view class="sku-price">¥{{ selectedSku ? selectedSku.price : product.price }}</view>
        </view>
        <text class="sku-label">选择规格</text>
        <view class="sku-list">
          <view v-for="sku in product.skus || []" :key="sku.id" class="sku-item" :class="{ selected: selectedSku?.id === sku.id }" @click="selectSku(sku)">
            {{ sku.specText || Object.values(sku.specs || {}).join('/') }}
          </view>
        </view>
        <view class="sku-confirm" @click="showSkuPanel = false">确定</view>
      </view>
    </view>
  </view>
  <view v-else class="loading-page">加载中...</view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { shopApi } from "../../api";

const product = ref<any>(null);
const selectedSku = ref<any>(null);
const showSkuPanel = ref(false);

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
  }
});

function selectSku(sku: any) {
  selectedSku.value = sku;
}

async function onBuy() {
  try {
    await shopApi.createOrder({
      productId: product.value.id,
      skuId: selectedSku.value?.id,
      quantity: 1,
    });
    uni.showToast({ title: "下单成功", icon: "success" });
  } catch {
    uni.showToast({ title: "下单失败，请重试", icon: "none" });
  }
}

function onCollect() {
  uni.showToast({ title: "已收藏", icon: "success" });
}
</script>

<style>
.page { background: #f5f0e6; min-height: 100vh; padding-bottom: 60px; }
.swiper { width: 100%; height: 360px; }
.swiper-img { width: 100%; height: 100%; }
.info-section { background: #fff; padding: 14px; margin-bottom: 8px; }
.price-row { display: flex; align-items: baseline; gap: 8px; }
.price { font-size: 24px; font-weight: bold; color: #d03050; }
.origin { font-size: 14px; color: #999; text-decoration: line-through; }
.title { font-size: 16px; color: #333; font-weight: bold; display: block; margin: 6px 0; }
.sales { font-size: 12px; color: #999; }
.spec-section { background: #fff; padding: 14px; display: flex; align-items: center; margin-bottom: 8px; }
.label { font-size: 14px; color: #666; width: 60px; }
.spec-val { flex: 1; font-size: 14px; color: #333; }
.arrow { font-size: 20px; color: #ccc; }
.desc-section { background: #fff; padding: 14px; }
.section-title { font-size: 16px; font-weight: bold; color: #333; display: block; margin-bottom: 10px; }
.desc-html { font-size: 14px; color: #555; line-height: 1.7; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; display: flex; background: #fff; border-top: 1px solid #eee; padding: 8px 14px; gap: 10px; }
.btn-collect { flex: 1; text-align: center; padding: 10px; border: 1px solid #8b4513; border-radius: 20px; color: #8b4513; font-size: 15px; }
.btn-buy { flex: 2; text-align: center; padding: 10px; background: #8b4513; border-radius: 20px; color: #fff; font-size: 15px; }
/* SKU面板 */
.sku-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100; display: flex; align-items: flex-end; }
.sku-panel { background: #fff; border-radius: 16px 16px 0 0; width: 100%; padding: 16px; }
.sku-header { display: flex; gap: 12px; align-items: center; margin-bottom: 14px; }
.sku-thumb { width: 80px; height: 80px; border-radius: 8px; }
.sku-price { font-size: 20px; font-weight: bold; color: #d03050; }
.sku-label { font-size: 14px; color: #666; margin-bottom: 8px; display: block; }
.sku-list { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.sku-item { padding: 6px 14px; border: 1px solid #ddd; border-radius: 16px; font-size: 13px; color: #333; }
.sku-item.selected { border-color: #8b4513; color: #8b4513; background: #fdf5ed; }
.sku-confirm { text-align: center; padding: 12px; background: #8b4513; color: #fff; border-radius: 22px; font-size: 16px; }
.loading-page { text-align: center; padding: 100px 0; color: #999; }
</style>
