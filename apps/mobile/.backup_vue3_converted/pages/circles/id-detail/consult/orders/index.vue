<template>
  <view class="min-h-screen bg-background">
    <view class="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
      <view @click="goBack"><text class="text-xl text-foreground">←</text></view>
      <text class="text-base font-semibold text-foreground">咨询订单</text>
    </view>

    <!-- Summary -->
    <view class="mx-4 mt-4 p-4 rounded-xl flex gap-6" style="background:rgba(196,30,58,0.05);border:1px solid rgba(196,30,58,0.2)">
      <view class="text-center flex-1">
        <text class="text-xl font-bold text-primary block">¥{{ totalSpent.toFixed(2) }}</text>
        <text class="text-xs text-muted-foreground mt-0.5">累计消费</text>
      </view>
      <view class="text-center flex-1">
        <text class="text-xl font-bold text-foreground block">{{ completedCount }}</text>
        <text class="text-xs text-muted-foreground mt-0.5">完成订单</text>
      </view>
      <view class="text-center flex-1">
        <text class="text-xl font-bold text-foreground block">{{ callCount }}</text>
        <text class="text-xs text-muted-foreground mt-0.5">通话次数</text>
      </view>
    </view>

    <!-- Filter -->
    <view class="flex gap-2 px-4 pt-4 pb-2 overflow-x-auto">
      <view v-for="f in filterOptions" :key="f.key"
        @click="filter = f.key"
        :class="['px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors', filter === f.key ? 'bg-primary text-white' : 'bg-muted text-foreground']">
        <text>{{ f.label }}</text>
      </view>
    </view>

    <view class="px-4 pb-20 space-y-3 pt-2">
      <view v-for="order in filtered" :key="order.id" class="bg-white border border-border rounded-xl p-4">
        <view class="flex items-center justify-between mb-3">
          <text class="text-xs text-muted-foreground">订单号：{{ order.orderNo }}</text>
          <text :class="['text-xs flex items-center gap-1', STATUS_CFG[order.status].cls]">
            <text>{{ STATUS_CFG[order.status].icon }}</text>
            <text>{{ STATUS_CFG[order.status].label }}</text>
          </text>
        </view>
        <view class="flex items-center gap-3">
          <image :src="order.avatar" mode="aspectFill" class="w-10 h-10 rounded-full flex-shrink-0" />
          <view class="flex-1 min-w-0">
            <view class="flex items-center gap-2">
              <text class="text-sm font-medium text-foreground">{{ order.expert }}</text>
              <text class="text-xs text-muted-foreground flex items-center gap-0.5">
                <text>{{ order.type === 'call' ? '📞' : '' }}</text>
                <text>{{ order.type === 'call' ? '电话' : '图文' }}</text>
              </text>
            </view>
            <text class="text-xs text-muted-foreground mt-0.5 block">{{ order.desc }}</text>
          </view>
          <view class="text-right flex-shrink-0">
            <text :class="['text-sm font-bold', order.status === 'refunded' ? 'line-through text-muted-foreground' : 'text-primary']">{{ order.amount }}</text>
            <text class="text-[10px] text-muted-foreground mt-0.5 block">{{ order.createdAt }}</text>
          </view>
        </view>
      </view>
      <view v-if="filtered.length === 0" class="text-center text-sm text-muted-foreground py-16">
        暂无订单
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

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

const STATUS_CFG: Record<string, { label: string; icon: string; cls: string }> = {
  completed: { label: '已完成', icon: '✓', cls: 'text-green-600' },
  pending: { label: '待处理', icon: '🕐', cls: 'text-orange-500' },
  refunded: { label: '已退款', icon: '✕', cls: 'text-muted-foreground' },
}

const filterOptions = [
  { key: 'all', label: '全部' },
  { key: 'completed', label: '已完成' },
  { key: 'pending', label: '待处理' },
  { key: 'refunded', label: '已退款' },
]

const filter = ref<OrderStatus>('all')

const filtered = computed(() => filter.value === 'all' ? mockOrders : mockOrders.filter(o => o.status === filter.value))
const totalSpent = computed(() =>
  mockOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + parseFloat(o.amount.replace('¥', '')), 0)
)
const completedCount = computed(() => mockOrders.filter(o => o.status === 'completed').length)
const callCount = computed(() => mockOrders.filter(o => o.type === 'call').length)

function goBack() { uni.navigateBack() }
</script>
<style scoped>/* 样式由 Tailwind 处理 */</style>