<template>
  <view class="min-h-screen bg-background pb-24">
    <!-- 金色渐变背景装饰 -->
    <view class="absolute top-0 left-0 right-0 h-80 pointer-events-none" style="background:linear-gradient(to bottom, rgba(201,169,110,0.2), rgba(201,169,110,0.1), transparent)" />

    <!-- 顶部导航 -->
    <view class="sticky top-0 z-40 safe-area-pt" style="background:transparent">
      <view class="flex items-center justify-between px-4 h-14">
        <view @tap="uni.navigateBack()"><text class="text-foreground text-xl">‹</text></view>
        <text class="font-semibold text-lg text-foreground">会员中心</text>
        <text class="text-sm text-primary" @tap="goRecords">购买记录</text>
      </view>
    </view>

    <view class="relative z-10 px-4 space-y-6">
      <!-- 会员卡片 -->
      <view class="p-6 rounded-2xl overflow-hidden relative" style="background:linear-gradient(135deg, #C9A96E, #B8935A, rgba(196,30,58,0.8)); box-shadow:0 8px 32px rgba(201,169,110,0.3)">
        <!-- 装饰圆 -->
        <view class="absolute -right-10 -top-10 w-40 h-40 rounded-full border-2 border-white/20 opacity-30" />
        <view class="absolute -right-6 -top-6 w-28 h-28 rounded-full border border-white/15 opacity-20" />

        <view class="relative">
          <view class="flex items-center gap-3 mb-4">
            <view class="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
              <view class="text-white text-2xl"><svg class="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="currentColor"><path d="M2 20h20M5 20V10l7-7 7 7v10"/></svg></view>
            </view>
            <view class="flex-1">
              <view class="flex items-center gap-2">
                <text class="text-xl font-bold text-white">{{ status.level !== 'none' ? status.levelName : '热卜国学VIP' }}</text>
                <view v-if="status.level !== 'none'" class="px-2 py-0.5 rounded bg-white/20">
                  <text class="text-xs text-white uppercase">{{ status.level }}</text>
                </view>
              </view>
              <text class="text-sm text-white/70 block mt-0.5">
                {{ status.level !== 'none'
                  ? (status.isExpired ? '会员已过期' : `有效期至 ${status.expireAt}，还剩 ${status.daysLeft} 天`)
                  : '解锁全部特权，畅享国学智慧' }}
              </text>
            </view>
          </view>

          <!-- 核心数据 -->
          <view class="grid grid-cols-3 gap-4 pt-4 border-t border-white/20">
            <view class="text-center">
              <text class="text-2xl font-bold text-white block">500+</text>
              <text class="text-xs text-white/70">免费课程</text>
            </view>
            <view class="text-center">
              <text class="text-2xl font-bold text-white block">无限</text>
              <text class="text-xs text-white/70">AI对话</text>
            </view>
            <view class="text-center">
              <text class="text-2xl font-bold text-white block">{{ status.points }}</text>
              <text class="text-xs text-white/70">会员积分</text>
            </view>
          </view>

          <!-- 自动续费 -->
          <view v-if="status.level !== 'none'" class="flex items-center justify-between mt-4 pt-4 border-t border-white/20">
            <text class="text-sm text-white/80">自动续费</text>
            <view
              class="w-12 h-6 rounded-full transition-colors flex items-center px-1"
              :style="`background:${status.autoRenew ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}`"
              @tap="toggleAutoRenew"
            >
              <view class="w-4 h-4 rounded-full bg-white shadow transition-all" :style="`transform:translateX(${status.autoRenew ? '24px' : '0'})`" />
            </view>
          </view>
        </view>
      </view>

      <!-- 等级选择 -->
      <view>
        <text class="font-semibold text-base text-foreground block mb-3">选择等级</text>
        <scroll-view scroll-x class="whitespace-nowrap pb-2">
          <view class="flex gap-2 pr-4">
            <view
              v-for="group in planGroups"
              :key="group.level"
              class="flex-shrink-0 px-5 py-2 rounded-full border text-sm font-medium transition-colors"
              :class="selectedLevel === group.level ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground bg-card'"
              @tap="selectLevel(group.level)"
            >
              {{ group.levelName }}
            </view>
          </view>
        </scroll-view>
        <text v-if="currentGroup" class="text-sm text-muted-foreground mt-2 block">{{ currentGroup.description }}</text>
      </view>

      <!-- 套餐选择 -->
      <view>
        <text class="font-semibold text-base text-foreground block mb-3">选择套餐</text>
        <view class="grid grid-cols-3 gap-3">
          <view
            v-for="plan in currentGroup?.plans"
            :key="plan.id"
            class="p-3 rounded-xl border relative overflow-hidden"
            :class="selectedPlan?.id === plan.id ? 'border-2 border-accent bg-accent/5' : 'border-border bg-card'"
            @tap="selectedPlan = plan"
          >
            <!-- 推荐/折扣标签 -->
            <view v-if="plan.popular" class="absolute top-0 right-0 px-2 py-0.5 rounded-bl-lg" style="background:var(--color-accent)">
              <text class="text-[10px] font-medium text-accent-foreground">推荐</text>
            </view>
            <view v-else-if="plan.discount" class="absolute top-0 right-0 px-2 py-0.5 rounded-bl-lg bg-primary">
              <text class="text-[10px] font-medium text-primary-foreground">{{ plan.discount }}</text>
            </view>
            <!-- 选中角标 -->
            <view v-if="selectedPlan?.id === plan.id" class="absolute top-2 left-2 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
              <view class="text-accent-foreground text-xs"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></view>
            </view>

            <text class="font-medium text-sm text-foreground text-center block">{{ plan.durationName }}</text>
            <view class="flex items-baseline justify-center gap-0.5 mt-2">
              <text class="text-xs text-muted-foreground">¥</text>
              <text class="text-2xl font-bold text-primary">{{ plan.price }}</text>
            </view>
            <text v-if="plan.originalPrice > plan.price" class="text-xs text-muted-foreground line-through text-center block mt-1">¥{{ plan.originalPrice }}</text>
            <text class="text-xs text-accent text-center block mt-1">¥{{ plan.dailyPrice }}/天</text>
          </view>
        </view>
      </view>

      <!-- 会员权益 -->
      <view>
        <text class="font-semibold text-base text-foreground block mb-3">会员专属权益</text>
        <view class="grid grid-cols-2 gap-3">
          <view
            v-for="benefit in benefits"
            :key="benefit.id"
            class="p-3 rounded-xl border"
            :class="benefit.available ? 'bg-accent/5 border-accent/30' : 'opacity-50 border-border bg-card'"
          >
            <view class="flex items-start gap-3">
              <view class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" :class="benefit.available ? 'bg-accent/20' : 'bg-secondary'">
                <svg :class="benefit.available ? 'text-accent' : 'text-muted-foreground'" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <template v-if="benefit.id === 1"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></template>
                  <template v-else-if="benefit.id === 2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></template>
                  <template v-else-if="benefit.id === 3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></template>
                  <template v-else-if="benefit.id === 4"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></template>
                  <template v-else-if="benefit.id === 5"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7z"/><line x1="2" y1="20" x2="22" y2="20"/></template>
                  <template v-else><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></template>
                </svg>
              </view>
              <view class="flex-1 min-w-0">
                <text class="font-medium text-sm text-foreground block">{{ benefit.title }}</text>
                <text class="text-xs text-muted-foreground mt-0.5 line-clamp-2 block">{{ benefit.description }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 用户评价 -->
      <view>
        <text class="font-semibold text-base text-foreground block mb-3">会员评价</text>
        <view class="space-y-3">
          <view v-for="(review, i) in reviews" :key="i" class="p-3 bg-card rounded-xl">
            <view class="flex items-start gap-3">
              <view class="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                <text class="text-sm font-medium text-accent">{{ review.avatar }}</text>
              </view>
              <view class="flex-1">
                <view class="flex items-center justify-between">
                  <text class="font-medium text-sm text-foreground">{{ review.name }}</text>
                  <text class="text-accent text-xs"><svg class="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><svg class="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><svg class="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><svg class="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><svg class="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></text>
                </view>
                <text class="text-xs text-muted-foreground mt-1 block">{{ review.content }}</text>
                <text class="text-xs text-muted-foreground mt-2 block">已开通{{ review.days }}天</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 常见问题 -->
      <view>
        <text class="font-semibold text-base text-foreground block mb-3">常见问题</text>
        <view class="bg-card rounded-xl overflow-hidden divide-y divide-border">
          <view v-for="(faq, i) in faqs" :key="i" class="p-3">
            <text class="font-medium text-sm text-foreground block">{{ faq.q }}</text>
            <text class="text-xs text-muted-foreground mt-1 block">{{ faq.a }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部购买栏 -->
    <view v-if="selectedPlan" class="fixed bottom-0 left-0 right-0 bg-card/95 border-t border-border safe-area-pb z-50">
      <view class="flex items-center justify-between px-4 py-3">
        <view>
          <view class="flex items-baseline gap-1">
            <text class="text-sm text-muted-foreground">¥</text>
            <text class="text-3xl font-bold text-primary">{{ selectedPlan.price }}</text>
            <text class="text-sm text-muted-foreground">/{{ selectedPlan.durationName }}</text>
          </view>
          <text class="text-xs text-muted-foreground line-through block">原价 ¥{{ selectedPlan.originalPrice }}</text>
        </view>
        <view class="px-8 h-12 rounded-full flex items-center font-medium text-white shadow-lg" style="background:linear-gradient(to right, #C9A96E, #C41E3A)" @tap="showPaySheet=true">
          {{ status.level === selectedLevel && !status.isExpired ? '续费' : '立即开通' }}
        </view>
      </view>
    </view>

    <!-- 支付方式面板 -->
    <view v-if="showPaySheet" class="fixed inset-0 z-50">
      <view class="absolute inset-0 bg-black/60" @tap="showPaySheet=false" />
      <view class="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl pb-safe overflow-hidden">
        <view class="p-4 border-b border-border">
          <text class="font-semibold text-foreground text-center block">选择支付方式</text>
        </view>
        <view v-if="selectedPlan" class="text-center py-4 border-b border-border">
          <text class="text-sm text-muted-foreground block">{{ selectedPlan.durationName }}</text>
          <view class="flex items-baseline justify-center mt-1">
            <text class="text-lg text-primary">¥</text>
            <text class="text-3xl font-bold text-primary">{{ selectedPlan.price }}</text>
          </view>
        </view>
        <view class="p-4 space-y-3">
          <view
            v-for="m in paySheetMethods"
            :key="m.id"
            class="flex items-center gap-3 p-3 border rounded-xl"
            :class="paySheetMethod === m.id ? 'border-primary bg-primary/5' : 'border-border'"
            @tap="paySheetMethod = m.id"
          >
            <view class="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold" :style="`background:${m.color}`">{{ m.icon }}</view>
            <text class="flex-1 text-sm text-foreground">{{ m.label }}</text>
            <view class="w-5 h-5 rounded-full border-2 flex items-center justify-center" :class="paySheetMethod === m.id ? 'border-primary bg-primary' : 'border-muted-foreground'">
              <view v-if="paySheetMethod === m.id" class="text-primary-foreground text-xs"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></view>
            </view>
          </view>
        </view>
        <view class="px-4 pb-4">
          <view class="w-full py-3.5 rounded-full bg-primary text-center" @tap="confirmPurchase">
            <text class="text-primary-foreground font-semibold">确认支付 ¥{{ selectedPlan?.price }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

type VipLevel = 'none' | 'basic' | 'pro' | 'premium'
interface Plan { id: number; durationName: string; price: number; originalPrice: number; dailyPrice: string; popular?: boolean; discount?: string }
interface PlanGroup { level: VipLevel; levelName: string; description: string; plans: Plan[] }

const status = ref({ level: 'none' as VipLevel, levelName: '非会员', isExpired: false, expireAt: '', daysLeft: 0, points: 0, autoRenew: false })
const selectedLevel = ref<VipLevel>('pro')
const showPaySheet = ref(false)
const paySheetMethod = ref('wechat')

const planGroups = ref<PlanGroup[]>([
  {
    level: 'basic', levelName: '基础会员', description: '基础会员享有标准权益，适合初学者',
    plans: [
      { id: 1, durationName: '月度', price: 29, originalPrice: 39, dailyPrice: '0.97' },
      { id: 2, durationName: '季度', price: 79, originalPrice: 117, dailyPrice: '0.88', popular: true },
      { id: 3, durationName: '年度', price: 259, originalPrice: 468, dailyPrice: '0.71', discount: '5.5折' },
    ],
  },
  {
    level: 'pro', levelName: '专业会员', description: '专业会员解锁全部课程和AI功能',
    plans: [
      { id: 4, durationName: '月度', price: 59, originalPrice: 79, dailyPrice: '1.97' },
      { id: 5, durationName: '季度', price: 159, originalPrice: 237, dailyPrice: '1.77', popular: true },
      { id: 6, durationName: '年度', price: 499, originalPrice: 948, dailyPrice: '1.37', discount: '5.3折' },
    ],
  },
  {
    level: 'premium', levelName: '至尊会员', description: '至尊会员享有一对一专家服务',
    plans: [
      { id: 7, durationName: '月度', price: 129, originalPrice: 169, dailyPrice: '4.3' },
      { id: 8, durationName: '季度', price: 359, originalPrice: 507, dailyPrice: '3.99', popular: true },
      { id: 9, durationName: '年度', price: 1199, originalPrice: 2028, dailyPrice: '3.29', discount: '5.9折' },
    ],
  },
])

const currentGroup = computed(() => planGroups.value.find(g => g.level === selectedLevel.value))
const selectedPlan = ref<Plan | null>(planGroups.value[1].plans[1])

const benefits = computed(() => [
  { id: 1, title: '海量课程免费看', description: '500+门课程无限畅学', available: true },
  { id: 2, title: 'AI无限对话', description: '不限次使用智能排盘和解读', available: ['pro','premium'].includes(selectedLevel.value) },
  { id: 3, title: '离线下载', description: '最多200节课离线缓存', available: true },
  { id: 4, title: '专属福利', description: '每月赠送积分和优惠券', available: true },
  { id: 5, title: '专家答疑', description: '专业老师一对一解答', available: selectedLevel.value === 'premium' },
  { id: 6, title: '学习报告', description: '个性化学习数据分析', available: ['pro','premium'].includes(selectedLevel.value) },
])

const reviews = [
  { name: '易*明', avatar: '易', content: '开通年度会员后，学习效率提升很多，课程质量很高！', days: 128 },
  { name: '张*华', avatar: '张', content: 'AI智能体太好用了，排盘解读很专业，物超所值。', days: 56 },
]
const faqs = [
  { q: '开通后可以退款吗？', a: '会员服务一经开通，暂不支持退款，请确认后购买。' },
  { q: '会员可以多设备登录吗？', a: '同一账号最多支持3台设备同时登录。' },
  { q: '会员到期后权益还在吗？', a: '到期后会员权益将失效，但已下载的内容可继续保留。' },
]
const paySheetMethods = [
  { id: 'wechat', label: '微信支付', icon: '微', color: '#07C160' },
  { id: 'alipay', label: '支付宝', icon: '支', color: '#1677FF' },
  { id: 'balance', label: '国学币余额 (¥888.88)', icon: '币', color: '#C9A96E' },
]

function selectLevel(level: VipLevel) {
  selectedLevel.value = level
  const group = planGroups.value.find(g => g.level === level)
  selectedPlan.value = group?.plans.find(p => p.popular) || group?.plans[0] || null
}
function toggleAutoRenew() { status.value.autoRenew = !status.value.autoRenew }
function goRecords() { uni.navigateTo({ url: '/pages/vip/records' }) }
function confirmPurchase() {
  showPaySheet.value = false
  uni.showToast({ title: '购买成功', icon: 'success' })
}
</script>
