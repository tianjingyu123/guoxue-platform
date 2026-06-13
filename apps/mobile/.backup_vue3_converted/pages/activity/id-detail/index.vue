<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
      <view @click="goBack" class="w-8 h-8 flex items-center justify-center">
        <text class="text-foreground text-lg">←</text>
      </view>
      <text class="text-base font-semibold text-foreground">{{ activityConfig.title }}</text>
      <view @click="showShareModal = true" class="w-8 h-8 flex items-center justify-center">
        <text class="text-foreground text-lg">↗</text>
      </view>
    </view>

    <scroll-view scroll-y class="pb-4">
      <!-- Banner -->
      <view v-if="sortedModules.some(m => m.type === 'banner')" class="relative">
        <view class="aspect-[2/1] bg-gradient-to-br from-primary/30 via-accent/20 to-primary/10 relative overflow-hidden">
          <view
            v-for="(banner, index) in activityConfig.banners"
            :key="banner.id"
            :class="['absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-500', currentBanner === index ? 'opacity-100' : 'opacity-0']"
          >
            <text class="text-2xl font-bold text-foreground">{{ banner.title }}</text>
            <text class="text-sm text-muted-foreground mt-2">{{ banner.subtitle }}</text>
          </view>
          <!-- 轮播指示器 -->
          <view class="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5">
            <view
              v-for="(_, index) in activityConfig.banners"
              :key="index"
              :class="['w-1.5 h-1.5 rounded-full transition-all', currentBanner === index ? 'w-4 bg-primary' : 'bg-white/50']"
            />
          </view>
        </view>
      </view>

      <!-- Countdown -->
      <view v-if="sortedModules.some(m => m.type === 'countdown')" class="px-4 py-3">
        <view class="p-4 bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 border border-primary/20 rounded-xl">
          <view class="flex items-center justify-between">
            <view class="flex items-center gap-2">
              <text class="text-primary">🕐</text>
              <text class="text-sm font-medium text-foreground">距离活动结束</text>
            </view>
            <view class="flex items-center gap-1">
              <text class="w-8 h-8 rounded bg-primary text-white text-sm font-bold flex items-center justify-center">{{ countdown.days }}</text>
              <text class="text-foreground">天</text>
              <text class="w-8 h-8 rounded bg-primary text-white text-sm font-bold flex items-center justify-center">{{ countdown.hours.toString().padStart(2, "0") }}</text>
              <text class="text-foreground">:</text>
              <text class="w-8 h-8 rounded bg-primary text-white text-sm font-bold flex items-center justify-center">{{ countdown.minutes.toString().padStart(2, "0") }}</text>
              <text class="text-foreground">:</text>
              <text class="w-8 h-8 rounded bg-primary text-white text-sm font-bold flex items-center justify-center">{{ countdown.seconds.toString().padStart(2, "0") }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Rules -->
      <view v-if="sortedModules.some(m => m.type === 'rules')" class="px-4">
        <view class="overflow-hidden rounded-xl border border-border bg-white">
          <view @click="rulesExpanded = !rulesExpanded" class="flex items-center justify-between w-full p-3">
            <text class="font-medium text-sm text-foreground">活动规则</text>
            <text class="text-muted-foreground">{{ rulesExpanded ? '▲' : '▼' }}</text>
          </view>
          <view v-if="rulesExpanded" class="px-3 pb-3 text-sm text-muted-foreground border-t border-border pt-3">
            <text class="block">1. 活动时间：2024年11月1日00:00 - 11月11日23:59</text>
            <text class="block">2. 活动期间，全场课程低至5折，部分商品参与满减活动</text>
            <text class="block">3. 新用户注册即送100国学币，可抵扣任意订单</text>
            <text class="block">4. 分享活动页面给好友，好友注册成功后双方各得50国学币</text>
            <text class="block">5. 本活动最终解释权归平台所有</text>
          </view>
        </view>
      </view>

      <!-- Coupons -->
      <view v-if="sortedModules.some(m => m.type === 'coupons')" class="py-4">
        <view class="flex items-center justify-between px-4 mb-3">
          <view class="flex items-center gap-2">
            <text class="text-accent">🎁</text>
            <text class="font-semibold text-base text-foreground">优惠券专区</text>
          </view>
          <view @click="goTo('/pages/coupons/index')" class="text-xs text-muted-foreground flex items-center gap-1">
            <text>我的券 →</text>
          </view>
        </view>
        <scroll-view scroll-x class="px-4 pb-2" show-scrollbar="false">
          <view class="flex gap-3">
            <view
              v-for="coupon in coupons"
              :key="coupon.id"
              :class="['flex-shrink-0 w-36 rounded-lg overflow-hidden border', coupon.claimed ? 'border-border bg-secondary/50' : 'border-primary/30 bg-gradient-to-br from-primary/10 to-accent/5']"
            >
              <view class="p-3 text-center">
                <view :class="['text-2xl font-bold', coupon.claimed ? 'text-muted-foreground' : 'text-primary']">
                  <text class="text-sm">¥</text>{{ coupon.amount }}
                </view>
                <text class="text-[10px] text-muted-foreground mt-0.5 block">{{ coupon.condition }}</text>
                <text class="text-[10px] text-muted-foreground block">{{ coupon.scope }}</text>
              </view>
              <view
                @click="!coupon.claimed && handleClaimCoupon(coupon.id)"
                :class="['w-full py-2 text-xs font-medium text-center', coupon.claimed ? 'bg-secondary text-muted-foreground' : 'bg-primary text-white']"
              >
                <text>{{ coupon.claimed ? '已领取' : '立即领取' }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- Seckill -->
      <view v-if="sortedModules.some(m => m.type === 'seckill')" class="py-4">
        <view class="flex items-center justify-between px-4 mb-3">
          <view class="flex items-center gap-2">
            <text class="text-primary">⚡️</text>
            <text class="font-semibold text-base text-foreground">限时秒杀</text>
            <view class="bg-danger text-white text-[10px] px-1.5 py-0 rounded">
              <text>抢购中</text>
            </view>
          </view>
          <view @click="goTo('/pages/seckill/index')" class="text-xs text-muted-foreground flex items-center gap-1">
            <text>更多 →</text>
          </view>
        </view>
        <scroll-view scroll-x class="px-4 pb-2" show-scrollbar="false">
          <view class="flex gap-3">
            <view
              v-for="product in activityConfig.seckillProducts"
              :key="product.id"
              class="flex-shrink-0 w-32"
              @click="goTo('/pages/course/' + product.id + '/index')"
            >
              <view class="rounded-xl overflow-hidden border border-border bg-white">
                <view class="aspect-[4/3] bg-secondary flex items-center justify-center relative">
                  <text class="text-accent/60 text-4xl"></text>
                  <view class="absolute top-1 right-1 bg-primary text-white text-[10px] px-1 py-0 rounded">
                    <text>{{ Math.round((1 - product.seckillPrice / product.originalPrice) * 100) }}%OFF</text>
                  </view>
                </view>
                <view class="p-2">
                  <text class="text-xs font-medium text-foreground line-clamp-1 block">{{ product.title }}</text>
                  <view class="flex items-baseline gap-1 mt-1">
                    <text class="text-sm text-primary font-bold">¥{{ product.seckillPrice }}</text>
                    <text class="text-[10px] text-muted-foreground line-through">¥{{ product.originalPrice }}</text>
                  </view>
                  <view class="mt-1.5">
                    <view class="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <view class="h-full bg-gradient-to-r from-primary to-accent rounded-full" :style="{ width: (product.sold / product.stock) * 100 + '%' }" />
                    </view>
                    <text class="text-[10px] text-muted-foreground mt-0.5 block">已抢{{ Math.round((product.sold / product.stock) * 100) }}%</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- Products -->
      <view v-if="sortedModules.some(m => m.type === 'products')" class="py-4">
        <view class="flex items-center gap-2 px-4 mb-3">
          <text class="text-accent">🎁</text>
          <text class="font-semibold text-base text-foreground">活动精选</text>
        </view>
        <view class="grid grid-cols-2 gap-3 px-4">
          <view
            v-for="product in activityConfig.products"
            :key="product.id"
            @click="goTo(product.type === 'course' ? '/pages/course/' + product.id + '/index' : '/pages/mall/product/' + product.id + '/index')"
            class="rounded-xl overflow-hidden border border-border bg-white"
          >
            <view class="aspect-[4/3] bg-secondary flex items-center justify-center relative">
              <text class="text-4xl" :class="product.type === 'course' ? 'text-accent/60' : 'text-primary/60'">{{ product.type === 'course' ? '' : '' }}</text>
              <view :class="['absolute top-1 left-1 text-[10px] px-1.5 py-0 rounded border-0', product.type === 'course' ? 'bg-accent/20 text-accent' : 'bg-primary/20 text-primary']">
                <text>{{ product.type === 'course' ? '课程' : '商品' }}</text>
              </view>
            </view>
            <view class="p-2.5">
              <text class="text-sm font-medium text-foreground line-clamp-2 block">{{ product.title }}</text>
              <view class="flex items-baseline gap-1.5 mt-1.5">
                <text class="text-base text-primary font-bold">¥{{ product.price }}</text>
                <text class="text-xs text-muted-foreground line-through">¥{{ product.originalPrice }}</text>
              </view>
              <text class="text-[10px] text-muted-foreground mt-0.5 block">{{ product.sales }}人已购</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Ranking -->
      <view v-if="sortedModules.some(m => m.type === 'ranking')" class="py-4 px-4">
        <view class="rounded-xl overflow-hidden border border-border bg-white">
          <view class="flex items-center justify-between p-3 border-b border-border">
            <view class="flex items-center gap-2">
              <text class="text-accent"></text>
              <text class="font-semibold text-sm text-foreground">活动排行榜</text>
            </view>
            <view class="flex gap-1">
              <view
                v-for="type in ['consume', 'invite']"
                :key="type"
                @click="rankingType = type"
                :class="['px-3 py-1 text-xs rounded-full transition-colors', rankingType === type ? 'bg-primary text-white' : 'text-muted-foreground bg-transparent']"
              >
                <text>{{ type === 'consume' ? '消费榜' : '邀请榜' }}</text>
              </view>
            </view>
          </view>
          <view class="divide-y divide-border">
            <view
              v-for="(user, index) in activityConfig.ranking.slice(0, 5)"
              :key="user.id"
              @click="goTo('/pages/user/' + user.id + '/index')"
              class="flex items-center gap-3 p-3"
            >
              <view :class="['w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold', index === 0 ? 'bg-accent text-white' : index === 1 ? 'bg-gray-400 text-white' : index === 2 ? 'bg-amber-600 text-white' : 'bg-secondary text-muted-foreground']">
                <text>{{ index + 1 }}</text>
              </view>
              <view class="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                <text class="text-sm text-foreground">{{ user.name[0] }}</text>
              </view>
              <view class="flex-1 min-w-0">
                <text class="text-sm font-medium text-foreground block">{{ user.name }}</text>
              </view>
              <text class="text-sm text-primary font-medium">{{ rankingType === 'consume' ? '¥' + user.amount.toLocaleString() : user.amount + '人' }}</text>
            </view>
          </view>
          <view @click="goTo('/pages/ranking/index')" class="flex items-center justify-center gap-1 p-3 text-xs text-muted-foreground border-t border-border">
            <text>查看完整榜单 →</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 更多精彩 -->
    <view class="px-4 py-6">
      <view @click="goTo('/pages/discover/index')" class="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
        <text>更多精彩内容 →</text>
      </view>
    </view>

    <!-- 底部固定分享栏 -->
    <view class="fixed bottom-0 left-0 right-0 bg-white/95 border-t border-border" style="backdrop-filter:blur(12px);padding-bottom:env(safe-area-inset-bottom)">
      <view class="flex items-center justify-between px-4 h-14">
        <view>
          <text class="text-xs text-muted-foreground block">分享赚国学币</text>
          <text class="text-sm font-medium text-foreground block">好友下单返<text class="text-primary">10%</text>佣金</text>
        </view>
        <view @click="showShareModal = true" class="px-6 py-2 bg-primary text-white text-sm font-medium rounded-full">
          <text>立即分享</text>
        </view>
      </view>
    </view>

    <!-- 分享弹窗 -->
    <view v-if="showShareModal" class="fixed inset-0 z-50 flex items-end justify-center bg-black/60" @click="showShareModal = false">
      <view class="w-full bg-white rounded-t-2xl" @click.stop>
        <view class="p-4 border-b border-border">
          <text class="font-semibold text-center block text-foreground">分享活动</text>
        </view>
        <view class="p-6">
          <view class="flex justify-around">
            <view v-for="item in shareItems" :key="item.key" class="flex flex-col items-center gap-2" @click="handleShare(item.key)">
              <view class="w-12 h-12 rounded-full flex items-center justify-center" :style="{ backgroundColor: item.color }">
                <text class="text-white text-lg">{{ item.icon }}</text>
              </view>
              <text class="text-xs text-muted-foreground">{{ item.label }}</text>
            </view>
          </view>
        </view>
        <view @click="showShareModal = false" class="w-full py-4 text-sm text-muted-foreground text-center border-t border-border">
          <text>取消</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'

// 导航辅助
function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }

// Mock 数据
const activityConfig = {
  id: "double11-2024",
  title: "双十一国学节",
  status: "ongoing",
  startTime: "2024-11-01T00:00:00",
  endTime: "2024-11-11T23:59:59",
  modules: [
    { type: "banner", enabled: true, order: 1 },
    { type: "countdown", enabled: true, order: 2 },
    { type: "rules", enabled: true, order: 3 },
    { type: "coupons", enabled: true, order: 4 },
    { type: "seckill", enabled: true, order: 5 },
    { type: "products", enabled: true, order: 6 },
    { type: "ranking", enabled: true, order: 7 },
  ],
  banners: [
    { id: 1, image: "", title: "双十一国学节", subtitle: "全场课程5折起" },
    { id: 2, image: "", title: "新用户专享", subtitle: "注册即送100国学币" },
  ],
  rules: `
    <h3>活动规则</h3>
    <p>1. 活动时间：2024年11月1日00:00 - 11月11日23:59</p>
    <p>2. 活动期间，全场课程低至5折，部分商品参与满减活动</p>
    <p>3. 新用户注册即送100国学币，可抵扣任意订单</p>
    <p>4. 分享活动页面给好友，好友注册成功后双方各得50国学币</p>
    <p>5. 本活动最终解释权归平台所有</p>
  `,
  coupons: [
    { id: 1, amount: 10, condition: "满99可用", scope: "全部课程", claimed: false },
    { id: 2, amount: 30, condition: "满199可用", scope: "全部商品", claimed: false },
    { id: 3, amount: 50, condition: "满299可用", scope: "通用", claimed: true },
    { id: 4, amount: 111, condition: "满1111可用", scope: "双11专享", claimed: false },
  ],
  seckillProducts: [
    { id: 1, title: "八字入门精讲", originalPrice: 299, seckillPrice: 99, stock: 50, sold: 42, endTime: "2024-11-11T12:00:00" },
    { id: 2, title: "紫微斗数实战", originalPrice: 399, seckillPrice: 149, stock: 30, sold: 28, endTime: "2024-11-11T18:00:00" },
    { id: 3, title: "风水堪舆入门", originalPrice: 199, seckillPrice: 69, stock: 100, sold: 65, endTime: "2024-11-11T20:00:00" },
  ],
  products: [
    { id: 1, type: "course", title: "八字命理系统课", price: 199, originalPrice: 399, sales: 1280, image: "" },
    { id: 2, type: "goods", title: "开运手串礼盒", price: 68, originalPrice: 128, sales: 856, image: "" },
    { id: 3, type: "course", title: "紫微斗数进阶", price: 299, originalPrice: 599, sales: 628, image: "" },
    { id: 4, type: "goods", title: "国学经典书籍套装", price: 158, originalPrice: 298, sales: 456, image: "" },
    { id: 5, type: "course", title: "风水实战案例", price: 149, originalPrice: 299, sales: 324, image: "" },
    { id: 6, type: "goods", title: "古法香道套装", price: 88, originalPrice: 168, sales: 256, image: "" },
  ],
  ranking: [
    { id: 1, name: "周易大师", avatar: "", amount: 12800, type: "consume" },
    { id: 2, name: "张玄风", avatar: "", amount: 8560, type: "consume" },
    { id: 3, name: "陈风水", avatar: "", amount: 6280, type: "consume" },
    { id: 4, name: "李易安", avatar: "", amount: 5120, type: "consume" },
    { id: 5, name: "王道长", avatar: "", amount: 4280, type: "consume" },
  ],
}

// 组件逻辑
const rulesExpanded = ref(false)
const coupons = ref(activityConfig.coupons.map(c => ({ ...c })))
const countdown = ref({ days: 0, hours: 0, minutes: 0, seconds: 0 })
const currentBanner = ref(0)
const rankingType = ref<"consume" | "invite">("consume")

// 排序模块
const sortedModules = [...activityConfig.modules]
  .filter(m => m.enabled)
  .sort((a, b) => a.order - b.order)

// 倒计时
let countdownTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  countdownTimer = setInterval(() => {
    const now = new Date().getTime()
    const end = new Date(activityConfig.endTime).getTime()
    const diff = end - now
    if (diff > 0) {
      countdown.value = {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      }
    }
  }, 1000)
})

// Banner 轮播
let bannerTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  bannerTimer = setInterval(() => {
    currentBanner.value = (currentBanner.value + 1) % activityConfig.banners.length
  }, 4000)
})

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
  if (bannerTimer) clearInterval(bannerTimer)
})

const showShareModal = ref(false)
const shareItems = [
  { key: 'wechat', label: '微信好友', icon: '', color: '#22c55e' },
  { key: 'moments', label: '朋友圈', icon: '🟢', color: '#16a34a' },
  { key: 'poster', label: '生成海报', icon: '️', color: '#C41E3A' },
  { key: 'copy', label: '复制链接', icon: '', color: '#F5F1EB' },
]

const handleClaimCoupon = (couponId: number) => {
  coupons.value = coupons.value.map(c => c.id === couponId ? { ...c, claimed: true } : c)
}

function handleShare(key: string) {
  uni.showToast({ title: '已' + shareItems.find(i => i.key === key)?.label, icon: 'success' })
  showShareModal.value = false
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
