<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <app-icon name="arrow-left" :size="22" color="#1a1a1a" />
        </view>
        <text class="nav-title">数据分析</text>
        <view class="nav-back" @tap="onExport">
          <app-icon name="download" :size="22" color="#999999" />
        </view>
      </view>
      <!-- 时间周期 -->
      <view class="period-bar">
        <view
          v-for="p in periods"
          :key="p.key"
          class="period"
          :class="{ 'period-active': period === p.key }"
          @tap="period = p.key"
        >
          <text class="period-text" :class="{ 'period-text-active': period === p.key }">{{ p.label }}</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ paddingTop: navHeight + 'px' }">
      <view v-if="loading" class="state-loading"><text class="state-loading-text">加载中...</text></view>
      <view v-if="error" class="state-error"><text class="state-error-text">加载失败</text><view class="state-retry" @tap="retry"><text class="state-retry-text">重试</text></view></view>
      <template v-if="!loading && !error">
      <!-- 关键指标 -->
      <view class="section">
        <text class="section-title">关键指标</text>
        <view class="metric-grid">
          <view v-for="(m, i) in data.metrics" :key="i" class="card metric-card">
            <view class="metric-head">
              <view>
                <text class="metric-title">{{ m.title }}</text>
                <view class="metric-value-row">
                  <text class="metric-value">{{ m.value.toLocaleString() }}</text>
                  <text class="metric-unit">{{ m.unit }}</text>
                </view>
              </view>
              <view class="metric-trend" :class="m.trend === 'up' ? 'trend-up' : 'trend-down'">
                <app-icon :name="m.trend === 'up' ? 'trending-up' : 'trending-down'" :size="12" :color="m.trend === 'up' ? '#16a34a' : '#dc2626'" />
                <text class="metric-change" :class="m.trend === 'up' ? 'trend-up' : 'trend-down'">{{ Math.abs(m.change) }}%</text>
              </view>
            </view>
            <text class="metric-desc">{{ m.description }}</text>
          </view>
        </view>
      </view>

      <!-- 销售趋势 -->
      <view class="section">
        <text class="section-title">销售趋势</text>
        <view class="card">
          <view class="chart-wrap">
            <view class="yaxis">
              <text v-for="t in salesTicks" :key="t" class="ytick">{{ t }}</text>
            </view>
            <view class="chart-main">
              <view class="grid">
                <view v-for="t in salesTicks" :key="t" class="gridline" />
              </view>
              <view class="svg-box">
                <svg :viewBox="`0 0 ${svgW} ${svgH}`" preserveAspectRatio="none" class="svg">
                  <polyline :points="salesLine" fill="none" stroke="#c41e3a" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
                  <circle v-for="(p, i) in salesCoords" :key="'s' + i" :cx="p.x" :cy="p.y" r="3" fill="#c41e3a" />
                  <polyline :points="ordersLine" fill="none" stroke="#c9a96e" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
                  <circle v-for="(p, i) in ordersCoords" :key="'o' + i" :cx="p.x" :cy="p.y" r="3" fill="#c9a96e" />
                </svg>
              </view>
              <view class="xaxis">
                <text v-for="(d, i) in data.salesTrend" :key="i" class="xtick">{{ d.date }}</text>
              </view>
            </view>
          </view>
          <view class="legend">
            <view class="legend-item"><view class="dot" style="background:#c41e3a" /><text class="legend-text">销售额(元)</text></view>
            <view class="legend-item"><view class="dot" style="background:#c9a96e" /><text class="legend-text">订单数</text></view>
          </view>
        </view>
      </view>

      <!-- 分类销售分布 -->
      <view class="section">
        <text class="section-title">分类销售分布</text>
        <view class="card">
          <view class="pie-wrap">
            <view class="pie" :style="{ background: pieGradient }">
              <view class="pie-hole" />
            </view>
          </view>
          <view class="cat-list">
            <view v-for="(c, i) in data.categorySales" :key="i" class="cat-item">
              <view class="cat-left">
                <view class="cat-dot" :style="{ background: colors[i % colors.length] }" />
                <view>
                  <text class="cat-name">{{ c.name }}</text>
                  <text class="cat-orders">{{ c.orders }} 单</text>
                </view>
              </view>
              <view class="cat-right">
                <text class="cat-sales">¥{{ c.sales.toLocaleString() }}</text>
                <text class="cat-pct">{{ c.percentage }}%</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 热销商品 TOP3 -->
      <view class="section">
        <text class="section-title">热销商品 TOP 3</text>
        <view class="top-list">
          <view v-for="(p, i) in data.topProducts" :key="p.id" class="card top-card">
            <view class="top-head">
              <view class="top-rank">#{{ i + 1 }}</view>
              <text class="top-name">{{ p.name }}</text>
              <text class="top-change" :class="p.change >= 0 ? 'trend-up' : 'trend-down'">
                {{ p.change >= 0 ? '↑' : '↓' }} {{ Math.abs(p.change) }}%
              </text>
            </view>
            <view class="top-foot">
              <text class="top-sales">销售 {{ p.sales }} 件</text>
              <text class="top-revenue">¥{{ p.revenue.toLocaleString() }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 用户留存 -->
      <view class="section">
        <view class="card">
          <text class="card-title">用户留存统计</text>
          <view class="retention-grid">
            <view class="retention-item">
              <text class="retention-num">{{ data.customerRetention.newCustomers }}</text>
              <text class="retention-label">新客户</text>
            </view>
            <view class="retention-item">
              <text class="retention-num">{{ data.customerRetention.repeatCustomers }}</text>
              <text class="retention-label">复购客户</text>
            </view>
            <view class="retention-item retention-primary">
              <text class="retention-num retention-num-primary">{{ data.customerRetention.retention }}%</text>
              <text class="retention-label">复购率</text>
            </view>
          </view>
        </view>
      </view>
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { merchantAdminApi, analyticsCategoryColors } from '@/lib/merchant-data'

const statusBarHeight = ref(0)
const navHeight = ref(96)

const sys = uni.getSystemInfoSync()
statusBarHeight.value = sys.statusBarHeight || 0
navHeight.value = (sys.statusBarHeight || 0) + 96

const data = ref<any>({})
const loading = ref(true)
const error = ref(false)
const colors = analyticsCategoryColors
const period = ref<'day' | 'week' | 'month'>('month')
const periods = [
  { key: 'day' as const, label: '今天' },
  { key: 'week' as const, label: '本周' },
  { key: 'month' as const, label: '本月' },
]

// SVG 折线图
const svgW = 300
const svgH = 180
const salesMax = computed(() => {
  const trend = data.value?.salesTrend
  if (!trend || trend.length === 0) return 2000
  const peak = Math.max(...trend.map((d: any) => d.sales))
  const step = 2000
  return Math.ceil(peak / step) * step
})
const salesTicks = computed(() => {
  const step = 2000
  const ticks: number[] = []
  for (let v = salesMax.value; v >= 0; v -= step) ticks.push(v)
  return ticks
})
const ordersMax = computed(() => {
  const trend = data.value?.salesTrend
  if (!trend || trend.length === 0) return 40
  return Math.max(...trend.map((d: any) => d.orders)) * 1.2
})
function coords(key: 'sales' | 'orders', max: number) {
  const trend = data.value?.salesTrend
  if (!trend) return []
  const n = trend.length
  return trend.map((d: any, i: number) => ({
    x: n > 1 ? (i / (n - 1)) * svgW : svgW / 2,
    y: svgH - (d[key] / max) * svgH,
  }))
}
const salesCoords = computed(() => coords('sales', salesMax.value))
const ordersCoords = computed(() => coords('orders', ordersMax.value))
const salesLine = computed(() => salesCoords.value.map((p) => `${p.x},${p.y}`).join(' '))
const ordersLine = computed(() => ordersCoords.value.map((p) => `${p.x},${p.y}`).join(' '))

// conic-gradient 饼图
const pieGradient = computed(() => {
  if (!data.value?.categorySales) return 'conic-gradient(#e5e7eb 100%)'
  let acc = 0
  const stops: string[] = []
  data.value.categorySales.forEach((c: any, i: number) => {
    const start = acc
    acc += c.percentage
    stops.push(`${colors[i % colors.length]} ${start}% ${acc}%`)
  })
  return `conic-gradient(${stops.join(', ')})`
})

function onExport() {
  uni.showToast({ title: '报表导出功能开发中', icon: 'none' })
}

onMounted(async () => {
  try {
    data.value = await merchantAdminApi.getDashboard()
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
})

async function retry() {
  error.value = false
  loading.value = true
  try { data.value = await merchantAdminApi.getDashboard() }
  catch { error.value = true }
  finally { loading.value = false }
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: #ffffff; border-bottom: 1px solid #ededed; }
.nav-bar { display: flex; align-items: center; height: 44px; padding: 0 16px; }
.nav-back { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.nav-title { flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #1a1a1a; }
.period-bar { display: flex; gap: 8px; padding: 0 16px 12px; }
.period { padding: 6px 14px; border-radius: 999px; background: #f3f4f6; }
.period-active { background: #c41e3a; }
.period-text { font-size: 13px; color: #4b5563; }
.period-text-active { color: #ffffff; }
.scroll { height: 100vh; box-sizing: border-box; padding-bottom: 40px; }

.section { padding: 16px 16px 0; }
.section-title { display: block; font-size: 14px; font-weight: 600; color: #1a1a1a; margin-bottom: 12px; }
.card { background: #ffffff; border-radius: 12px; padding: 16px; }

.metric-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.metric-card { padding: 12px; }
.metric-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 8px; }
.metric-title { font-size: 12px; color: #9ca3af; }
.metric-value-row { display: flex; align-items: baseline; gap: 2px; margin-top: 4px; }
.metric-value { font-size: 20px; font-weight: 700; color: #1a1a1a; }
.metric-unit { font-size: 12px; color: #9ca3af; }
.metric-trend { display: flex; align-items: center; gap: 2px; }
.metric-change { font-size: 12px; font-weight: 500; }
.trend-up { color: #16a34a; }
.trend-down { color: #dc2626; }
.metric-desc { font-size: 12px; color: #9ca3af; }

.chart-wrap { display: flex; padding: 8px 0; }
.yaxis { display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; padding-right: 8px; height: 180px; }
.ytick { font-size: 10px; color: #9ca3af; line-height: 1; }
.chart-main { position: relative; flex: 1; }
.grid { position: absolute; top: 0; left: 0; right: 0; height: 180px; display: flex; flex-direction: column; justify-content: space-between; }
.gridline { border-top: 1px dashed #ededed; height: 0; }
.svg-box { position: relative; height: 180px; width: 100%; }
.svg { width: 100%; height: 100%; display: block; overflow: visible; }
.xaxis { display: flex; justify-content: space-between; margin-top: 6px; }
.xtick { font-size: 10px; color: #9ca3af; }
.legend { display: flex; justify-content: center; gap: 20px; margin-top: 12px; }
.legend-item { display: flex; align-items: center; gap: 6px; }
.dot { width: 10px; height: 10px; border-radius: 50%; }
.legend-text { font-size: 12px; color: #4b5563; }

.pie-wrap { display: flex; justify-content: center; padding: 12px 0 20px; }
.pie { width: 160px; height: 160px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.pie-hole { width: 80px; height: 80px; border-radius: 50%; background: #ffffff; }
.cat-list { display: flex; flex-direction: column; gap: 12px; }
.cat-item { display: flex; align-items: center; justify-content: space-between; }
.cat-left { display: flex; align-items: center; gap: 8px; }
.cat-dot { width: 12px; height: 12px; border-radius: 50%; }
.cat-name { display: block; font-size: 14px; font-weight: 500; color: #1a1a1a; }
.cat-orders { font-size: 12px; color: #9ca3af; }
.cat-right { text-align: right; }
.cat-sales { display: block; font-size: 14px; font-weight: 600; color: #1a1a1a; }
.cat-pct { font-size: 12px; color: #9ca3af; }

.top-list { display: flex; flex-direction: column; gap: 8px; }
.top-card { padding: 12px; }
.top-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.top-rank { font-size: 12px; color: #4b5563; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; }
.top-name { flex: 1; font-size: 14px; font-weight: 500; color: #1a1a1a; }
.top-change { font-size: 12px; font-weight: 600; }
.top-foot { display: flex; align-items: center; justify-content: space-between; }
.top-sales { font-size: 12px; color: #9ca3af; }
.top-revenue { font-size: 14px; font-weight: 700; color: #1a1a1a; }

.card-title { display: block; font-size: 14px; font-weight: 600; color: #1a1a1a; margin-bottom: 16px; }
.retention-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
.retention-item { padding: 12px; background: #f9fafb; border-radius: 8px; display: flex; flex-direction: column; align-items: center; }
.retention-primary { background: #fef2f4; border: 1px solid #f5c2cb; }
.retention-num { font-size: 22px; font-weight: 700; color: #1a1a1a; }
.retention-num-primary { color: #c41e3a; }
.retention-label { font-size: 12px; color: #9ca3af; margin-top: 4px; }
/* 三态 */
.state-loading { padding: 80px 0; text-align: center; }
.state-loading-text { font-size: 14px; color: #9ca3af; }
.state-error { padding: 80px 0; text-align: center; }
.state-error-text { font-size: 14px; color: #ef4444; display: block; margin-bottom: 12px; }
.state-retry { display: inline-block; padding: 8px 20px; background: #c41e3a; border-radius: 8px; }
.state-retry-text { font-size: 14px; color: #fff; }
</style>
