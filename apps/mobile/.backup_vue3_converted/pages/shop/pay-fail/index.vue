<template>
  <view class="min-h-screen bg-background">
    <!-- Loading -->
    <view v-if="!loaded" class="min-h-screen bg-background flex items-center justify-center">
      <view class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </view>

    <template v-else>
      <!-- Red top -->
      <view class="relative overflow-hidden pt-16 pb-24 px-4" style="background: linear-gradient(180deg, #C41E3A, #E8534A);">
        <view class="absolute top-10 right-10 w-32 h-32 border border-white/10 rounded-full" />
        <view class="absolute top-20 right-20 w-20 h-20 border border-white/10 rounded-full" />
        <view class="flex flex-col items-center">
          <view class="relative">
            <view class="absolute inset-0 w-24 h-24 rounded-full bg-white/20 animate-ping" style="animation-duration: 2s;" />
            <view class="relative w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg" style="animation:payFailShake 0.5s ease-in-out">
              <text class="text-4xl text-primary">✕</text>
            </view>
          </view>
          <text class="mt-6 text-2xl font-bold text-white block">{{ failInfo.title }}</text>
          <view class="mt-2 text-white/90">
            <text class="text-sm">¥</text>
            <text class="text-3xl font-bold ml-1">{{ parseFloat(amount).toFixed(2) }}</text>
          </view>
        </view>
      </view>

      <!-- Fail Reason -->
      <view class="px-4 -mt-12 relative z-10">
        <view class="bg-white rounded-2xl shadow-sm p-6">
          <view class="flex items-center gap-3 pb-4" style="border-bottom: 1px solid #E8E0D5;">
            <view class="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-primary text-xl">
              <text>{{ failInfo.icon }}</text>
            </view>
            <view>
              <text class="font-medium text-foreground block">{{ failInfo.title }}</text>
              <text class="text-sm text-muted-foreground mt-0.5 block">{{ failInfo.desc }}</text>
            </view>
          </view>
          <view class="mt-4 space-y-3">
            <view class="flex justify-between text-sm">
              <text class="text-muted-foreground">订单编号</text>
              <text class="text-foreground font-mono">{{ orderId || '—' }}</text>
            </view>
            <view class="flex justify-between text-sm">
              <text class="text-muted-foreground">失败时间</text>
              <text class="text-foreground">{{ currentTime }}</text>
            </view>
          </view>
          <view class="mt-6 space-y-3" style="padding-bottom:calc(16px + env(safe-area-inset-bottom))">
            <view @click="goTo('/pages/shop/paying/index?orderId=' + orderId)"
              class="w-full py-3.5 text-white rounded-xl font-medium flex items-center justify-center gap-2 text-center active:opacity-80 active:scale-[0.98]"
              style="background: linear-gradient(90deg, #C41E3A, #E8534A);">
              <text></text>
              <text>重新支付</text>
            </view>
            <view @click="goTo('/pages/shop/checkout/index?orderId=' + orderId)"
              class="w-full py-3.5 bg-background text-foreground rounded-xl font-medium flex items-center justify-center gap-2 text-center active:opacity-80 active:scale-[0.98]">
              <text></text>
              <text>换个方式支付</text>
            </view>
            <view @click="goTo('/pages/orders/id-detail/index?id=' + orderId)"
              class="w-full py-3.5 text-ink-soft rounded-xl font-medium flex items-center justify-center gap-2 text-center active:opacity-80">
              <text></text>
              <text>查看订单详情</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Tips -->
      <view class="px-4 mt-6">
        <view class="bg-orange-50 rounded-xl p-4">
          <view class="flex items-start gap-3">
            <text class="text-orange-500 flex-shrink-0 mt-0.5"></text>
            <view class="text-sm text-orange-700">
              <text class="font-medium mb-1 block">温馨提示</text>
              <text class="text-orange-600 block">• 请检查支付账户余额是否充足</text>
              <text class="text-orange-600 block">• 确保网络连接稳定后重试</text>
              <text class="text-orange-600 block">• 如多次失败，请尝试其他支付方式</text>
              <text class="text-orange-600 block">• 订单将保留30分钟，请尽快完成支付</text>
            </view>
          </view>
        </view>
      </view>

      <view class="px-4 py-8 text-center">
        <text @click="goTo('/pages/shop/index')" class="text-muted-foreground text-sm">返回商城首页</text>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const orderId = ref('')
const amount = ref('0')
const currentTime = ref('')

const failReasons: Record<string, { title: string; desc: string; icon: string }> = {
  insufficient_balance: { title: '余额不足', desc: '您的账户余额不足以完成本次支付', icon: '' },
  timeout: { title: '支付超时', desc: '支付时间已超过限制，请重新发起支付', icon: '' },
  cancelled: { title: '支付已取消', desc: '您已取消本次支付', icon: '' },
  network_error: { title: '网络异常', desc: '网络连接出现问题，请检查网络后重试', icon: '' },
  default: { title: '支付失败', desc: '支付过程中出现问题，请稍后重试', icon: '' },
}

const loaded = ref(false)
const failInfo = ref<{ title: string; desc: string; icon: string }>(failReasons.default)

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  if (currentPage && currentPage.$page && currentPage.$page.options) {
    const options = currentPage.$page.options
    orderId.value = options.orderId || ''
    const reason = options.reason || 'default'
    amount.value = options.amount || '0'
    failInfo.value = failReasons[reason] || failReasons.default
  }
  currentTime.value = new Date().toLocaleString('zh-CN')
  loaded.value = true
})

function goTo(url: string) { uni.navigateTo({ url }) }
function goBack() { uni.navigateBack() }
</script>

<style scoped>
@keyframes payFailShake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}
</style>
