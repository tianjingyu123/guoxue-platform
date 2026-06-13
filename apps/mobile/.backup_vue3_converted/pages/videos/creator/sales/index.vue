<template>
  <view class="min-h-screen" style="background-color: #FAF8F5;">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-20" style="background-color: #FFFFFF; border-bottom: 1px solid #E8E0D5;">
      <view class="flex items-center justify-between px-4 py-3">
        <view @click="goBack" class="p-1" hover-class="opacity-60">
          <text style="font-size: 24px; color: #2C2C2C; line-height: 1;">←</text>
        </view>
        <text class="text-lg font-semibold" style="color: #2C2C2C;">销售数据</text>
        <view class="w-8" />
      </view>
    </view>

    <!-- 时间周期 -->
    <view class="sticky z-10 px-4 py-3" style="background-color: #FFFFFF; border-bottom: 1px solid #E8E0D5; top: 56px;">
      <view class="flex gap-2">
        <view
          v-for="p in periodOptions"
          :key="p.key"
          @click="period = p.key"
          class="px-3 py-1.5 rounded-full text-sm font-medium"
          :style="{
            backgroundColor: period === p.key ? '#C41E3A' : '#F5F1EB',
            color: period === p.key ? '#FFFFFF' : '#2C2C2C',
            cursor: 'pointer',
          }"
        >
          <text>{{ p.label }}</text>
        </view>
      </view>
    </view>

    <!-- Loading skeleton -->
    <view v-if="loading" class="p-4 space-y-4">
      <view v-for="i in 3" :key="i" class="h-32 rounded-xl skeleton-pulse" style="background-color: #F0EBE5;" />
    </view>

    <!-- Main Content -->
    <view v-else class="pb-20">
      <!-- 关键指标 -->
      <view class="mx-4 mt-4 grid grid-cols-2 gap-3">
        <view class="rounded-xl p-3" style="background-color: #FFFFFF;">
          <text class="text-xs block mb-1" style="color: #999999;">销售额</text>
          <text class="text-2xl font-bold block" style="color: #2C2C2C;">¥{{ formatCurrency(mockData.totalSales) }}</text>
          <view class="flex items-center gap-1 mt-1 text-xs" style="color: #16A34A;">
            <text style="font-size: 12px;">📈</text>
            <text>15%</text>
          </view>
        </view>
        <view class="rounded-xl p-3" style="background-color: #FFFFFF;">
          <text class="text-xs block mb-1" style="color: #999999;">预期收益</text>
          <text class="text-2xl font-bold block" style="color: #2C2C2C;">¥{{ formatCurrency(mockData.totalRevenue) }}</text>
          <text class="text-xs block mt-1" style="color: #999999;">75% 提成</text>
        </view>
        <view class="rounded-xl p-3" style="background-color: #FFFFFF;">
          <text class="text-xs block mb-1" style="color: #999999;">订单数</text>
          <text class="text-2xl font-bold block" style="color: #2C2C2C;">{{ mockData.totalOrders }}</text>
          <text class="text-xs block mt-1" style="color: #999999;">平均 ¥{{ avgOrderAmount }}</text>
        </view>
        <view class="rounded-xl p-3" style="background-color: #FFFFFF;">
          <text class="text-xs block mb-1" style="color: #999999;">客户数</text>
          <text class="text-2xl font-bold block" style="color: #2C2C2C;">{{ mockData.totalCustomers }}</text>
          <text class="text-xs block mt-1" style="color: #999999;">重复购 28%</text>
        </view>
      </view>

      <!-- 销售趋势 -->
      <view class="mx-4 mt-6">
        <text class="text-sm font-semibold block mb-3" style="color: #2C2C2C;">销售趋势</text>
        <view class="rounded-xl p-4" style="background-color: #FFFFFF;">
          <!-- Legend -->
          <view class="flex items-center gap-4 mb-3">
            <view class="flex items-center gap-1.5">
              <view class="w-2.5 h-2.5 rounded-sm" style="background-color: #C41E3A;" />
              <text class="text-xs" style="color: #666666;">销售额</text>
            </view>
            <view class="flex items-center gap-1.5">
              <view class="w-2.5 h-2.5 rounded-sm" style="background-color: #C9A96E;" />
              <text class="text-xs" style="color: #666666;">收益</text>
            </view>
          </view>

          <!-- Chart: Y-axis + Grid + Bars + X-axis -->
          <view class="flex gap-2">
            <!-- Y-axis labels -->
            <view class="flex flex-col justify-between text-xs pb-6 flex-shrink-0" style="color: #999999; width: 36px;">
              <text>{{ formatLargeNum(yAxisMax) }}</text>
              <text>{{ formatLargeNum(yAxisMax * 0.75) }}</text>
              <text>{{ formatLargeNum(yAxisMax * 0.5) }}</text>
              <text>{{ formatLargeNum(yAxisMax * 0.25) }}</text>
              <text>0</text>
            </view>

            <!-- Chart body -->
            <view class="flex-1" style="min-width: 0;">
              <!-- Grid + bars layer -->
              <view class="relative" style="height: 160px;">
                <!-- Dashed grid lines -->
                <view class="absolute inset-0 flex flex-col justify-between">
                  <view style="border-top: 1px dashed #E5E5E5;" />
                  <view style="border-top: 1px dashed #E5E5E5;" />
                  <view style="border-top: 1px dashed #E5E5E5;" />
                  <view style="border-top: 1px dashed #E5E5E5;" />
                  <view style="border-top: 1px dashed #E5E5E5;" />
                </view>
                <!-- Grouped bars -->
                <view class="absolute inset-0 flex items-end pb-1">
                  <view
                    v-for="day in mockData.salesTrend"
                    :key="day.date"
                    class="flex items-end gap-1"
                    style="flex: 1; justify-content: center;"
                  >
                    <view
                      class="w-2.5 rounded-t"
                      :style="{ height: (day.sales / yAxisMax * 150) + 'px', backgroundColor: '#C41E3A' }"
                    />
                    <view
                      class="w-2.5 rounded-t"
                      :style="{ height: (day.revenue / yAxisMax * 150) + 'px', backgroundColor: '#C9A96E' }"
                    />
                  </view>
                </view>
              </view>

              <!-- X-axis date labels -->
              <view class="flex text-xs pt-1" style="color: #999999;">
                <view
                  v-for="day in mockData.salesTrend"
                  :key="day.date"
                  style="flex: 1; text-align: center;"
                >
                  <text>{{ day.date.slice(-2) }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 热销产品 -->
      <view class="mx-4 mt-6">
        <text class="text-sm font-semibold block mb-3" style="color: #2C2C2C;">热销产品</text>
        <view class="space-y-2">
          <view
            v-for="(product, idx) in mockData.topProducts"
            :key="product.id"
            class="rounded-xl p-3"
            style="background-color: #FFFFFF;"
          >
            <view class="flex items-start justify-between mb-2">
              <view class="flex-1 min-w-0">
                <text class="text-sm font-medium" style="color: #2C2C2C;">{{ product.title }}</text>
              </view>
              <view class="px-2 py-0.5 rounded text-xs flex-shrink-0 ml-2" style="background-color: #F5F1EB; color: #999999;">
                <text>#{{ idx + 1 }}</text>
              </view>
            </view>
            <view class="grid grid-cols-3 gap-2 text-xs" style="color: #666666;">
              <view class="flex items-center gap-1">
                <text style="font-size: 12px;">️</text>
                <text>{{ product.sales }} 单</text>
              </view>
              <view class="flex items-center gap-1">
                <text style="font-size: 12px;"></text>
                <text>¥{{ product.revenue }}</text>
              </view>
              <view class="flex items-center gap-1">
                <text style="font-size: 12px;">📈</text>
                <text>{{ product.conversion }}%</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// --- Types ---
type PeriodType = 'week' | 'month'

interface SalesDay {
  date: string
  sales: number
  revenue: number
  orders: number
}

interface TopProduct {
  id: string
  title: string
  sales: number
  revenue: number
  conversion: number
}

interface SalesData {
  totalSales: number
  totalRevenue: number
  totalOrders: number
  totalCustomers: number
  salesTrend: SalesDay[]
  topProducts: TopProduct[]
}

// --- Mock Data ---
const mockData: SalesData = {
  totalSales: 48520,
  totalRevenue: 36390,
  totalOrders: 385,
  totalCustomers: 280,
  salesTrend: [
    { date: '01-15', sales: 1200, revenue: 900, orders: 8 },
    { date: '01-16', sales: 1850, revenue: 1388, orders: 12 },
    { date: '01-17', sales: 1520, revenue: 1140, orders: 10 },
    { date: '01-18', sales: 2100, revenue: 1575, orders: 14 },
    { date: '01-19', sales: 1850, revenue: 1388, orders: 12 },
    { date: '01-20', sales: 2450, revenue: 1838, orders: 16 },
  ],
  topProducts: [
    { id: '1', title: '《易经》进阶课程', sales: 185, revenue: 8250, conversion: 12.5 },
    { id: '2', title: '八字算命付费咨询', sales: 128, revenue: 5120, conversion: 8.2 },
    { id: '3', title: '紫微斗数秘籍合集', sales: 72, revenue: 3600, conversion: 4.8 },
  ],
}

// --- Period Options ---
const periodOptions = [
  { key: 'week' as PeriodType, label: '本周' },
  { key: 'month' as PeriodType, label: '本月' },
]

// --- State ---
const loading = ref(true)
const period = ref<PeriodType>('month')

// --- Computed ---
const avgOrderAmount = computed(() => {
  return Math.round(mockData.totalSales / mockData.totalOrders)
})

const yAxisMax = computed(() => {
  const maxVal = Math.max(
    ...mockData.salesTrend.map(d => Math.max(d.sales, d.revenue))
  )
  // Round up to nearest nice number
  return Math.ceil(maxVal / 500) * 500
})

// --- Lifecycle ---
setTimeout(() => {
  loading.value = false
}, 800)

// --- Helpers ---
function formatCurrency(value: number): string {
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

function formatLargeNum(value: number): string {
  if (value >= 1000) {
    return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  }
  return String(value)
}

// --- Navigation ---
function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
@keyframes skeletonPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.skeleton-pulse {
  animation: skeletonPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
