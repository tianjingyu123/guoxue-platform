<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api'
import {
  WarningFilled, Timer, User, ChatLineSquare, Tickets,
  Service, ChatDotRound, Bell, CaretTop, CaretBottom,
} from '@element-plus/icons-vue'
import GreetingHeader from '@/components/GreetingHeader.vue'
import AnimatedCounter from '@/components/AnimatedCounter.vue'
import AnomalyAlert from '@/components/AnomalyAlert.vue'
import ChartCard from '@/components/ChartCard.vue'

interface AlertItem { text: string; count: number; level: 'critical' | 'warning' | 'info' }
interface TrendInfo { pct: number }
interface CardItem { label: string; value: number; icon: any; highlight?: boolean; trend?: TrendInfo | null; route?: string }
interface ChartItem { title: string; option: any }
interface QuickAction { label: string; path: string; icon: any; badge?: number }

const username = ref('客服专员')
const router = useRouter()

// 角色专属快捷操作（仅指向 CUSTOMER_SERVICE 有权访问的管理页，避免 403）
const quickActions = ref<QuickAction[]>([])

function onCardClick(card: CardItem) {
  if (card.route) router.push(card.route)
}

const alerts = ref<AlertItem[]>([])
const cards = ref<CardItem[]>([])
const charts = ref<ChartItem[]>([])
const loading = ref(true)
const loadError = ref(false)

onMounted(load)

// 诚实环比：仅当昨日基数>0 时才计算日环比，否则返回 null（不展示）
function dayOverDay(todayVal?: number, yestVal?: number): TrendInfo | null {
  if (todayVal == null || yestVal == null || yestVal === 0) return null
  return { pct: Number((((todayVal - yestVal) / yestVal) * 100).toFixed(1)) }
}

async function load() {
  loading.value = true
  loadError.value = false
  try {
    const [overviewRes, statsRes] = await Promise.all([
      api.get('/dashboard/today-overview'),
      api.get('/dashboard/stats'),
    ])
    const ov = overviewRes.data ?? {}
    const st = statsRes.data ?? {}

    // 待办计数（真实来源：举报数取自 stats，今日概览中该字段为占位 0）
    const pendingReports = st.pendingReports ?? 0
    const pendingOrders = ov.todoList?.pendingOrders ?? 0

    // 7 日趋势（真实日粒度数据，用于日环比 + 工单量趋势图）
    const td: Array<{ date: string; users: number; orders: number }> = ov.trendData ?? []
    const todayRow = td.length ? td[td.length - 1] : undefined
    const yestRow = td.length > 1 ? td[td.length - 2] : undefined

    // 告警
    const aList: AlertItem[] = []
    if (pendingReports > 0) aList.push({ text: '待处理举报', count: pendingReports, level: 'critical' })
    if (pendingOrders > 0) aList.push({ text: '待处理工单', count: pendingOrders, level: 'warning' })
    alerts.value = aList

    // 角色专属 KPI（客服=待处理工单/举报 + 今日服务量），仅保留真实有来源字段
    cards.value = [
      { label: '待处理举报', value: pendingReports, icon: WarningFilled, highlight: pendingReports > 0, route: '/reports' },
      { label: '待处理工单', value: pendingOrders, icon: Tickets, highlight: pendingOrders > 0, route: '/after-sales' },
      { label: '今日工单量', value: ov.todayNewOrders ?? 0, icon: Timer, trend: dayOverDay(todayRow?.orders, yestRow?.orders), route: '/orders' },
      { label: '今日新增用户', value: ov.todayNewUsers ?? 0, icon: User, trend: dayOverDay(todayRow?.users, yestRow?.users), route: '/users' },
      { label: '总用户数', value: st.userCount ?? 0, icon: User, route: '/users' },
      { label: '今日活跃圈子', value: ov.todayStats?.todayActiveCircles ?? 0, icon: ChatLineSquare },
    ]

    // 快捷操作 + 待办徽标
    quickActions.value = [
      { label: '用户管理', path: '/users', icon: User },
      { label: '举报处理', path: '/reports', icon: WarningFilled, badge: pendingReports },
      { label: '售后管理', path: '/after-sales', icon: Service, badge: pendingOrders },
      { label: '申诉处理', path: '/risk/appeals', icon: ChatLineSquare },
      { label: '智能客服', path: '/ai/customer-service', icon: ChatDotRound },
      { label: '通知管理', path: '/notifications', icon: Bell },
    ]

    // 折线图 — 近 7 日工单量趋势（真实日订单数）
    charts.value = td.length ? [{
      title: '近7日工单量趋势',
      option: {
        grid: { top: 30, right: 20, bottom: 30, left: 50 },
        xAxis: {
          type: 'category', data: td.map((d) => d.date.slice(5)),
          axisLine: { lineStyle: { color: '#F0F0F0' } },
          axisTick: { show: false },
          axisLabel: { color: '#999', fontSize: 12 },
        },
        yAxis: {
          type: 'value', minInterval: 1,
          splitLine: { lineStyle: { color: '#F0F0F0' } },
          axisLabel: { color: '#999', fontSize: 12 },
          axisLine: { show: false }, axisTick: { show: false },
        },
        series: [{
          type: 'line', data: td.map((d) => d.orders), smooth: true,
          symbol: 'circle', symbolSize: 6,
          lineStyle: { color: '#FF6B6B', width: 3 },
          itemStyle: { color: '#FF6B6B', borderWidth: 2, borderColor: '#fff' },
          areaStyle: {
            color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
              { offset: 0, color: 'rgba(255,107,107,0.15)' },
              { offset: 1, color: 'rgba(255,107,107,0)' },
            ]},
          },
        }],
        tooltip: {
          trigger: 'axis', backgroundColor: '#fff',
          borderColor: '#F0F0F0', borderWidth: 1,
          textStyle: { color: '#1A1A1A', fontSize: 13 },
        },
      },
    }] : []
  } catch (e) {
    console.error('客服仪表盘数据加载失败', e)
    loadError.value = true
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div
    v-loading="loading"
    class="dashboard"
  >
    <GreetingHeader :username="username" />
    <el-result
      v-if="loadError"
      icon="error"
      title="数据加载失败"
      sub-title="无法获取客服数据，请检查网络或稍后重试"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="load"
        >
          重试
        </el-button>
      </template>
    </el-result>
    <template v-else>
    <!-- 角色专属快捷操作 -->
    <div class="quick-actions">
      <div class="quick-actions__title">
        快捷操作
      </div>
      <div class="quick-actions__grid">
        <div
          v-for="qa in quickActions"
          :key="qa.path"
          class="qa-card"
          @click="router.push(qa.path)"
        >
          <el-badge
            :value="qa.badge ?? 0"
            :hidden="!qa.badge"
            :max="99"
            class="qa-badge"
          >
            <div class="qa-icon">
              <el-icon :size="22">
                <component :is="qa.icon" />
              </el-icon>
            </div>
          </el-badge>
          <span class="qa-label">{{ qa.label }}</span>
        </div>
      </div>
    </div>
    <div
      v-if="alerts.length"
      class="alerts-row"
    >
      <AnomalyAlert
        v-for="a in alerts"
        :key="a.text"
        v-bind="a"
      />
    </div>
    <el-row
      :gutter="20"
      class="stats-row"
    >
      <el-col
        v-for="card in cards"
        :key="card.label"
        :xs="24"
        :sm="12"
        :md="6"
      >
        <div
          class="stat-card"
          :class="{ 'stat-card--link': card.route }"
          @click="onCardClick(card)"
        >
          <div class="stat-card__top">
            <span class="stat-card__label">{{ card.label }}</span>
            <div class="stat-card__icon">
              <el-icon :size="18">
                <component :is="card.icon" />
              </el-icon>
            </div>
          </div>
          <div class="stat-card__value">
            <AnimatedCounter
              :value="card.value"
              :highlight="card.highlight"
            />
          </div>
          <div
            v-if="card.trend"
            class="stat-card__trend"
            :class="card.trend.pct >= 0 ? 'up' : 'down'"
          >
            <el-icon :size="12">
              <component :is="card.trend.pct >= 0 ? CaretTop : CaretBottom" />
            </el-icon>
            <span>较昨日 {{ Math.abs(card.trend.pct) }}%</span>
          </div>
        </div>
      </el-col>
    </el-row>
    <el-row
      :gutter="20"
      class="charts-row"
    >
      <el-col
        v-for="ch in charts"
        :key="ch.title"
        :xs="24"
        :md="24"
      >
        <ChartCard
          :title="ch.title"
          :option="ch.option"
          :height="320"
        />
      </el-col>
      <el-col
        v-if="!charts.length"
        :xs="24"
        :md="24"
      >
        <el-empty description="暂无工单趋势数据" />
      </el-col>
    </el-row>
    </template>
  </div>
</template>

<style scoped>
.dashboard { padding: 0; }

/* 快捷操作 */
.quick-actions {
  background: #FFFFFF; border-radius: 16px; padding: 18px 22px 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04); margin-bottom: 20px;
}
.quick-actions__title { font-size: 14px; font-weight: 600; color: var(--color-text-title, #1A1A1A); margin-bottom: 14px; }
.quick-actions__grid { display: flex; flex-wrap: wrap; gap: 8px; }
.qa-card {
  flex: 1 1 92px; min-width: 92px;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 14px 8px; border-radius: 12px; cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}
.qa-card:hover { background: rgba(255, 107, 107, 0.06); transform: translateY(-2px); }
.qa-badge :deep(.el-badge__content) { border: none; }
.qa-icon {
  width: 44px; height: 44px; border-radius: 12px;
  background: rgba(255, 107, 107, 0.1); color: #FF6B6B;
  display: flex; align-items: center; justify-content: center;
}
.qa-label { font-size: 13px; color: var(--color-text-secondary); }

.alerts-row { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.stats-row { margin-bottom: 20px; }
.stat-card {
  background: #FFFFFF; border-radius: 16px; padding: 20px 22px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  margin-bottom: 20px;
}
.stat-card--link { cursor: pointer; }
.stat-card--link:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); }
.stat-card__top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.stat-card__label { font-size: 13px; color: var(--color-text-secondary); }
.stat-card__icon {
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(255, 107, 107, 0.1); color: #FF6B6B;
  display: flex; align-items: center; justify-content: center;
}
.stat-card__value {
  font-size: 28px; font-weight: 700; color: #1A1A1A;
  font-feature-settings: "tnum"; line-height: 1.2;
}
.stat-card__trend {
  display: flex; align-items: center; gap: 2px;
  font-size: 12px; margin-top: 8px;
}
.stat-card__trend.up { color: var(--color-success, #67c23a); }
.stat-card__trend.down { color: var(--color-error, #f56c6c); }
.charts-row { margin-bottom: 20px; }
@media (max-width: 768px) { .stat-card { margin-bottom: 12px; } }
</style>
