<script setup lang="ts">
/**
 * 咨询订单（从原型 app/circles/[id]/consult/orders/page.tsx 高保真迁移）
 * 汇总卡(累计消费/完成订单/通话次数) + 状态筛选 + 订单列表卡。
 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'

type OrderStatus = 'all' | 'completed' | 'pending' | 'refunded'

interface Order {
  id: string; orderNo: string; expert: string; avatar: string
  type: 'call' | 'text'; amount: string; status: 'completed' | 'pending' | 'refunded'
  createdAt: string; desc: string
}

const mockOrders: Order[] = [
  { id: '1', orderNo: 'CS202401200001', expert: '周易大师', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80', type: 'call', amount: '¥84.00', status: 'completed', createdAt: '2024-01-20', desc: '电话咨询 28分钟' },
  { id: '2', orderNo: 'CS202401180002', expert: '张玄风', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80', type: 'text', amount: '¥30.00', status: 'completed', createdAt: '2024-01-18', desc: '图文咨询' },
  { id: '3', orderNo: 'CS202401220003', expert: '李玄机', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80', type: 'text', amount: '¥80.00', status: 'pending', createdAt: '2024-01-22', desc: '图文咨询（待回复）' },
  { id: '4', orderNo: 'CS202401100004', expert: '王德华', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80', type: 'call', amount: '¥126.00', status: 'completed', createdAt: '2024-01-10', desc: '电话咨询 42分钟' },
  { id: '5', orderNo: 'CS202401050005', expert: '林奇门', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80', type: 'call', amount: '¥0.00', status: 'refunded', createdAt: '2024-01-05', desc: '已退款' },
]

const STATUS_CFG: Record<Exclude<OrderStatus, 'all'>, { label: string; icon: string; color: string }> = {
  completed: { label: '已完成', icon: 'check-circle', color: '#16A34A' },
  pending: { label: '待处理', icon: 'clock', color: '#F59E0B' },
  refunded: { label: '已退款', icon: 'x-circle', color: '#999999' },
}

const filter = ref<OrderStatus>('all')
const filterTabs: OrderStatus[] = ['all', 'completed', 'pending', 'refunded']

const filtered = computed(() => filter.value === 'all' ? mockOrders : mockOrders.filter(o => o.status === filter.value))
const totalSpent = computed(() => mockOrders.filter(o => o.status === 'completed').reduce((s, o) => s + parseFloat(o.amount.replace('¥', '')), 0))
const completedCount = computed(() => mockOrders.filter(o => o.status === 'completed').length)
const callCount = computed(() => mockOrders.filter(o => o.type === 'call').length)

function tabLabel(f: OrderStatus) { return f === 'all' ? '全部' : STATUS_CFG[f].label }
</script>

<template>
  <view class="co-page">
    <view class="co-nav">
      <view class="co-nav-btn" @tap="goBack"><app-icon name="arrow-left" :size="34" color="#2C2C2C" /></view>
      <text class="co-nav-title">咨询订单</text>
    </view>

    <view class="co-summary">
      <view class="co-sum-item"><text class="co-sum-num is-primary">¥{{ totalSpent.toFixed(2) }}</text><text class="co-sum-label">累计消费</text></view>
      <view class="co-sum-item"><text class="co-sum-num">{{ completedCount }}</text><text class="co-sum-label">完成订单</text></view>
      <view class="co-sum-item"><text class="co-sum-num">{{ callCount }}</text><text class="co-sum-label">通话次数</text></view>
    </view>

    <scroll-view scroll-x class="co-filters" :show-scrollbar="false">
      <view class="co-filters-inner">
        <view v-for="f in filterTabs" :key="f" class="co-filter" :class="{ 'is-active': filter === f }" @tap="filter = f">
          <text class="co-filter-t" :class="{ 'is-active': filter === f }">{{ tabLabel(f) }}</text>
        </view>
      </view>
    </scroll-view>

    <view class="co-list">
      <view v-for="o in filtered" :key="o.id" class="co-card">
        <view class="co-card-head">
          <text class="co-order-no">订单号：{{ o.orderNo }}</text>
          <view class="co-status">
            <app-icon :name="STATUS_CFG[o.status].icon" :size="22" :color="STATUS_CFG[o.status].color" />
            <text class="co-status-t" :style="{ color: STATUS_CFG[o.status].color }">{{ STATUS_CFG[o.status].label }}</text>
          </view>
        </view>
        <view class="co-card-body">
          <image class="co-avatar" :src="o.avatar" mode="aspectFill" />
          <view class="co-info">
            <view class="co-info-top">
              <text class="co-expert">{{ o.expert }}</text>
              <view class="co-type">
                <app-icon :name="o.type === 'call' ? 'phone' : 'message-square'" :size="20" color="#999999" />
                <text class="co-type-t">{{ o.type === 'call' ? '电话' : '图文' }}</text>
              </view>
            </view>
            <text class="co-desc">{{ o.desc }}</text>
          </view>
          <view class="co-amount-wrap">
            <text class="co-amount" :class="{ 'is-refunded': o.status === 'refunded' }">{{ o.amount }}</text>
            <text class="co-date">{{ o.createdAt }}</text>
          </view>
        </view>
      </view>
      <view v-if="filtered.length === 0" class="co-empty"><text class="co-empty-t">暂无订单</text></view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.co-page { min-height: 100vh; background: #F5F1E8; padding-bottom: 48rpx; }
.co-nav { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 16rpx; height: 88rpx; padding: 0 24rpx; background: #F5F1E8; border-bottom: 1rpx solid #E8E0D0; }
.co-nav-btn { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; }
.co-nav-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.co-summary { display: flex; gap: 32rpx; margin: 24rpx; padding: 28rpx; background: rgba(196,30,58,0.05); border: 1rpx solid rgba(196,30,58,0.2); border-radius: 20rpx; }
.co-sum-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.co-sum-num { font-size: 38rpx; font-weight: 700; color: #2C2C2C; }
.co-sum-num.is-primary { color: #C41E3A; }
.co-sum-label { font-size: 22rpx; color: #999; }
.co-filters { white-space: nowrap; padding: 8rpx 24rpx 16rpx; }
.co-filters-inner { display: inline-flex; gap: 16rpx; }
.co-filter { padding: 12rpx 28rpx; border-radius: 999rpx; background: #ECE6D8; }
.co-filter.is-active { background: #C41E3A; }
.co-filter-t { font-size: 26rpx; color: #2C2C2C; font-weight: 500; }
.co-filter-t.is-active { color: #fff; }
.co-list { display: flex; flex-direction: column; gap: 20rpx; padding: 8rpx 24rpx 0; }
.co-card { background: #fff; border: 1rpx solid #E8E0D0; border-radius: 20rpx; padding: 24rpx; }
.co-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.co-order-no { font-size: 22rpx; color: #999; }
.co-status { display: flex; align-items: center; gap: 6rpx; }
.co-status-t { font-size: 22rpx; }
.co-card-body { display: flex; align-items: center; gap: 16rpx; }
.co-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; flex-shrink: 0; }
.co-info { flex: 1; min-width: 0; }
.co-info-top { display: flex; align-items: center; gap: 12rpx; }
.co-expert { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.co-type { display: flex; align-items: center; gap: 4rpx; }
.co-type-t { font-size: 22rpx; color: #999; }
.co-desc { display: block; font-size: 22rpx; color: #999; margin-top: 6rpx; }
.co-amount-wrap { text-align: right; flex-shrink: 0; }
.co-amount { display: block; font-size: 28rpx; font-weight: 700; color: #C41E3A; }
.co-amount.is-refunded { text-decoration: line-through; color: #999; }
.co-date { display: block; font-size: 20rpx; color: #999; margin-top: 6rpx; }
.co-empty { padding: 120rpx 0; }
.co-empty-t { display: block; text-align: center; font-size: 26rpx; color: #999; }
</style>
