<template>
  <view class="min-h-screen bg-background">
    <!-- Loading Skeleton -->
    <view v-if="loading" class="px-4 pt-4 animate-pulse">
      <view class="bg-white rounded-2xl overflow-hidden mb-4">
        <view class="p-4">
          <view class="flex gap-3">
            <view class="w-20 h-20 rounded-xl bg-[#E8E0D5]" />
            <view class="flex-1">
              <view class="h-4 bg-[#E8E0D5] rounded w-3/4 mb-2" />
              <view class="h-3 bg-[#E8E0D5] rounded w-1/4 mb-1" />
              <view class="h-3 bg-[#E8E0D5] rounded w-1/3" />
            </view>
          </view>
        </view>
        <view class="px-4 py-3" style="border-top: 1px solid #E8E0D5;">
          <view class="h-4 bg-[#E8E0D5] rounded w-1/2" />
        </view>
        <view class="px-4 py-3" style="border-top: 1px solid #E8E0D5; background: rgba(249,250,251,0.5);">
          <view class="h-4 bg-[#E8E0D5] rounded w-2/3 mb-2" />
          <view class="h-4 bg-[#E8E0D5] rounded w-1/2" />
        </view>
      </view>
      <view class="bg-white rounded-2xl p-4 mb-4">
        <view class="flex items-center gap-3">
          <view class="w-10 h-10 rounded-full bg-[#E8E0D5]" />
          <view class="flex-1">
            <view class="h-4 bg-[#E8E0D5] rounded w-1/3 mb-1" />
            <view class="h-3 bg-[#E8E0D5] rounded w-1/4" />
          </view>
        </view>
      </view>
      <view class="bg-white rounded-2xl p-4">
        <view class="h-12 bg-[#E8E0D5] rounded-xl mb-3" />
        <view class="h-12 bg-[#E8E0D5] rounded-xl" />
      </view>
    </view>

    <template v-else>
      <!-- Success Header -->
      <view class="relative overflow-hidden pt-12 pb-24 px-4 text-center" style="background: linear-gradient(135deg, #22C55E, #16A34A);">
        <view class="absolute inset-0 opacity-10">
          <view v-for="i in 6" :key="i" class="absolute w-32 h-32 border border-white/20 rounded-full"
            :style="{ left: (20 + i * 15) + '%', top: (10 + (i % 3) * 30) + '%', transform: 'scale(' + (0.5 + i * 0.2) + ')' }" />
        </view>
        <view :class="['relative transition-all duration-700', showAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4']">
          <view class="w-20 h-20 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg relative">
            <text class="text-4xl text-green-500"></text>
            <view v-if="showAnimation" class="absolute inset-0 rounded-full border-4 border-white/50 animate-ping" style="animation-duration: 1.5s; animation-iteration-count: 2;" />
          </view>
          <text class="text-2xl font-bold text-white mb-2 block">拼团成功</text>
          <text class="text-white/80 text-sm block">恭喜您，已成功拼团！</text>
        </view>
      </view>

      <!-- Content -->
      <view class="px-4 -mt-16 pb-32 space-y-4">
        <!-- Product Card -->
        <view :class="['bg-white rounded-2xl shadow-sm overflow-hidden transition-all duration-500', showAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4']" style="transition-delay: 200ms;">
          <view class="p-4">
            <view class="flex gap-3">
              <view class="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                <text class="text-2xl text-muted-foreground">📦</text>
              </view>
              <view class="flex-1 min-w-0">
                <text class="font-medium text-foreground line-clamp-2 mb-2 block">{{ result.productName }}</text>
                <view class="flex items-baseline gap-2">
                  <text class="text-primary font-bold text-lg">¥{{ result.price }}</text>
                  <text class="text-muted-foreground text-sm line-through">¥{{ result.originalPrice }}</text>
                  <text class="bg-orange-100 text-orange-600 text-xs px-1.5 py-0.5 rounded">省¥{{ result.originalPrice - result.price }}</text>
                </view>
              </view>
            </view>
          </view>
          <!-- Members -->
          <view class="px-4 py-3" style="border-top: 1px solid #E8E0D5;">
            <view class="flex items-center justify-between">
              <text class="text-sm text-ink-soft">成团成员</text>
              <view class="flex items-center gap-1">
                <view class="flex -space-x-2">
                  <view v-for="member in result.members" :key="member.id" class="w-7 h-7 rounded-full border-2 border-white bg-[#E8E0D5] flex items-center justify-center">
                    <text class="text-[10px] text-ink-soft">{{ member.name[0] }}</text>
                  </view>
                </view>
                <text class="text-sm text-ink-soft ml-2">共{{ result.members.length }}人</text>
              </view>
            </view>
          </view>
          <!-- Time Info -->
          <view class="px-4 py-3 bg-gray-50/50" style="border-top: 1px solid #E8E0D5;">
            <view class="flex justify-between text-sm mb-2">
              <text class="text-muted-foreground">成团时间</text>
              <text class="text-ink-soft">{{ result.completedAt }}</text>
            </view>
            <view class="flex justify-between text-sm">
              <text class="text-muted-foreground">订单编号</text>
              <view class="flex items-center gap-1">
                <text class="text-ink-soft">{{ result.orderId }}</text>
                <view @click="handleCopy(result.orderId)" class="text-primary">
                  <text v-if="copied" class="text-sm">✓</text>
                  <text v-else class="text-sm"></text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- Shipping Info -->
        <view :class="['bg-white rounded-2xl p-4 transition-all duration-500', showAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4']" style="transition-delay: 300ms;">
          <view class="flex items-center gap-3">
            <view class="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
              <text class="text-blue-500">📦</text>
            </view>
            <view class="flex-1">
              <text class="font-medium text-foreground block">预计发货时间</text>
              <text class="text-sm text-ink-soft block">{{ result.estimatedShipDate }}（工作日）</text>
            </view>
          </view>
        </view>

        <!-- Share for Coupon -->
        <view :class="['rounded-2xl p-4 transition-all duration-500', showAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4']" style="transition-delay: 400ms; background: linear-gradient(90deg, #F97316, #EF4444);">
          <view class="flex items-center justify-between">
            <view class="flex items-center gap-3 text-white">
              <view class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <text class="text-lg">🎁</text>
              </view>
              <view>
                <text class="font-medium block">分享得优惠券</text>
                <text class="text-sm text-white/80 block">邀请好友拼团，获10元优惠券</text>
              </view>
            </view>
            <view @click="handleShare" class="bg-white text-orange-500 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1">
              <text></text>
              <text>分享</text>
            </view>
          </view>
        </view>

        <!-- Actions -->
        <view :class="['space-y-3 transition-all duration-500', showAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4']" style="transition-delay: 500ms; padding-bottom:calc(16px + env(safe-area-inset-bottom));">
          <view @click="goTo('/pages/orders/id-detail/index?id=' + result.orderId)" class="w-full py-3.5 bg-primary text-white rounded-xl font-medium flex items-center justify-center gap-2">
            <text>查看订单</text>
            <text>›</text>
          </view>
          <view @click="goTo('/pages/shop/index')" class="w-full py-3.5 bg-white text-ink-soft rounded-xl font-medium text-center" style="border: 1px solid #E8E0D5;">
            继续逛逛
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface GroupBuyResult {
  id: string; productName: string; productCover: string; price: number; originalPrice: number
  members: { id: string; name: string; avatar: string }[]; completedAt: string; orderId: string; estimatedShipDate: string
}

const mockResult: GroupBuyResult = {
  id: '1', productName: '周易六十四卦详解（精装典藏版）', productCover: '/placeholder.svg',
  price: 128, originalPrice: 298,
  members: [
    { id: '1', name: '张三', avatar: '/placeholder.svg' },
    { id: '2', name: '李四', avatar: '/placeholder.svg' },
    { id: '3', name: '王五', avatar: '/placeholder.svg' },
  ],
  completedAt: '2024-01-15 14:30:00', orderId: 'GB202401150001', estimatedShipDate: '2024-01-17',
}

const result = ref<GroupBuyResult | null>(null)
const copied = ref(false)
const showAnimation = ref(false)
const loading = ref(true)

onMounted(() => {
  result.value = mockResult
  setTimeout(() => { showAnimation.value = true }, 100)
  setTimeout(() => { loading.value = false }, 300)
})

function handleCopy(text: string) {
  uni.setClipboardData({ data: text })
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function handleShare() {
  uni.showToast({ title: '分享功能开发中', icon: 'none' })
}

function goTo(url: string) { uni.navigateTo({ url }) }
function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
