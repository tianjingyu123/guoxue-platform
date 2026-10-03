<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <app-icon name="arrow-left" :size="20" color="#1a1a1a" />
        </view>
        <text class="nav-title">店铺预览</text>
        <view class="nav-back" @tap="onShare">
          <app-icon name="share-2" :size="20" color="#1a1a1a" />
        </view>
      </view>
    </view>

    <!-- Loading -->
    <view v-if="loading" class="state" :style="{ paddingTop: navHeight + 'px' }">
      <text class="state-txt">加载中…</text>
    </view>
    <!-- Error -->
    <view v-else-if="error" class="state" :style="{ paddingTop: navHeight + 'px' }">
      <app-icon name="alert-circle" :size="44" color="#dc2626" />
      <text class="state-txt">{{ error }}</text>
      <view class="state-btn" @tap="load"><text class="state-btn-txt">重试</text></view>
    </view>

    <scroll-view v-else-if="profile" scroll-y class="scroll" :style="{ paddingTop: navHeight + 'px' }">
      <!-- 店铺头部 -->
      <view class="shop-header">
        <view class="shop-top">
          <view class="shop-logo">
            <image lazy-load v-if="profile.shopLogo" :src="profile.shopLogo" class="shop-logo-img" mode="aspectFill" />
            <app-icon v-else name="store" :size="32" color="#ffffff" />
          </view>
          <view class="shop-info">
            <text class="shop-name">{{ profile.shopName }}</text>
            <text v-if="profile.shopIntro" class="shop-slogan">{{ profile.shopIntro }}</text>
            <view class="shop-meta">
              <view class="shop-rating">
                <app-icon name="star" :size="14" color="#fbbf24" />
                <text class="shop-rating-text">{{ Number(profile.rating ?? 0).toFixed(1) }}</text>
              </view>
              <text class="shop-sep">|</text>
              <text class="shop-meta-text">{{ products.length }}件在售</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 店铺数据 -->
      <view class="card data-card">
        <view class="data-grid">
          <view class="data-item"><text class="data-num">{{ products.length }}</text><text class="data-label">在售商品</text></view>
          <view class="data-item"><text class="data-num">{{ profile.totalOrders ?? 0 }}</text><text class="data-label">累计订单</text></view>
          <view class="data-item"><text class="data-num">¥{{ money(profile.totalSales) }}</text><text class="data-label">累计销售</text></view>
          <view class="data-item"><text class="data-num">{{ Number(profile.rating ?? 0).toFixed(1) }}</text><text class="data-label">店铺评分</text></view>
        </view>
      </view>

      <!-- 店铺信息 -->
      <view class="card">
        <text class="card-title">店铺信息</text>
        <view v-if="profile.contactName" class="info-row">
          <app-icon name="user" :size="14" color="#9ca3af" /><text class="info-text">{{ profile.contactName }}</text>
        </view>
        <view v-if="profile.contactPhone" class="info-row">
          <app-icon name="phone" :size="14" color="#9ca3af" /><text class="info-text">{{ profile.contactPhone }}</text>
        </view>
      </view>

      <!-- 在售商品 -->
      <view class="prod-section-title">
        <text class="card-title">在售商品</text>
      </view>
      <view v-if="products.length" class="prod-grid">
        <view v-for="p in products" :key="p.id" class="prod-card">
          <view class="prod-image">
            <image lazy-load v-if="p.images && p.images.length" :src="p.images[0]" class="prod-image-img" mode="aspectFill" />
            <app-icon v-else name="package" :size="40" color="#9ca3af" />
          </view>
          <view class="prod-body">
            <text class="prod-title">{{ p.title }}</text>
            <view class="prod-price-row">
              <text class="prod-price">¥{{ Number(p.price).toFixed(2) }}</text>
            </view>
            <text class="prod-sales">已售 {{ p.salesCount }}</text>
          </view>
        </view>
      </view>
      <view v-else class="prod-empty">
        <app-icon name="package" :size="40" color="#ccc" />
        <text class="prod-empty-txt">暂无在售商品</text>
      </view>
      <view style="height: 24px" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { merchantBackendApi, type MerchantProfile, type MerchantProduct } from '@/pkg-merchant/lib/merchant-data'

const statusBarHeight = ref(0)
const navHeight = ref(44)

const sys = uni.getSystemInfoSync()
statusBarHeight.value = sys.statusBarHeight || 0
navHeight.value = (sys.statusBarHeight || 0) + 44

const loading = ref(true)
const error = ref('')
const profile = ref<MerchantProfile | null>(null)
const products = ref<MerchantProduct[]>([])

function money(v?: string | number | null): string {
  return Number(v ?? 0).toFixed(2)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [p, list] = await Promise.all([
      merchantBackendApi.getProfile(),
      merchantBackendApi.getProducts({ status: 'ON_SALE' }),
    ])
    profile.value = p
    products.value = list.items
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

function onShare() {
  uni.showToast({ title: '当前为店铺预览模式', icon: 'none' })
}

load()
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(8px); border-bottom: 1px solid #ededed; }
.nav-bar { display: flex; align-items: center; height: 44px; padding: 0 16px; }
.nav-back { width: 44px; height: 44px; margin: 0 -6px; display: flex; align-items: center; justify-content: center; } /* 触控热区≥44px：容器扩大+负margin保持视觉位置 */
.nav-title { flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #1a1a1a; }
.scroll { height: 100vh; box-sizing: border-box; }

.shop-header { background: linear-gradient(135deg, var(--brand), #a01830); padding: 16px 16px 24px; }
.shop-top { display: flex; align-items: flex-start; gap: 16px; }
.shop-logo { width: 64px; height: 64px; border-radius: 12px; background: rgba(255, 255, 255, 0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
.shop-logo-img { width: 64px; height: 64px; border-radius: 12px; }
.shop-info { flex: 1; min-width: 0; }
.shop-name { font-size: 18px; font-weight: 700; color: #ffffff; }
.shop-slogan { display: block; font-size: 14px; color: rgba(255, 255, 255, 0.8); margin-top: 4px; }
.shop-meta { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.shop-rating { display: flex; align-items: center; gap: 4px; }
.shop-rating-text { font-size: 14px; font-weight: 500; color: #ffffff; }
.shop-sep { color: rgba(255, 255, 255, 0.5); font-size: 12px; }
.shop-meta-text { font-size: 14px; color: #ffffff; }

.card { background: #ffffff; border-radius: 12px; margin: 12px 16px 0; padding: 16px; }
.data-card { margin-top: -12px; position: relative; z-index: 10; }
.data-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.data-item { display: flex; flex-direction: column; align-items: center; }
.data-num { font-size: 18px; font-weight: 700; color: #1a1a1a; }
.data-label { font-size: 12px; color: #9ca3af; margin-top: 2px; }

.card-title { display: block; font-size: 15px; font-weight: 500; color: #1a1a1a; margin-bottom: 12px; }
.info-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.info-row:last-child { margin-bottom: 0; }
.info-text { font-size: 14px; color: #6b7280; }

.prod-section-title { padding: 16px 16px 8px; }
.prod-section-title .card-title { margin-bottom: 0; }
.prod-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 0 16px; }
.prod-card { background: #ffffff; border-radius: 12px; overflow: hidden; }
.prod-image { aspect-ratio: 1; background: #f3f4f6; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.prod-image-img { width: 100%; height: 100%; }
.prod-body { padding: 12px; }
.prod-title { display: block; font-size: 14px; font-weight: 500; color: #1a1a1a; line-height: 1.4; min-height: 39px; }
.prod-price-row { display: flex; align-items: baseline; gap: 4px; margin-top: 8px; }
.prod-price { font-size: 16px; font-weight: 700; color: var(--brand); }
.prod-sales { display: block; font-size: 12px; color: #9ca3af; margin-top: 4px; }
.prod-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 48px 0; }
.prod-empty-txt { font-size: 13px; color: #9ca3af; }

.state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 80px 24px; }
.state-txt { font-size: 14px; color: #9ca3af; text-align: center; }
.state-btn { margin-top: 4px; border: 1px solid #d1d5db; padding: 8px 24px; border-radius: 8px; }
.state-btn-txt { font-size: 14px; color: #1a1a1a; }
</style>
