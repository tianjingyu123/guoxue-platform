<template>
  <view class="sa-page">
    <view class="sa-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="sa-nav-inner">
        <view class="sa-icon-btn" @tap="goBack">
          <AppIcon name="arrow-left" :size="24" color="#1a1a1a" />
        </view>
        <text class="sa-title">销售数据</text>
        <view class="sa-w8" />
      </view>
      <view class="sa-period">
        <view
          v-for="p in periods"
          :key="p.key"
          class="sa-period-btn"
          :class="{ 'sa-period-active': period === p.key }"
          @tap="period = p.key"
        >
          {{ p.label }}
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="sa-scroll" :style="{ paddingTop: statusBarHeight + 96 + 'px' }">
      <!-- 加载/错误 -->
      <view v-if="loading" class="sa-loading">
        <view class="sa-loading-spin" />
        <text class="sa-loading-txt">加载中...</text>
      </view>
      <view v-if="error" class="sa-error">
        <text class="sa-error-txt">加载失败</text>
        <view class="sa-error-btn" @tap="fetchData"><text class="sa-error-btn-txt">重试</text></view>
      </view>
      <template v-if="!loading && !error">
      <!-- 关键指标 -->
      <view class="sa-metric-grid">
        <view class="sa-card sa-metric">
          <text class="sa-metric-label">销售额</text>
          <text class="sa-metric-num">¥{{ fmtMoney(data.totalSales) }}</text>
          <view class="sa-trend sa-up"><AppIcon name="trending-up" :size="12" color="#16a34a" /><text>15%</text></view>
        </view>
        <view class="sa-card sa-metric">
          <text class="sa-metric-label">预期收益</text>
          <text class="sa-metric-num">¥{{ fmtMoney(data.totalRevenue) }}</text>
          <text class="sa-metric-sub">75% 提成</text>
        </view>
        <view class="sa-card sa-metric">
          <text class="sa-metric-label">订单数</text>
          <text class="sa-metric-num">{{ data.totalOrders }}</text>
          <text class="sa-metric-sub">平均 ¥126</text>
        </view>
        <view class="sa-card sa-metric">
          <text class="sa-metric-label">客户数</text>
          <text class="sa-metric-num">{{ data.totalCustomers }}</text>
          <text class="sa-metric-sub">重复购 28%</text>
        </view>
      </view>

      <!-- 销售趋势 -->
      <view class="sa-section">
        <text class="sa-section-title">销售趋势</text>
        <view class="sa-card">
          <view class="sa-chart-wrap">
            <view class="sa-yaxis">
              <text v-for="t in yTicks" :key="t" class="sa-ytick">{{ t }}</text>
            </view>
            <view class="sa-chart-main">
              <view class="sa-grid">
                <view v-for="t in yTicks" :key="t" class="sa-gridline" />
              </view>
              <view class="sa-chart">
                <view v-for="(item, i) in data.salesTrend" :key="i" class="sa-chart-col">
                  <view class="sa-chart-bars">
                    <view class="sa-bar sa-bar-sales" :style="{ height: (item.sales / chartMax * 100) + '%' }" />
                    <view class="sa-bar sa-bar-rev" :style="{ height: (item.revenue / chartMax * 100) + '%' }" />
                  </view>
                  <text class="sa-chart-label">{{ item.date }}</text>
                </view>
              </view>
            </view>
          </view>
          <view class="sa-legend">
            <view class="sa-legend-item"><view class="sa-dot" style="background:#C41E3A" /><text>销售额</text></view>
            <view class="sa-legend-item"><view class="sa-dot" style="background:#C9A96E" /><text>收益</text></view>
          </view>
        </view>
      </view>

      <!-- 热销产品 -->
      <view class="sa-section">
        <text class="sa-section-title">热销产品</text>
        <view class="sa-list">
          <view v-for="(product, idx) in data.topProducts" :key="product.id" class="sa-card sa-prod">
            <view class="sa-prod-head">
              <text class="sa-prod-title">{{ product.title }}</text>
              <text class="sa-rank">#{{ idx + 1 }}</text>
            </view>
            <view class="sa-prod-stats">
              <view class="sa-pstat"><AppIcon name="shopping-bag" :size="12" color="#999" /><text>{{ product.sales }} 单</text></view>
              <view class="sa-pstat"><AppIcon name="dollar-sign" :size="12" color="#999" /><text>¥{{ product.revenue }}</text></view>
              <view class="sa-pstat"><AppIcon name="trending-up" :size="12" color="#999" /><text>{{ product.conversion }}%</text></view>
            </view>
          </view>
        </view>
      </view>
      <view class="sa-pad" />
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onMounted } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { creatorApi } from '@/lib/creator-data'

const statusBarHeight = ref(0)
const loading = ref(true)
const error = ref(false)
const data = ref({ totalSales: 0, totalRevenue: 0, totalOrders: 0, totalCustomers: 0, salesTrend: [] as Array<{ date: string; sales: number; revenue: number; orders: number }>, topProducts: [] as Array<{ id: string; title: string; sales: number; revenue: number; conversion: number }> })
const period = ref<'week' | 'month'>('month')
const periods = [
  { key: 'week' as const, label: '本周' },
  { key: 'month' as const, label: '本月' },
]
onMounted(async () => {
  try {
    data.value = await creatorApi.getSales()
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
})
async function fetchData() {
  error.value = false
  loading.value = true
  try {
    data.value = await creatorApi.getSales()
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

// Y轴上界取整到 650 的倍数(匹配原型刻度间隔)；刻度从高到低
const chartMax = computed(() => {
  const trend = data.value.salesTrend
  if (trend.length === 0) return 650
  const peak = Math.max(...trend.map((d) => Math.max(d.sales, d.revenue)))
  const step = 650
  return Math.ceil(peak / step) * step
})
const yTicks = computed(() => {
  const step = 650
  const ticks: number[] = []
  for (let v = chartMax.value; v >= 0; v -= step) ticks.push(v)
  return ticks
})

function fmtMoney(n: number) {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

uni.getSystemInfo({ success: (res) => { statusBarHeight.value = res.statusBarHeight || 0 } })
</script>

<style scoped>
.sa-page { min-height: 100vh; background: #f5f5f5; }
.sa-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 10; background: #ffffff; border-bottom: 1px solid #eee; }
.sa-nav-inner { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; height: 44px; }
.sa-icon-btn { padding: 4px; }
.sa-w8 { width: 32px; }
.sa-title { font-size: 18px; font-weight: 600; color: #1a1a1a; }
.sa-period { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid #f5f5f5; }
.sa-period-btn { padding: 6px 12px; border-radius: 999px; font-size: 14px; font-weight: 500; background: #f0f0f0; color: #1a1a1a; }
.sa-period-active { background: #c41e3a; color: #ffffff; }
.sa-scroll { height: 100vh; box-sizing: border-box; }
.sa-metric-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px; }
.sa-card { background: #ffffff; border-radius: 12px; padding: 12px; border: 1px solid #f0f0f0; }
.sa-metric { display: flex; flex-direction: column; }
.sa-metric-label { font-size: 12px; color: #999; margin-bottom: 4px; }
.sa-metric-num { font-size: 24px; font-weight: 700; color: #1a1a1a; }
.sa-metric-sub { font-size: 12px; color: #999; margin-top: 4px; }
.sa-trend { display: flex; align-items: center; gap: 2px; font-size: 12px; margin-top: 4px; }
.sa-up { color: #16a34a; }
.sa-section { margin: 24px 16px 0; }
.sa-section-title { display: block; font-size: 14px; font-weight: 600; color: #1a1a1a; margin-bottom: 12px; }
.sa-chart-wrap { display: flex; height: 220px; padding: 8px 0; }
.sa-yaxis { display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; padding-right: 8px; height: 200px; }
.sa-ytick { font-size: 11px; color: #999; line-height: 1; }
.sa-chart-main { position: relative; flex: 1; }
.sa-grid { position: absolute; top: 0; left: 0; right: 0; height: 200px; display: flex; flex-direction: column; justify-content: space-between; }
.sa-gridline { border-top: 1px dashed #ededed; height: 0; }
.sa-chart { position: relative; display: flex; align-items: flex-end; gap: 8px; }
.sa-chart-col { flex: 1; display: flex; flex-direction: column; align-items: center; }
.sa-chart-bars { height: 200px; width: 100%; display: flex; align-items: flex-end; justify-content: center; gap: 3px; }
.sa-bar { width: 38%; border-radius: 3px 3px 0 0; min-height: 4px; }
.sa-bar-sales { background: #c41e3a; }
.sa-bar-rev { background: #c9a96e; }
.sa-chart-label { font-size: 11px; color: #999; margin-top: 6px; }
.sa-legend { display: flex; justify-content: center; gap: 16px; margin-top: 8px; }
.sa-legend-item { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #666; }
.sa-dot { width: 8px; height: 8px; border-radius: 50%; }
.sa-list { display: flex; flex-direction: column; gap: 8px; }
.sa-prod-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 8px; }
.sa-prod-title { flex: 1; font-size: 14px; font-weight: 500; color: #1a1a1a; }
.sa-rank { font-size: 12px; background: #f0f0f0; color: #666; padding: 2px 8px; border-radius: 4px; }
.sa-prod-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.sa-pstat { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #666; }
.sa-pad { height: 80px; }
/* 加载/错误 */
.sa-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 200rpx 0; gap: 24rpx; }
.sa-loading-spin { width: 56rpx; height: 56rpx; border: 4rpx solid #E5E7EB; border-top-color: #c41e3a; border-radius: 50%; animation: sa-spin 0.8s linear infinite; }
@keyframes sa-spin { to { transform: rotate(360deg); } }
.sa-loading-txt { font-size: 26rpx; color: #999; }
.sa-error { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 200rpx 48rpx; gap: 24rpx; }
.sa-error-txt { font-size: 28rpx; color: #999; }
.sa-error-btn { padding: 16rpx 48rpx; background: #c41e3a; border-radius: 999rpx; }
.sa-error-btn-txt { font-size: 28rpx; color: #fff; font-weight: 500; }
</style>
