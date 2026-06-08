<template>
  <view class="page">
    <view class="header">
      <view class="back-btn" @click="goBack"><text class="back-arrow">←</text></view>
      <text class="header-title">订单管理</text>
      <view class="header-spacer" />
    </view>

    <!-- Tab切换栏 -->
    <scroll-view class="tabs-wrap" scroll-x :show-scrollbar="false">
      <view class="tabs">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="tab"
          :class="{ active: currentTab === tab.key }"
          @click="switchTab(tab.key)"
        >
          <text>{{ tab.label }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 加载态 -->
    <view v-if="loading && orders.length === 0" class="loading-wrap">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 空态 -->
    <view v-else-if="orders.length === 0" class="empty-wrap">
      <text class="empty-icon">📋</text>
      <text class="empty-text">暂无订单</text>
    </view>

    <!-- 订单列表 -->
    <template v-else>
      <view
        v-for="o in orders"
        :key="o.id"
        class="order-card"
        @click="goDetail(o.id)"
      >
        <view class="order-top">
          <text class="order-no">{{ o.orderNo || o.id }}</text>
          <text class="order-status" :class="orderStatusClass(o.status)">{{ orderStatusLabel(o.status) }}</text>
        </view>
        <view class="order-body">
          <text class="order-product">{{ o.productTitle || o.productName || '商品' }}</text>
          <text class="order-price">¥{{ o.amount || o.totalAmount || 0 }}</text>
        </view>
        <text class="order-time">{{ o.createdAt }}</text>
      </view>

      <view v-if="loadingMore" class="load-more-wrap"><text>加载更多...</text></view>
      <view v-else-if="!hasMore" class="load-more-wrap"><text>— 没有更多了 —</text></view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onReachBottom, onPullDownRefresh } from '@dcloudio/uni-app'
import { merchantApi } from '@/api'

const tabs = [
  { key: '', label: '全部' },
  { key: 'PENDING', label: '待支付' },
  { key: 'PAID', label: '待发货' },
  { key: 'SHIPPED', label: '已发货' },
  { key: 'COMPLETED', label: '已完成' },
  { key: 'REFUNDING', label: '退款中' },
]
const currentTab = ref('')
const orders = ref<any[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const hasMore = ref(true)
const page = ref(1)
const pageSize = 10

async function loadData() {
  loading.value = true
  try {
    page.value = 1
    const res = await merchantApi.listOrders({
      page: page.value,
      pageSize,
      status: currentTab.value || undefined,
    })
    orders.value = Array.isArray(res) ? res : res?.list || res?.records || []
    hasMore.value = orders.value.length >= pageSize
  } catch {
    /* handled by api interceptor */
  } finally {
    loading.value = false
  }
}

async function loadMoreData() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  try {
    page.value++
    const res = await merchantApi.listOrders({
      page: page.value,
      pageSize,
      status: currentTab.value || undefined,
    })
    const list = Array.isArray(res) ? res : res?.list || res?.records || []
    orders.value.push(...list)
    hasMore.value = list.length >= pageSize
  } catch {
    page.value--
  } finally {
    loadingMore.value = false
  }
}

function switchTab(key: string) {
  if (currentTab.value === key) return
  currentTab.value = key
  loadData()
}

function orderStatusClass(s: string) {
  const m: Record<string, string> = {
    PENDING: 'pending',
    PAID: 'paid',
    SHIPPED: 'shipped',
    COMPLETED: 'completed',
    REFUNDING: 'refund',
  }
  return m[s] || ''
}

function orderStatusLabel(s: string) {
  const m: Record<string, string> = {
    PENDING: '待支付',
    PAID: '待发货',
    SHIPPED: '已发货',
    COMPLETED: '已完成',
    REFUNDING: '退款中',
  }
  return m[s] || s
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/merchant/order-detail?id=${id}` })
}

function goBack() {
  uni.navigateBack()
}

onLoad(() => loadData())
onReachBottom(() => loadMoreData())
onPullDownRefresh(async () => {
  await loadData()
  uni.stopPullDownRefresh()
})
</script>

<style scoped>
.page { min-height: 100vh; background: #F5F0E8; padding-bottom: 60rpx; }

/* Header */
.header { display: flex; align-items: center; padding: 24rpx 32rpx; background: #fff; border-bottom: 1rpx solid #E8E0D5; }
.back-btn { padding: 8rpx 16rpx 8rpx 0; }
.back-arrow { font-size: 40rpx; color: #3C2415; }
.header-title { flex: 1; font-size: 32rpx; font-weight: 600; color: #3C2415; text-align: center; }
.header-spacer { width: 60rpx; }

/* Tabs */
.tabs-wrap { background: #fff; border-bottom: 1rpx solid #E8E0D5; }
.tabs { display: flex; padding: 0 24rpx; white-space: nowrap; }
.tab { display: inline-block; padding: 20rpx 24rpx; font-size: 26rpx; color: #666; position: relative; }
.tab.active { color: #5a3a1a; font-weight: 600; }
.tab.active::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 40rpx; height: 4rpx; background: #8b6914; border-radius: 2rpx; }

/* Loading & Empty */
.loading-wrap { display: flex; align-items: center; justify-content: center; height: 400rpx; }
.loading-text { font-size: 28rpx; color: #999; }
.empty-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 500rpx; }
.empty-icon { font-size: 80rpx; margin-bottom: 16rpx; }
.empty-text { font-size: 28rpx; color: #ccc; }

/* Order Card */
.order-card { margin: 16rpx 24rpx; background: #fff; border-radius: 16rpx; padding: 24rpx; }
.order-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.order-no { font-size: 24rpx; color: #999; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 16rpx; }
.order-status { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 6rpx; flex-shrink: 0; }
.order-status.pending { background: #FFF8E1; color: #F57F17; }
.order-status.paid { background: #E3F2FD; color: #1565C0; }
.order-status.shipped { background: #E8F5E9; color: #2E7D32; }
.order-status.completed { background: #F5F0E8; color: #666; }
.order-status.refund { background: #FFEBEE; color: #C62828; }
.order-body { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.order-product { font-size: 28rpx; color: #3C2415; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 16rpx; }
.order-price { font-size: 28rpx; font-weight: 600; color: #C41E3A; white-space: nowrap; }
.order-time { font-size: 22rpx; color: #ccc; display: block; }

.load-more-wrap { text-align: center; padding: 24rpx; font-size: 24rpx; color: #ccc; }
</style>
