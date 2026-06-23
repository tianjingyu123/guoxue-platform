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

    <scroll-view scroll-y class="scroll" :style="{ paddingTop: navHeight + 'px' }">
      <!-- 店铺头部 -->
      <view class="shop-header">
        <view class="shop-top">
          <view class="shop-logo">
            <app-icon name="store" :size="32" color="#ffffff" />
          </view>
          <view class="shop-info">
            <view class="shop-name-row">
              <text class="shop-name">{{ shop.name }}</text>
              <text class="shop-level">{{ shop.level }}</text>
            </view>
            <text class="shop-slogan">{{ shop.slogan }}</text>
            <view class="shop-meta">
              <view class="shop-rating">
                <app-icon name="star" :size="14" color="#fbbf24" />
                <text class="shop-rating-text">{{ shop.rating }}</text>
              </view>
              <text class="shop-sep">|</text>
              <text class="shop-meta-text">{{ shop.followerCount }}关注</text>
              <text class="shop-sep">|</text>
              <text class="shop-meta-text">{{ shop.productCount }}商品</text>
            </view>
          </view>
        </view>
        <view class="shop-badges">
          <text v-for="b in shop.badges" :key="b" class="shop-badge">{{ b }}</text>
        </view>
      </view>

      <!-- 店铺数据 -->
      <view class="card data-card">
        <view class="data-grid">
          <view class="data-item"><text class="data-num">{{ shop.productCount }}</text><text class="data-label">全部商品</text></view>
          <view class="data-item"><text class="data-num">{{ shop.salesCount }}</text><text class="data-label">总销量</text></view>
          <view class="data-item"><text class="data-num">{{ shop.reviewCount }}</text><text class="data-label">评价数</text></view>
          <view class="data-item"><text class="data-num">{{ shop.followerCount }}</text><text class="data-label">粉丝数</text></view>
        </view>
        <view class="data-actions">
          <view class="action-btn" @tap="onFollow">
            <app-icon name="heart" :size="16" color="#4b5563" />
            <text class="action-text">关注店铺</text>
          </view>
          <view class="action-btn" @tap="onContact">
            <app-icon name="message-square" :size="16" color="#4b5563" />
            <text class="action-text">联系客服</text>
          </view>
        </view>
      </view>

      <!-- 店铺信息 -->
      <view class="card">
        <text class="card-title">店铺信息</text>
        <view class="info-row"><app-icon name="phone" :size="14" color="#9ca3af" /><text class="info-text">{{ shop.phone }}</text></view>
        <view class="info-row"><app-icon name="map-pin" :size="14" color="#9ca3af" /><text class="info-text">{{ shop.address }}</text></view>
        <view class="info-row"><app-icon name="clock" :size="14" color="#9ca3af" /><text class="info-text">营业时间: {{ shop.businessHours }}</text></view>
      </view>

      <!-- 商品列表 -->
      <view class="prod-tabs">
        <view
          v-for="t in prodTabs"
          :key="t.key"
          class="prod-tab"
          :class="{ 'prod-tab-active': prodTab === t.key }"
          @tap="prodTab = t.key"
        >
          <text class="prod-tab-text" :class="{ 'prod-tab-text-active': prodTab === t.key }">{{ t.label }}</text>
        </view>
      </view>
      <view class="prod-grid">
        <view v-for="p in products" :key="p.id" class="prod-card">
          <view class="prod-image">
            <app-icon name="package" :size="40" color="#9ca3af" />
          </view>
          <view class="prod-body">
            <text class="prod-title">{{ p.title }}</text>
            <view class="prod-price-row">
              <text class="prod-price">¥{{ p.price }}</text>
              <text v-if="p.originalPrice" class="prod-original">¥{{ p.originalPrice }}</text>
            </view>
            <text class="prod-sales">已售 {{ p.sales }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部购物车 -->
    <view class="footer" :style="{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }">
      <view class="cart-btn" @tap="onCart">
        <app-icon name="shopping-cart" :size="20" color="#1a1a1a" />
        <text class="cart-badge">2</text>
      </view>
      <view class="checkout-btn" @tap="onCart">
        <text class="checkout-text">去购物车结算</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { merchantShopProfile, shopPreviewProducts } from '@/lib/merchant-data'

const statusBarHeight = ref(0)
const navHeight = ref(44)

const sys = uni.getSystemInfoSync()
statusBarHeight.value = sys.statusBarHeight || 0
navHeight.value = (sys.statusBarHeight || 0) + 44

const shop = merchantShopProfile
const products = shopPreviewProducts
const prodTab = ref('all')
const prodTabs = [
  { key: 'all', label: '全部' },
  { key: 'hot', label: '热销' },
  { key: 'new', label: '新品' },
  { key: 'price', label: '价格' },
]

function onShare() {
  uni.showToast({ title: '分享功能开发中', icon: 'none' })
}
function onFollow() {
  uni.showToast({ title: '这是预览模式', icon: 'none' })
}
function onContact() {
  uni.showToast({ title: '这是预览模式', icon: 'none' })
}
function onCart() {
  uni.showToast({ title: '这是预览模式', icon: 'none' })
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(8px); border-bottom: 1px solid #ededed; }
.nav-bar { display: flex; align-items: center; height: 44px; padding: 0 16px; }
.nav-back { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.nav-title { flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #1a1a1a; }
.scroll { height: 100vh; box-sizing: border-box; padding-bottom: 90px; }

.shop-header { background: linear-gradient(135deg, #c41e3a, #a01830); padding: 16px 16px 24px; }
.shop-top { display: flex; align-items: flex-start; gap: 16px; }
.shop-logo { width: 64px; height: 64px; border-radius: 12px; background: rgba(255, 255, 255, 0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.shop-info { flex: 1; min-width: 0; }
.shop-name-row { display: flex; align-items: center; gap: 8px; }
.shop-name { font-size: 18px; font-weight: 700; color: #ffffff; }
.shop-level { font-size: 10px; color: #ffffff; background: rgba(245, 158, 11, 0.9); padding: 2px 6px; border-radius: 4px; }
.shop-slogan { display: block; font-size: 14px; color: rgba(255, 255, 255, 0.8); margin-top: 4px; }
.shop-meta { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.shop-rating { display: flex; align-items: center; gap: 4px; }
.shop-rating-text { font-size: 14px; font-weight: 500; color: #ffffff; }
.shop-sep { color: rgba(255, 255, 255, 0.5); font-size: 12px; }
.shop-meta-text { font-size: 14px; color: #ffffff; }
.shop-badges { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.shop-badge { font-size: 10px; color: #ffffff; background: rgba(255, 255, 255, 0.2); padding: 4px 8px; border-radius: 4px; }

.card { background: #ffffff; border-radius: 12px; margin: 12px 16px 0; padding: 16px; }
.data-card { margin-top: -12px; position: relative; z-index: 10; }
.data-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.data-item { display: flex; flex-direction: column; align-items: center; }
.data-num { font-size: 18px; font-weight: 700; color: #1a1a1a; }
.data-label { font-size: 12px; color: #9ca3af; margin-top: 2px; }
.data-actions { display: flex; gap: 12px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #ededed; }
.action-btn { flex: 1; height: 38px; border: 1px solid #e5e7eb; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 4px; }
.action-text { font-size: 14px; color: #4b5563; }

.card-title { display: block; font-size: 15px; font-weight: 500; color: #1a1a1a; margin-bottom: 12px; }
.info-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.info-row:last-child { margin-bottom: 0; }
.info-text { font-size: 14px; color: #6b7280; }

.prod-tabs { display: flex; gap: 8px; padding: 16px 16px 8px; }
.prod-tab { flex: 1; height: 34px; border-radius: 8px; background: #ffffff; display: flex; align-items: center; justify-content: center; }
.prod-tab-active { background: #c41e3a; }
.prod-tab-text { font-size: 12px; color: #4b5563; }
.prod-tab-text-active { color: #ffffff; }
.prod-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 0 16px; }
.prod-card { background: #ffffff; border-radius: 12px; overflow: hidden; }
.prod-image { aspect-ratio: 1; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
.prod-body { padding: 12px; }
.prod-title { display: block; font-size: 14px; font-weight: 500; color: #1a1a1a; line-height: 1.4; min-height: 39px; }
.prod-price-row { display: flex; align-items: baseline; gap: 4px; margin-top: 8px; }
.prod-price { font-size: 16px; font-weight: 700; color: #c41e3a; }
.prod-original { font-size: 12px; color: #9ca3af; text-decoration: line-through; }
.prod-sales { display: block; font-size: 12px; color: #9ca3af; margin-top: 4px; }

.footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 12px 16px; background: #ffffff; border-top: 1px solid #ededed; display: flex; align-items: center; gap: 12px; }
.cart-btn { position: relative; width: 46px; height: 46px; border: 1px solid #e5e7eb; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.cart-badge { position: absolute; top: -4px; right: -4px; width: 16px; height: 16px; border-radius: 50%; background: #c41e3a; font-size: 10px; color: #ffffff; display: flex; align-items: center; justify-content: center; }
.checkout-btn { flex: 1; height: 46px; border-radius: 10px; background: #c41e3a; display: flex; align-items: center; justify-content: center; }
.checkout-text { font-size: 15px; font-weight: 500; color: #ffffff; }
</style>
