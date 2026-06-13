<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <header class="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
      <view @click="goBack" class="p-1">
        <text class="text-xl text-foreground">←</text>
      </view>
      <text class="text-base font-semibold text-foreground flex items-center gap-2">
        <text class="text-orange-500">⚡</text> 秒杀活动规则
      </text>
    </header>

    <!-- 加载骨架屏 -->
    <view v-if="loading" class="px-4 py-6">
      <view class="h-32 rounded-2xl bg-muted animate-pulse mb-6" />
      <view v-for="i in 4" :key="i" class="mb-3">
        <view class="flex gap-3 p-3 bg-white rounded-xl border border-border/60">
          <view class="w-8 h-8 bg-muted rounded animate-pulse shrink-0" />
          <view class="flex-1 space-y-2">
            <view class="h-4 w-24 bg-muted rounded animate-pulse" />
            <view class="h-3 w-full bg-muted rounded animate-pulse" />
            <view class="h-3 w-3/4 bg-muted rounded animate-pulse" />
          </view>
        </view>
      </view>
    </view>

    <view v-else class="px-4 py-6 pb-24">
      <!-- Hero Banner -->
      <view class="p-4 mb-6 rounded-2xl text-white overflow-hidden relative" style="background:linear-gradient(135deg,#f97316,#ef4444)">
        <view class="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mt-8 -mr-8" />
        <view class="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full -mb-6 -ml-6" />
        <view class="flex items-center gap-2 mb-2 relative z-10">
          <text class="text-2xl">⚡</text>
          <text class="font-bold text-lg">限时秒杀</text>
        </view>
        <text class="text-sm opacity-90 block relative z-10">全场低至1折，每天多场，错过等一年！参与前请仔细阅读以下规则。</text>

        <!-- 倒计时示例 -->
        <view class="mt-3 flex items-center gap-2 bg-white/15 rounded-lg px-3 py-2 relative z-10">
          <text class="text-xs opacity-80">距下一场:</text>
          <view class="flex items-center gap-1 font-mono">
            <text class="bg-white/20 rounded px-1.5 py-0.5 text-xs font-bold">{{ h }}</text>
            <text class="text-xs">:</text>
            <text class="bg-white/20 rounded px-1.5 py-0.5 text-xs font-bold">{{ m }}</text>
            <text class="text-xs">:</text>
            <text class="bg-white/20 rounded px-1.5 py-0.5 text-xs font-bold">{{ s }}</text>
          </view>
        </view>
      </view>

      <!-- 目录导航 -->
      <view class="flex gap-2 mb-6 overflow-x-auto whitespace-nowrap scrollbar-hide">
        <view
          v-for="(section, idx) in ruleSections"
          :key="idx"
          @click="activeSection = idx"
          class="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex-shrink-0"
          :class="activeSection === idx ? 'bg-primary text-white border-primary' : 'bg-white text-foreground border-border'"
        >
          {{ section.title }}
        </view>
      </view>

      <!-- 活动规则 -->
      <view class="mb-6">
        <view class="flex items-center gap-2 mb-3">
          <text class="text-primary"></text>
          <text class="text-sm font-semibold text-foreground">活动规则</text>
        </view>
        <view class="space-y-3">
          <view v-for="(r, idx) in rules" :key="idx" class="flex gap-3 p-3 bg-white rounded-xl" style="border:1px solid rgba(232,224,213,0.6)">
            <view class="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <text class="text-sm">{{ r.icon }}</text>
            </view>
            <view class="flex-1">
              <view class="flex items-center gap-2 mb-1">
                <text class="text-sm font-semibold text-foreground">{{ r.title }}</text>
                <text v-if="r.badge" class="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">{{ r.badge }}</text>
              </view>
              <text class="text-xs text-muted-foreground leading-relaxed block">{{ r.content }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 参与方式 -->
      <view class="mb-6">
        <view class="flex items-center gap-2 mb-3">
          <text class="text-primary"></text>
          <text class="text-sm font-semibold text-foreground">参与方式</text>
        </view>
        <view class="bg-white rounded-xl p-4 border border-border">
          <view v-for="(step, idx) in participationSteps" :key="idx" class="flex items-start gap-3 pb-3 mb-3 border-b border-[#FAF8F5] last:border-0 last:pb-0 last:mb-0">
            <view class="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center flex-shrink-0">
              <text>{{ idx + 1 }}</text>
            </view>
            <view>
              <text class="text-sm font-medium text-foreground block">{{ step.title }}</text>
              <text class="text-xs text-muted-foreground mt-0.5 block">{{ step.desc }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 注意事项 -->
      <view class="mb-6">
        <view class="flex items-center gap-2 mb-3">
          <text class="text-primary"></text>
          <text class="text-sm font-semibold text-foreground">注意事项</text>
        </view>
        <view class="space-y-2">
          <view v-for="(notice, idx) in notices" :key="idx" class="flex items-start gap-2.5 p-3 rounded-xl" style="background:rgba(255,152,0,0.06);border:1px solid rgba(255,152,0,0.2)">
            <text class="text-amber-500 text-sm flex-shrink-0 mt-0.5">!</text>
            <text class="text-xs text-foreground leading-relaxed">{{ notice }}</text>
          </view>
        </view>
      </view>

      <!-- 常见问题 -->
      <view class="mb-6">
        <view class="flex items-center gap-2 mb-3">
          <text class="text-primary">❓</text>
          <text class="text-sm font-semibold text-foreground">常见问题</text>
        </view>
        <view class="space-y-3">
          <view
            v-for="(f, idx) in faqs"
            :key="idx"
            class="p-3 bg-white rounded-xl border border-border"
            @click="toggleFaq(idx)"
          >
            <view class="flex items-center justify-between">
              <text class="text-sm font-medium text-foreground">Q：{{ f.q }}</text>
              <text class="text-muted-foreground text-xs transition-transform" :class="faqOpen[idx] ? 'rotate-180' : ''">▼</text>
            </view>
            <text v-if="faqOpen[idx]" class="text-xs text-muted-foreground leading-relaxed mt-2 block">A：{{ f.a }}</text>
          </view>
        </view>
      </view>

      <!-- 历史秒杀回顾 -->
      <view class="mb-6">
        <view class="flex items-center gap-2 mb-3">
          <text class="text-primary">📊</text>
          <text class="text-sm font-semibold text-foreground">往期回顾</text>
        </view>
        <view class="bg-white rounded-xl p-4 border border-border">
          <view class="flex items-center justify-between mb-3">
            <text class="text-xs text-muted-foreground">往期活动数据</text>
            <text class="text-[10px] text-primary">查看全部 →</text>
          </view>
          <view class="space-y-2">
            <view v-for="(h, idx) in history" :key="idx" class="flex items-center justify-between py-2 border-b border-[#FAF8F5] last:border-0">
              <view>
                <text class="text-xs text-foreground font-medium block">{{ h.date }}</text>
                <text class="text-[10px] text-muted-foreground block">{{ h.session }}</text>
              </view>
              <view class="text-right">
                <text class="text-xs font-bold text-primary block">{{ h.sold }}件</text>
                <text class="text-[10px] text-muted-foreground block">售罄率{{ h.rate }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 声明 -->
      <view class="mt-2 flex gap-1.5 p-3 rounded-xl" style="background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3)">
        <text class="text-amber-600 text-sm shrink-0 mt-0.5"></text>
        <text class="text-xs text-amber-700">平台保留活动最终解释权。如有疑问请联系客服（工作日 9:00-18:00）。</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// 加载状态
const loading = ref(true)
setTimeout(() => { loading.value = false }, 500)

// 倒计时
const seconds = ref(125 * 60 + 30)
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timer = setInterval(() => {
    seconds.value = seconds.value > 0 ? seconds.value - 1 : 0
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const h = ref('02')
const m = ref('05')
const s = ref('30')

// 实时更新倒计时
setInterval(() => {
  const total = seconds.value
  h.value = String(Math.floor(total / 3600)).padStart(2, '0')
  m.value = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  s.value = String(total % 60).padStart(2, '0')
}, 1000)

// 目录导航
const activeSection = ref(0)
const ruleSections = [
  { title: '活动规则' },
  { title: '参与方式' },
  { title: '注意事项' },
  { title: '常见问题' },
]

// 活动规则
const rules = [
  { icon: '', title: '参与资格', content: '所有注册用户均可参与秒杀活动。每个账号每次活动限购1件。不同的秒杀商品单独计算购买资格。', badge: '必读' },
  { icon: '⏱️', title: '活动时间', content: '秒杀活动在指定时间段内进行，通常为每天10:00、14:00、18:00、20:00四个时段各1小时。具体时间以活动页面公示为准。', badge: '' },
  { icon: '', title: '支付规则', content: '抢购成功后需在15分钟内完成支付，超时订单自动取消，商品重新投入秒杀池。支持微信支付、支付宝、余额等支付方式。', badge: '' },
  { icon: '', title: '禁止行为', content: '禁止使用脚本、外挂等技术手段抢购；禁止恶意下单不付款；禁止通过异常途径获取优惠。一经发现，取消参与资格并封禁账号。', badge: '违规' },
  { icon: '↩️', title: '退款政策', content: '虚拟类商品（课程、VIP会员）付款成功后原则上不支持退款。如遇商品描述与实际严重不符，可在24小时内申请客服处理。', badge: '' },
  { icon: '📦', title: '实物商品', content: '实物类秒杀商品将在3-5个工作日内发货，支持7天无理由退换货（限商品未拆封使用状态）。', badge: '' },
  { icon: '', title: '等级权益', content: 'VIP会员享有提前5分钟进入秒杀场的权益。不同会员等级还享有不同的折扣和限购数量。', badge: '会员' },
]

// 参与方式
const participationSteps = [
  { title: '进入秒杀页面', desc: '通过首页入口或推送通知进入限时秒杀频道' },
  { title: '选择场次', desc: '在10:00/14:00/18:00/20:00四个场次中选择当前可参与的场次' },
  { title: '抢购商品', desc: '在秒杀商品列表中点击"立即抢购"，手速要快！' },
  { title: '完成支付', desc: '抢购成功后需在15分钟内完成支付，超时自动取消' },
  { title: '查看订单', desc: '在「我的订单」中查看购买记录和物流信息' },
]

// 注意事项
const notices = [
  '秒杀价格不与平台其他优惠叠加使用（包括优惠券、积分抵扣等）',
  '部分热门商品库存极少，建议提前5分钟进入商品页面等待',
  '如遇支付高峰，请耐心等待，不要重复提交订单',
  '虚拟课程类秒杀商品购买后不支持退款，请仔细确认后再下单',
  '秒杀商品数量有限，售完即止，不设补货',
]

// 常见问题
const faqs = [
  { q: '秒杀价格是否包含运费？', a: '秒杀价格为商品本身价格，不包含运费。运费在支付页面单独显示。' },
  { q: '手慢没抢到可以等下次吗？', a: '秒杀商品库存有限，未抢到可关注该商品，下次活动时会收到推送通知。建议提前关注秒杀日历。' },
  { q: '已购买的秒杀课程如何观看？', a: '购买成功后可在「我的课程」中找到对应课程，立即开始学习。秒杀课程与正价课程享受相同服务。' },
  { q: '为什么我看不到秒杀入口？', a: '请确认APP已更新至最新版本。部分秒杀活动仅对特定等级用户开放。' },
  { q: '如何设置秒杀提醒？', a: '在秒杀活动页面点击"提醒我"按钮，活动开始前5分钟将通过系统通知提醒您。' },
]

const faqOpen = ref<boolean[]>([false, false, false, false, false])
function toggleFaq(idx: number) {
  faqOpen.value[idx] = !faqOpen.value[idx]
}

// 历史数据
const history = [
  { date: '2024-06-09', session: '20:00场', sold: 286, rate: '100%' },
  { date: '2024-06-09', session: '14:00场', sold: 245, rate: '92%' },
  { date: '2024-06-09', session: '10:00场', sold: 312, rate: '100%' },
  { date: '2024-06-08', session: '20:00场', sold: 198, rate: '85%' },
]

function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
.scrollbar-hide::-webkit-scrollbar { display: none; }
</style>
