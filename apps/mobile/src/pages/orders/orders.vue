<template>
  <view class="page">
    <!-- 订单状态 Tab -->
    <scroll-view scroll-x class="tab-scroll" show-scrollbar="false" enhanced>
      <view class="tab-list">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-item"
          :class="{ active: activeTab === tab.key }"
          @click="switchTab(tab.key)"
        >
          <text class="tab-text">{{ tab.label }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 订单列表 -->
    <DataState
      :is-loading="loading"
      :error="error"
      :is-empty="!loading && !error && orders.length === 0"
      :empty-title="emptyTitle"
      empty-description="看看有什么好买的吧"
      empty-action-text="去商城"
      skeleton-type="list"
      @retry="initLoad"
      @empty-action="goShop"
    >
      <view class="order-list">
        <view v-for="order in orders" :key="order.id" class="order-card">
          <!-- 订单头 -->
          <view class="order-header" @click="viewDetail(order.id)">
            <text class="order-no">订单号：{{ order.orderNo || order.id.slice(0, 16) }}</text>
            <view :class="['status-badge', statusClass(order.status)]">
              <text class="status-text">{{ order.statusText || statusLabel(order.status) }}</text>
            </view>
          </view>

          <!-- 订单商品 -->
          <view class="order-items" @click="viewDetail(order.id)">
            <view v-for="item in order.items" :key="item.id" class="order-item">
              <image :src="item.cover" class="item-img" mode="aspectFill" />
              <view class="item-info">
                <text class="item-title">{{ item.title }}</text>
                <text v-if="item.skuAttrs" class="item-sku">{{ item.skuAttrs }}</text>
              </view>
              <view class="item-right">
                <text class="item-price">¥{{ toYuan(item.price) }}</text>
                <text class="item-qty">×{{ item.quantity }}</text>
              </view>
            </view>
          </view>

          <!-- 订单底部 -->
          <view class="order-footer">
            <view class="footer-left">
              <text class="order-time">{{ formatTime(order.createdAt) }}</text>
            </view>
            <view class="footer-right">
              <text class="amount-label">合计</text>
              <text class="order-amount">¥{{ toYuan(order.payAmount || order.totalAmount) }}</text>
            </view>
          </view>

          <!-- 操作按钮 -->
          <view class="order-actions">
            <template v-if="order.status === 'pending_pay'">
              <view class="action-btn outline" @click="cancelOrder(order)">取消订单</view>
              <view class="action-btn primary" @click="payOrder(order)">去支付</view>
            </template>
            <template v-else-if="order.status === 'shipped' || order.status === 'pending_receive'">
              <view class="action-btn outline" @click="viewLogistics(order)">查看物流</view>
              <view class="action-btn primary" @click="confirmReceive(order)">确认收货</view>
            </template>
            <template v-else-if="order.status === 'completed'">
              <view class="action-btn outline" @click="viewDetail(order.id)">查看详情</view>
              <view class="action-btn primary" @click="buyAgain(order)">再次购买</view>
            </template>
            <template v-else-if="order.status === 'cancelled'">
              <view class="action-btn outline" @click="deleteOrder(order)">删除订单</view>
            </template>
            <template v-else-if="order.status === 'refunding' || order.status === 'refunded'">
              <view class="action-btn outline" @click="viewRefund(order)">查看售后</view>
            </template>
            <template v-else>
              <view class="action-btn outline" @click="viewDetail(order.id)">查看详情</view>
            </template>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="loadingMore" class="load-more-bar">
        <text>加载中...</text>
      </view>
      <view v-if="!hasMore && orders.length > 0" class="load-more-bar">
        <text class="no-more">— 已经到底了 —</text>
      </view>
    </DataState>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onReachBottom } from '@dcloudio/uni-app'
import { shopApi } from '../../api'
import DataState from '../../components/DataState.vue'
import type { Order, OrderStatus } from '../../types'

interface OrderTab {
  key: string
  label: string
}

const tabs: OrderTab[] = [
  { key: '', label: '全部' },
  { key: 'pending_pay', label: '待付款' },
  { key: 'pending_ship', label: '待发货' },
  { key: 'shipped', label: '待收货' },
  { key: 'completed', label: '已完成' },
  { key: 'refunding', label: '售后' },
]

const statusLabels: Record<string, string> = {
  pending_pay: '待付款',
  pending_ship: '待发货',
  shipped: '待收货',
  received: '已收货',
  completed: '已完成',
  cancelled: '已取消',
  refunding: '退款中',
  refunded: '已退款',
}

const statusClassMap: Record<string, string> = {
  pending_pay: 'status-pending',
  pending_ship: 'status-processing',
  shipped: 'status-processing',
  received: 'status-done',
  completed: 'status-done',
  cancelled: 'status-cancel',
  refunding: 'status-warning',
  refunded: 'status-done',
}

const activeTab = ref('')
const orders = ref<Order[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const loadingMore = ref(false)
const hasMore = ref(true)
const page = ref(1)
const PAGE_SIZE = 20

const emptyTitle = computed(() => {
  if (activeTab.value === '') return '暂无订单'
  const tab = tabs.find(t => t.key === activeTab.value)
  return tab ? `暂无${tab.label}订单` : '暂无订单'
})

onMounted(() => {
  initLoad()
})

async function initLoad() {
  page.value = 1
  hasMore.value = true
  fetchOrders()
}

onReachBottom(() => {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  page.value++
  fetchOrders(true).finally(() => {
    loadingMore.value = false
  })
})

function switchTab(key: string) {
  if (activeTab.value === key) return
  activeTab.value = key
  page.value = 1
  hasMore.value = true
  orders.value = []
  fetchOrders()
}

async function fetchOrders(append = false) {
  if (!append) {
    loading.value = true
    error.value = null
  }
  try {
    const params: Record<string, any> = { page: page.value, pageSize: PAGE_SIZE }
    if (activeTab.value) params.status = activeTab.value
    const data = await shopApi.myOrders(params)
    const list: Order[] = Array.isArray(data) ? data : (data.list || data.items || data.data || [])
    if (append) {
      orders.value.push(...list)
    } else {
      orders.value = list
    }
    hasMore.value = list.length >= PAGE_SIZE
  } catch (e: any) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function statusLabel(s: string): string {
  return statusLabels[s] || s
}

function statusClass(s: string): string {
  return statusClassMap[s] || 'status-default'
}

function toYuan(fen: number): string {
  return (fen / 100).toFixed(2)
}

function formatTime(t: string): string {
  if (!t) return ''
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ===== 操作 =====
function viewDetail(id: string) {
  uni.navigateTo({ url: `/pages/orders/order-detail?id=${id}` })
}

function goShop() {
  uni.switchTab({ url: '/pages/shop/shop' })
}

async function cancelOrder(order: Order) {
  const { confirm } = await uni.showModal({
    title: '取消订单',
    content: '确定要取消该订单吗？',
  })
  if (!confirm) return
  try {
    await shopApi.cancelOrder(order.id)
    uni.showToast({ title: '已取消', icon: 'success' })
    order.status = 'cancelled'
  } catch {
    uni.showToast({ title: '取消失败', icon: 'none' })
  }
}

function payOrder(order: Order) {
  uni.navigateTo({ url: `/pages/shop/paying?orderId=${order.id}` })
}

function viewLogistics(order: Order) {
  uni.navigateTo({ url: `/pages/orders/logistics?orderId=${order.id}` })
}

async function confirmReceive(order: Order) {
  const { confirm } = await uni.showModal({
    title: '确认收货',
    content: '确定已收到商品吗？',
  })
  if (!confirm) return
  try {
    // 如果有确认收货 API 则调用，否则直接跳转
    order.status = 'completed'
    uni.showToast({ title: '已确认收货', icon: 'success' })
  } catch {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

function buyAgain(order: Order) {
  uni.navigateTo({ url: '/pages/shop/shop' })
}

function deleteOrder(order: Order) {
  orders.value = orders.value.filter(o => o.id !== order.id)
}

function viewRefund(order: Order) {
  uni.navigateTo({ url: `/pages/orders/refund-progress?orderId=${order.id}` })
}
</script>

<style scoped>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 40rpx;
}

/* ===== 状态 Tab ===== */
.tab-scroll {
  background: #fff;
  white-space: nowrap;
  padding: 16rpx 20rpx;
  position: sticky;
  top: 0;
  z-index: 50;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.tab-list {
  display: inline-flex;
  gap: 12rpx;
}
.tab-item {
  display: inline-flex;
  align-items: center;
  padding: 14rpx 32rpx;
  border-radius: 32rpx;
  background: #F5F0E8;
  flex-shrink: 0;
}
.tab-item.active {
  background: #C41E3A;
  box-shadow: 0 4rpx 12rpx rgba(196, 30, 58, 0.2);
}
.tab-text {
  font-size: 24rpx;
  color: #666;
  font-weight: 500;
  line-height: 1.2;
}
.tab-item.active .tab-text {
  color: #fff;
}

/* ===== 订单列表 ===== */
.order-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 16rpx 20rpx;
}
.order-card {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

/* ===== 订单头 ===== */
.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx 16rpx;
}
.order-no {
  font-size: 22rpx;
  color: #bbb;
}
.status-badge {
  padding: 6rpx 18rpx;
  border-radius: 20rpx;
  font-size: 22rpx;
  font-weight: 500;
}
.status-text {
  font-size: 22rpx;
}
.status-pending { background: #fdf5e6; }
.status-pending .status-text { color: #C9A96E; }
.status-processing { background: #e3f2fd; }
.status-processing .status-text { color: #1565c0; }
.status-done { background: #e8f5e9; }
.status-done .status-text { color: #2e7d32; }
.status-cancel { background: #F5F0E8; }
.status-cancel .status-text { color: #bbb; }
.status-warning { background: #fff3e0; }
.status-warning .status-text { color: #e67e22; }
.status-default { background: #F5F0E8; }
.status-default .status-text { color: #666; }

/* ===== 订单商品 ===== */
.order-items {
  padding: 0 24rpx;
}
.order-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 12rpx 0;
  border-top: 1rpx solid #f5f0e8;
}
.order-item:first-child {
  border-top: none;
}
.item-img {
  width: 120rpx;
  height: 120rpx;
  border-radius: 10rpx;
  background: #F5F0E8;
  flex-shrink: 0;
}
.item-info {
  flex: 1;
  min-width: 0;
}
.item-title {
  font-size: 26rpx;
  color: #2C2C2C;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  line-height: 1.4;
}
.item-sku {
  font-size: 20rpx;
  color: #bbb;
  margin-top: 4rpx;
  display: block;
}
.item-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4rpx;
  flex-shrink: 0;
}
.item-price {
  font-size: 26rpx;
  color: #2C2C2C;
  font-weight: 500;
}
.item-qty {
  font-size: 20rpx;
  color: #bbb;
}

/* ===== 订单底部 ===== */
.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 24rpx;
  border-top: 1rpx solid #F5F0E8;
}
.footer-left {
  flex: 1;
}
.order-time {
  font-size: 20rpx;
  color: #bbb;
}
.footer-right {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
  flex-shrink: 0;
}
.amount-label {
  font-size: 22rpx;
  color: #999;
}
.order-amount {
  font-size: 32rpx;
  font-weight: bold;
  color: #C41E3A;
}

/* ===== 操作按钮 ===== */
.order-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  padding: 12rpx 24rpx 20rpx;
  border-top: 1rpx solid #F5F0E8;
}
.action-btn {
  padding: 12rpx 32rpx;
  border-radius: 32rpx;
  font-size: 24rpx;
  font-weight: 500;
  line-height: 1.2;
}
.action-btn.outline {
  border: 1rpx solid #E8E0D5;
  color: #666;
}
.action-btn.primary {
  background: #C41E3A;
  color: #fff;
  box-shadow: 0 2rpx 8rpx rgba(196, 30, 58, 0.2);
}

/* ===== 加载更多 ===== */
.load-more-bar {
  text-align: center;
  padding: 32rpx 0 40rpx;
  font-size: 24rpx;
  color: #C9A96E;
}
.load-more-bar .no-more {
  color: #ccc;
}
</style>
