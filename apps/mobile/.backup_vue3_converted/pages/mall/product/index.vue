<template>
  <view class="min-h-screen bg-background pb-24">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-40 bg-white border-b border-border shadow-sm">
      <view class="flex items-center justify-between h-12 px-4">
        <view class="p-1 -ml-1" @click="goBack">
          <text class="text-xl text-foreground">←</text>
        </view>
        <text class="text-base font-semibold text-foreground">商品详情</text>
        <view class="flex items-center gap-2">
          <view class="w-8 h-8 flex items-center justify-center" @click="handleShare">
            <text class="text-lg text-foreground"></text>
          </view>
        </view>
      </view>
    </view>

    <!-- 加载骨架 -->
    <view v-if="loading" class="animate-pulse">
      <view class="w-full aspect-square bg-[#E8E0D5]" />
      <view class="p-4">
        <view class="h-8 bg-[#E8E0D5] rounded w-1/3 mb-2" />
        <view class="h-5 bg-[#E8E0D5] rounded w-2/3 mb-2" />
        <view class="h-4 bg-[#E8E0D5] rounded w-1/4 mb-4" />
        <view class="flex gap-3 mb-4">
          <view v-for="i in 3" :key="i" class="flex-1 h-8 bg-[#E8E0D5] rounded-lg" />
        </view>
        <view class="flex items-center gap-3 mb-4">
          <view class="h-8 w-8 bg-[#E8E0D5] rounded-lg" />
          <view class="h-6 w-12 bg-[#E8E0D5] rounded" />
          <view class="h-8 w-8 bg-[#E8E0D5] rounded-lg" />
        </view>
        <view class="h-32 bg-[#E8E0D5] rounded-xl mb-4" />
        <view class="grid grid-cols-2 gap-3">
          <view v-for="i in 4" :key="i" class="h-16 bg-[#E8E0D5] rounded-xl" />
        </view>
      </view>
    </view>

    <scroll-view v-else scroll-y class="flex-1">
      <!-- 商品轮播图 -->
      <swiper :indicator-dots="true" :autoplay="true" :interval="4000" :current="activeImage" @change="(e: any) => activeImage = e.detail.current" class="w-full aspect-square bg-[#F2EFEA]" indicator-color="#ddd" indicator-active-color="#C41E3A">
        <swiper-item v-for="(img, index) in images" :key="index">
          <view class="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center relative">
            <text class="text-7xl">{{ img.emoji }}</text>
            <view class="absolute bottom-4 right-4 bg-black/40 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur">{{ index + 1 }}/{{ images.length }}</view>
          </view>
        </swiper-item>
      </swiper>

      <!-- 商品信息 -->
      <view class="bg-white px-4 py-4 mb-2">
        <view class="flex items-baseline gap-2 mb-2">
          <text class="text-2xl font-bold text-primary">¥{{ product.price }}</text>
          <text class="text-sm text-muted-foreground line-through">¥{{ product.originalPrice }}</text>
          <view class="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] rounded font-medium">{{ product.discount }}% OFF</view>
          <view class="ml-auto flex items-center gap-0.5">
            <text class="text-accent text-xs"></text>
            <text class="text-xs text-muted-foreground">{{ product.rating }}</text>
            <text class="text-[10px] text-muted-foreground">({{ product.reviewCount }}评价)</text>
          </view>
        </view>
        <text class="text-base font-semibold text-foreground block leading-relaxed">{{ product.title }}</text>
        <text class="text-sm text-muted-foreground mt-1 block">{{ product.subtitle }}</text>
        <view class="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <text>已售 {{ formatNum(product.sales) }}</text>
          <text>库存 {{ product.stock > 0 ? product.stock : '充足' }}</text>
          <text>浏览 {{ formatNum(product.views) }}</text>
          <text v-if="product.stock > 0 && product.stock < 50" class="text-primary">仅剩 {{ product.stock }} 件</text>
        </view>
      </view>

      <!-- 促销信息 -->
      <view class="bg-white mx-0 px-4 py-3 mb-2 border-b border-border">
        <view class="flex items-center gap-2 mb-2">
          <text class="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded font-medium">满减</text>
          <text class="text-xs text-foreground">满200减30 · 满500减100</text>
        </view>
        <view class="flex items-center gap-2">
          <text class="text-[10px] bg-accent text-white px-1.5 py-0.5 rounded font-medium">赠品</text>
          <text class="text-xs text-foreground">购书即送电子版学习资料</text>
        </view>
      </view>

      <!-- 规格选择 -->
      <view class="bg-white px-4 py-3 mb-2">
        <view v-for="spec in specs" :key="spec.name" class="mb-3 last:mb-0">
          <text class="text-xs font-medium text-foreground block mb-2.5">{{ spec.name }}</text>
          <view class="flex flex-wrap gap-2.5">
            <view v-for="opt in spec.options" :key="opt" :class="'px-3.5 py-2 rounded-xl text-xs border transition-all '+(spec.selected===opt?'border-primary bg-primary/10 text-primary font-medium shadow-sm':'border-border text-ink-soft bg-background')" @click="spec.selected=opt">{{ opt }}</view>
          </view>
        </view>
      </view>

      <!-- 数量选择 -->
      <view class="bg-white px-4 py-3 mb-2 flex items-center justify-between">
        <text class="text-sm font-medium text-foreground">数量</text>
        <view class="flex items-center gap-4">
          <view :class="'w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-colors '+(quantity<=1?'bg-secondary text-[#ccc]':'bg-primary/10 text-primary active:bg-primary/20')" @click="decreaseQty">−</view>
          <text class="text-lg font-semibold text-foreground w-8 text-center">{{ quantity }}</text>
          <view :class="'w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-colors '+(quantity>=10?'bg-secondary text-[#ccc]':'bg-primary/10 text-primary active:bg-primary/20')" @click="increaseQty">+</view>
        </view>
      </view>

      <!-- 商品详情 -->
      <view class="bg-white px-4 py-4 mb-2">
        <view class="flex items-center gap-2 mb-4">
          <view class="w-1 h-4 bg-primary rounded-full" />
          <text class="text-sm font-semibold text-foreground"> 商品详情</text>
        </view>
        <text class="text-sm text-ink-soft leading-relaxed">{{ product.description }}</text>
        <view class="mt-4 space-y-3">
          <view v-for="detail in detailImages" :key="detail.label" class="bg-background rounded-xl p-4 border border-border">
            <view class="flex items-center gap-2 mb-2">
              <text class="text-base">{{ detail.label.split(' ')[0] }}</text>
              <text class="text-sm font-medium text-foreground">{{ detail.label.replace(/^[\S]+\s/, '') }}</text>
            </view>
            <text class="text-xs text-ink-soft leading-relaxed whitespace-pre-line">{{ detail.content }}</text>
          </view>
        </view>
      </view>

      <!-- 服务保障 -->
      <view class="bg-white px-4 py-4 mb-2">
        <view class="flex items-center gap-2 mb-4">
          <view class="w-1 h-4 bg-accent rounded-full" />
          <text class="text-sm font-semibold text-foreground">🛡️ 服务保障</text>
        </view>
        <view class="grid grid-cols-2 gap-3">
          <view v-for="svc in services" :key="svc.label" class="flex items-center gap-3 bg-background rounded-xl p-3.5 border border-border">
            <text class="text-xl">{{ svc.icon }}</text>
            <view>
              <text class="text-xs font-medium text-foreground">{{ svc.label }}</text>
              <text class="text-[10px] text-muted-foreground block mt-0.5">{{ svc.desc }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 商家信息 -->
      <view class="bg-white px-4 py-4 mb-2">
        <view class="flex items-center gap-3">
          <view class="w-11 h-11 rounded-full bg-gradient-to-br from-accent to-[#E8D5A3] flex items-center justify-center text-white font-bold text-base">商</view>
          <view class="flex-1 min-w-0">
            <view class="flex items-center gap-2">
              <text class="text-sm font-medium text-foreground">{{ merchant.name }}</text>
              <text class="px-1.5 py-0.5 bg-green-50 text-green-600 text-[10px] rounded-full">官方</text>
            </view>
            <text class="text-xs text-muted-foreground block mt-0.5">{{ merchant.desc }}</text>
          </view>
          <text class="text-xs text-primary font-medium" @click="goMerchant">进店 ›</text>
        </view>
        <view class="flex items-center gap-4 mt-3 pt-3 border-t border-[#FAF8F5]">
          <text class="text-[10px] text-muted-foreground">商品 {{ merchant.productCount }} 件</text>
          <text class="text-[10px] text-muted-foreground">好评率 {{ merchant.goodRate }}%</text>
          <text class="text-[10px] text-muted-foreground">回复时效 {{ merchant.responseTime }}</text>
        </view>
      </view>

      <view class="h-6" />
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="fixed bottom-0 left-0 right-0 bg-white border-t border-border px-4 py-3 flex items-center gap-3 z-30 shadow-lg" style="padding-bottom: calc(12px + env(safe-area-inset-bottom))">
      <view class="flex items-center gap-4 pr-2">
        <view class="text-center" @click="toggleFavorite">
          <text :class="'text-xl ' + (favorited ? 'text-primary' : 'text-muted-foreground')">{{ favorited ? '❤' : '🤍' }}</text>
          <text class="text-[10px] text-muted-foreground block mt-0.5">收藏</text>
        </view>
        <view class="text-center" @click="handleShare">
          <text class="text-xl text-muted-foreground"></text>
          <text class="text-[10px] text-muted-foreground block mt-0.5">分享</text>
        </view>
      </view>
      <view class="flex-1 h-12 rounded-2xl bg-accent/20 text-accent font-medium text-sm flex items-center justify-center active:bg-accent/30" @click="handleAddToCart">
        <text>加入购物车</text>
      </view>
      <view class="flex-1 h-12 rounded-2xl bg-gradient-to-r from-primary to-[#E74C3C] text-white font-medium text-sm flex items-center justify-center shadow-md shadow-primary/20 active:opacity-90" @click="handleBuyNow">
        <text>立即购买</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const loading = ref(true)
const activeImage = ref(0)
const quantity = ref(1)
const favorited = ref(false)

const images = ref([
  { emoji: '📦' },
  { emoji: '' },
  { emoji: '' },
  { emoji: '' },
])

const product = ref({
  title: '紫微斗数全书（精装版）',
  subtitle: '紫微斗数入门必读经典，含星曜详解、命盘解读、四化飞星',
  price: 98,
  originalPrice: 168,
  discount: 42,
  sales: 1856,
  stock: 200,
  views: 5680,
  rating: 4.8,
  reviewCount: 523,
  description: '紫微斗数全书是学习紫微斗数的经典教材，内容涵盖紫微斗数基础知识、命盘解读、星曜详解等。本书采用精装印刷，纸张优良，是紫微斗数爱好者的必备读物。全书共分为十二章，从基础理论到实战应用，循序渐进，适合各个层次的读者学习。'
})

const specs = ref([
  { name: '版本', options: ['标准版 ¥68', '精装版 ¥98', '典藏版 ¥168'], selected: '精装版 ¥98' },
  { name: '套餐', options: ['单册', '套装(含工具包) +¥30', '套装(含视频课) +¥99'], selected: '单册' },
])

const services = ref([
  { icon: '🛡️', label: '正品保障', desc: '假一赔十' },
  { icon: '🚚', label: '急速发货', desc: '48小时内发出' },
  { icon: '', label: '7天退换', desc: '无理由退换货' },
  { icon: '', label: '品质认证', desc: '平台严选好物' },
])

const detailImages = ref([
  { label: ' 内容简介', content: '本书系统整理了紫微斗数的核心理论体系，包括紫微星、天机星、太阳星、武曲星、天府星等主星的特性解析，以及十二宫的详细解读方法。全书配有大量图表和案例，便于读者理解和掌握。' },
  { label: ' 适合人群', content: '紫微斗数初学者、进阶学习者、命理研究者、传统文化爱好者。零基础也可轻松入门，循序渐进掌握紫微斗数核心知识。' },
  { label: ' 目录概览', content: '第一章：紫微斗数基础概论\n第二章：十四主星详解\n第三章：十二宫解读方法\n第四章：四化飞星与命盘联动\n第五章：命盘实战案例分析\n第六章：流年与大运推断' },
  { label: '📏 商品参数', content: '出版社：国学出版社\n出版时间：2023年12月\nISBN：978-7-XXXX-XXXX-X\n装帧：精装\n页数：456页\n开本：16开' },
])

const merchant = ref({
  name: '国学书店',
  desc: '正版国学书籍 · 品质保证 · 诚信经营',
  productCount: 128,
  goodRate: 99.2,
  responseTime: '5分钟内'
})

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

function decreaseQty() {
  if (quantity.value > 1) quantity.value--
}
function increaseQty() {
  if (quantity.value < 10) quantity.value++
}

setTimeout(() => { loading.value = false }, 600)

function toggleFavorite() {
  favorited.value = !favorited.value
  uni.showToast({ title: favorited.value ? '已收藏' : '已取消收藏', icon: 'success' })
}
function goBack() { uni.navigateBack() }
function handleShare() { uni.showToast({ title: '分享已开启', icon: 'none' }) }
function handleAddToCart() { uni.showToast({ title: '已加入购物车', icon: 'success' }) }
function handleBuyNow() { uni.navigateTo({ url: '/pages/courses/purchase-confirm/index' }) }
function goMerchant() { uni.showToast({ title: '进入店铺', icon: 'none' }) }
</script>
<style scoped>
/* 样式由 Tailwind 处理 */
</style>
