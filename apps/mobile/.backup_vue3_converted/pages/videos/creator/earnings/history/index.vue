<template>
  <view class="min-h-screen bg-background">
    <!-- 骨架屏 -->
    <view v-if="loading" class="p-4 space-y-3">
      <view v-for="i in 5" :key="i" class="h-20 rounded-xl animate-pulse" style="background:rgba(0,0,0,0.04)" />
    </view>

    <!-- 空态 -->
    <view v-else-if="historyData.records.length === 0" class="min-h-screen flex flex-col items-center justify-center p-4">
      <text class="text-4xl text-accent/30 block mb-4">📊</text>
      <text class="text-muted-foreground text-center">暂无收益记录</text>
      <text class="text-muted-foreground/60 text-sm mt-2">开始创作后收益将在此展示</text>
    </view>

    <template v-else>
      <!-- 顶部导航 -->
      <view class="sticky top-0 z-10 bg-background border-b border-border">
        <view class="flex items-center justify-between px-4 py-3">
          <view @click="goBack" class="p-1">
            <text class="text-xl text-foreground">←</text>
          </view>
          <text class="text-lg font-semibold text-foreground">收益历史</text>
          <view class="w-8" />
        </view>
      </view>

      <view class="pb-20">
        <!-- 总体统计 -->
        <view class="mx-4 mt-4 grid grid-cols-2 gap-3">
          <view class="p-4 text-center rounded-xl bg-white border border-border">
            <text class="text-xs text-muted-foreground block mb-1">累计收益</text>
            <text class="text-2xl font-bold text-foreground">
              ¥{{ historyData.totalEarnings.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}
            </text>
          </view>
          <view class="p-4 text-center rounded-xl bg-white border border-border">
            <text class="text-xs text-muted-foreground block mb-1">本月收益</text>
            <text class="text-2xl font-bold text-green-600">
              ¥{{ historyData.monthlyEarnings.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}
            </text>
            <text class="text-xs text-green-600 mt-1">↑ 12%</text>
          </view>
        </view>

        <!-- 历史记录 -->
        <view class="mx-4 mt-6">
          <text class="text-sm font-semibold text-foreground block mb-3">收益明细</text>
          <view class="space-y-2">
            <view
              v-for="record in historyData.records" :key="record.id"
              @click="showDetail(record)"
              class="w-full p-3 rounded-lg border border-border bg-white transition-all text-left"
            >
              <view class="flex items-center justify-between mb-2">
                <view class="flex items-center gap-2">
                  <text class="text-foreground/60"></text>
                  <text class="font-medium text-foreground">{{ record.month }}</text>
                </view>
                <view :class="['flex items-center gap-1 font-semibold text-sm', record.trend === 'up' ? 'text-green-600' : 'text-red-600']">
                  <text>{{ record.trend === 'up' ? '↑' : '↓' }} {{ Math.abs(record.change) }}%</text>
                </view>
              </view>
              <view class="flex items-center justify-between">
                <text class="text-sm text-muted-foreground">{{ record.orders }} 个订单</text>
                <text class="text-lg font-bold text-foreground">
                  ¥{{ record.earnings.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}
                </text>
              </view>
            </view>
          </view>
        </view>

        <!-- 收益说明 -->
        <view class="mx-4 mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <text class="text-sm font-semibold text-blue-900 block mb-2">收益说明</text>
          <view class="text-xs text-blue-800 space-y-1">
            <text class="block">• 收益结算周期为每个自然月</text>
            <text class="block">• 提现可在次月1日起申请</text>
            <text class="block">• 平台提成 25%，创作者获得 75%</text>
            <text class="block">• 点击记录可查看订单详情</text>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface EarningMonthRecord {
  id: string
  month: string
  earnings: number
  orders: number
  trend: 'up' | 'down'
  change: number
}

interface EarningsHistory {
  totalEarnings: number
  monthlyEarnings: number
  records: EarningMonthRecord[]
}

const loading = ref(true)
const historyData = ref<EarningsHistory>({
  totalEarnings: 125480,
  monthlyEarnings: 18520,
  records: [],
})

onMounted(() => {
  setTimeout(() => {
    historyData.value = {
      totalEarnings: 125480,
      monthlyEarnings: 18520,
      records: [
        { id: '1', month: '2024年1月', earnings: 18520, orders: 385, trend: 'up', change: 12 },
        { id: '2', month: '2023年12月', earnings: 16520, orders: 342, trend: 'up', change: 8 },
        { id: '3', month: '2023年11月', earnings: 15280, orders: 315, trend: 'down', change: -3 },
        { id: '4', month: '2023年10月', earnings: 15750, orders: 325, trend: 'up', change: 5 },
        { id: '5', month: '2023年9月', earnings: 15010, orders: 310, trend: 'up', change: 2 },
        { id: '6', month: '2023年8月', earnings: 14720, orders: 305, trend: 'down', change: -1 },
      ],
    }
    loading.value = false
  }, 500)
})

function goBack() { uni.navigateBack() }

function showDetail(record: EarningMonthRecord) {
  uni.showToast({ title: record.month + ' - ¥' + record.earnings, icon: 'none' })
}
</script>

<style scoped>
</style>
