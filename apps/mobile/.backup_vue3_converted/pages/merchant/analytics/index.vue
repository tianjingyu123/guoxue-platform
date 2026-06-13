<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-white border-b border-border">
      <view class="flex items-center justify-between px-4 py-3">
        <view @click="goBack" class="p-1">
          <text class="text-2xl text-foreground">&#8592;</text>
        </view>
        <text class="text-lg font-semibold text-foreground">数据分析</text>
        <view @click="handleDownload" class="p-1">
          <text class="text-lg text-muted-foreground">⬇</text>
        </view>
      </view>
    </view>

    <!-- 时间周期选择 -->
    <view class="bg-white border-b border-border px-4 py-3">
      <view class="flex gap-2">
        <view
          v-for="p in periods" :key="p.key"
          @click="switchPeriod(p.key)"
          :class="['px-3 py-1.5 rounded-full text-sm font-medium', period === p.key ? 'bg-primary text-white' : 'bg-background text-ink-soft']"
        >
          <text>{{ p.label }}</text>
        </view>
      </view>
    </view>

    <!-- 加载骨架 -->
    <view v-if="loading" class="p-4 space-y-4">
      <view v-for="i in 4" :key="i" class="h-32 bg-gray-200 rounded-xl animate-pulse" />
    </view>

    <scroll-view v-else scroll-y class="flex-1" style="height: calc(100vh - 120px)">
      <view class="pb-20">
        <!-- 关键指标 -->
        <view class="mx-4 mt-4">
          <text class="text-sm font-semibold text-foreground mb-3 block">关键指标</text>
          <view class="grid grid-cols-2 gap-3">
            <view v-for="(metric, idx) in metrics" :key="idx" class="bg-white rounded-xl p-3 shadow-sm">
              <view class="flex items-start justify-between mb-2">
                <view>
                  <text class="text-xs text-muted-foreground mb-1 block">{{ metric.title }}</text>
                  <text class="text-xl font-bold text-foreground">
                    {{ metric.displayValue }}<text class="text-xs ml-1 text-muted-foreground">{{ metric.unit }}</text>
                  </text>
                </view>
                <text :class="['flex items-center text-xs font-medium', metric.trend === 'up' ? 'text-green-600' : 'text-red-600']">
                  {{ metric.trend === 'up' ? '↑' : '↓' }}{{ Math.abs(metric.change) }}%
                </text>
              </view>
              <text class="text-xs text-muted-foreground">{{ metric.desc }}</text>
            </view>
          </view>
        </view>

        <!-- 销售趋势 -->
        <view class="mx-4 mt-6">
          <text class="text-sm font-semibold text-foreground mb-3 block">销售趋势</text>
          <view class="bg-white rounded-xl p-4 shadow-sm">
            <view class="space-y-3">
              <view v-for="(item, idx) in salesTrend" :key="idx" class="flex items-center gap-3">
                <text class="text-xs text-muted-foreground w-10 shrink-0">{{ item.date }}</text>
                <view class="flex-1 h-6 bg-background rounded relative overflow-hidden">
                  <view class="h-full bg-primary rounded transition-all" :style="{ width: (item.sales / maxSales * 100) + '%' }" />
                </view>
                <text class="text-xs text-foreground w-16 text-right shrink-0">¥{{ item.sales }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 分类销售分布 -->
        <view class="mx-4 mt-6">
          <text class="text-sm font-semibold text-foreground mb-3 block">分类销售分布</text>
          <view class="space-y-3">
            <view v-for="(cat, idx) in categorySales" :key="idx" class="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3">
              <view class="w-3 h-3 rounded-full shrink-0" :style="{ backgroundColor: colors[idx % colors.length] }" />
              <view class="flex-1">
                <text class="text-sm font-medium text-foreground block">{{ cat.name }}</text>
                <text class="text-xs text-muted-foreground">{{ cat.orders }} 单</text>
              </view>
              <view class="text-right">
                <text class="text-sm font-semibold text-foreground block">¥{{ cat.sales.toLocaleString() }}</text>
                <text class="text-xs text-muted-foreground">{{ cat.percentage }}%</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 热销商品 -->
        <view class="mx-4 mt-6">
          <text class="text-sm font-semibold text-foreground mb-3 block">热销商品 TOP 3</text>
          <view class="space-y-2">
            <view v-for="(product, idx) in topProducts" :key="product.id" class="bg-white rounded-xl p-3 shadow-sm">
              <view class="flex items-center justify-between mb-2">
                <view class="flex items-center gap-2">
                  <view class="px-2 py-0.5 bg-background rounded text-xs text-ink-soft">#{{ idx + 1 }}</view>
                  <text class="text-sm font-medium text-foreground line-clamp-1">{{ product.name }}</text>
                </view>
                <text :class="['text-xs font-semibold', product.change >= 0 ? 'text-green-600' : 'text-red-600']">
                  {{ product.change >= 0 ? '↑' : '↓' }}{{ Math.abs(product.change) }}%
                </text>
              </view>
              <view class="flex items-center justify-between">
                <text class="text-xs text-muted-foreground">销售 {{ product.sales }} 件</text>
                <text class="text-sm font-bold text-foreground">¥{{ product.revenue.toLocaleString() }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 用户留存 -->
        <view class="mx-4 mt-6 mb-8">
          <view class="bg-white rounded-xl p-4 shadow-sm">
            <text class="text-sm font-semibold text-foreground mb-4 block">用户留存统计</text>
            <view class="grid grid-cols-3 gap-3">
              <view class="text-center p-3 bg-background rounded-lg">
                <text class="text-2xl font-bold text-foreground block">{{ customerRetention.newCustomers }}</text>
                <text class="text-xs text-muted-foreground mt-1 block">新客户</text>
              </view>
              <view class="text-center p-3 bg-background rounded-lg">
                <text class="text-2xl font-bold text-foreground block">{{ customerRetention.repeatCustomers }}</text>
                <text class="text-xs text-muted-foreground mt-1 block">复购客户</text>
              </view>
              <view class="text-center p-3 bg-primary/5 rounded-lg border border-primary/20">
                <text class="text-2xl font-bold text-primary block">{{ customerRetention.retention }}%</text>
                <text class="text-xs text-muted-foreground mt-1 block">复购率</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const periods = [
  { key: 'day', label: '今天' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
]

const period = ref('month')
const loading = ref(true)
const colors = ['#C41E3A', '#E85D75', '#C9A96E', '#8B7355']

// 模拟数据
interface MetricItem { title: string; value: number; unit: string; displayValue: string; change: number; trend: 'up' | 'down'; desc: string }
interface SalesTrendItem { date: string; sales: number; orders: number }
interface CategorySalesItem { name: string; orders: number; sales: number; percentage: number }
interface ProductItem { id: string; name: string; sales: number; revenue: number; change: number }
interface Retention { newCustomers: number; repeatCustomers: number; retention: number }

const metrics = ref<MetricItem[]>([])
const salesTrend = ref<SalesTrendItem[]>([])
const categorySales = ref<CategorySalesItem[]>([])
const topProducts = ref<ProductItem[]>([])
const customerRetention = ref<Retention>({ newCustomers: 0, repeatCustomers: 0, retention: 0 })

const maxSales = computed(() => Math.max(...salesTrend.value.map(t => t.sales), 1))

function generateMockData(p: string) {
  const isDay = p === 'day'
  const isWeek = p === 'week'

  metrics.value = [
    { title: '浏览量', value: 12560, unit: '次', displayValue: isDay ? '1,256' : isWeek ? '8,430' : '12,560', change: 12, trend: 'up', desc: `较上${isDay ? '日' : isWeek ? '周' : '月'}增长12%` },
    { title: '订单数', value: 328, unit: '单', displayValue: isDay ? '42' : isWeek ? '218' : '328', change: 8, trend: 'up', desc: `较上${isDay ? '日' : isWeek ? '周' : '月'}增长8%` },
    { title: '营收', value: 12800, unit: '元', displayValue: isDay ? '1,280' : isWeek ? '8,600' : '12,800', change: 15, trend: 'up', desc: `较上${isDay ? '日' : isWeek ? '周' : '月'}增长15%` },
    { title: '转化率', value: 2.6, unit: '%', displayValue: isDay ? '3.2' : isWeek ? '2.8' : '2.6', change: 3, trend: 'down', desc: `较上${isDay ? '日' : isWeek ? '周' : '月'}下降3%` },
  ]

  if (isDay) {
    salesTrend.value = [
      { date: '06:00', sales: 120, orders: 2 },
      { date: '08:00', sales: 380, orders: 5 },
      { date: '10:00', sales: 520, orders: 8 },
      { date: '12:00', sales: 410, orders: 6 },
      { date: '14:00', sales: 350, orders: 5 },
      { date: '16:00', sales: 290, orders: 4 },
      { date: '18:00', sales: 180, orders: 3 },
    ]
    categorySales.value = [
      { name: '古籍图书', orders: 18, sales: 3200, percentage: 38 },
      { name: '文创用品', orders: 12, sales: 2100, percentage: 25 },
      { name: '国学课程', orders: 8, sales: 1800, percentage: 22 },
      { name: '其他', orders: 4, sales: 1200, percentage: 15 },
    ]
    topProducts.value = [
      { id: '1', name: '《渊海子平》精装典藏版', sales: 18, revenue: 3024, change: 12 },
      { id: '2', name: '天然黑曜石貔貅手链', sales: 12, revenue: 1536, change: 5 },
      { id: '3', name: '孔子像摆件', sales: 8, revenue: 1600, change: -3 },
    ]
    customerRetention.value = { newCustomers: 18, repeatCustomers: 8, retention: 44.4 }
  } else if (isWeek) {
    salesTrend.value = [
      { date: '周一', sales: 980, orders: 15 },
      { date: '周二', sales: 1200, orders: 18 },
      { date: '周三', sales: 860, orders: 14 },
      { date: '周四', sales: 1500, orders: 22 },
      { date: '周五', sales: 2100, orders: 30 },
      { date: '周六', sales: 1800, orders: 26 },
      { date: '周日', sales: 1600, orders: 24 },
    ]
    categorySales.value = [
      { name: '古籍图书', orders: 85, sales: 15200, percentage: 40 },
      { name: '文创用品', orders: 52, sales: 8600, percentage: 26 },
      { name: '国学课程', orders: 38, sales: 6200, percentage: 20 },
      { name: '其他', orders: 28, sales: 4800, percentage: 14 },
    ]
    topProducts.value = [
      { id: '1', name: '《渊海子平》精装典藏版', sales: 68, revenue: 11424, change: 18 },
      { id: '2', name: '天然黑曜石貔貅手链', sales: 45, revenue: 5760, change: 10 },
      { id: '3', name: '风水罗盘专业版', sales: 32, revenue: 8576, change: -8 },
    ]
    customerRetention.value = { newCustomers: 86, repeatCustomers: 38, retention: 44.2 }
  } else {
    salesTrend.value = [
      { date: '01/01', sales: 1200, orders: 18 },
      { date: '01/05', sales: 800, orders: 12 },
      { date: '01/09', sales: 1600, orders: 24 },
      { date: '01/13', sales: 2000, orders: 30 },
      { date: '01/17', sales: 1400, orders: 21 },
      { date: '01/21', sales: 1800, orders: 27 },
      { date: '01/25', sales: 960, orders: 15 },
    ]
    categorySales.value = [
      { name: '古籍图书', orders: 128, sales: 21500, percentage: 42 },
      { name: '文创用品', orders: 86, sales: 12800, percentage: 25 },
      { name: '国学课程', orders: 52, sales: 9600, percentage: 19 },
      { name: '其他', orders: 34, sales: 7200, percentage: 14 },
    ]
    topProducts.value = [
      { id: '1', name: '《渊海子平》精装典藏版', sales: 128, revenue: 21504, change: 15 },
      { id: '2', name: '天然黑曜石貔貅手链', sales: 89, revenue: 11392, change: 8 },
      { id: '3', name: '风水罗盘专业版', sales: 56, revenue: 15008, change: -5 },
    ]
    customerRetention.value = { newCustomers: 128, repeatCustomers: 56, retention: 43.8 }
  }
}

function switchPeriod(p: string) {
  if (p === period.value) return
  period.value = p
  loading.value = true
  setTimeout(() => {
    generateMockData(p)
    loading.value = false
  }, 400)
}

function handleDownload() {
  uni.showToast({ title: '数据导出中...', icon: 'loading' })
  setTimeout(() => { uni.showToast({ title: '导出成功', icon: 'success' }) }, 1000)
}

function goBack() { uni.navigateBack() }

// 初始化
generateMockData('month')
loading.value = false
</script>

<style scoped>
</style>
