<template>
  <view class="orders-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">我的订单</text>
      </view>
    </view>

    <!-- 订单状态Tab -->
    <view class="tab-bar">
      <scroll-view scroll-x class="tab-scroll" :show-scrollbar="false">
        <text v-for="t in tabs" :key="t.key" class="tab-item" :class="{ active: activeTab === t.key }" @click="activeTab = t.key">
          {{ t.label }}
        </text>
      </scroll-view>
    </view>

    <!-- Loading -->
    <view v-if="loading" class="load-area">
      <view v-for="i in 3" :key="i" class="sk-card">
        <view class="sk-line w60" />
        <view class="sk-line w90" />
        <view class="sk-line w40" />
      </view>
    </view>

    <!-- 空 -->
    <view v-else-if="filteredOrders.length === 0" class="empty-wrap">
      <text class="empty-icon">📦</text>
      <text class="empty-title">暂无相关订单</text>
    </view>

    <!-- 订单列表 -->
    <view v-else class="order-list">
      <view v-for="order in filteredOrders" :key="order.id" class="order-card">
        <view class="oc-header">
          <text class="oc-shop">{{ order.shopName }}</text>
          <text class="oc-status" :class="order.status">{{ statusLabel(order.status) }}</text>
        </view>
        <view v-for="item in order.items" :key="item.id" class="oc-item">
          <view class="oci-img">
            <image v-if="item.image" :src="item.image" class="oci-img-real" mode="aspectFill" />
            <text v-else class="oci-img-fb">📦</text>
          </view>
          <view class="oci-info">
            <text class="oci-name">{{ item.name }}</text>
            <text class="oci-spec">{{ item.spec }}</text>
            <view class="oci-bottom">
              <text class="oci-price">¥{{ item.price }}</text>
              <text class="oci-qty">x{{ item.qty }}</text>
            </view>
          </view>
        </view>
        <view class="oc-total">
          <text>共 {{ order.totalCount }} 件</text>
          <text class="oc-amount">合计: <text class="oc-amount-num">¥{{ order.totalAmount }}</text></text>
        </view>
        <view class="oc-actions">
          <text v-if="order.status === 'pending'" class="oc-btn primary" @click="handlePay(order.id)">去支付</text>
          <text v-if="order.status === 'shipped'" class="oc-btn primary" @click="handleConfirm(order.id)">确认收货</text>
          <text v-if="order.status === 'completed'" class="oc-btn" @click="handleBuyAgain(order.id)">再次购买</text>
          <text v-if="order.status === 'pending'" class="oc-btn" @click="handleCancel(order.id)">取消订单</text>
          <text class="oc-btn" @click="goDetail(order.id)">查看详情</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待付款' },
  { key: 'paid', label: '待发货' },
  { key: 'shipped', label: '待收货' },
  { key: 'completed', label: '已完成' },
]

const activeTab = ref('all')
const loading = ref(true)

const orders = reactive([
  {
    id: '1', shopName: '易道书院', status: 'pending', totalCount: 2, totalAmount: '467.00',
    items: [
      { id: 1, name: '《渊海子平》精装典藏版', spec: '精装版 / 全三册', price: '168.00', qty: 1, image: '' },
      { id: 2, name: '八字命理入门到精通', spec: '视频课程 / 共36节', price: '299.00', qty: 1, image: '' },
    ],
  },
  {
    id: '2', shopName: '玄学文创旗舰店', status: 'shipped', totalCount: 2, totalAmount: '256.00',
    items: [
      { id: 3, name: '天然黑曜石貔貅手链', spec: '14mm / 男款', price: '128.00', qty: 2, image: '' },
    ],
  },
  {
    id: '3', shopName: '国学经典书店', status: 'completed', totalCount: 1, totalAmount: '168.00',
    items: [
      { id: 4, name: '《周易全集》正版精装', spec: '精装典藏版', price: '168.00', qty: 1, image: '' },
    ],
  },
])

const filteredOrders = computed(() => {
  if (activeTab.value === 'all') return orders
  return orders.filter(o => o.status === activeTab.value)
})

function statusLabel(s: string) {
  const m: Record<string, string> = { pending: '待付款', paid: '待发货', shipped: '待收货', completed: '已完成', cancelled: '已取消' }
  return m[s] || s
}

function goDetail(id: string) { uni.navigateTo({ url: `/pages/orders/id-detail/index?id=${id}` }) }
function handlePay(id: string) { uni.navigateTo({ url: `/pages/checkout/index` }) }
function handleConfirm(id: string) { uni.showToast({ title: '已确认收货', icon: 'success' }) }
function handleCancel(id: string) { uni.showToast({ title: '已取消订单', icon: 'none' }) }
function handleBuyAgain(id: string) { uni.navigateTo({ url: '/pages/mall/index' }) }

setTimeout(() => { loading.value = false }, 400)
</script>

<style scoped>
.orders-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 100rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 0 24rpx; height: 88rpx; }
.header-back { font-size: 48rpx; color: #333; width: 64rpx; }
.header-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; }

.tab-bar { border-bottom: 1px solid #E8E0D5; }
.tab-scroll { white-space: nowrap; padding: 0 24rpx; }
.tab-item { display: inline-block; padding: 20rpx 24rpx; font-size: 26rpx; color: #999; }
.tab-item.active { color: #C41E3A; font-weight: 600; position: relative; }
.tab-item.active::after { content: ''; position: absolute; bottom: 0; left: 24rpx; right: 24rpx; height: 4rpx; background: #C41E3A; border-radius: 2rpx; }

.load-area { padding: 24rpx; }
.sk-card { background: #fff; border-radius: 16rpx; padding: 32rpx; margin-bottom: 16rpx; }
.sk-line { height: 28rpx; background: #F2EFEA; border-radius: 6rpx; margin-bottom: 16rpx; }
.w60 { width: 60%; }
.w90 { width: 90%; }
.w40 { width: 40%; }

.empty-wrap { display: flex; flex-direction: column; align-items: center; padding: 120rpx 48rpx; }
.empty-icon { font-size: 96rpx; margin-bottom: 24rpx; }
.empty-title { font-size: 28rpx; color: #999; }

.order-list { padding: 16rpx 24rpx; }
.order-card { background: #fff; border-radius: 20rpx; padding: 24rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.oc-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 16rpx; border-bottom: 1px solid #F5F1EB; }
.oc-shop { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.oc-status { font-size: 24rpx; color: #C41E3A; }
.oc-status.completed { color: #999; }
.oc-status.shipped { color: #4A90D9; }

.oc-item { display: flex; gap: 16rpx; padding: 20rpx 0; }
.oc-item + .oc-item { border-top: 1px solid #F5F1EB; }
.oci-img { width: 160rpx; height: 160rpx; border-radius: 16rpx; overflow: hidden; background: #F5F1EB; flex-shrink: 0; }
.oci-img-real { width: 100%; height: 100%; }
.oci-img-fb { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48rpx; }
.oci-info { flex: 1; display: flex; flex-direction: column; }
.oci-name { font-size: 26rpx; font-weight: 500; color: #333; }
.oci-spec { font-size: 22rpx; color: #999; margin-top: 4rpx; }
.oci-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: auto; }
.oci-price { font-size: 28rpx; font-weight: 600; color: #C41E3A; }
.oci-qty { font-size: 24rpx; color: #999; }

.oc-total { display: flex; justify-content: flex-end; align-items: baseline; gap: 8rpx; padding: 16rpx 0; border-top: 1px solid #F5F1EB; font-size: 24rpx; color: #999; }
.oc-amount-num { font-size: 30rpx; font-weight: 600; color: #C41E3A; }

.oc-actions { display: flex; justify-content: flex-end; gap: 16rpx; border-top: 1px solid #F5F1EB; padding-top: 16rpx; }
.oc-btn { padding: 10rpx 28rpx; border-radius: 32rpx; font-size: 24rpx; color: #666; border: 1px solid #E0E0E0; }
.oc-btn.primary { color: #C41E3A; border-color: #C41E3A; }
</style>
