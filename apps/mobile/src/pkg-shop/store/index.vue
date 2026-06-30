<script setup lang="ts">
/** C 端店铺主页 — 商家公开信息 + 在售商品（GET /shop/store/:merchantId）。失败走 error 三态，不回退假数据 */
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, navigateBack } from '@/utils/router'
import { shopApi, type StoreData } from '@/lib/shop-data'

const merchantId = ref('')
const store = ref<StoreData | null>(null)
const loading = ref(false)
const error = ref('')

async function loadStore() {
  if (!merchantId.value) {
    error.value = '店铺不存在'
    return
  }
  loading.value = true
  error.value = ''
  try {
    store.value = await shopApi.getStore(merchantId.value)
  } catch (_e) {
    error.value = '店铺加载失败，请重试'
  } finally {
    loading.value = false
  }
}

onLoad((opt: any) => {
  merchantId.value = opt?.id || ''
  loadStore()
})

function goProduct(id: string) {
  navigateTo('/mall/product/' + id)
}
</script>

<template>
  <view class="page">
    <customer-service-fab />
    <!-- 顶部返回栏 -->
    <view class="topbar">
      <view class="topbar-back" hover-class="press" @tap="navigateBack()">
        <AppIcon name="chevron-left" :size="40" color="var(--text-strong)" />
      </view>
      <text class="topbar-title">店铺主页</text>
      <view class="topbar-back" />
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="state-wrap">
      <view class="state-spinner" />
      <text class="state-text">加载中...</text>
    </view>

    <!-- 加载失败 -->
    <view v-else-if="error" class="state-wrap">
      <view class="state-icon"><AppIcon name="alert-circle" :size="56" color="var(--brand)" /></view>
      <text class="state-text">{{ error }}</text>
      <view class="state-retry" hover-class="press" @tap="loadStore"><text class="state-retry-text">点击重试</text></view>
    </view>

    <!-- 内容 -->
    <template v-else-if="store">
      <!-- 店铺头 -->
      <view class="store-head">
        <view class="store-head-top">
          <image lazy-load v-if="store.merchant.shopLogo" class="store-logo" :src="store.merchant.shopLogo" mode="aspectFill" />
          <view v-else class="store-logo store-logo-ph"><AppIcon name="store" :size="56" color="#fff" /></view>
          <view class="store-head-info">
            <text class="store-name">{{ store.merchant.shopName }}</text>
            <text v-if="store.merchant.shopIntro" class="store-intro">{{ store.merchant.shopIntro }}</text>
          </view>
        </view>
        <view class="store-stats">
          <view class="stat-item">
            <text class="stat-num">{{ store.merchant.rating }}</text>
            <text class="stat-label">评分</text>
          </view>
          <view class="stat-divider" />
          <view class="stat-item">
            <text class="stat-num">{{ store.merchant.productCount }}</text>
            <text class="stat-label">在售</text>
          </view>
          <view class="stat-divider" />
          <view class="stat-item">
            <text class="stat-num">{{ store.merchant.totalSales }}</text>
            <text class="stat-label">已售</text>
          </view>
        </view>
      </view>

      <!-- 商品区 -->
      <view class="section">
        <view class="section-head">
          <text class="section-title">全部商品</text>
          <text class="section-count">共 {{ store.total }} 件</text>
        </view>

        <!-- 空商品 -->
        <view v-if="!store.products.length" class="empty">
          <view class="empty-icon"><AppIcon name="shopping-bag" :size="56" color="var(--text-soft)" /></view>
          <text class="empty-text">该店铺暂无在售商品</text>
        </view>

        <!-- 商品网格 -->
        <view v-else class="goods-grid">
          <view
            v-for="p in store.products"
            :key="p.id"
            class="goods-card"
            hover-class="press"
            @tap="goProduct(p.id)"
          >
            <image lazy-load v-if="p.cover" class="goods-img" :src="p.cover" mode="aspectFill" />
            <view v-else class="goods-img goods-img-ph"><AppIcon name="shopping-bag" :size="48" color="var(--text-soft)" /></view>
            <text class="goods-name">{{ p.title }}</text>
            <view class="goods-foot">
              <text class="goods-price">¥{{ p.price }}</text>
              <text class="goods-sales">{{ p.sales }}人付款</text>
            </view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg, #f5f5f5); padding-bottom: 40rpx; }
.press { opacity: 0.85; }

/* 顶部返回栏 */
.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(12rpx + env(safe-area-inset-top)) 24rpx 12rpx;
  height: 88rpx;
  box-sizing: content-box;
  background: var(--surface, #fff);
  border-bottom: 1rpx solid var(--border, #eee);
}
.topbar-back { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; }
.topbar-title { font-size: 32rpx; font-weight: 600; color: var(--text-strong); }

/* 店铺头 */
.store-head {
  margin: 24rpx 28rpx 0;
  padding: 32rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, var(--brand) 0%, #a8182f 100%);
}
.store-head-top { display: flex; align-items: center; gap: 24rpx; }
.store-logo { width: 120rpx; height: 120rpx; border-radius: 50%; flex-shrink: 0; border: 2rpx solid rgba(255,255,255,0.6); background: rgba(255,255,255,0.15); }
.store-logo-ph { display: flex; align-items: center; justify-content: center; }
.store-head-info { flex: 1; min-width: 0; }
.store-name { display: block; font-size: 38rpx; font-weight: 700; color: #fff; line-height: 1.3; }
.store-intro {
  display: block; font-size: 24rpx; color: rgba(255,255,255,0.85); margin-top: 10rpx; line-height: 1.5;
  overflow: hidden; text-overflow: ellipsis;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.store-stats { display: flex; align-items: center; margin-top: 28rpx; }
.stat-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.stat-num { font-size: 34rpx; font-weight: 700; color: #fff; }
.stat-label { font-size: 22rpx; color: rgba(255,255,255,0.8); }
.stat-divider { width: 1rpx; height: 48rpx; background: rgba(255,255,255,0.3); }

/* 商品区 */
.section { margin: 24rpx 28rpx 0; }
.section-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 20rpx; }
.section-title { font-size: 32rpx; font-weight: 600; color: var(--text-strong); }
.section-count { font-size: 24rpx; color: var(--text-soft); }
.goods-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx; }
.goods-card { background: var(--surface, #fff); border-radius: 16rpx; padding: 16rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.05); }
.goods-img { width: 100%; height: 300rpx; border-radius: 12rpx; background: var(--surface-sunken, #f5f2ef); }
.goods-img-ph { display: flex; align-items: center; justify-content: center; }
.goods-name {
  display: block; font-size: 26rpx; font-weight: 500; color: var(--text-strong); line-height: 1.4; margin: 14rpx 0 12rpx;
  overflow: hidden; text-overflow: ellipsis;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  min-height: 72rpx;
}
.goods-foot { display: flex; align-items: baseline; justify-content: space-between; }
.goods-price { font-size: 32rpx; font-weight: 700; color: var(--brand); }
.goods-sales { font-size: 22rpx; color: var(--text-soft); }

/* 空态 */
.empty { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-icon { width: 140rpx; height: 140rpx; border-radius: 50%; background: var(--surface-sunken, #f5f2ef); display: flex; align-items: center; justify-content: center; margin-bottom: 24rpx; }
.empty-text { font-size: 28rpx; color: var(--text-soft); }

/* 三态：加载/错误 */
.state-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 200rpx 0; min-height: 50vh; }
.state-spinner { width: 64rpx; height: 64rpx; border: 4rpx solid var(--border); border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.state-icon { width: 120rpx; height: 120rpx; border-radius: 50%; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; margin-bottom: 24rpx; }
.state-text { font-size: 26rpx; color: var(--text-soft); margin-top: 20rpx; }
.state-retry { margin-top: 32rpx; padding: 16rpx 48rpx; border-radius: 999rpx; background: var(--brand); }
.state-retry-text { font-size: 26rpx; color: #fff; font-weight: 500; }
</style>
