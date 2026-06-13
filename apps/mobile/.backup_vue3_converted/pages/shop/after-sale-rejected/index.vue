<template>
  <view class="min-h-screen bg-background pb-32">
    <!-- Loading -->
    <view v-if="loading" class="min-h-screen bg-background">
      <view class="sticky top-0 z-10 h-14" style="background: linear-gradient(90deg, #C41E3A, #E53E3E);" />
      <view class="p-4 space-y-4">
        <view v-for="i in 3" :key="i" class="bg-white rounded-2xl h-32 animate-pulse" />
      </view>
    </view>

    <template v-else-if="detail">
      <!-- Header -->
      <view class="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 text-white" style="background: linear-gradient(90deg, #C41E3A, #E53E3E);">
        <view @click="goBack" class="p-1 -ml-1">
          <text class="text-lg">←</text>
        </view>
        <text class="text-lg font-medium">售后结果</text>
      </view>

      <!-- Result Card -->
      <view class="px-4 pt-6 pb-12 text-white" style="background: linear-gradient(135deg, #C41E3A, #E53E3E);">
        <view class="flex flex-col items-center">
          <view class="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4 animate-pulse">
            <text class="text-4xl"></text>
          </view>
          <text class="text-2xl font-bold mb-2">售后申请已驳回</text>
          <text class="text-white/80 text-sm">您的售后申请未通过审核</text>
        </view>
      </view>

      <!-- Reject Reason -->
      <view class="px-4 -mt-6">
        <view class="bg-white rounded-2xl shadow-sm overflow-hidden">
          <view class="p-4" style="border-bottom: 1px solid #E8E0D5;">
            <view class="flex items-center gap-2 text-primary mb-3">
              <text class="text-lg"></text>
              <text class="font-medium">驳回原因</text>
            </view>
            <text class="text-ink-soft text-sm leading-relaxed block">{{ detail.rejectReason }}</text>
          </view>
          <view class="p-4 bg-background">
            <view class="flex items-center justify-between text-sm">
              <text class="text-muted-foreground">处理时间</text>
              <text class="text-foreground">{{ detail.timeline.find(t => t.status === 'rejected')?.time || detail.createdAt }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- After Sale Info -->
      <view class="px-4 mt-4">
        <view class="bg-white rounded-2xl p-4">
          <text class="font-medium text-foreground mb-4 flex items-center gap-2">
            <text class="text-accent"></text>
            售后信息
          </text>
          <!-- Product -->
          <view class="flex gap-3 pb-4" style="border-bottom: 1px solid #E8E0D5;">
            <view class="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
              <image v-if="!productCoverError" :src="detail.product.cover" mode="aspectFill" class="w-full h-full" @error="productCoverError = true" />
              <text v-else class="text-lg text-muted-foreground">📦</text>
            </view>
            <view class="flex-1 min-w-0">
              <text class="text-sm text-foreground line-clamp-1 block">{{ detail.product.name }}</text>
              <text class="text-xs text-muted-foreground mt-1 block">{{ detail.product.skuName }}</text>
              <view class="flex items-center justify-between mt-2">
                <text class="text-primary font-medium">¥{{ detail.product.price }}</text>
                <text class="text-xs text-muted-foreground">x{{ detail.product.quantity }}</text>
              </view>
            </view>
          </view>
          <!-- Info List -->
          <view class="pt-4 space-y-3">
            <view class="flex justify-between text-sm">
              <text class="text-muted-foreground">售后类型</text>
              <text class="text-foreground">{{ detail.type === 'refund_only' ? '仅退款' : '退货退款' }}</text>
            </view>
            <view class="flex justify-between text-sm">
              <text class="text-muted-foreground">退款金额</text>
              <text class="text-primary font-medium">¥{{ detail.amount.toFixed(2) }}</text>
            </view>
            <view class="flex justify-between text-sm">
              <text class="text-muted-foreground">退款原因</text>
              <text class="text-foreground">{{ detail.reason }}</text>
            </view>
            <view class="flex justify-between text-sm items-start">
              <text class="text-muted-foreground">售后单号</text>
              <view class="flex items-center gap-2">
                <text class="text-foreground">{{ detail.id }}</text>
                <view @click="handleCopy(detail.id)" class="text-accent">
                  <text v-if="copied" class="text-sm">✓</text>
                  <text v-else class="text-sm"></text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- Problem Description -->
      <view v-if="detail.description" class="px-4 mt-4">
        <view class="bg-white rounded-2xl p-4">
          <text class="font-medium text-foreground mb-3 block">问题描述</text>
          <text class="text-sm text-ink-soft leading-relaxed block">{{ detail.description }}</text>
        </view>
      </view>

      <!-- Images -->
      <view v-if="detail.images && detail.images.length > 0" class="px-4 mt-4">
        <view class="bg-white rounded-2xl p-4">
          <text class="font-medium text-foreground mb-3 block">凭证图片</text>
          <view class="flex gap-2 flex-wrap">
            <view v-for="(img, index) in detail.images" :key="index" class="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center relative overflow-hidden">
              <image v-if="!imgErrors[index]" :src="img" mode="aspectFill" class="w-full h-full object-cover rounded-lg" @error="imgErrors[index] = true" />
              <text v-else class="text-lg text-muted-foreground"></text>
            </view>
          </view>
        </view>
      </view>

      <!-- Appeal Tips -->
      <view class="px-4 mt-4">
        <view class="rounded-2xl p-4" style="background: linear-gradient(90deg, #FFF7ED, #FFFBF5); border: 1px solid rgba(251,191,36,0.2);">
          <view class="flex items-start gap-3">
            <view class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style="background: rgba(251,191,36,0.1);">
              <text class="text-[#FBBF24]"></text>
            </view>
            <view>
              <text class="font-medium text-foreground mb-1 block">对结果有异议？</text>
              <text class="text-sm text-ink-soft leading-relaxed block">如果您对驳回结果有疑问，可以发起申诉，我们会安排专人重新审核您的售后申请。</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Contact Customer Service -->
      <view class="px-4 mt-4">
        <view @click="goTo('/pages/support/chat/index')" class="w-full bg-white rounded-2xl p-4 flex items-center justify-between">
          <view class="flex items-center gap-3">
            <view class="w-10 h-10 rounded-full flex items-center justify-center" style="background: rgba(201,169,110,0.1);">
              <text class="text-accent">📞</text>
            </view>
            <view class="text-left">
              <text class="font-medium text-foreground block">联系客服</text>
              <text class="text-xs text-muted-foreground block">在线客服为您解答</text>
            </view>
          </view>
          <text class="text-[#CCCCCC]">›</text>
        </view>
      </view>

      <!-- Bottom Buttons -->
      <view class="fixed bottom-0 left-0 right-0 bg-white p-4 space-y-3" style="border-top: 1px solid #E8E0D5; padding-bottom: calc(16px + env(safe-area-inset-bottom));">
        <view class="flex gap-3">
          <view @click="goTo('/pages/shop/after-sale/index?orderId=' + detail.orderId)" class="flex-1 py-3 text-primary rounded-xl font-medium flex items-center justify-center gap-2 text-center" style="border: 1px solid #C41E3A;">
            <text></text>
            <text>重新申请</text>
          </view>
          <view @click="goTo('/pages/shop/dispute/index?afterSaleId=' + detail.id)" class="flex-1 py-3 text-white rounded-xl font-medium flex items-center justify-center gap-2 text-center" style="background: linear-gradient(90deg, #C41E3A, #E53E3E);">
            <text></text>
            <text>我要申诉</text>
          </view>
        </view>
        <view @click="goTo('/pages/orders/id-detail/index?id=' + detail.orderId)" class="w-full py-3 bg-background text-ink-soft rounded-xl text-sm text-center">
          查看订单详情
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
  timeline: TimelineItem[]; createdAt: string; canCancel: boolean; rejectReason?: string
}

const mockDetail: AfterSaleDetail = {
  id: 'as001', orderId: 'order001', orderNo: '202401150001', type: 'refund_only',
  status: 'rejected', reason: '商品质量问题', amount: 168,
  description: '收到商品后发现印刷模糊，影响阅读体验',
  images: ['/placeholder.svg', '/placeholder.svg'],
  product: { id: 'p1', name: '周易六十四卦详解（精装典藏版）', cover: '/placeholder.svg', skuName: '精装版', price: 168, quantity: 1 },
  timeline: [
    { status: 'submitted', title: '提交申请', time: '2024-01-15 10:30', isCurrent: false },
    { status: 'reviewing', title: '商家审核', time: '2024-01-15 14:20', isCurrent: false },
    { status: 'rejected', title: '申请驳回', description: '商家已驳回您的售后申请', time: '2024-01-16 09:15', isCurrent: true },
  ],
  rejectReason: '经核实，您购买的商品为正品且印刷清晰，不符合退款条件。商品在发货前已经过严格质检，如有疑问请联系客服进一步沟通。',
  createdAt: '2024-01-15 10:30', canCancel: false,
}

const loading = ref(true)
const detail = ref<AfterSaleDetail | null>(null)
const copied = ref(false)
const productCoverError = ref(false)
const imgErrors = ref<Record<number, boolean>>({})

onMounted(() => {
  setTimeout(() => {
    detail.value = mockDetail
    loading.value = false
  }, 500)
})

function handleCopy(text: string) {
  uni.setClipboardData({ data: text })
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function goTo(url: string) { uni.navigateTo({ url }) }
function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
