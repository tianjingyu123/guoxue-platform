<template>
  <view class="page">
    <view class="header">
      <view class="back-btn" @click="goBack"><text class="back-arrow">←</text></view>
      <text class="header-title">商家后台</text>
      <view class="header-spacer" />
    </view>

    <view v-if="loading" class="loading-wrap"><text class="loading-text">加载中...</text></view>

    <template v-else>
      <!-- 数据概览 -->
      <view class="overview-cards">
        <view class="overview-card" @click="goPage('orders')">
          <text class="ov-num">{{ dashboard.todayOrders || 0 }}</text>
          <text class="ov-label">今日订单</text>
        </view>
        <view class="overview-card" @click="goPage('orders')">
          <text class="ov-num">¥{{ dashboard.todayRevenue || 0 }}</text>
          <text class="ov-label">今日收入</text>
        </view>
        <view class="overview-card">
          <text class="ov-num">{{ dashboard.totalProducts || 0 }}</text>
          <text class="ov-label">商品数</text>
        </view>
        <view class="overview-card" @click="goPage('settlements')">
          <text class="ov-num">¥{{ dashboard.pendingSettlement || 0 }}</text>
          <text class="ov-label">待结算</text>
        </view>
      </view>

      <!-- 快捷入口 -->
      <view class="quick-actions">
        <view class="qa-title">快捷操作</view>
        <view class="qa-grid">
          <view v-for="act in quickActions" :key="act.label" class="qa-item" @click="goPage(act.page)">
            <view class="qa-icon-box" :style="{ background: act.bg }">
              <text class="qa-icon">{{ act.icon }}</text>
            </view>
            <text class="qa-label">{{ act.label }}</text>
          </view>
        </view>
      </view>

      <!-- 店铺信息 -->
      <view class="shop-card" v-if="profile">
        <view class="shop-header">
          <text class="shop-name">{{ profile.shopName }}</text>
          <view class="shop-status" :class="profile.status === 'ACTIVE' ? 'active' : 'suspended'">
            <text>{{ profile.status === 'ACTIVE' ? '营业中' : '已停业' }}</text>
          </view>
        </view>
        <text class="shop-intro" v-if="profile.shopIntro">{{ profile.shopIntro }}</text>
        <view class="shop-meta">
          <text>创建时间：{{ profile.createdAt }}</text>
          <text>保证金：¥{{ profile.depositAmount || 0 }}（{{ profile.depositStatus === 'PAID' ? '已缴' : '待缴' }}）</text>
        </view>
      </view>

      <!-- 最新订单 -->
      <view class="section" v-if="recentOrders.length">
        <view class="section-head">
          <text class="section-title">最新订单</text>
          <text class="section-more" @click="goPage('orders')">全部 ›</text>
        </view>
        <view v-for="o in recentOrders" :key="o.id" class="order-item">
          <view class="order-top">
            <text class="order-no">{{ o.orderNo || o.id }}</text>
            <text class="order-status" :class="orderStatusClass(o.status)">{{ orderStatusLabel(o.status) }}</text>
          </view>
          <view class="order-mid">
            <text class="order-product">{{ o.productTitle || '商品' }}</text>
            <text class="order-price">¥{{ o.amount }}</text>
          </view>
          <text class="order-time">{{ o.createdAt }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { merchantApi } from '@/api'

const loading = ref(true)
const dashboard = ref<any>({})
const profile = ref<any>(null)
const recentOrders = ref<any[]>([])

const quickActions = [
  { label: '商品管理', icon: '📦', bg: 'rgba(196,30,58,.1)', page: 'products' },
  { label: '订单管理', icon: '📋', bg: 'rgba(74,144,217,.1)', page: 'orders' },
  { label: '评价管理', icon: '⭐', bg: 'rgba(250,140,22,.1)', page: 'reviews' },
  { label: '店铺信息', icon: '🏪', bg: 'rgba(82,196,26,.1)', page: 'profile' },
  { label: '违规记录', icon: '⚠️', bg: 'rgba(231,76,60,.1)', page: 'violations' },
  { label: '结算记录', icon: '💰', bg: 'rgba(201,169,110,.1)', page: 'settlements' },
]

onMounted(async () => {
  try {
    const [dashRes, profileRes, ordersRes] = await Promise.allSettled([
      merchantApi.dashboard(),
      merchantApi.getProfile(),
      merchantApi.listOrders({ page: 1, pageSize: 5 }),
    ])
    if (dashRes.status === 'fulfilled') dashboard.value = dashRes.value?.data || dashRes.value || {}
    if (profileRes.status === 'fulfilled') profile.value = profileRes.value?.data || profileRes.value
    if (ordersRes.status === 'fulfilled') {
      const o = ordersRes.value
      recentOrders.value = Array.isArray(o) ? o : o?.list || o?.records || []
    }
  } catch { /* use defaults */ }
  finally { loading.value = false }
})

function orderStatusClass(s: string) {
  const m: Record<string, string> = { PENDING: 'pending', PAID: 'paid', SHIPPED: 'shipped', COMPLETED: 'completed', REFUNDING: 'refund' }
  return m[s] || ''
}
function orderStatusLabel(s: string) {
  const m: Record<string, string> = { PENDING: '待支付', PAID: '待发货', SHIPPED: '已发货', COMPLETED: '已完成', REFUNDING: '退款中' }
  return m[s] || s
}

function goPage(page: string) {
  uni.navigateTo({ url: `/pages/merchant/${page}` })
}
function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { min-height: 100vh; background: #F5F0E8; padding-bottom: 60rpx; }

.header { display: flex; align-items: center; padding: 24rpx 32rpx; background: #fff; border-bottom: 1rpx solid #E8E0D5; }
.back-btn { padding: 8rpx 16rpx 8rpx 0; }
.back-arrow { font-size: 40rpx; color: #3C2415; }
.header-title { flex: 1; font-size: 32rpx; font-weight: 600; color: #3C2415; text-align: center; }
.header-spacer { width: 60rpx; }

.loading-wrap { display: flex; align-items: center; justify-content: center; height: 400rpx; }
.loading-text { font-size: 28rpx; color: #999; }

/* 概览 */
.overview-cards { display: flex; padding: 24rpx; gap: 12rpx; }
.overview-card { flex: 1; background: #fff; border-radius: 16rpx; padding: 24rpx 16rpx; text-align: center; }
.ov-num { font-size: 36rpx; font-weight: bold; color: #3C2415; display: block; }
.ov-label { font-size: 22rpx; color: #999; display: block; margin-top: 4rpx; }

/* 快捷操作 */
.quick-actions { margin: 0 24rpx 24rpx; background: #fff; border-radius: 16rpx; padding: 24rpx; }
.qa-title { font-size: 28rpx; font-weight: 600; color: #3C2415; margin-bottom: 16rpx; }
.qa-grid { display: flex; flex-wrap: wrap; }
.qa-item { width: 25%; display: flex; flex-direction: column; align-items: center; padding: 16rpx 0; }
.qa-icon-box { width: 80rpx; height: 80rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; margin-bottom: 8rpx; }
.qa-icon { font-size: 36rpx; }
.qa-label { font-size: 22rpx; color: #666; }

/* 店铺 */
.shop-card { margin: 0 24rpx 24rpx; background: #fff; border-radius: 16rpx; padding: 24rpx; }
.shop-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8rpx; }
.shop-name { font-size: 32rpx; font-weight: bold; color: #3C2415; }
.shop-status { padding: 6rpx 16rpx; border-radius: 8rpx; }
.shop-status.active { background: #E8F5E9; }
.shop-status.active text { color: #2E7D32; font-size: 22rpx; }
.shop-status.suspended { background: #FFEBEE; }
.shop-status.suspended text { color: #C62828; font-size: 22rpx; }
.shop-intro { font-size: 24rpx; color: #999; display: block; margin-bottom: 12rpx; }
.shop-meta { display: flex; flex-direction: column; gap: 4rpx; }
.shop-meta text { font-size: 22rpx; color: #ccc; }

/* 订单 */
.section { margin: 0 24rpx 24rpx; background: #fff; border-radius: 16rpx; padding: 24rpx; }
.section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.section-title { font-size: 28rpx; font-weight: 600; color: #3C2415; }
.section-more { font-size: 24rpx; color: #8b6914; }
.order-item { padding: 20rpx 0; border-bottom: 1rpx solid #f0ebe0; }
.order-item:last-child { border-bottom: none; }
.order-top { display: flex; justify-content: space-between; margin-bottom: 8rpx; }
.order-no { font-size: 24rpx; color: #999; }
.order-status { font-size: 22rpx; padding: 2rpx 12rpx; border-radius: 6rpx; }
.order-status.pending { background: #FFF8E1; color: #F57F17; }
.order-status.paid { background: #E3F2FD; color: #1565C0; }
.order-status.shipped { background: #E8F5E9; color: #2E7D32; }
.order-status.completed { background: #F5F0E8; color: #666; }
.order-status.refund { background: #FFEBEE; color: #C62828; }
.order-mid { display: flex; justify-content: space-between; }
.order-product { font-size: 26rpx; color: #3C2415; }
.order-price { font-size: 26rpx; font-weight: 600; color: #C41E3A; }
.order-time { font-size: 20rpx; color: #ccc; display: block; margin-top: 4rpx; }
</style>
