<script setup lang="ts">
/**
 * Revenue.vue — 运营看板·收入（看-P1）
 * GMV 柱 + 佣金折线（双轴柱线混合）+ 会员新购柱图
 * 数据源：GET /dashboard/daily（DashboardDaily 聚合表）
 * Route meta roles: SUPER_ADMIN / OPERATION_ADMIN / FINANCE_ADMIN
 */
import { ref, onMounted } from 'vue'
import { dashboardApi } from '@/api'
import ChartCard from '@/components/ChartCard.vue'

interface DailyRow {
  date: string
  metrics: { gmv?: number; ordersPaid?: number; commissionSum?: number; memberNew?: number }
}

const loading = ref(true)
const loadError = ref(false)
const rows = ref<DailyRow[]>([])
const summary = ref({ gmv30: 0, commission30: 0, member30: 0, orders30: 0 })

// ECharts option 为复杂联合类型，保留 any
const gmvOption = ref<any>(null)
const memberOption = ref<any>(null)

function buildView() {
  const list = rows.value
  if (!list.length) {
    gmvOption.value = null
    memberOption.value = null
    summary.value = { gmv30: 0, commission30: 0, member30: 0, orders30: 0 }
    return
  }
  const dates = list.map((r) => r.date.slice(5))
  summary.value = {
    gmv30: list.reduce((s, r) => s + (r.metrics.gmv ?? 0), 0),
    commission30: list.reduce((s, r) => s + (r.metrics.commissionSum ?? 0), 0),
    member30: list.reduce((s, r) => s + (r.metrics.memberNew ?? 0), 0),
    orders30: list.reduce((s, r) => s + (r.metrics.ordersPaid ?? 0), 0),
  }

  gmvOption.value = {
    grid: { top: 40, right: 60, bottom: 30, left: 60 },
    legend: { data: ['GMV', '佣金'], top: 0 },
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => `¥${Number(v ?? 0).toLocaleString()}` },
    xAxis: { type: 'category', data: dates, axisLabel: { color: '#999', fontSize: 12 }, axisTick: { show: false } },
    yAxis: [
      { type: 'value', name: 'GMV', splitLine: { lineStyle: { color: '#F0F0F0' } }, axisLabel: { color: '#999', fontSize: 12 } },
      { type: 'value', name: '佣金', splitLine: { show: false }, axisLabel: { color: '#999', fontSize: 12 } },
    ],
    series: [
      { name: 'GMV', type: 'bar', data: list.map((r) => r.metrics.gmv ?? 0), itemStyle: { color: '#5B8FF9', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 18 },
      { name: '佣金', type: 'line', yAxisIndex: 1, smooth: true, data: list.map((r) => r.metrics.commissionSum ?? 0), lineStyle: { color: '#F6BD16', width: 3 }, itemStyle: { color: '#F6BD16' } },
    ],
  }

  memberOption.value = {
    grid: { top: 30, right: 20, bottom: 30, left: 50 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: dates, axisLabel: { color: '#999', fontSize: 12 }, axisTick: { show: false } },
    yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#F0F0F0' } }, axisLabel: { color: '#999', fontSize: 12 } },
    series: [{ name: '会员新购', type: 'bar', data: list.map((r) => r.metrics.memberNew ?? 0), itemStyle: { color: '#61C29B', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 18 }],
  }
}

async function fetchData() {
  loading.value = true
  loadError.value = false
  try {
    const res = await dashboardApi.daily(30)
    rows.value = res.data ?? []
    buildView()
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
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
      <h3>运营看板 · 收入</h3>
      <el-button
        :loading="loading"
        @click="fetchData"
      >
        刷新
      </el-button>
    </div>

    <!-- 错误态 -->
    <el-result
      v-if="loadError"
      icon="error"
      title="数据加载失败"
      sub-title="无法获取收入数据，请检查网络或稍后重试"
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
      <!-- 近30日汇总卡 -->
      <el-row
        v-if="rows.length"
        :gutter="20"
        class="stats-row"
      >
        <el-col
          :xs="12"
          :md="6"
        >
          <div class="stat-card">
            <div class="stat-card__label">
              近30日 GMV
            </div>
            <div class="stat-card__value">
              ¥{{ summary.gmv30.toLocaleString() }}
            </div>
          </div>
        </el-col>
        <el-col
          :xs="12"
          :md="6"
        >
          <div class="stat-card">
            <div class="stat-card__label">
              近30日佣金
            </div>
            <div class="stat-card__value">
              ¥{{ summary.commission30.toLocaleString() }}
            </div>
          </div>
        </el-col>
        <el-col
          :xs="12"
          :md="6"
        >
          <div class="stat-card">
            <div class="stat-card__label">
              近30日支付订单
            </div>
            <div class="stat-card__value">
              {{ summary.orders30.toLocaleString() }}
            </div>
          </div>
        </el-col>
        <el-col
          :xs="12"
          :md="6"
        >
          <div class="stat-card">
            <div class="stat-card__label">
              近30日会员新购
            </div>
            <div class="stat-card__value">
              {{ summary.member30.toLocaleString() }}
            </div>
          </div>
        </el-col>
      </el-row>

      <el-row
        v-if="rows.length"
        :gutter="20"
        class="charts-row"
      >
        <el-col :span="24">
          <ChartCard
            title="GMV（柱）× 佣金（线） · 近30日"
            :option="gmvOption"
            :height="360"
          />
        </el-col>
      </el-row>

      <el-row
        v-if="rows.length"
        :gutter="20"
        class="charts-row"
      >
        <el-col :span="24">
          <ChartCard
            title="会员新购 · 近30日"
            :option="memberOption"
            :height="300"
          />
        </el-col>
      </el-row>

      <el-empty
        v-if="!rows.length && !loading"
        description="暂无聚合数据（每日 00:30 自动聚合昨日）"
      />
    </template>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.stats-row { margin-bottom: 20px; }
.stat-card {
  background: var(--color-bg-card); border-radius: 16px; padding: 20px 22px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04); margin-bottom: 20px;
}
.stat-card__label { font-size: 13px; color: var(--color-text-secondary); margin-bottom: 10px; }
.stat-card__value { font-size: 26px; font-weight: 700; color: #1A1A1A; font-feature-settings: "tnum"; line-height: 1.2; }
.charts-row { margin-bottom: 20px; }
@media (max-width: 768px) { .stat-card { margin-bottom: 12px; } }
</style>
