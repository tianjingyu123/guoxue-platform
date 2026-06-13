<template>
  <view class="min-h-screen bg-background pb-24">
    <!-- Header -->
    <view class="sticky top-0 z-40 bg-white border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view @click="goBack" class="p-1">
          <text class="text-foreground text-lg">←</text>
        </view>
        <text class="font-medium text-foreground">订单详情</text>
        <view class="p-1">
          <text class="text-ink-soft"></text>
        </view>
      </view>
    </view>

    <!-- Loading -->
    <view v-if="loading" class="p-4 space-y-4">
      <view v-for="i in 4" :key="i" class="bg-white rounded-2xl h-32 animate-pulse" />
    </view>

    <view v-else-if="order">
      <!-- Status Card -->
      <view :class="['px-4 py-6', status.bgColor]">
        <view class="flex items-center gap-4">
          <view :class="['w-14 h-14 rounded-full flex items-center justify-center', status.bgColor]">
            <text :class="['text-3xl', status.color]">{{ status.iconText }}</text>
          </view>
          <view>
            <text :class="['text-xl font-bold', status.color]">{{ status.text }}</text>
            <text v-if="order.status === 'pending_pay'" class="text-sm text-ink-soft mt-1 block">请在30分钟内完成支付</text>
            <text v-if="order.status === 'pending_receive'" class="text-sm text-ink-soft mt-1 block">快件正在派送中</text>
          </view>
        </view>

        <!-- Progress Steps -->
        <view v-if="order.status !== 'cancelled'" class="flex items-center justify-between mt-6">
          <view v-for="(step, index) in steps" :key="step.key" class="flex items-center">
            <view class="flex flex-col items-center">
              <view :class="['w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium', index < currentStep ? 'bg-primary text-white' : 'bg-[#E8E0D5] text-muted-foreground']">
                <text v-if="index < currentStep">✓</text>
                <text v-else>{{ index + 1 }}</text>
              </view>
              <text :class="['text-xs mt-1', index < currentStep ? 'text-foreground' : 'text-muted-foreground']">{{ step.label }}</text>
            </view>
            <view v-if="index < steps.length - 1" :class="['w-10 h-0.5 mx-1', index < currentStep - 1 ? 'bg-primary' : 'bg-[#E8E0D5]']" />
          </view>
        </view>
      </view>

      <!-- Logistics Info -->
      <view v-if="order.logistics && order.status !== 'pending_pay' && order.status !== 'cancelled'" class="mx-4 mt-4 bg-white rounded-xl p-4 shadow-sm">
        <view @click="goLogistics" class="flex items-start gap-3">
          <view class="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
            <text class="text-blue-500">🚚</text>
          </view>
          <view class="flex-1">
            <view class="flex items-center gap-2">
              <text class="text-sm font-medium text-foreground">{{ order.logistics.company }}</text>
              <text class="text-xs text-muted-foreground">{{ order.logistics.trackingNo }}</text>
            </view>
            <view v-if="order.logistics.timeline && order.logistics.timeline[0]" class="mt-2">
              <text class="text-sm text-foreground block">{{ order.logistics.timeline[0].content }}</text>
              <text class="text-xs text-muted-foreground mt-1 block">{{ order.logistics.timeline[0].time }}</text>
            </view>
          </view>
          <text class="text-[#CCC] text-lg mt-2">›</text>
        </view>
      </view>

      <!-- Address -->
      <view class="mx-4 mt-4 bg-white rounded-xl p-4 shadow-sm">
        <view class="flex items-start gap-3">
          <view class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <text class="text-primary">📍</text>
          </view>
          <view class="flex-1">
            <view class="flex items-center gap-2">
              <text class="font-medium text-foreground">{{ order.address.name }}</text>
              <text class="text-ink-soft text-sm">{{ order.address.phone }}</text>
            </view>
            <text class="text-sm text-ink-soft mt-1 block">{{ order.address.province }}{{ order.address.city }}{{ order.address.district }}{{ order.address.address }}</text>
          </view>
          <view class="p-2 rounded-full bg-background" @click="handleCall">
            <text class="text-ink-soft">📞</text>
          </view>
        </view>
      </view>

      <!-- Products -->
      <view class="mx-4 mt-4 bg-white rounded-xl shadow-sm overflow-hidden">
        <view class="px-4 py-3 border-b border-border">
          <text class="font-medium text-sm text-foreground">商品清单</text>
        </view>
        <view class="divide-y divide-border">
          <view v-for="product in order.products" :key="product.id" class="flex gap-3 p-4">
            <image :src="product.cover" class="w-20 h-20 rounded-lg object-cover" mode="aspectFill" />
            <view class="flex-1 min-w-0">
              <text class="text-sm font-medium text-foreground block line-clamp-2">{{ product.name }}</text>
              <text class="text-xs text-muted-foreground mt-1 block">{{ product.skuName }}</text>
              <view class="flex items-center justify-between mt-2">
                <text class="text-sm text-primary font-medium">¥{{ product.price }}</text>
                <text class="text-sm text-muted-foreground">x{{ product.quantity }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- Quick Actions -->
        <view v-if="order.status === 'completed' || order.status === 'pending_receive'" class="flex items-center gap-2 px-4 py-3 border-t border-border">
          <view v-if="order.canReview" @click="goReview" class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium">
            <text> 评价晒单</text>
          </view>
          <view @click="goAfterSale" class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium">
            <text>↩️ 申请售后</text>
          </view>
        </view>
      </view>

      <!-- Price Detail -->
      <view class="mx-4 mt-4 bg-white rounded-xl p-4 shadow-sm">
        <text class="font-medium text-sm text-foreground block mb-3">价格明细</text>
        <view class="space-y-2">
          <view class="flex items-center justify-between">
            <text class="text-sm text-ink-soft">商品总额</text>
            <text class="text-sm text-foreground">¥{{ order.totalAmount.toFixed(2) }}</text>
          </view>
          <view class="flex items-center justify-between">
            <text class="text-sm text-ink-soft">运费</text>
            <text class="text-sm text-foreground">包邮</text>
          </view>
          <view v-if="order.coupon" class="flex items-center justify-between">
            <text class="text-sm text-ink-soft">{{ order.coupon.name }}</text>
            <text class="text-sm text-primary">-¥{{ order.coupon.discount.toFixed(2) }}</text>
          </view>
          <view class="flex items-center justify-between pt-2 border-t border-border">
            <text class="text-sm font-medium text-foreground">实付金额</text>
            <text class="text-lg font-bold text-primary">¥{{ order.payAmount.toFixed(2) }}</text>
          </view>
        </view>
      </view>

      <!-- Order Info -->
      <view class="mx-4 mt-4 bg-white rounded-xl p-4 shadow-sm mb-4">
        <text class="font-medium text-sm text-foreground block mb-3">订单信息</text>
        <view class="space-y-2">
          <view class="flex items-center justify-between">
            <text class="text-sm text-ink-soft">订单编号</text>
            <view class="flex items-center gap-2">
              <text class="text-sm text-foreground font-mono">{{ order.orderNo }}</text>
              <view @click="handleCopy(order.orderNo)" class="text-primary">
                <text></text>
              </view>
            </view>
          </view>
          <view class="flex items-center justify-between">
            <text class="text-sm text-ink-soft">下单时间</text>
            <text class="text-sm text-foreground">{{ order.createdAt }}</text>
          </view>
          <view v-if="order.paidAt" class="flex items-center justify-between">
            <text class="text-sm text-ink-soft">付款时间</text>
            <text class="text-sm text-foreground">{{ order.paidAt }}</text>
          </view>
          <view v-if="order.payMethod" class="flex items-center justify-between">
            <text class="text-sm text-ink-soft">支付方式</text>
            <text class="text-sm text-foreground">{{ order.payMethod }}</text>
          </view>
          <view v-if="order.remark" class="flex items-center justify-between">
            <text class="text-sm text-ink-soft">备注</text>
            <text class="text-sm text-foreground">{{ order.remark }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Copy Toast -->
    <view v-if="copied" class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-4 py-2 bg-black/70 text-white text-sm rounded-lg z-50">
      复制成功
    </view>

    <!-- Bottom Actions -->
    <view class="fixed bottom-0 left-0 right-0 bg-white border-t border-border">
      <view class="flex items-center justify-between px-4 h-16">
        <view class="flex items-center gap-1 text-ink-soft" @click="handleContact">
          <text>📞</text>
          <text class="text-sm">联系客服</text>
        </view>
        <view class="flex items-center gap-2">
          <template v-if="order && order.status === 'pending_pay'">
            <view @click="handleCancelOrder" class="px-4 py-2 text-sm text-ink-soft border border-border rounded-full">取消订单</view>
            <view @click="handlePay" class="px-4 py-2 text-sm text-white bg-primary rounded-full">去支付</view>
          </template>
          <template v-if="order && order.status === 'pending_receive'">
            <view @click="goLogistics" class="px-4 py-2 text-sm text-ink-soft border border-border rounded-full">查看物流</view>
            <view @click="handleConfirmReceive" :class="['px-4 py-2 text-sm text-white bg-primary rounded-full', confirming ? 'opacity-50' : '']">{{ confirming ? '确认中...' : '确认收货' }}</view>
          </template>
          <template v-if="order && order.status === 'completed'">
            <view @click="goReview" class="px-4 py-2 text-sm text-primary border border-primary rounded-full">去评价</view>
            <view @click="goAfterSale" class="px-4 py-2 text-sm text-ink-soft border border-border rounded-full">申请售后</view>
            <view @click="goRebuy" class="px-4 py-2 text-sm text-white bg-primary rounded-full flex items-center gap-1">
              <text>️ 再次购买</text>
            </view>
          </template>
          <view v-if="order && order.status === 'cancelled'" @click="goRebuy" class="px-4 py-2 text-sm text-white bg-primary rounded-full">重新下单</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface OrderProduct {
  id: string; name: string; cover: string; skuName: string; price: number; quantity: number
}

interface TrackPoint {
  time: string; content: string
}

interface OrderDetail {
  id: string; orderNo: string; status: string; totalAmount: number; payAmount: number
  createdAt: string; paidAt?: string; shippedAt?: string
  products: OrderProduct[]; canCancel: boolean; canConfirm: boolean; canReview: boolean
  address: { id: string; name: string; phone: string; province: string; city: string; district: string; address: string }
  payMethod?: string
  logistics?: { company: string; trackingNo: string; status: string; timeline: TrackPoint[] }
  coupon?: { name: string; discount: number }
  remark?: string
}

const mockOrder: OrderDetail = {
  id: '1', orderNo: 'GX202401150001', status: 'pending_receive',
  totalAmount: 344, payAmount: 294,
  createdAt: '2024-01-15 14:30:00', paidAt: '2024-01-15 14:32:15',
  products: [
    { id: '1', name: '《渊海子平》精装典藏版', cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&q=80', skuName: '精装版', price: 168, quantity: 1 },
    { id: '2', name: '紫微斗数入门教程', cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=200&q=80', skuName: '平装版', price: 88, quantity: 2 },
  ],
  canCancel: false, canConfirm: true, canReview: false,
  address: { id: '1', name: '张三', phone: '138****8888', province: '北京市', city: '北京市', district: '朝阳区', address: '建国路88号SOHO现代城A座1201', isDefault: true } as any,
  payMethod: '微信支付',
  logistics: {
    company: '顺丰速运', trackingNo: 'SF1234567890', status: '派送中',
    timeline: [
      { time: '01-17 08:30', content: '快递员正在派送中，预计12:00前送达' },
      { time: '01-17 06:15', content: '快件已到达【北京朝阳营业点】' },
      { time: '01-16 18:20', content: '快件在【北京转运中心】已装车，准备发往【北京朝阳营业点】' },
      { time: '01-16 09:00', content: '商家已发货，快递员已揽件' },
    ]
  },
  coupon: { name: '新人专享券', discount: 50 },
  remark: '请放门口快递柜',
}

const statusConfig: Record<string, { iconText: string; color: string; bgColor: string; text: string; step: number }> = {
  pending_pay: { iconText: '🕐', color: 'text-primary', bgColor: 'bg-primary/10', text: '待付款', step: 1 },
  pending_ship: { iconText: '📦', color: 'text-yellow-500', bgColor: 'bg-yellow-50', text: '待发货', step: 2 },
  pending_receive: { iconText: '🚚', color: 'text-blue-500', bgColor: 'bg-blue-50', text: '待收货', step: 3 },
  completed: { iconText: '✓', color: 'text-green-500', bgColor: 'bg-green-50', text: '已完成', step: 4 },
  cancelled: { iconText: '✗', color: 'text-gray-500', bgColor: 'bg-gray-50', text: '已取消', step: 0 },
  after_sale: { iconText: '', color: 'text-yellow-500', bgColor: 'bg-yellow-50', text: '售后中', step: 3 },
}

const steps = [
  { key: 'created', label: '提交订单' },
  { key: 'paid', label: '付款成功' },
  { key: 'shipped', label: '商家发货' },
  { key: 'completed', label: '交易完成' },
]

const order = ref<OrderDetail | null>(null)
const loading = ref(true)
const copied = ref(false)
const confirming = ref(false)

const status = computed(() => statusConfig[order.value?.status || 'pending_pay'])
const currentStep = computed(() => status.value.step)

onMounted(() => {
  setTimeout(() => {
    order.value = mockOrder
    loading.value = false
  }, 300)
})

function handleCopy(text: string) {
  uni.setClipboardData({ data: text })
  copied.value = true
  setTimeout(() => copied.value = false, 2000)
}

async function handleConfirmReceive() {
  if (!order.value) return
  confirming.value = true
  await new Promise(r => setTimeout(r, 800))
  order.value = { ...order.value, status: 'completed', canConfirm: false, canReview: true }
  confirming.value = false
}

function handleCall() {
  if (order.value?.address?.phone) {
    uni.makePhoneCall({ phoneNumber: order.value.address.phone })
  }
}
function handleContact() {
  uni.showToast({ title: '联系客服', icon: 'none' })
}
function handleCancelOrder() {
  uni.showToast({ title: '取消订单', icon: 'none' })
}
function handlePay() {
  uni.navigateTo({ url: `/pages/shop/paying/index?orderId=${order.value?.id}` })
}
function goReview() {
  uni.navigateTo({ url: `/pages/orders/id-detail/review/index?id=${order.value?.id}` })
}
function goAfterSale() {
  uni.navigateTo({ url: `/pages/shop/after-sale/index?orderId=${order.value?.id}` })
}
function goRebuy() {
  uni.navigateTo({ url: '/pages/shop/index' })
}
function goBack() { uni.navigateBack() }
function goLogistics() { uni.navigateTo({ url: `/pages/orders/logistics/index?orderId=${order.value?.id}` }) }
</script>
