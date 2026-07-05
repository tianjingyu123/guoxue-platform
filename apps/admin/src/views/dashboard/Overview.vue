<script setup lang="ts">
/**
 * Overview.vue — 运营看板·总览（看-P1）
 * 北极星卡（周活从业者数暂缺省为 —·近30日 GMV）+ 今日关键数（实时轻查）+ 30日 DAU/GMV 趋势
 * 数据源：GET /dashboard/daily（DashboardDaily 聚合表）+ GET /dashboard/today（实时轻查）
 * Route meta roles: SUPER_ADMIN / OPERATION_ADMIN / FINANCE_ADMIN
 */
import { ref, onMounted } from 'vue'
import type { Component } from 'vue'
import { ElMessage } from 'element-plus'
import { dashboardApi } from '@/api'
import ChartCard from '@/components/ChartCard.vue'
import { User, View, Goods, Money, TrendCharts, Plus, Star } from '@element-plus/icons-vue'

interface DailyRow {
  date: string
  metrics: {
    dau?: number
    pv?: number
    newUsers?: number
    d1Retention?: number
    d7Retention?: number
    bActiveCount?: number
    gmv?: number
    ordersPaid?: number
    memberNew?: number
    commissionSum?: number
    moduleHeat?: Array<{ path: string; pv: number }>
    errors24h?: number
  }
}

const loading = ref(true)
const loadError = ref(false)
const rebuilding = ref(false)
const rows = ref<DailyRow[]>([])
const today = ref<{ date: string; dau: number; pv: number; ordersPaid: number } | null>(null)

interface CardDef {
  label: string
  value: string
  icon: Component
  hint?: string
}
const cards = ref<CardDef[]>([])
// ECharts option 为复杂联合类型，保留 any
const dauOption = ref<any>(null)
const gmvOption = ref<any>(null)

function lineOption(dates: string[], name: string, values: Array<number | null>, color: string, isMoney = false) {
  return {
    grid: { top: 30, right: 20, bottom: 30, left: 60 },
    xAxis: { type: 'category', data: dates, axisLabel: { color: '#999', fontSize: 12 }, axisTick: { show: false } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#F0F0F0' } }, axisLabel: { color: '#999', fontSize: 12 } },
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => (isMoney ? `¥${Number(v ?? 0).toLocaleString()}` : Number(v ?? 0).toLocaleString()) },
    series: [{
      name, type: 'line', data: values, smooth: true, symbol: 'circle', symbolSize: 5,
      lineStyle: { color, width: 3 }, itemStyle: { color },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: `${color}26` }, { offset: 1, color: `${color}00` }] } },
    }],
  }
}

function buildView() {
  const list = rows.value
  const last = list[list.length - 1]
  const gmv30 = list.reduce((s, r) => s + (r.metrics.gmv ?? 0), 0)

  // 昨日单位经济指标（由现有字段推导·D-T3）
  const m = last?.metrics
  const gmvY = m?.gmv ?? 0
  const ordersY = m?.ordersPaid ?? 0
  const commY = m?.commissionSum ?? 0
  const arpu = ordersY > 0 ? `¥${Math.round(gmvY / ordersY).toLocaleString()}` : '—'
  const commRatio = gmvY > 0 ? `${((commY / gmvY) * 100).toFixed(1)}%` : '—'
  const d7 = m?.d7Retention != null ? `${(m.d7Retention * 100).toFixed(1)}%` : '—'
  const bActive = m?.bActiveCount != null ? m.bActiveCount.toLocaleString() : '—'

  // 老板一屏 9 指标（D-T3·生态健康 + 单位经济 + 实时/昨日核心）
  cards.value = [
    { label: '近30日 GMV（北极星）', value: `¥${gmv30.toLocaleString()}`, icon: Money },
    { label: '昨日 B端活跃数（生态健康）', value: bActive, icon: Star, hint: '活跃∩站长/商家/圈主/驿站/讲师' },
    { label: '昨日 7日留存', value: d7, icon: TrendCharts, hint: d7 === '—' ? '暂无 7 日前 cohort' : undefined },
    { label: '昨日 客单价', value: arpu, icon: Money, hint: 'GMV / 支付订单' },
    { label: '昨日 分佣支出比', value: commRatio, icon: Plus, hint: '分佣 / GMV' },
    { label: '今日 DAU', value: (today.value?.dau ?? 0).toLocaleString(), icon: User },
    { label: '今日支付订单', value: (today.value?.ordersPaid ?? 0).toLocaleString(), icon: Goods },
    { label: `昨日 DAU（${last?.date ?? '—'}）`, value: (last?.metrics.dau ?? 0).toLocaleString(), icon: View },
    { label: '昨日 GMV', value: `¥${gmvY.toLocaleString()}`, icon: Money },
  ]

  if (list.length) {
    const dates = list.map((r) => r.date.slice(5))
    dauOption.value = lineOption(dates, 'DAU', list.map((r) => r.metrics.dau ?? 0), '#FF6B6B')
    gmvOption.value = lineOption(dates, 'GMV', list.map((r) => r.metrics.gmv ?? 0), '#5B8FF9', true)
  } else {
    dauOption.value = null
    gmvOption.value = null
  }
}

async function fetchData() {
  loading.value = true
  loadError.value = false
  try {
    const [dailyRes, todayRes] = await Promise.all([dashboardApi.daily(30), dashboardApi.today()])
    rows.value = dailyRes.data ?? []
    today.value = todayRes.data ?? null
    buildView()
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

/** 手动重算昨日聚合（upsert 幂等） */
async function rebuildYesterday() {
  if (rebuilding.value) return
  rebuilding.value = true
  try {
    await dashboardApi.rebuild()
    ElMessage.success('昨日聚合已重算')
    await fetchData()
  } catch {
    // 错误提示由 api 拦截器统一弹出
  } finally {
    rebuilding.value = false
  }
}

onMounted(fetchData)
</script>

<template>
  <div
    v-loading="loading"
    class="page"
  >
    <div class="toolbar">
      <h3>运营看板 · 总览</h3>
      <div class="toolbar-right">
        <el-button
          :loading="loading"
          @click="fetchData"
        >
          刷新
        </el-button>
        <el-button
          type="primary"
          :loading="rebuilding"
          @click="rebuildYesterday"
        >
          重算昨日
        </el-button>
      </div>
    </div>

    <!-- 错误态 -->
    <el-result
      v-if="loadError"
      icon="error"
      title="数据加载失败"
      sub-title="无法获取看板数据，请检查网络或稍后重试"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="fetchData"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <template v-else>
      <!-- 指标卡 -->
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
          <div class="stat-card">
            <div class="stat-card__top">
              <span class="stat-card__label">{{ card.label }}</span>
              <div class="stat-card__icon">
                <el-icon :size="18">
                  <component :is="card.icon" />
                </el-icon>
              </div>
            </div>
            <div class="stat-card__value">
              {{ card.value }}
            </div>
            <div
              v-if="card.hint"
              class="stat-card__hint"
            >
              {{ card.hint }}
            </div>
          </div>
        </el-col>
      </el-row>

      <!-- 30日趋势 -->
      <el-row
        v-if="rows.length"
        :gutter="20"
        class="charts-row"
      >
        <el-col
          :xs="24"
          :md="12"
        >
          <ChartCard
            title="DAU · 近30日"
            :option="dauOption"
            :height="320"
          />
        </el-col>
        <el-col
          :xs="24"
          :md="12"
        >
          <ChartCard
            title="GMV · 近30日"
            :option="gmvOption"
            :height="320"
          />
        </el-col>
      </el-row>

      <!-- 空态：聚合表尚无数据 -->
      <el-empty
        v-if="!rows.length && !loading"
        description="暂无聚合数据（每日 00:30 自动聚合昨日，也可点击「重算昨日」立即生成）"
      />
    </template>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.toolbar-right { display: flex; gap: 8px; }
.stats-row { margin-bottom: 20px; }
.stat-card {
  background: var(--color-bg-card); border-radius: 16px; padding: 20px 22px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04); margin-bottom: 20px;
}
.stat-card__top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.stat-card__label { font-size: 13px; color: var(--color-text-secondary); }
.stat-card__icon {
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(255,107,107,0.1); color: #FF6B6B;
  display: flex; align-items: center; justify-content: center;
}
.stat-card__value { font-size: 26px; font-weight: 700; color: #1A1A1A; font-feature-settings: "tnum"; line-height: 1.2; }
.stat-card__hint { margin-top: 6px; font-size: 12px; color: var(--color-text-secondary); }
.charts-row { margin-bottom: 20px; }
@media (max-width: 768px) { .stat-card { margin-bottom: 12px; } }
</style>
