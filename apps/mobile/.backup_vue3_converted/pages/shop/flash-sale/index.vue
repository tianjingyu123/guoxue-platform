<template>
  <view class="min-h-screen" style="background: linear-gradient(180deg, #C41E3A, #8B0000);">
    <!-- Header -->
    <view class="sticky top-0 z-20 px-4 py-3 flex items-center gap-3" style="background: linear-gradient(90deg, #C41E3A, #E85050);">
      <view @click="goBack" class="w-8 h-8 flex items-center justify-center rounded-full bg-white/20">
        <text class="text-lg text-white">←</text>
      </view>
      <view class="flex items-center gap-2">
        <text class="text-lg text-yellow-300">⚡</text>
        <text class="text-lg font-bold text-white">限时秒杀</text>
      </view>
    </view>

    <!-- 时间段选择 -->
    <view class="px-4 py-3 overflow-x-auto">
      <view class="flex gap-2 min-w-max">
        <view
          v-for="slot in timeSlots"
          :key="slot.id"
          @click="activeSlot = slot.id"
          :class="['px-4 py-2 rounded-full text-sm font-medium transition-all', activeSlot === slot.id ? 'bg-white text-primary shadow-lg' : 'bg-white/20 text-white/80']"
        >
          <text class="block">{{ slot.label }}</text>
          <text class="text-xs mt-0.5 block">{{ getSlotStatus(slot.id) }}</text>
        </view>
      </view>
    </view>

    <!-- 倒计时 -->
    <view class="mx-4 mb-4 rounded-2xl p-4" style="background: rgba(0,0,0,0.3); backdrop-filter: blur(8px);">
      <!-- 滚动通知 -->
      <view v-if="showNotice" class="flex items-center gap-2 mb-3 pb-3" style="border-bottom: 1px solid rgba(255,255,255,0.1);">
        <text class="text-base text-yellow-300 flex-shrink-0"></text>
        <view class="flex-1 overflow-hidden">
          <text class="text-xs text-white/80 block whitespace-nowrap">用户 138****8888 刚刚抢到了「周易六十四卦详解」 | 用户 156****6666 抢购成功 | 限时秒杀，手慢无！</text>
        </view>
        <view @click="showNotice = false" class="text-white/50 text-xs">关闭</view>
      </view>

      <view class="flex items-center justify-between">
        <view class="flex items-center gap-2">
          <text class="text-lg text-orange-400 animate-pulse"></text>
          <text class="text-white font-medium">距离结束还剩</text>
        </view>
        <view class="flex items-center gap-1">
          <view class="bg-white text-primary px-2 py-1 rounded font-mono font-bold text-lg min-w-[32px] text-center">
            {{ String(countdown.hours).padStart(2, '0') }}
          </view>
          <text class="text-white font-bold animate-pulse">:</text>
          <view class="bg-white text-primary px-2 py-1 rounded font-mono font-bold text-lg min-w-[32px] text-center">
            {{ String(countdown.minutes).padStart(2, '0') }}
          </view>
          <text class="text-white font-bold animate-pulse">:</text>
          <view class="bg-white text-primary px-2 py-1 rounded font-mono font-bold text-lg min-w-[32px] text-center">
            {{ String(countdown.seconds).padStart(2, '0') }}
          </view>
        </view>
      </view>
    </view>

    <!-- 商品列表 -->
    <view class="bg-background rounded-t-3xl min-h-[60vh] p-4">
      <view v-if="loading" class="grid grid-cols-2 gap-3">
        <view v-for="i in 4" :key="i" class="bg-white rounded-2xl p-3 animate-pulse">
          <view class="aspect-square bg-gray-200 rounded-xl mb-3" />
          <view class="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <view class="h-4 bg-gray-200 rounded w-1/2" />
        </view>
      </view>
      <view v-else-if="products.length === 0" class="flex flex-col items-center justify-center py-16">
        <text class="text-4xl text-gray-300 mb-4"></text>
        <text class="text-muted-foreground">该时段暂无秒杀商品</text>
      </view>
      <view v-else class="grid grid-cols-2 gap-3">
        <view
          v-for="product in products"
          :key="product.id"
          @click="goTo('/pages/shop/id-detail/index?id=' + product.id + '&flashSale=true')"
          class="bg-white rounded-2xl p-3 shadow-sm cursor-pointer"
        >
          <!-- 图片 -->
          <view class="relative aspect-square mb-3">
            <view class="w-full h-full bg-background rounded-xl flex items-center justify-center">
              <text class="text-2xl text-muted-foreground">📦</text>
            </view>
            <text v-if="product.sold / product.stock >= 0.8" class="absolute top-2 left-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">即将售罄</text>
            <view class="absolute top-2 right-2 bg-primary text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              <text>⚡</text>
              <text>秒杀</text>
            </view>
          </view>

          <!-- 信息 -->
          <text class="text-sm font-medium text-foreground line-clamp-2 mb-2 block h-10">{{ product.name }}</text>

          <!-- 价格 -->
          <view class="flex items-baseline gap-2 mb-2">
            <text class="text-lg font-bold text-primary">¥{{ product.price }}</text>
            <text class="text-xs text-muted-foreground line-through">¥{{ product.originalPrice }}</text>
          </view>

          <!-- 进度条 -->
          <view class="mb-3">
            <view class="h-4 bg-[#FFE4E4] rounded-full overflow-hidden relative">
              <view class="h-full rounded-full transition-all duration-500" :style="{ width: Math.round(product.sold / product.stock * 100) + '%', background: 'linear-gradient(90deg, #C41E3A, #FF6B6B)' }" />
              <text class="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">已抢{{ Math.round(product.sold / product.stock * 100) }}%</text>
            </view>
          </view>

          <!-- 抢购按钮 -->
          <view
            @click.stop="handleRush(product.id)"
            :class="['w-full py-2.5 rounded-full text-sm font-medium text-center', Math.round(product.sold / product.stock * 100) >= 100 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : rushingProductId === product.id ? 'bg-primary text-white' : 'text-white']"
            :style="Math.round(product.sold / product.stock * 100) < 100 && rushingProductId !== product.id ? 'background: linear-gradient(90deg, #C41E3A, #E85050);' : ''"
          >
            <text v-if="rushingProductId === product.id">抢购中...</text>
            <text v-else-if="Math.round(product.sold / product.stock * 100) >= 100">已抢光</text>
            <text v-else>立即抢购</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

interface FlashProduct {
  id: string; name: string; cover: string; price: number; originalPrice: number; stock: number; sold: number
}

interface FlashSale {
  id: string; title: string; startTime: string; endTime: string; status: string; products: FlashProduct[]
}

const timeSlots = [
  { id: '10', label: '10:00', time: '10:00:00' },
  { id: '14', label: '14:00', time: '14:00:00' },
  { id: '18', label: '18:00', time: '18:00:00' },
  { id: '20', label: '20:00', time: '20:00:00' },
  { id: '22', label: '22:00', time: '22:00:00' },
]

const mockFlashSales: FlashSale[] = [
  {
    id: '1', title: '限时秒杀',
    startTime: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    endTime: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
    status: 'ongoing',
    products: [
      { id: 'p1', name: '周易六十四卦详解', cover: '/placeholder.svg', price: 68, originalPrice: 168, stock: 100, sold: 78 },
      { id: 'p2', name: '紫微斗数入门', cover: '/placeholder.svg', price: 38, originalPrice: 98, stock: 50, sold: 45 },
      { id: 'p3', name: '风水入门指南', cover: '/placeholder.svg', price: 28, originalPrice: 88, stock: 200, sold: 156 },
      { id: 'p4', name: '八字命理基础', cover: '/placeholder.svg', price: 48, originalPrice: 128, stock: 80, sold: 62 },
    ],
  },
]

const activeSlot = ref('14')
const flashSales = ref<FlashSale[]>([])
const loading = ref(true)
const countdown = ref({ hours: 0, minutes: 0, seconds: 0 })
const rushingProductId = ref<string | null>(null)
const showNotice = ref(true)

const currentSale = computed(() => flashSales.value[0])
const products = computed(() => currentSale.value?.products || [])

let countdownTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  loadFlashSales()
  countdownTimer = setInterval(updateCountdown, 1000)
})

onBeforeUnmount(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})

import { computed } from 'vue'

function updateCountdown() {
  const sale = flashSales.value[0]
  if (!sale) return
  const end = new Date(sale.endTime).getTime()
  const now = Date.now()
  const diff = Math.max(0, end - now)
  countdown.value = {
    hours: Math.floor(diff / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  }
}

function loadFlashSales() {
  loading.value = true
  setTimeout(() => {
    flashSales.value = mockFlashSales
    loading.value = false
    updateCountdown()
  }, 500)
}

function getSlotStatus(slotId: string): string {
  const now = new Date()
  const hour = parseInt(slotId)
  const curr = now.getHours()
  if (hour <= curr && hour + 2 > curr) return '抢购中'
  if (hour < curr) return '已结束'
  return '即将开始'
}

function handleRush(productId: string) {
  rushingProductId.value = productId
  setTimeout(() => {
    rushingProductId.value = null
    goTo('/pages/shop/checkout/index?productId=' + productId + '&flashSale=true')
  }, 1500)
}

function goTo(url: string) { uni.navigateTo({ url }) }
function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
