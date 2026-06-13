<template>
  <view class="min-h-screen bg-background pb-20">

    <!-- 顶部导航 -->
    <view class="sticky top-0 z-20 bg-background border-b border-border">
      <view class="flex items-center gap-3 px-4 py-3">
        <view
          class="w-9 h-9 flex items-center justify-center rounded-full -ml-1"
          @tap="goBack"
        >
          <svg class="w-6 h-6 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </view>
        <text class="text-lg font-semibold text-foreground">我的订单</text>
      </view>

      <!-- 状态 Tab -->
      <scroll-view scroll-x show-scrollbar="false" class="border-t border-border">
        <view class="flex whitespace-nowrap">
          <view
            v-for="tab in statusTabs"
            :key="tab.key"
            :class="[
              'flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.key
                ? 'text-primary border-primary'
                : 'text-muted-foreground border-transparent'
            ]"
            @tap="activeTab = tab.key; loadOrders()"
          >
            <text>{{ tab.label }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 内容区 -->
    <scroll-view scroll-y class="flex-1">
      <view class="p-4 space-y-4">

        <!-- 骨架屏 -->
        <view v-if="loading">
          <view v-for="i in 3" :key="i" class="bg-card rounded-2xl p-4 animate-pulse mb-4">
            <view class="flex justify-between mb-3">
              <view class="h-4 w-32 bg-muted rounded" />
              <view class="h-4 w-16 bg-muted rounded" />
            </view>
            <view class="flex gap-3">
              <view class="w-20 h-20 bg-muted rounded-lg flex-shrink-0" />
              <view class="flex-1 space-y-2">
                <view class="h-4 w-full bg-muted rounded" />
                <view class="h-3 w-20 bg-muted rounded" />
                <view class="h-4 w-16 bg-muted rounded" />
              </view>
            </view>
          </view>
        </view>

        <!-- 空状态 -->
        <view v-else-if="filteredOrders.length === 0" class="flex flex-col items-center justify-center py-20">
          <svg class="w-16 h-16 text-border mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          <text class="text-muted-foreground mb-4">暂无订单</text>
          <view
            class="px-6 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-full"
            @tap="navigateTo('/pages/mall/index')"
          >
            <text>去逛逛</text>
          </view>
        </view>

        <!-- 订单列表 -->
        <view v-else>
          <view
            v-for="order in filteredOrders"
            :key="order.id"
            class="bg-card rounded-2xl overflow-hidden mb-4"
            @tap="navigateTo(`/pages/orders/detail?id=${order.id}`)"
          >
            <!-- 订单头 -->
            <view class="px-4 py-3 border-b border-border flex items-center justify-between">
              <view class="flex items-center gap-2 text-sm text-muted-foreground">
                <text>订单号: {{ order.orderNo }}</text>
                <view
                  class="p-1"
                  @tap.stop="copyOrderNo(order.orderNo)"
                >
                  <svg class="w-3.5 h-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </view>
              </view>
              <view :class="['flex items-center gap-1 text-sm font-medium', statusConfig[order.status]?.color]">
                <view v-html="statusConfig[order.status]?.icon" class="w-4 h-4" />
                <text>{{ statusConfig[order.status]?.label }}</text>
              </view>
            </view>

            <!-- 商品列表 -->
            <view class="p-4">
              <view
                v-for="(product, idx) in order.products.slice(0, 2)"
                :key="product.id"
                :class="['flex gap-3', idx > 0 ? 'mt-3 pt-3 border-t border-border' : '']"
              >
                <view class="w-20 h-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <image
                    v-if="product.cover && product.cover !== '/placeholder.svg'"
                    :src="product.cover"
                    mode="aspectFill"
                    class="w-full h-full"
                  />
                  <svg v-else class="w-8 h-8 text-muted-foreground/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                  </svg>
                </view>
                <view class="flex-1 min-w-0">
                  <text class="text-sm font-medium text-foreground line-clamp-2">{{ product.name }}</text>
                  <text class="text-xs text-muted-foreground mt-1">{{ product.skuName }}</text>
                  <view class="flex items-center justify-between mt-2">
                    <text class="text-sm font-semibold text-primary">¥{{ product.price }}</text>
                    <text class="text-xs text-muted-foreground">x{{ product.quantity }}</text>
                  </view>
                </view>
              </view>
              <text v-if="order.products.length > 2" class="text-xs text-muted-foreground mt-3 text-center block">
                共 {{ order.products.length }} 件商品
              </text>
            </view>

            <!-- 底部操作栏 -->
            <view class="px-4 py-3 border-t border-border flex items-center justify-between" @tap.stop>
              <view class="text-sm">
                <text class="text-muted-foreground">实付: </text>
                <text class="text-primary font-semibold">¥{{ order.payAmount }}</text>
              </view>
              <view class="flex items-center gap-2">
                <!-- 待付款 -->
                <template v-if="order.status === 'pending_pay'">
                  <view
                    class="px-4 py-1.5 text-sm text-muted-foreground border border-border rounded-full"
                    @tap="showCancelModal(order.id)"
                  >
                    <text>取消订单</text>
                  </view>
                  <view
                    class="px-4 py-1.5 text-sm text-primary-foreground bg-primary rounded-full"
                    @tap="navigateTo(`/pages/orders/paying?orderId=${order.id}`)"
                  >
                    <text>去支付</text>
                  </view>
                </template>
                <!-- 待发货 -->
                <template v-else-if="order.status === 'pending_ship' && order.canCancel">
                  <view
                    class="px-4 py-1.5 text-sm text-muted-foreground border border-border rounded-full"
                    @tap="showCancelModal(order.id)"
                  >
                    <text>取消订单</text>
                  </view>
                </template>
                <!-- 待收货 -->
                <template v-else-if="order.status === 'pending_receive'">
                  <view
                    class="px-4 py-1.5 text-sm text-muted-foreground border border-border rounded-full"
                    @tap="navigateTo(`/pages/orders/logistics?orderId=${order.id}`)"
                  >
                    <text>查看物流</text>
                  </view>
                  <view
                    v-if="order.canConfirm"
                    class="px-4 py-1.5 text-sm text-primary-foreground bg-primary rounded-full"
                    @tap="confirmReceive(order.id)"
                  >
                    <text>确认收货</text>
                  </view>
                </template>
                <!-- 已完成 -->
                <template v-else-if="order.status === 'completed'">
                  <view
                    v-if="order.canReview"
                    class="px-4 py-1.5 text-sm text-primary border border-primary rounded-full"
                    @tap="navigateTo(`/pages/orders/review?orderId=${order.id}`)"
                  >
                    <text>去评价</text>
                  </view>
                  <view
                    class="px-4 py-1.5 text-sm text-primary-foreground bg-primary rounded-full"
                    @tap="buyAgain(order.id)"
                  >
                    <text>再次购买</text>
                  </view>
                </template>
              </view>
            </view>
          </view>
        </view>

      </view>
    </scroll-view>

    <!-- 取消订单弹窗 -->
    <view
      v-if="cancelModalVisible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @tap="cancelModalVisible = false"
    >
      <view class="bg-card rounded-2xl w-[85%] max-w-sm overflow-hidden" @tap.stop>
        <view class="p-4 border-b border-border">
          <text class="text-lg font-semibold text-foreground text-center block">取消订单</text>
        </view>
        <view class="p-4">
          <text class="text-sm text-muted-foreground mb-3 block">请选择取消原因：</text>
          <view
            v-for="reason in cancelReasons"
            :key="reason"
            :class="[
              'w-full text-left px-4 py-3 rounded-lg mb-2 text-sm transition-colors',
              selectedReason === reason
                ? 'bg-primary/10 text-primary border border-primary'
                : 'bg-muted text-foreground'
            ]"
            @tap="selectedReason = reason"
          >
            <text>{{ reason }}</text>
          </view>
        </view>
        <view class="p-4 border-t border-border flex gap-3">
          <view
            class="flex-1 py-2.5 text-sm text-muted-foreground border border-border rounded-full text-center"
            @tap="cancelModalVisible = false; cancelTargetId = ''; selectedReason = ''"
          >
            <text>暂不取消</text>
          </view>
          <view
            :class="[
              'flex-1 py-2.5 text-sm text-center rounded-full transition-opacity',
              selectedReason
                ? 'bg-primary text-primary-foreground'
                : 'bg-primary/40 text-primary-foreground/60'
            ]"
            @tap="doCancel"
          >
            <text>确认取消</text>
          </view>
        </view>
      </view>
    </view>

  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Product {
  id: string; name: string; cover: string
  skuName: string; price: number; quantity: number
}
interface Order {
  id: string; orderNo: string; status: string
  totalAmount: number; payAmount: number; createdAt: string
  products: Product[]; canCancel: boolean; canConfirm: boolean
  canReview: boolean; hasAfterSale: boolean
}

const activeTab = ref('')
const loading = ref(true)
const cancelModalVisible = ref(false)
const cancelTargetId = ref('')
const selectedReason = ref('')
const cancelReasons = ['不想要了', '信息填写错误', '重复下单', '其他原因']
const orders = ref<Order[]>([])

const statusTabs = [
  { key: '', label: '全部' },
  { key: 'pending_pay', label: '待付款' },
  { key: 'pending_ship', label: '待发货' },
  { key: 'pending_receive', label: '待收货' },
  { key: 'completed', label: '已完成' },
  { key: 'after_sale', label: '售后' },
]

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  pending_pay: {
    label: '待付款', color: 'text-primary',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
  },
  pending_ship: {
    label: '待发货', color: 'text-accent',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>'
  },
  pending_receive: {
    label: '待收货', color: 'text-blue-500',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>'
  },
  completed: {
    label: '已完成', color: 'text-chart-4',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
  },
  cancelled: {
    label: '已取消', color: 'text-muted-foreground',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
  },
  after_sale: {
    label: '售后中', color: 'text-orange-500',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
  },
}

const mockOrders: Order[] = [
  { id: '1', orderNo: '202401150001', status: 'pending_pay', totalAmount: 256, payAmount: 256, createdAt: '2024-01-15 14:30', products: [{ id: 'p1', name: '周易六十四卦详解（精装典藏版）', cover: '/placeholder.svg', skuName: '精装版', price: 168, quantity: 1 }, { id: 'p2', name: '紫微斗数入门教程', cover: '/placeholder.svg', skuName: '平装版', price: 88, quantity: 1 }], canCancel: true, canConfirm: false, canReview: false, hasAfterSale: false },
  { id: '2', orderNo: '202401140002', status: 'pending_ship', totalAmount: 168, payAmount: 158, createdAt: '2024-01-14 10:20', products: [{ id: 'p3', name: '八字命理学基础', cover: '/placeholder.svg', skuName: '标准版', price: 168, quantity: 1 }], canCancel: true, canConfirm: false, canReview: false, hasAfterSale: false },
  { id: '3', orderNo: '202401130003', status: 'pending_receive', totalAmount: 299, payAmount: 279, createdAt: '2024-01-13 09:15', products: [{ id: 'p4', name: '风水布局实战指南', cover: '/placeholder.svg', skuName: '精装版', price: 299, quantity: 1 }], canCancel: false, canConfirm: true, canReview: false, hasAfterSale: false },
  { id: '4', orderNo: '202401100004', status: 'completed', totalAmount: 128, payAmount: 128, createdAt: '2024-01-10 16:40', products: [{ id: 'p5', name: '梅花易数速成', cover: '/placeholder.svg', skuName: '电子版', price: 128, quantity: 1 }], canCancel: false, canConfirm: false, canReview: true, hasAfterSale: false },
]

const filteredOrders = computed(() =>
  activeTab.value ? orders.value.filter(o => o.status === activeTab.value) : orders.value
)

async function loadOrders() {
  loading.value = true
  await new Promise(r => setTimeout(r, 400))
  orders.value = mockOrders
  loading.value = false
}

function showCancelModal(id: string) {
  cancelTargetId.value = id
  selectedReason.value = ''
  cancelModalVisible.value = true
}

function doCancel() {
  if (!selectedReason.value) return
  orders.value = orders.value.map(o =>
    o.id === cancelTargetId.value ? { ...o, status: 'cancelled', canCancel: false } : o
  )
  cancelModalVisible.value = false
  cancelTargetId.value = ''
  selectedReason.value = ''
}

function confirmReceive(id: string) {
  orders.value = orders.value.map(o =>
    o.id === id ? { ...o, status: 'completed', canConfirm: false, canReview: true } : o
  )
}

function buyAgain(id: string) { navigateTo('/pages/shop/cart') }
function copyOrderNo(no: string) {
  uni.setClipboardData({ data: no })
  uni.showToast({ title: '已复制', icon: 'none' })
}
function goBack() { uni.navigateBack() }
function navigateTo(url: string) { uni.navigateTo({ url }) }
onMounted(loadOrders)
</script>
