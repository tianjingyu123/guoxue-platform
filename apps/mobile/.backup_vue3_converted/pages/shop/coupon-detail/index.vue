<template>
  <!-- 骨架屏 -->
  <view v-if="loading" class="min-h-screen bg-background">
    <view class="sticky top-0 z-20 bg-white px-4 py-3 h-14" style="border-bottom: 1px solid #E8E0D5;" />
    <view class="p-4 space-y-4">
      <view v-for="i in 3" :key="i" class="bg-white rounded-2xl h-32 animate-pulse" />
    </view>
  </view>

  <!-- 主内容 -->
  <view v-else class="min-h-screen bg-background">
    <!-- 导航栏 -->
    <view class="sticky top-0 z-20 bg-white px-4 py-3 flex items-center gap-3" style="border-bottom: 1px solid #E8E0D5;">
      <view @click="goBack" class="p-2 -ml-2">
        <text class="text-lg text-foreground">←</text>
      </view>
      <text class="text-lg font-semibold text-foreground">优惠券详情</text>
    </view>

    <view class="p-4">
      <!-- 优惠券大卡片 -->
      <view class="rounded-2xl p-6 text-white mb-6 shadow-lg" style="background: linear-gradient(90deg, #C41E3A, #E74C57);">
        <view class="flex items-start justify-between mb-4">
          <view>
            <view class="text-4xl font-bold">{{ coupon.value }}</view>
            <view class="text-sm mt-1 opacity-90">元</view>
          </view>
          <view class="text-right text-sm">
            <view>满{{ coupon.minAmount }}元可用</view>
            <view class="opacity-90 text-xs mt-1">至 {{ coupon.expireAt }}</view>
          </view>
        </view>
        <view class="text-sm" style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 12px;">{{ coupon.description }}</view>
      </view>

      <!-- 优惠券代码 -->
      <view class="bg-white rounded-2xl p-4 mb-6">
        <view class="flex items-center justify-between">
          <view>
            <view class="text-xs text-muted-foreground mb-2">优惠券代码</view>
            <view class="font-mono text-lg text-foreground font-semibold">{{ coupon.id }}</view>
          </view>
          <view @click="handleCopy" class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg" hover-class="press-opacity-80">
            <text v-if="copied" class="text-sm">✓ 已复制</text>
            <text v-else class="text-sm"> 复制</text>
          </view>
        </view>
      </view>

      <!-- 使用说明 -->
      <view class="bg-white rounded-2xl p-4 mb-6">
        <view class="font-semibold text-foreground mb-4">使用说明</view>
        <view class="space-y-3">
          <view v-for="(rule, idx) in coupon.rules" :key="idx" class="flex gap-3 text-sm">
            <view class="text-primary font-semibold flex-shrink-0">•</view>
            <view class="text-ink-soft">{{ rule }}</view>
          </view>
        </view>
      </view>

      <!-- 适用商品 -->
      <view class="mb-6">
        <view class="bg-white px-4 py-3" style="border-bottom: 1px solid #E8E0D5; border-radius: 16px 16px 0 0;">
          <view class="font-semibold text-foreground">适用商品/课程</view>
        </view>
        <view class="bg-white" style="border-radius: 0 0 16px 16px;">
          <view
            v-for="item in applicableItems"
            :key="item.id"
            @click="goTo(item.type === 'product' ? '/pages/shop/id-detail/index?id=' + item.id : '/pages/courses/' + item.id)"
            class="w-full p-4 flex gap-3" style="border-bottom: 1px solid #E8E0D5;" hover-class="press-opacity-70"
          >
            <view class="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0" />
            <view class="flex-1 min-w-0">
              <view class="flex items-center gap-2 mb-1">
                <text :class="['text-xs', item.type === 'product' ? 'text-muted-foreground' : 'text-accent']">{{ item.type === 'product' ? ' 商品' : ' 课程' }}</text>
              </view>
              <view class="font-medium text-foreground line-clamp-2 text-sm mb-1">{{ item.name }}</view>
              <view class="text-primary font-semibold">￥{{ item.price }}</view>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部按钮 -->
      <view
        @click="handleUse"
        class="w-full text-center text-white font-semibold py-4 rounded-2xl mb-8"
        style="background: linear-gradient(90deg, #C41E3A, #E74C57);"
        hover-class="press-opacity-90"
      >
        立即使用
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface ApplicableItem { id: string; type: 'product' | 'course'; name: string; image: string; price: number }

const loading = ref(true)
const copied = ref(false)

const coupon = {
  id: '1',
  name: '新人立减50元',
  type: 'amount',
  value: 50,
  minAmount: 200,
  expireAt: '2024-12-31',
  description: '新用户首次下单享受优惠，满200元减50元',
  rules: [
    '新用户首次购物订单享受',
    '单笔订单满200元可使用',
    '不与其他优惠叠加使用',
    '仅限商品购买，不适用课程',
  ],
}

const applicableItems: ApplicableItem[] = [
  { id: '1', type: 'product', name: '周易六十四卦详解（精装典藏版）', image: '/placeholder.svg', price: 298 },
  { id: '2', type: 'product', name: '紫微斗数入门教程', image: '/placeholder.svg', price: 128 },
  { id: '3', type: 'course', name: '八字基础入门课', image: '/placeholder.svg', price: 299 },
  { id: '4', type: 'product', name: '易经风水运势解读', image: '/placeholder.svg', price: 188 },
]

onMounted(() => {
  setTimeout(() => { loading.value = false }, 500)
})

function handleCopy() {
  uni.setClipboardData({ data: coupon.id })
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function handleUse() {
  goTo('/pages/shop/index')
}

function goTo(url: string) { uni.navigateTo({ url }) }
function goBack() { uni.navigateBack() }
</script>

<style scoped>
.press-opacity-80:active { opacity: 0.8; }
.press-opacity-70:active { opacity: 0.7; }
.press-opacity-90:active { opacity: 0.9; }
</style>
