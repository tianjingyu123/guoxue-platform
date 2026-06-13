<template>
  <view class="min-h-screen" style="background: linear-gradient(180deg, #4CAF50, #45a049);">
    <!-- Loading -->
    <view v-if="!orderInfo" class="min-h-screen flex items-center justify-center">
      <view class="w-16 h-16 bg-white rounded-full animate-pulse" />
    </view>

    <template v-else>
      <!-- Success Animation -->
      <view class="pt-16 pb-8 flex flex-col items-center">
        <view :class="['relative w-24 h-24 mb-6 transition-all duration-500', showAnimation ? 'scale-100 opacity-100' : 'scale-50 opacity-0']">
          <view class="absolute inset-0 bg-white rounded-full shadow-lg" />
          <view :class="['absolute inset-0 flex items-center justify-center transition-all duration-700 delay-300', showAnimation ? 'scale-100' : 'scale-0']">
            <text class="text-5xl text-green-500"></text>
          </view>
          <view :class="['absolute inset-0 rounded-full border-4 border-white/30 transition-all duration-1000', showAnimation ? 'scale-150 opacity-0' : 'scale-100 opacity-100']" />
        </view>
        <text :class="['text-2xl font-bold text-white mb-2 transition-all duration-500 delay-200', showAnimation ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0']">
          支付成功
        </text>
        <view :class="['text-center transition-all duration-500 delay-300', showAnimation ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0']">
          <text class="text-4xl font-bold text-white mb-1 block">¥{{ orderInfo.amount.toFixed(2) }}</text>
          <text class="text-white/80 text-sm">{{ orderInfo.payMethod }} · {{ orderInfo.itemCount }}件商品</text>
        </view>
      </view>

      <!-- Card Area -->
      <view class="bg-background rounded-t-3xl min-h-[60vh] p-4">
        <!-- Order Info -->
        <view :class="['bg-white rounded-2xl p-4 shadow-sm mb-4 transition-all duration-500 delay-400', showAnimation ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0']">
          <view class="flex items-center justify-between py-3" style="border-bottom: 1px solid #E8E0D5;">
            <text class="text-ink-soft">订单编号</text>
            <view class="flex items-center gap-2">
              <text class="text-foreground font-medium">{{ orderInfo.orderId }}</text>
              <view @click="handleCopy" class="text-primary text-sm flex items-center gap-1">
                <text class="text-sm">{{ copied ? '✓' : '' }}</text>
                <text>{{ copied ? '已复制' : '复制' }}</text>
              </view>
            </view>
          </view>
          <view class="flex items-center justify-between py-3" style="border-bottom: 1px solid #E8E0D5;">
            <text class="text-ink-soft">支付方式</text>
            <text class="text-foreground">{{ orderInfo.payMethod }}</text>
          </view>
          <view class="flex items-center justify-between py-3">
            <text class="text-ink-soft">支付时间</text>
            <text class="text-foreground">{{ orderInfo.paidAt }}</text>
          </view>
        </view>

        <!-- Action Buttons -->
        <view :class="['space-y-3 mb-6 transition-all duration-500 delay-500', showAnimation ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0']">
          <view @click="goTo('/pages/orders/id-detail/index?id=' + orderInfo.orderId)" class="w-full py-4 bg-primary text-white rounded-xl font-medium flex items-center justify-center gap-2">
            <text>️</text>
            <text>查看订单</text>
          </view>
          <view @click="goTo('/pages/index/index')" class="w-full py-4 bg-white text-foreground rounded-xl font-medium flex items-center justify-center gap-2" style="border: 1px solid #E8E0D5;">
            <text>🏠</text>
            <text>返回首页</text>
          </view>
        </view>

        <!-- Recommendation -->
        <view :class="['transition-all duration-500 delay-600', showAnimation ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0']">
          <text class="text-ink-soft text-sm mb-3 block">猜你喜欢</text>
          <view class="bg-white rounded-2xl overflow-hidden">
            <view @click="goTo('/pages/shop/index')" class="w-full p-4 flex items-center gap-3">
              <view class="w-10 h-10 flex items-center justify-center rounded-xl text-white" style="background: linear-gradient(135deg, #C41E3A, #e85a6b);">
                <text>🎁</text>
              </view>
              <view class="flex-1 text-left">
                <text class="text-foreground font-medium block">更多好物</text>
                <text class="text-muted-foreground text-sm block">发现更多国学精品</text>
              </view>
              <text class="text-muted-foreground">›</text>
            </view>
          </view>
        </view>

        <!-- Footer -->
        <view class="mt-8 text-center text-muted-foreground text-xs">
          <text class="block">如有问题请联系客服</text>
          <text class="block mt-1">感谢您的支持，祝您学习愉快！</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const orderInfo = ref<{
  orderId: string; amount: number; payMethod: string; paidAt: string; itemCount: number
} | null>(null)
const copied = ref(false)
const showAnimation = ref(false)

onMounted(() => {
  setTimeout(() => { showAnimation.value = true }, 100)
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const orderId = currentPage?.$page?.options?.orderId || '202401150001'
  orderInfo.value = {
    orderId,
    amount: 344,
    payMethod: '微信支付',
    paidAt: new Date().toLocaleString('zh-CN'),
    itemCount: 2,
  }
})

function handleCopy() {
  if (orderInfo.value) {
    uni.setClipboardData({ data: orderInfo.value.orderId })
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
