<template>
  <view class="min-h-screen bg-background flex flex-col">
    <!-- 加载骨架屏 -->
    <view v-if="loading" class="p-4 space-y-4">
      <view class="h-12 bg-muted rounded-lg" />
      <view class="h-44 bg-muted rounded-2xl" />
      <view class="h-36 bg-muted rounded-xl" />
      <view class="h-48 bg-muted rounded-xl" />
    </view>

    <template v-else>
      <!-- 顶部导航 -->
      <view class="flex items-center justify-between px-4 h-12 bg-white border-b border-border flex-shrink-0">
        <view class="p-1" @click="goBack"><text class="text-xl text-foreground">←</text></view>
        <text class="text-base font-semibold text-foreground">收益明细</text>
        <view @click="showWithdrawSheet = true" class="px-3 py-1.5 bg-primary text-white text-xs rounded-full font-medium">提现</view>
      </view>

      <scroll-view scroll-y class="flex-1 p-4 overflow-y-auto">
        <!-- 总收益卡片 -->
        <view class="bg-gradient-to-br from-primary to-[#A01530] rounded-2xl p-5 text-white mb-4">
          <view class="flex items-center justify-between mb-1">
            <text class="text-sm opacity-80 block">总收益</text>
            <text class="text-xs text-white/50">{{ period }}</text>
          </view>
          <text class="text-4xl font-bold block my-2">¥{{ total }}</text>
          <view class="flex items-center gap-1">
            <text class="text-xs text-white/70">本月 +¥{{ monthlyGrowth }}</text>
            <text class="text-xs text-green-300 bg-green-500/20 px-1.5 py-0.5 rounded-full">{{ growthRate }}%</text>
          </view>
          <view class="mt-5 pt-4 border-t border-white/20 grid grid-cols-3 gap-3">
            <view class="text-center">
              <text class="text-lg font-bold block">{{ incomeCount }}</text>
              <text class="text-[11px] text-white/70">收入笔数</text>
            </view>
            <view class="text-center">
              <text class="text-lg font-bold block">¥{{ avgIncome }}</text>
              <text class="text-[11px] text-white/70">平均收入</text>
            </view>
            <view class="text-center">
              <text class="text-lg font-bold block text-[#FFD700]" @click="showWithdrawSheet = true">提现</text>
              <text class="text-[11px] text-white/70">可提现 ¥{{ withdrawable }}</text>
            </view>
          </view>
        </view>

        <!-- 收益趋势图（简易柱状图） -->
        <view class="bg-white rounded-xl p-4 border border-border mb-3">
          <view class="flex items-center justify-between mb-4">
            <text class="text-sm font-semibold text-foreground">📊 月度趋势</text>
            <view class="flex gap-2">
              <text
                v-for="t in trendTabs" :key="t.key"
                @click="activeTrendTab = t.key"
                :class="['px-2 py-0.5 rounded text-[10px]', activeTrendTab === t.key ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground']"
              >
                {{ t.label }}
              </text>
            </view>
          </view>
          <view class="flex items-end gap-2 h-28">
            <view v-for="(bar, idx) in trendData" :key="idx" class="flex-1 flex flex-col items-center gap-1">
              <text class="text-[8px] text-muted-foreground" v-if="bar.value > 0">¥{{ bar.value }}</text>
              <view
                class="w-full rounded-sm transition-all"
                :style="{ height: bar.height + '%', backgroundColor: idx === trendData.length - 1 ? '#C41E3A' : bar.value > (maxTrend * 0.7) ? '#C9A96E' : '#E8E0D5' }"
              />
              <text class="text-[8px] text-muted-foreground mt-1">{{ bar.label }}</text>
            </view>
          </view>
        </view>

        <!-- 收益分类 -->
        <view class="bg-white rounded-xl p-4 border border-border mb-3">
          <text class="text-sm font-semibold text-foreground block mb-3">收益分类</text>
          <view v-for="c in categories" :key="c.name" class="flex items-center gap-3 py-3 border-b border-[#FAF8F5] last:border-b-0">
            <text class="text-xl">{{ c.icon }}</text>
            <text class="text-[13px] text-foreground flex-1">{{ c.name }}</text>
            <!-- 进度条 -->
            <view class="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
              <view class="h-full rounded-full bg-primary" :style="'width:' + c.pct + '%'" />
            </view>
            <text class="text-[12px] text-muted-foreground w-8 text-right">{{ c.pct }}%</text>
            <text class="text-[14px] font-medium text-green-600 w-20 text-right">+¥{{ c.amount }}</text>
          </view>
        </view>

        <!-- 收益明细 -->
        <view class="bg-white rounded-xl p-4 border border-border mb-8">
          <view class="flex items-center justify-between mb-3">
            <text class="text-sm font-semibold text-foreground">收益明细</text>
            <text class="text-xs text-muted-foreground">近30天</text>
          </view>
          <view v-for="r in records" :key="r.id" class="flex items-center justify-between py-3 border-b border-[#FAF8F5] last:border-b-0">
            <view class="flex items-center gap-2.5">
              <view class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <text class="text-sm">{{ r.icon }}</text>
              </view>
              <view>
                <text class="text-[13px] text-foreground block">{{ r.desc }}</text>
                <text class="text-[11px] text-muted-foreground block mt-0.5">{{ r.time }}</text>
              </view>
            </view>
            <text class="text-[14px] font-medium" :class="r.type === 'income' ? 'text-green-600' : 'text-red-500'">
              {{ r.type === 'income' ? '+' : '-' }}¥{{ r.amount }}
            </text>
          </view>
        </view>
      </scroll-view>

      <!-- 提现抽屉 -->
      <view v-if="showWithdrawSheet" class="fixed inset-0 z-50 bg-black/40" @click="showWithdrawSheet = false">
        <view class="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 pb-10" @click.stop>
          <view class="w-10 h-1 bg-[#E8E0D5] rounded-full mx-auto mb-5" />
          <text class="text-base font-semibold text-foreground block mb-1">提现</text>
          <text class="text-xs text-muted-foreground block mb-4">可提现余额：¥{{ withdrawable }}</text>
          <view class="bg-background rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
            <text class="text-sm text-foreground font-medium">¥</text>
            <input v-model="withdrawAmount" type="text" placeholder="请输入提现金额" class="flex-1 text-sm text-foreground placeholder-[#ccc] outline-none" />
          </view>
          <view class="flex gap-2 mb-4 flex-wrap">
            <text v-for="amt in quickAmounts" :key="amt" @click="withdrawAmount = amt.toString()" class="px-3 py-1.5 bg-muted text-xs rounded-full">
              ¥{{ amt }}
            </text>
            <text @click="withdrawAmount = withdrawable.toString()" class="px-3 py-1.5 bg-primary/10 text-primary text-xs rounded-full">
              全部
            </text>
          </view>
          <view @click="doWithdraw" class="w-full py-3 rounded-xl bg-primary text-white text-sm font-medium text-center">
            确认提现
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const loading = ref(true)

onMounted(() => {
  setTimeout(() => { loading.value = false }, 500)
})

const total = 12800
const monthlyGrowth = 3200
const growthRate = 12.5
const incomeCount = 24
const avgIncome = 533
const withdrawable = 8620.50
const period = '截至 2024年6月'

const showWithdrawSheet = ref(false)
const withdrawAmount = ref('')
const quickAmounts = [100, 500, 1000, 5000]

const activeTrendTab = ref('6month')
const trendTabs = [
  { key: '3month', label: '近3月' },
  { key: '6month', label: '近6月' },
  { key: 'year', label: '近一年' },
]

const maxTrend = computed(() => Math.max(...trendData.value.map(d => d.value)))

const trendData = computed(() => {
  const rawData = [
    { label: '1月', value: 6800 },
    { label: '2月', value: 7500 },
    { label: '3月', value: 8200 },
    { label: '4月', value: 9600 },
    { label: '5月', value: 11200 },
    { label: '6月', value: 12800 },
  ]
  // 对高度进行归一化
  const maxVal = Math.max(...rawData.map(d => d.value))
  return rawData.map(d => ({
    ...d,
    height: (d.value / maxVal) * 100
  }))
})

const categories = [
  { icon: '', name: '入圈费', pct: 40, amount: 5120 },
  { icon: '', name: '课程收入', pct: 30, amount: 3840 },
  { icon: '', name: '问答悬赏', pct: 20, amount: 2560 },
  { icon: '🎁', name: '打赏', pct: 10, amount: 1280 },
]

const records = [
  { id: '1', icon: '', desc: '6月会员入圈费', time: '2024-06-01', amount: 5000, type: 'income' as const },
  { id: '2', icon: '', desc: '6月课程分成', time: '2024-06-01', amount: 3800, type: 'income' as const },
  { id: '3', icon: '', desc: '6月问答悬赏', time: '2024-06-01', amount: 4000, type: 'income' as const },
  { id: '4', icon: '', desc: '5月会员入圈费', time: '2024-05-01', amount: 4800, type: 'income' as const },
  { id: '5', icon: '', desc: '5月课程分成', time: '2024-05-01', amount: 3600, type: 'income' as const },
  { id: '6', icon: '🎁', desc: '5月打赏收入', time: '2024-05-15', amount: 1200, type: 'income' as const },
  { id: '7', icon: '', desc: '提现转账', time: '2024-04-28', amount: 5000, type: 'expense' as const },
]

function goBack() { uni.navigateBack() }

function doWithdraw() {
  if (!withdrawAmount.value || parseFloat(withdrawAmount.value) <= 0) {
    uni.showToast({ title: '请输入有效金额', icon: 'none' })
    return
  }
  if (parseFloat(withdrawAmount.value) > withdrawable) {
    uni.showToast({ title: '余额不足', icon: 'none' })
    return
  }
  uni.showToast({ title: '提现申请已提交', icon: 'success' })
  showWithdrawSheet.value = false
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
