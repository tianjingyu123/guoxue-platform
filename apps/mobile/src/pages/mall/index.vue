<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const quickEntries = [
  { id: 'orders', label: '我的订单', badge: 0 },
  { id: 'cart', label: '购物车', badge: 3 },
  { id: 'coupons', label: '优惠券', badge: 2 },
  { id: 'favorites', label: '我的收藏', badge: 0 },
]
const banners = [
  { id: 1, title: '新人专享', subtitle: '首单立减20元', from: '#C41E3A', to: '#A01530' },
  { id: 2, title: '国学典籍', subtitle: '周易全系列8折', from: '#C9A96E', to: '#B8956A' },
  { id: 3, title: '开运饰品', subtitle: '买二赠一', from: '#2563EB', to: '#1D4ED8' },
]
const categories = [
  { id: 'books', name: '书籍' },
  { id: 'culture', name: '文创' },
  { id: 'jewelry', name: '饰品' },
  { id: 'peripheral', name: '周边' },
  { id: 'tools', name: '工具' },
  { id: 'incense', name: '香道' },
  { id: 'tea', name: '茶器' },
  { id: 'all', name: '全部' },
]
const commerceLives = [
  { id: 1, title: '开光吉祥物专场', host: '福缘阁主', viewers: 8920, isLive: true },
  { id: 2, title: '周易古籍珍藏版专场', host: '古籍书阁', viewers: 4150, isLive: true },
  { id: 3, title: '手工罗盘制作与售卖', host: '匠心堂', time: '明天14:00', reservations: 526, isLive: false },
]
const products = [
  { id: 1, title: '周易正义·十三经注疏本', cover: '/images/circles/circle-1.jpg', price: 68, originalPrice: 128, sales: 2341, tag: '热销' },
  { id: 2, title: '紫微斗数全书（精装版）', cover: '/images/circles/circle-2.jpg', price: 98, originalPrice: 168, sales: 1856, tag: '新品' },
  { id: 3, title: '太极八卦铜摆件', cover: '/images/circles/circle-3.jpg', price: 168, originalPrice: 298, sales: 892, tag: '' },
  { id: 4, title: '天然黑曜石貔貅手链', cover: '/images/circles/circle-1.jpg', price: 128, originalPrice: 258, sales: 1523, tag: '热销' },
  { id: 5, title: '檀香木罗盘摆件', cover: '/images/circles/circle-2.jpg', price: 388, originalPrice: 588, sales: 456, tag: '' },
  { id: 6, title: '梅花易数入门', cover: '/images/circles/circle-3.jpg', price: 45, originalPrice: 78, sales: 3201, tag: '秒杀' },
  { id: 7, title: '六爻铜钱套装（古法铸造）', cover: '/images/circles/circle-1.jpg', price: 88, originalPrice: 128, sales: 2156, tag: '' },
  { id: 8, title: '沉香线香礼盒', cover: '/images/circles/circle-2.jpg', price: 168, originalPrice: 268, sales: 678, tag: '新品' },
  { id: 9, title: '奇门遁甲精义', cover: '/images/circles/circle-3.jpg', price: 88, originalPrice: 148, sales: 1234, tag: '' },
  { id: 10, title: '紫水晶七星阵', cover: '/images/circles/circle-1.jpg', price: 298, originalPrice: 498, sales: 345, tag: '热销' },
  { id: 11, title: '风水罗盘专业版', cover: '/images/circles/circle-2.jpg', price: 688, originalPrice: 988, sales: 234, tag: '' },
  { id: 12, title: '四库全书·术数类', cover: '/images/circles/circle-3.jpg', price: 268, originalPrice: 398, sales: 567, tag: '' },
]

const searchQuery = ref('')
const currentBanner = ref(0)

let bannerTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  bannerTimer = setInterval(() => {
    currentBanner.value = (currentBanner.value + 1) % banners.length
  }, 4000)
})
onUnmounted(() => { if (bannerTimer) clearInterval(bannerTimer) })

function formatSales(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}
function goEntry(id: string) { uni.navigateTo({ url: `/pages/mall/${id}` }) }
function goCategory(id: string) { uni.navigateTo({ url: id === 'all' ? '/pages/mall/category' : `/pages/mall/category?cat=${id}` }) }
function goProduct(id: number) { uni.navigateTo({ url: `/pages/mall/detail?id=${id}` }) }
function goLive(id: number) { uni.navigateTo({ url: `/pages/live/room?id=${id}` }) }
</script>

<template>
  <view class="min-h-screen bg-background pb-6">

    <!-- 顶部搜索 -->
    <view class="sticky top-0 z-30 bg-background border-b border-border">
      <view class="px-4 py-3 flex items-center gap-2">
        <view class="flex-1 relative">
          <view class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg class="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </view>
          <input
            v-model="searchQuery"
            placeholder="搜索商品"
            class="w-full h-10 pl-10 pr-4 rounded-full bg-secondary text-sm text-foreground"
            placeholder-class="text-muted-foreground"
          />
        </view>
        <view class="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
          <text class="text-xs font-bold text-primary">AI</text>
        </view>
      </view>
    </view>

    <view class="px-4 space-y-5 pt-4">

      <!-- 功能快捷入口 4宫格 -->
      <view class="grid grid-cols-4 gap-3">
        <view
          v-for="entry in quickEntries"
          :key="entry.id"
          class="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-card relative"
          @tap="goEntry(entry.id)"
        >
          <view class="w-10 h-10 rounded-full bg-secondary flex items-center justify-center relative">
            <!-- 订单 -->
            <svg v-if="entry.id === 'orders'" class="w-5 h-5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            <!-- 购物车 -->
            <svg v-else-if="entry.id === 'cart'" class="w-5 h-5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <!-- 优惠券 -->
            <svg v-else-if="entry.id === 'coupons'" class="w-5 h-5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/>
            </svg>
            <!-- 收藏 -->
            <svg v-else class="w-5 h-5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <!-- badge -->
            <view
              v-if="entry.badge > 0"
              class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center"
            >
              <text class="text-[10px] text-primary-foreground font-bold">{{ entry.badge }}</text>
            </view>
          </view>
          <text class="text-xs text-foreground">{{ entry.label }}</text>
        </view>
      </view>

      <!-- 电商直播 -->
      <view>
        <view class="flex items-center justify-between mb-3">
          <view class="flex items-center gap-2">
            <svg class="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
            </svg>
            <text class="font-semibold text-foreground">直播带货</text>
            <view class="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
          </view>
          <navigator url="/pages/live/list?type=commerce" class="flex items-center text-xs text-muted-foreground">
            <text>更多</text>
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </navigator>
        </view>
        <scroll-view scroll-x class="pb-1">
          <view class="flex gap-2.5">
            <view
              v-for="live in commerceLives"
              :key="live.id"
              class="flex-shrink-0 w-32 bg-card rounded-xl overflow-hidden"
              @tap="goLive(live.id)"
            >
              <view class="relative aspect-[9/16]">
                <image src="/static/placeholder.svg" class="w-full h-full" mode="aspectFill" />
                <view v-if="live.isLive" class="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary">
                  <view class="w-1 h-1 rounded-full bg-primary-foreground animate-pulse" />
                  <text class="text-[10px] text-primary-foreground">直播中</text>
                </view>
                <view v-else class="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-black/50">
                  <text class="text-[10px] text-white">{{ live.time }}</text>
                </view>
              </view>
              <view class="p-2">
                <text class="text-[11px] font-medium text-foreground line-clamp-1 block">{{ live.title }}</text>
                <text class="text-[10px] text-muted-foreground block mt-0.5">{{ live.host }}</text>
                <text v-if="live.isLive" class="text-[10px] text-muted-foreground block">{{ live.viewers?.toLocaleString() }}人观看</text>
                <text v-else class="text-[10px] text-muted-foreground block">{{ live.reservations }}人预约</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- Banner 轮播 -->
      <view class="relative">
        <swiper
          class="rounded-xl overflow-hidden"
          style="height: 120px"
          autoplay
          interval="4000"
          circular
          :current="currentBanner"
          @change="(e: any) => currentBanner = e.detail.current"
        >
          <swiper-item v-for="banner in banners" :key="banner.id" class="px-0.5">
            <view
              class="w-full h-full rounded-xl flex flex-col justify-center px-5"
              :style="`background: linear-gradient(135deg, ${banner.from}, ${banner.to})`"
            >
              <text class="text-white text-xl font-bold block">{{ banner.title }}</text>
              <text class="text-white/80 text-sm block mt-1">{{ banner.subtitle }}</text>
            </view>
          </swiper-item>
        </swiper>
        <view class="flex justify-center gap-1.5 mt-3">
          <view
            v-for="(_, idx) in banners"
            :key="idx"
            class="h-1.5 rounded-full transition-all"
            :class="idx === currentBanner ? 'w-4 bg-primary' : 'w-1.5 bg-muted-foreground/30'"
          />
        </view>
      </view>

      <!-- 商品分类 8宫格 -->
      <view>
        <view class="flex items-center justify-between mb-3">
          <text class="font-semibold text-foreground">商品分类</text>
          <navigator url="/pages/mall/category" class="flex items-center text-xs text-muted-foreground">
            <text>全部分类</text>
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </navigator>
        </view>
        <view class="grid grid-cols-4 gap-3">
          <view
            v-for="cat in categories"
            :key="cat.id"
            class="flex flex-col items-center gap-1.5 py-2.5 rounded-lg bg-card"
            @tap="goCategory(cat.id)"
          >
            <view class="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <text class="text-sm text-foreground font-medium">{{ cat.name[0] }}</text>
            </view>
            <text class="text-xs text-foreground">{{ cat.name }}</text>
          </view>
        </view>
      </view>

      <!-- 为你推荐 商品双列 -->
      <view>
        <text class="font-semibold text-foreground block mb-3">为你推荐</text>
        <view class="grid grid-cols-2 gap-2">
          <view
            v-for="product in products"
            :key="product.id"
            class="bg-card rounded-xl overflow-hidden"
            @tap="goProduct(product.id)"
          >
            <view class="relative aspect-square">
              <image :src="product.cover" class="w-full h-full" mode="aspectFill" />
              <view v-if="product.tag" class="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-primary">
                <text class="text-[10px] text-primary-foreground font-medium">{{ product.tag }}</text>
              </view>
            </view>
            <view class="p-2.5">
              <text class="text-[13px] text-foreground line-clamp-2 block">{{ product.title }}</text>
              <view class="flex items-baseline gap-1.5 mt-1.5">
                <text class="text-primary font-bold">¥{{ product.price }}</text>
                <text class="text-xs text-muted-foreground line-through">¥{{ product.originalPrice }}</text>
              </view>
              <text class="text-[11px] text-muted-foreground block mt-0.5">已售{{ formatSales(product.sales) }}件</text>
            </view>
          </view>
        </view>
      </view>

    </view>
  </view>
</template>
