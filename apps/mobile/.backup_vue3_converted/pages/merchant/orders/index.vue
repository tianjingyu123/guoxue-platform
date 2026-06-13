<template>
  <view class="min-h-screen bg-background pb-20">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-white border-b border-border">
      <view class="flex items-center h-14 px-4">
        <view @click="goBack" class="mr-3 p-1">
          <text class="text-xl text-foreground">←</text>
        </view>
        <text class="text-lg font-semibold">订单管理</text>
      </view>
    </view>

    <!-- 搜索 -->
    <view class="p-4 space-y-3">
      <view class="flex gap-2">
        <view class="relative flex-1">
          <text class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"></text>
          <input v-model="searchQuery" placeholder="搜索订单号/商品名称" class="w-full pl-9 pr-3 py-2.5 bg-white rounded-xl text-sm border border-border" />
        </view>
        <view class="w-10 h-10 border border-border rounded-xl flex items-center justify-center">
          <text>🔽</text>
        </view>
      </view>

      <!-- 状态标签 -->
      <view class="flex gap-2">
        <view v-for="tab in statusTabs" :key="tab.key" @click="activeTab = tab.key" :class="['flex-1 py-2 rounded-full text-xs text-center font-medium', activeTab === tab.key ? 'bg-primary text-white' : 'bg-background text-ink-soft']">
          <text>{{ tab.label }}({{ tab.count }})</text>
        </view>
      </view>
    </view>

    <!-- 订单列表 -->
    <scroll-view scroll-y class="flex-1 px-4 space-y-3">
      <view v-for="order in filteredOrders" :key="order.id" @click="goDetail(order.id)" class="bg-white rounded-2xl p-4 shadow-sm">
        <!-- 订单头部 -->
        <view class="flex items-center justify-between mb-3">
          <text class="text-xs text-muted-foreground">订单号: {{ order.id }}</text>
          <view :class="['inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs', statusConfig[order.status]?.color || '']">
            <text>{{ statusConfig[order.status]?.icon || '' }}</text>
            <text>{{ statusConfig[order.status]?.label || '' }}</text>
          </view>
        </view>

        <!-- 商品信息 -->
        <view class="flex gap-3">
          <view class="w-16 h-16 rounded-xl bg-background flex items-center justify-center shrink-0">
            <text class="text-xl">📦</text>
          </view>
          <view class="flex-1 min-w-0">
            <text class="text-sm font-medium line-clamp-2 block">{{ order.productTitle }}</text>
            <view class="flex items-center justify-between mt-1">
              <text class="text-xs text-muted-foreground">x{{ order.quantity }}</text>
              <text class="text-sm font-medium">¥{{ order.price }}</text>
            </view>
          </view>
        </view>

        <!-- 订单金额 -->
        <view class="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <text class="text-xs text-muted-foreground">{{ order.createdAt.split(' ')[0] }}</text>
          <view class="flex items-center gap-2">
            <text class="text-sm">共{{ order.quantity }}件，实付: <text class="font-bold text-primary">¥{{ order.totalAmount }}</text></text>
            <text class="text-muted-foreground">›</text>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view v-if="order.status === 'pending'" class="flex justify-end gap-2 mt-3 pt-3 border-t border-border">
          <view @click.stop class="px-3 py-1.5 border border-border rounded-lg text-xs">修改价格</view>
          <view @click.stop class="px-3 py-1.5 bg-primary text-white rounded-lg text-xs">立即发货</view>
        </view>

        <view v-if="order.status === 'refunding'" class="flex justify-end gap-2 mt-3 pt-3 border-t border-border">
          <view @click.stop class="px-3 py-1.5 border border-border rounded-lg text-xs">拒绝退款</view>
          <view @click.stop class="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs">同意退款</view>
        </view>
      </view>

      <view v-if="filteredOrders.length === 0" class="py-20 text-center">
        <text class="text-muted-foreground">暂无订单</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Order {
  id: string
  productTitle: string
  price: number
  quantity: number
  totalAmount: number
  status: string
  buyerName: string
  createdAt: string
}

const orders: Order[] = [
  { id: '202401150001', productTitle: '滴天髓精解', price: 68, quantity: 2, totalAmount: 136, status: 'pending', buyerName: '张***', createdAt: '2024-01-15 14:30:00' },
  { id: '202401150002', productTitle: '子平真诠评注', price: 88, quantity: 1, totalAmount: 88, status: 'shipped', buyerName: '李***', createdAt: '2024-01-14 10:20:00' },
  { id: '202401150003', productTitle: '文房四宝套装', price: 268, quantity: 1, totalAmount: 268, status: 'completed', buyerName: '王***', createdAt: '2024-01-10 09:00:00' },
  { id: '202401150004', productTitle: '八字命理基础课', price: 199, quantity: 1, totalAmount: 199, status: 'refunding', buyerName: '赵***', createdAt: '2024-01-12 15:00:00' },
  { id: '202401150005', productTitle: '紫砂茶壶礼盒', price: 588, quantity: 1, totalAmount: 588, status: 'cancelled', buyerName: '孙***', createdAt: '2024-01-08 11:00:00' },
]

const statusConfig: Record<string, { label: string; icon: string; color: string }> = {
  pending: { label: '待发货', icon: '📦', color: 'bg-orange-100 text-orange-700' },
  shipped: { label: '已发货', icon: '🚚', color: 'bg-blue-100 text-blue-700' },
  completed: { label: '已完成', icon: '', color: 'bg-green-100 text-green-700' },
  refunding: { label: '退款中', icon: '', color: 'bg-red-100 text-red-700' },
  cancelled: { label: '已取消', icon: '', color: 'bg-gray-100 text-gray-700' },
}

const stats = computed(() => ({
  all: orders.length,
  pending: orders.filter(o => o.status === 'pending').length,
  shipped: orders.filter(o => o.status === 'shipped').length,
  refunding: orders.filter(o => o.status === 'refunding').length,
}))

const statusTabs = computed(() => [
  { key: 'all', label: '全部', count: stats.value.all },
  { key: 'pending', label: '待发货', count: stats.value.pending },
  { key: 'shipped', label: '已发货', count: stats.value.shipped },
  { key: 'refunding', label: '退款', count: stats.value.refunding },
])

const activeTab = ref('all')
const searchQuery = ref('')

onMounted(() => {
  // 从路由参数获取初始状态
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  if (currentPage && currentPage.$page && currentPage.$page.options) {
    const status = currentPage.$page.options.status
    if (status && ['pending', 'shipped', 'completed', 'refunding'].includes(status)) {
      activeTab.value = status
    }
  }
})

const filteredOrders = computed(() => {
  return orders.filter(o => {
    if (activeTab.value !== 'all' && o.status !== activeTab.value) return false
    if (searchQuery.value && !o.id.includes(searchQuery.value) && !o.productTitle.includes(searchQuery.value)) return false
    return true
  })
})

function goBack() { uni.navigateBack() }
function goDetail(id: string) { uni.navigateTo({ url: `/pages/merchant/order-detail/index?id=${id}` }) }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
