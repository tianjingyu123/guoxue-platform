<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-background border-b border-border">
      <view class="flex items-center justify-between px-4 h-12">
        <view class="flex items-center gap-2">
          <view @click="goBack" class="p-1">
            <text class="text-xl text-foreground">←</text>
          </view>
          <text class="text-base font-semibold text-foreground">直播收益</text>
        </view>
        <view class="flex items-center gap-1 text-xs text-muted-foreground">
          <text></text>
          <text>导出</text>
        </view>
      </view>
    </view>

    <view class="p-4 space-y-4">
      <!-- 时间范围选择 -->
      <view class="flex gap-2">
        <view
          v-for="r in ranges" :key="r.key"
          @click="range = r.key"
          :class="['flex-1 py-1.5 rounded-full text-xs font-medium text-center', range === r.key ? 'bg-primary text-white' : 'bg-secondary text-foreground']"
        >
          {{ r.label }}
        </view>
      </view>

      <!-- 收益总览卡片 -->
      <view class="bg-white rounded-xl p-4 border border-border">
        <text class="text-xs text-muted-foreground block mb-1">总收益（元）</text>
        <view class="flex items-end gap-2 mb-3">
          <text class="text-3xl font-black text-foreground">{{ stats.total.toLocaleString() }}</text>
          <view :class="['flex items-center gap-0.5 pb-1 text-xs font-medium', stats.trend >= 0 ? 'text-green-500' : 'text-primary']">
            <text>{{ stats.trend >= 0 ? '📈' : '📉' }}</text>
            <text>{{ Math.abs(stats.trend) }}%</text>
          </view>
        </view>
        <view class="grid grid-cols-2 gap-3">
          <view class="bg-background rounded-lg p-3">
            <view class="flex items-center gap-1.5 mb-1">
              <text class="text-accent">🎁</text>
              <text class="text-xs text-muted-foreground">打赏收益</text>
            </view>
            <text class="text-lg font-bold text-foreground">¥{{ stats.reward.toLocaleString() }}</text>
          </view>
          <view class="bg-background rounded-lg p-3">
            <view class="flex items-center gap-1.5 mb-1">
              <text class="text-primary">️</text>
              <text class="text-xs text-muted-foreground">带货收益</text>
            </view>
            <text class="text-lg font-bold text-foreground">¥{{ stats.goods.toLocaleString() }}</text>
          </view>
        </view>
      </view>

      <!-- 提现入口 -->
      <view @click="goTo('/pages/videos/creator/withdraw/index')" class="w-full flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl p-4">
        <view class="flex items-center gap-2.5">
          <view class="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <text></text>
          </view>
          <view>
            <text class="text-sm font-semibold text-foreground block">可提现金额</text>
            <text class="text-xs text-muted-foreground">T+1 结算，最低100元可提</text>
          </view>
        </view>
        <view class="flex items-center gap-1.5">
          <text class="text-lg font-bold text-primary">¥{{ (stats.total * 0.7).toFixed(0) }}</text>
          <text class="text-muted-foreground">›</text>
        </view>
      </view>

      <!-- 明细列表 -->
      <view>
        <!-- 筛选 -->
        <view class="flex gap-2 mb-3">
          <view
            v-for="f in typeFilters" :key="f.key"
            @click="typeFilter = f.key"
            :class="['px-3 py-1.5 rounded-full text-xs font-medium', typeFilter === f.key ? 'bg-primary text-white' : 'bg-secondary text-foreground']"
          >
            {{ f.label }}
          </view>
        </view>

        <view class="space-y-2">
          <view v-for="record in filteredRecords" :key="record.id" class="bg-white rounded-xl p-3.5 border border-border">
            <view class="flex items-start justify-between gap-2">
              <view class="flex items-start gap-2.5 min-w-0">
                <view :class="['w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5', record.type === 'reward' ? 'bg-accent/15' : 'bg-primary/10']">
                  <text>{{ record.type === 'reward' ? '🎁' : '️' }}</text>
                </view>
                <view class="min-w-0">
                  <text class="text-sm font-medium text-foreground truncate block">{{ record.desc }}</text>
                  <text class="text-xs text-muted-foreground truncate block">{{ record.live }}</text>
                  <text class="text-xs text-muted-foreground">{{ record.date }}</text>
                </view>
              </view>
              <text class="text-sm font-bold text-green-500 flex-shrink-0">+¥{{ record.amount }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="h-8" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

type Range = '7d' | '30d' | '90d'
type TypeFilter = 'all' | 'reward' | 'goods'

const range = ref<Range>('30d')
const typeFilter = ref<TypeFilter>('all')

const ranges: { key: Range; label: string }[] = [
  { key: '7d', label: '近7天' },
  { key: '30d', label: '近30天' },
  { key: '90d', label: '近90天' },
]

const typeFilters: { key: TypeFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'reward', label: '打赏' },
  { key: 'goods', label: '带货' },
]

interface Stats { total: number; reward: number; goods: number; trend: number }
const statsByRange: Record<Range, Stats> = {
  '7d': { total: 3680, reward: 1280, goods: 2400, trend: 12.5 },
  '30d': { total: 18600, reward: 5400, goods: 13200, trend: 8.3 },
  '90d': { total: 52400, reward: 14800, goods: 37600, trend: -2.1 },
}

interface RecordItem { id: string; date: string; type: 'reward' | 'goods'; desc: string; amount: number; live: string }
const records: RecordItem[] = [
  { id: '1', date: '2024-01-15', type: 'reward', desc: '用户「星空」打赏', amount: 520, live: '八字命理精讲第12课' },
  { id: '2', date: '2024-01-15', type: 'goods', desc: '带货成交：《渊海子平》', amount: 168, live: '八字命理精讲第12课' },
  { id: '3', date: '2024-01-14', type: 'goods', desc: '带货成交：紫微斗数入门', amount: 88, live: '紫微斗数专题' },
  { id: '4', date: '2024-01-14', type: 'reward', desc: '用户「山河」打赏', amount: 200, live: '紫微斗数专题' },
  { id: '5', date: '2024-01-13', type: 'reward', desc: '用户「云上」打赏', amount: 360, live: '奇门遁甲入门' },
  { id: '6', date: '2024-01-12', type: 'goods', desc: '带货成交：铜制罗盘', amount: 480, live: '风水堂第8课' },
  { id: '7', date: '2024-01-12', type: 'reward', desc: '用户「墨言」打赏', amount: 100, live: '风水堂第8课' },
  { id: '8', date: '2024-01-11', type: 'goods', desc: '带货成交：手抄本', amount: 240, live: '八字命理精讲第11课' },
]

const stats = computed(() => statsByRange[range.value])
const filteredRecords = computed(() => typeFilter.value === 'all' ? records : records.filter(r => r.type === typeFilter.value))

function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }
</script>
