<template>
  <view class="min-h-screen bg-background pb-24">
    <!-- Loading -->
    <view v-if="loading" class="min-h-screen bg-background">
      <view class="sticky top-0 z-10 bg-white px-4 py-3 flex items-center gap-3" style="border-bottom: 1px solid #E8E0D5;">
        <view class="w-6 h-6 bg-gray-200 rounded animate-pulse" />
        <view class="w-24 h-5 bg-gray-200 rounded animate-pulse" />
      </view>
      <view class="p-4 space-y-4">
        <view v-for="i in 3" :key="i" class="bg-white rounded-2xl p-4 animate-pulse">
          <view class="h-24 bg-gray-200 rounded" />
        </view>
      </view>
    </view>

    <template v-else-if="detail">
      <!-- Header -->
      <view class="sticky top-0 z-10 bg-white flex items-center justify-between px-4 py-3" style="border-bottom: 1px solid #E8E0D5;">
        <view class="flex items-center gap-3">
          <view @click="goBack" class="p-1 -ml-1">
            <text class="text-lg text-foreground">←</text>
          </view>
          <text class="text-lg font-semibold text-foreground">售后详情</text>
        </view>
        <view @click="uni.showToast({ title: '联系客服功能开发中', icon: 'none' })" class="flex items-center gap-1 text-sm text-primary">
          <text></text>
          <text>联系客服</text>
        </view>
      </view>

      <!-- Status Card -->
      <view :class="['mx-4 mt-4 rounded-2xl p-4', statusInfo.bg]">
        <view class="flex items-center gap-3">
          <view :class="['w-12 h-12 rounded-full bg-white flex items-center justify-center', statusInfo.color]">
            <text class="text-xl">{{ getStatusIcon(detail.status) }}</text>
          </view>
          <view class="flex-1">
            <text :class="['font-semibold text-lg', statusInfo.color]">{{ statusInfo.text }}</text>
            <text v-if="detail.status === 'approved' && detail.type === 'refund_with_return'" class="text-sm text-ink-soft mt-0.5 block">请在7天内寄回商品</text>
            <text v-if="detail.status === 'rejected' && detail.rejectReason" class="text-sm text-red-600 mt-0.5 block">原因：{{ detail.rejectReason }}</text>
          </view>
          <view class="text-right">
            <text class="text-sm text-muted-foreground block">退款金额</text>
            <text class="text-xl font-bold text-primary">¥{{ detail.amount }}</text>
          </view>
        </view>
      </view>

      <!-- Product Info -->
      <view class="mx-4 mt-4 bg-white rounded-2xl p-4">
        <view class="flex gap-3">
          <view class="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            <text class="text-2xl text-muted-foreground">📦</text>
          </view>
          <view class="flex-1 min-w-0">
            <text class="text-foreground font-medium line-clamp-2 block">{{ detail.product.name }}</text>
            <text class="text-sm text-muted-foreground mt-1 block">{{ detail.product.skuName }}</text>
            <view class="flex items-center justify-between mt-2">
              <text class="text-primary font-semibold">¥{{ detail.product.price }}</text>
              <text class="text-sm text-muted-foreground">x{{ detail.product.quantity }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- After Sale Info -->
      <view class="mx-4 mt-4 bg-white rounded-2xl p-4 space-y-3">
        <text class="font-semibold text-foreground block">售后信息</text>
        <view class="flex justify-between text-sm">
          <text class="text-muted-foreground">售后类型</text>
          <text class="text-foreground">{{ detail.type === 'refund_only' ? '仅退款' : '退货退款' }}</text>
        </view>
        <view class="flex justify-between text-sm">
          <text class="text-muted-foreground">退款原因</text>
          <text class="text-foreground">{{ detail.reason }}</text>
        </view>
        <view class="flex justify-between text-sm">
          <text class="text-muted-foreground">售后单号</text>
          <view class="flex items-center gap-2">
            <text class="text-foreground">{{ detail.id }}</text>
            <view @click="copyOrderNo" class="text-primary">
              <text v-if="copied" class="text-sm">✓</text>
              <text v-else class="text-sm"></text>
            </view>
          </view>
        </view>
        <view class="flex justify-between text-sm">
          <text class="text-muted-foreground">申请时间</text>
          <text class="text-foreground">{{ detail.createdAt }}</text>
        </view>
        <view v-if="detail.description" class="pt-2" style="border-top: 1px solid #E8E0D5;">
          <text class="text-sm text-muted-foreground mb-2 block">问题描述</text>
          <text class="text-sm text-foreground">{{ detail.description }}</text>
        </view>
        <view v-if="detail.images && detail.images.length > 0" class="pt-2" style="border-top: 1px solid #E8E0D5;">
          <text class="text-sm text-muted-foreground mb-2 block">上传凭证</text>
          <view class="flex gap-2 flex-wrap">
            <view v-for="(img, i) in detail.images" :key="i" class="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
              <text class="text-lg text-muted-foreground"></text>
            </view>
          </view>
        </view>
      </view>

      <!-- Timeline -->
      <view class="mx-4 mt-4 bg-white rounded-2xl p-4">
        <text class="font-semibold text-foreground mb-4 block">处理进度</text>
        <view class="relative">
          <view v-for="(item, index) in detail.timeline" :key="index" class="flex gap-4 pb-6 last:pb-0">
            <view class="flex flex-col items-center">
              <view :class="['w-4 h-4 rounded-full flex items-center justify-center', item.isCurrent ? 'bg-primary' : isCompleted(index) ? 'bg-green-500' : 'bg-gray-300']">
                <text v-if="isCompleted(index) && !item.isCurrent" class="text-white text-xs">✓</text>
                <view v-if="item.isCurrent" class="w-2 h-2 bg-white rounded-full" />
              </view>
              <view v-if="index < detail.timeline.length - 1" :class="['w-0.5 flex-1 mt-1', isCompleted(index) ? 'bg-green-500' : 'bg-gray-200']" />
            </view>
            <view class="flex-1 -mt-0.5">
              <text :class="['font-medium', item.isCurrent ? 'text-primary' : isCompleted(index) ? 'text-foreground' : 'text-muted-foreground']">{{ item.title }}</text>
              <text v-if="item.description" class="text-sm text-muted-foreground mt-0.5 block">{{ item.description }}</text>
              <text v-if="item.time" class="text-xs text-muted-foreground mt-1 block">{{ item.time }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Return Address -->
      <view v-if="detail.type === 'refund_with_return' && detail.status === 'approved' && detail.logistics" class="mx-4 mt-4 bg-white rounded-2xl p-4">
        <view class="flex items-center gap-2 mb-3">
          <text class="text-primary">🚚</text>
          <text class="font-semibold text-foreground">退货地址</text>
        </view>
        <view class="bg-background rounded-xl p-3">
          <text class="text-sm text-foreground block">{{ detail.logistics.address }}</text>
          <text class="text-xs text-muted-foreground mt-2 block">请在7天内将商品寄回以上地址</text>
        </view>
        <view @click="uni.showToast({ title: '填写物流功能开发中', icon: 'none' })" class="w-full mt-3 py-2.5 bg-primary text-white rounded-xl font-medium text-center">
          填写物流单号
        </view>
      </view>

      <!-- Bottom Actions -->
      <view class="fixed bottom-0 left-0 right-0 bg-white p-4 flex gap-3" style="border-top: 1px solid #E8E0D5; padding-bottom: calc(16px + env(safe-area-inset-bottom));">
        <view @click="goTo('/pages/orders/id-detail/index?id=' + detail.orderId)" class="flex-1 py-3 text-foreground font-medium rounded-xl text-center" style="border: 1px solid #E8E0D5;">
          查看订单
        </view>
        <view v-if="detail.canCancel" @click="showCancelConfirm = true" class="flex-1 py-3 text-primary font-medium rounded-xl text-center" style="border: 1px solid #C41E3A;">
          取消售后
        </view>
      </view>

      <!-- Cancel Confirm -->
      <view v-if="showCancelConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <view class="bg-white rounded-2xl w-[85%] max-w-sm overflow-hidden">
          <view class="p-6 text-center">
            <view class="w-14 h-14 mx-auto mb-4 rounded-full bg-orange-50 flex items-center justify-center">
              <text class="text-orange-500 text-xl"></text>
            </view>
            <text class="text-lg font-semibold text-foreground mb-2 block">确认取消售后？</text>
            <text class="text-sm text-ink-soft block">取消后将无法恢复，需重新申请</text>
          </view>
          <view class="flex" style="border-top: 1px solid #E8E0D5;">
            <view @click="showCancelConfirm = false" class="flex-1 py-4 text-ink-soft font-medium text-center" style="border-right: 1px solid #E8E0D5;">再想想</view>
            <view @click="handleCancel" class="flex-1 py-4 text-primary font-medium text-center">确认取消</view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface TimelineItem { status: string; title: string; description?: string; time: string; isCurrent: boolean }
interface AfterSaleDetail {
  id: string; orderId: string; orderNo: string; type: string; status: string
  reason: string; amount: number; description?: string; images?: string[]
  product: { id: string; name: string; cover: string; skuName: string; price: number; quantity: number }
  timeline: TimelineItem[]; logistics?: { company: string; trackingNo: string; address: string }
  createdAt: string; canCancel: boolean; rejectReason?: string
}

const mockDetail: AfterSaleDetail = {
  id: 'as001', orderId: 'order001', orderNo: '202401150001', type: 'refund_with_return',
  status: 'approved', reason: '商品与描述不符', amount: 168,
  description: '收到商品后发现颜色与图片差异较大，希望退货退款。',
  images: ['/placeholder.svg', '/placeholder.svg'],
  product: { id: 'p1', name: '周易六十四卦详解（精装典藏版）', cover: '/placeholder.svg', skuName: '精装版', price: 168, quantity: 1 },
  timeline: [
    { status: 'submitted', title: '提交申请', description: '您的售后申请已提交', time: '2024-01-15 10:30', isCurrent: false },
    { status: 'approved', title: '审核通过', description: '商家已同意您的退货申请，请尽快寄回商品', time: '2024-01-15 14:20', isCurrent: true },
    { status: 'shipping', title: '退货中', description: '等待您寄回商品', time: '', isCurrent: false },
    { status: 'refunding', title: '退款中', description: '商家确认收货后将处理退款', time: '', isCurrent: false },
    { status: 'completed', title: '退款完成', description: '退款已原路返回', time: '', isCurrent: false },
  ],
  logistics: { company: '顺丰速运', trackingNo: '', address: '北京市朝阳区建国路88号SOHO现代城A座1201' },
  createdAt: '2024-01-15 10:30', canCancel: true,
}

const statusConfig: Record<string, { text: string; color: string; bg: string }> = {
  pending: { text: '审核中', color: 'text-orange-500', bg: 'bg-orange-50' },
  approved: { text: '审核通过', color: 'text-green-500', bg: 'bg-green-50' },
  rejected: { text: '已拒绝', color: 'text-red-500', bg: 'bg-red-50' },
  refunding: { text: '退款中', color: 'text-blue-500', bg: 'bg-blue-50' },
  completed: { text: '已完成', color: 'text-green-500', bg: 'bg-green-50' },
  cancelled: { text: '已取消', color: 'text-gray-500', bg: 'bg-gray-50' },
}

const loading = ref(true)
const detail = ref<AfterSaleDetail | null>(null)
const showCancelConfirm = ref(false)
const copied = ref(false)

onMounted(() => {
  setTimeout(() => {
    detail.value = mockDetail
    loading.value = false
  }, 500)
})

const statusInfo = computed(() => statusConfig[detail.value?.status || 'pending'] || statusConfig.pending)

import { computed } from 'vue'

function getStatusIcon(status: string): string {
  switch (status) {
    case 'pending': return ''
    case 'approved': return ''
    case 'rejected': return ''
    case 'refunding': return '📦'
    case 'completed': return ''
    case 'cancelled': return ''
    default: return ''
  }
}

function isCompleted(index: number): boolean {
  if (!detail.value) return false
  const currentIdx = detail.value.timeline.findIndex(t => t.isCurrent)
  return currentIdx >= index
}

function handleCancel() {
  if (!detail.value) return
  detail.value = { ...detail.value, status: 'cancelled', canCancel: false }
  showCancelConfirm.value = false
  uni.showToast({ title: '售后已取消', icon: 'success' })
}

function copyOrderNo() {
  if (detail.value) {
    uni.setClipboardData({ data: detail.value.id })
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }
}

function goTo(url: string) { uni.navigateTo({ url }) }
function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
