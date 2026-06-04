<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-row">
        <view class="header-left">
          <text class="back-btn" @click="goBack">←</text>
          <text class="header-title">驿站订单</text>
        </view>
        <text class="refresh-btn" :class="{ spinning: refreshing }" @click="handleRefresh">🔄</text>
      </view>
      <!-- Tab 栏 -->
      <view class="tabs-bar">
        <view
          v-for="tab in orderTabs"
          :key="tab.key"
          class="tab"
          :class="{ active: activeTab === tab.key }"
          @click="switchTab(tab.key)"
        >
          <text>{{ tab.icon }}</text>
          <text>{{ tab.label }}</text>
        </view>
      </view>
    </view>

    <!-- 订单列表 -->
    <DataState
      :is-loading="loading && orders.length === 0"
      :isEmpty="!loading && orders.length === 0"
      empty-icon="📦"
      :empty-title="emptyTitle"
      empty-action-text="去逛逛驿站"
      :empty-show-action="true"
      skeleton-type="list"
      @retry="loadOrders"
      @empty-action="goStations"
    >
      <view class="order-list">
        <view v-for="order in orders" :key="order.id" class="order-card" @click="goOrderDetail(order)">
          <!-- 订单头部 -->
          <view class="order-header">
            <view class="order-header-left">
              <text class="order-type-icon">{{ getTypeIcon(order.type) }}</text>
              <text class="order-station">{{ order.stationName }}</text>
            </view>
            <text class="order-status" :class="'status-' + order.status">
              {{ getOrderStatusLabel(order.status) }}
            </text>
          </view>
          <!-- 订单内容 -->
          <view class="order-body">
            <view v-for="(item, idx) in order.items" :key="item.id" class="order-item" :class="{ 'has-border': idx > 0 }">
              <image :src="item.cover" class="order-item-img" mode="aspectFill" />
              <view class="order-item-info">
                <text class="order-item-title">{{ item.title }}</text>
                <text v-if="item.spec" class="order-item-spec">{{ item.spec }}</text>
                <view class="order-item-price-row">
                  <text class="order-item-price">¥{{ item.price }}</text>
                  <text class="order-item-qty">x{{ item.quantity }}</text>
                </view>
              </view>
            </view>
            <view v-if="order.scheduleTime" class="order-schedule">
              <text>🕐 预约时间：{{ order.scheduleTime }}</text>
            </view>
          </view>
          <!-- 订单底部 -->
          <view class="order-footer">
            <text class="order-summary">共{{ totalQty(order) }}件 | 实付 <text class="order-pay-amount">¥{{ order.payAmount }}</text></text>
            <view v-if="getActions(order).length" class="order-actions" @click.stop>
              <text
                v-for="act in getActions(order).slice(0, 2)"
                :key="act.key"
                class="order-action-btn"
                :class="'action-' + act.variant"
                @click="handleOrderAction(order.id, act.key)"
              >{{ act.label }}</text>
            </view>
          </view>
        </view>
      </view>
    </DataState>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { offlineApi } from '../../api'
import DataState from '../../components/DataState.vue'

interface OrderItem {
  id: number
  title: string
  cover: string
  price: number
  quantity: number
  spec?: string
}

interface OfflineOrder {
  id: number
  type: string
  stationName: string
  status: string
  payAmount: number
  scheduleTime?: string
  items: OrderItem[]
}

const orderTabs = [
  { key: 'all', label: '全部', icon: '📦' },
  { key: 'course', label: '课程', icon: '📖' },
  { key: 'product', label: '商品', icon: '🛍' },
  { key: 'booking', label: '预约', icon: '📅' },
]

const orders = ref<OfflineOrder[]>([])
const activeTab = ref('all')
const loading = ref(false)
const refreshing = ref(false)

const emptyTitle = ref('暂无订单')
let stationId = 1

watch(activeTab, () => {
  loadOrders()
})

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage?.$page?.options || currentPage?.options || {}
  stationId = Number(options.stationId || 1)
  loadOrders()
})

async function loadOrders(showLoading = true) {
  if (showLoading) loading.value = true
  try {
    const res: any = await offlineApi.getOrders(String(stationId))
    const list = Array.isArray(res) ? res : res?.list || res?.data || []
    orders.value = list
    const labels: Record<string, string> = {
      all: '暂无订单',
      course: '暂无课程订单',
      product: '暂无商品订单',
      booking: '暂无预约订单',
    }
    emptyTitle.value = labels[activeTab.value] || '暂无订单'
  } catch (e: any) {
    console.error(e)
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function switchTab(key: string) {
  if (activeTab.value === key) return
  activeTab.value = key
}

function handleRefresh() {
  refreshing.value = true
  loadOrders(false)
}

function handleOrderAction(orderId: number, action: string) {
  switch (action) {
    case 'pay':
      uni.showToast({ title: '跳转支付...', icon: 'none' })
      break
    case 'cancel':
      uni.showModal({
        title: '提示',
        content: '确定要取消这个订单吗？',
        success: (res) => {
          if (res.confirm) {
            loadOrders()
          }
        },
      })
      break
    case 'confirm':
      loadOrders()
      break
    case 'refund':
      uni.showToast({ title: '已提交退款申请', icon: 'none' })
      break
    case 'review':
      uni.navigateTo({ url: `/pages/offline/review?orderId=${orderId}` })
      break
    case 'rebuy':
      uni.navigateTo({ url: `/pages/offline/orders/detail?orderId=${orderId}&rebuy=1` })
      break
  }
}

function goOrderDetail(order: OfflineOrder) {
  uni.navigateTo({ url: `/pages/offline/orders/detail?id=${order.id}` })
}

function goStations() {
  uni.navigateTo({ url: '/pages/offline/stations' })
}

function goBack() {
  uni.navigateBack()
}

function totalQty(order: OfflineOrder): number {
  return order.items.reduce((sum: number, i: OrderItem) => sum + i.quantity, 0)
}

function getTypeIcon(type: string): string {
  const map: Record<string, string> = {
    course: '📖',
    product: '🛍',
    booking: '📅',
  }
  return map[type] || '📦'
}

function getOrderStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending_pay: '待付款',
    pending_use: '待使用',
    completed: '已完成',
    cancelled: '已取消',
    refunding: '退款中',
    refunded: '已退款',
  }
  return map[status] || status
}

function getActions(order: OfflineOrder): { key: string; label: string; variant: string }[] {
  const actions: { key: string; label: string; variant: string }[] = []
  switch (order.status) {
    case 'pending_pay':
      actions.push({ key: 'pay', label: '去支付', variant: 'primary' })
      actions.push({ key: 'cancel', label: '取消', variant: 'ghost' })
      break
    case 'pending_use':
      actions.push({ key: 'confirm', label: '确认使用', variant: 'primary' })
      actions.push({ key: 'refund', label: '退款', variant: 'ghost' })
      break
    case 'completed':
      actions.push({ key: 'review', label: '评价', variant: 'outline' })
      actions.push({ key: 'rebuy', label: '再来一单', variant: 'primary' })
      break
  }
  return actions
}
</script>

<style scoped>
.page {
  background: #F5F0E8;
  min-height: 100vh;
}
.header {
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1rpx solid #E5E1DB;
}
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
}
.header-left { display: flex; align-items: center; gap: 12rpx; }
.back-btn { font-size: 36rpx; }
.header-title { font-size: 32rpx; font-weight: 600; }
.refresh-btn { font-size: 32rpx; padding: 8rpx; }
.spinning { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

.tabs-bar {
  display: flex;
  border-top: 1rpx solid #E5E1DB;
}
.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: 16rpx 0;
  font-size: 22rpx;
  color: #999;
  border-bottom: 4rpx solid transparent;
}
.tab.active { color: #C41E3A; border-bottom-color: #C41E3A; font-weight: 500; }

.order-list { padding: 20rpx 24rpx; }
.order-card {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  margin-bottom: 20rpx;
  border: 1rpx solid #E5E1DB;
}
.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 20rpx;
  border-bottom: 1rpx solid #E5E1DB;
}
.order-header-left { display: flex; align-items: center; gap: 8rpx; }
.order-type-icon { font-size: 28rpx; }
.order-station { font-size: 24rpx; color: #666; }
.order-status { font-size: 22rpx; padding: 2rpx 10rpx; border-radius: 6rpx; }
.status-pending_pay { background: rgba(196,30,58,0.1); color: #C41E3A; }
.status-pending_use { background: rgba(243,156,18,0.1); color: #e67e22; }
.status-completed { background: rgba(39,174,96,0.1); color: #27ae60; }
.status-cancelled, .status-refunded { background: #F5F0E8; color: #999; }
.status-refunding { background: rgba(243,156,18,0.1); color: #e67e22; }

.order-body { padding: 16rpx 20rpx; }
.order-item { display: flex; gap: 12rpx; padding: 12rpx 0; }
.order-item.has-border { border-top: 1rpx solid #E5E1DB; }
.order-item-img { width: 96rpx; height: 96rpx; border-radius: 8rpx; flex-shrink: 0; }
.order-item-info { flex: 1; min-width: 0; }
.order-item-title { font-size: 24rpx; font-weight: 500; display: block; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.order-item-spec { font-size: 20rpx; color: #999; display: block; margin-top: 4rpx; }
.order-item-price-row { display: flex; justify-content: space-between; align-items: center; margin-top: 4rpx; }
.order-item-price { font-size: 24rpx; color: #C41E3A; font-weight: 500; }
.order-item-qty { font-size: 20rpx; color: #999; }
.order-schedule { padding-top: 12rpx; border-top: 1rpx solid #E5E1DB; font-size: 22rpx; color: #999; margin-top: 8rpx; }

.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 20rpx;
  border-top: 1rpx solid #E5E1DB;
  background: #fcfaf7;
}
.order-summary { font-size: 22rpx; color: #666; }
.order-pay-amount { font-size: 24rpx; color: #C41E3A; font-weight: 600; }
.order-actions { display: flex; gap: 12rpx; }
.order-action-btn {
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  font-size: 22rpx;
}
.action-primary { background: linear-gradient(135deg, #C41E3A, #A01830); color: #fff; }
.action-outline { border: 1rpx solid #C41E3A; color: #C41E3A; }
.action-ghost { border: 1rpx solid #E5E1DB; color: #666; }
</style>
