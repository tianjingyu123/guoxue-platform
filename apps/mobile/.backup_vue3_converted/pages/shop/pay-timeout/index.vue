<template>
  <view class="min-h-screen bg-background">
    <!-- Header -->
    <view class="sticky top-0 z-10 px-4 py-3 flex items-center" style="background: rgba(255,255,255,0.8); backdrop-filter: blur(8px); border-bottom: 1px solid #E8E0D5;">
      <view @click="goBack" class="p-1 -ml-1">
        <text class="text-lg text-foreground">←</text>
      </view>
      <text class="ml-2 text-lg font-medium text-foreground">支付结果</text>
    </view>

    <!-- Orange Header -->
    <view class="pt-12 pb-20 px-4" style="background: linear-gradient(180deg, #FB923C, #F97316);">
      <view class="flex flex-col items-center">
        <view class="relative mb-6">
          <view class="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
            <text class="text-3xl text-orange-500 animate-pulse"></text>
          </view>
          <view class="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-white/50 animate-spin" style="animation-duration: 2s;" />
        </view>
        <text class="text-2xl font-bold text-white mb-2 block">支付超时</text>
        <text class="text-white/90 text-sm mb-4 block">订单已超时，请重新发起支付</text>
        <view class="text-white/80 text-sm">
          订单金额
          <text class="text-3xl font-bold text-white ml-2">¥{{ amount }}</text>
        </view>
      </view>
    </view>

    <!-- Content -->
    <view class="px-4 -mt-12 pb-32 space-y-4">
      <!-- Reasons -->
      <view class="bg-white rounded-2xl p-4 shadow-sm">
        <view class="flex items-center gap-2 mb-4">
          <text class="text-orange-500"></text>
          <text class="font-medium text-foreground">可能的原因</text>
        </view>
        <view class="space-y-3">
          <view v-for="(reason, index) in timeoutReasons" :key="index" class="flex items-start gap-3 p-3 bg-orange-50 rounded-xl">
            <view class="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <text class="text-orange-600 text-sm">{{ reason.icon }}</text>
            </view>
            <text class="text-sm text-ink-soft leading-relaxed pt-1">{{ reason.text }}</text>
          </view>
        </view>
      </view>

      <!-- Order Info -->
      <view class="bg-white rounded-2xl p-4 shadow-sm">
        <text class="font-medium text-foreground mb-3 block">订单信息</text>
        <view class="space-y-2">
          <view class="flex justify-between items-center py-2">
            <text class="text-sm text-muted-foreground">订单编号</text>
            <text class="text-sm text-foreground font-mono">{{ orderId }}</text>
          </view>
          <view class="flex justify-between items-center py-2" style="border-top: 1px solid #E8E0D5;">
            <text class="text-sm text-muted-foreground">超时时间</text>
            <text class="text-sm text-ink-soft">{{ currentTime }}</text>
          </view>
          <view class="flex justify-between items-center py-2" style="border-top: 1px solid #E8E0D5;">
            <text class="text-sm text-muted-foreground">订单状态</text>
            <text class="text-sm text-orange-500 font-medium">待支付</text>
          </view>
        </view>
      </view>

      <!-- Tips -->
      <view class="bg-blue-50 rounded-xl p-4" style="border: 1px solid #DBEAFE;">
        <view class="flex items-start gap-2">
          <view class="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <text class="text-white text-xs font-bold">!</text>
          </view>
          <view class="text-sm text-blue-700 leading-relaxed">
            <text class="font-medium mb-1 block">温馨提示</text>
            <text class="block">如您已完成支付但显示超时，资金会在1-3个工作日内原路退回。如有疑问请联系客服。</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Bottom Buttons -->
    <view class="fixed bottom-0 left-0 right-0 bg-white p-4 space-y-3" style="border-top: 1px solid #E8E0D5; padding-bottom: calc(16px + env(safe-area-inset-bottom));">
      <view @click="goTo('/pages/shop/paying/index?orderId=' + orderId)"
        class="w-full py-3 text-white font-medium rounded-xl flex items-center justify-center gap-2"
        style="background: linear-gradient(90deg, #C41E3A, #E53935);">
        <text></text>
        <text>重新支付</text>
      </view>
      <view class="flex gap-3">
        <view @click="goTo('/pages/shop/checkout/index?orderId=' + orderId)"
          class="flex-1 py-3 text-ink-soft font-medium rounded-xl flex items-center justify-center gap-2" style="border: 1px solid #E8E0D5;">
          <text>🔀</text>
          <text>换个支付方式</text>
        </view>
        <view @click="goTo('/pages/orders/id-detail/index?id=' + orderId)"
          class="flex-1 py-3 text-ink-soft font-medium rounded-xl flex items-center justify-center gap-2" style="border: 1px solid #E8E0D5;">
          <text></text>
          <text>查看订单</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const timeoutReasons = [
  { icon: '📶', text: '网络连接不稳定，请检查网络后重试' },
  { icon: '', text: '银行卡单笔/单日限额，请尝试换卡支付' },
  { icon: '', text: '支付App未响应，请确保支付App正常运行' },
]

const orderId = ref('')
const amount = ref('0')
const currentTime = ref('')

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  if (currentPage && currentPage.$page && currentPage.$page.options) {
    orderId.value = currentPage.$page.options.orderId || 'ORD20241201123456'
    amount.value = currentPage.$page.options.amount || '344.00'
  }
  currentTime.value = new Date().toLocaleString('zh-CN')
})

function goTo(url: string) { uni.navigateTo({ url }) }
function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
