<script setup lang="ts">
/**
 * Growth.vue — 运营看板·增长（看-P1）
 * DAU/新增用户双线 + 次日留存曲线（d1Retention 按日可缺省·全空时诚实空态）
 * 数据源：GET /dashboard/daily（DashboardDaily 聚合表）
 * Route meta roles: SUPER_ADMIN / OPERATION_ADMIN / FINANCE_ADMIN
 */
import { ref, onMounted } from 'vue'
import { dashboardApi } from '@/api'
import ChartCard from '@/components/ChartCard.vue'

interface DailyRow {
  date: string
  metrics: { dau?: number; newUsers?: number; d1Retention?: number }
}

const loading = ref(true)
const loadError = ref(false)
const rows = ref<DailyRow[]>([])
const hasRetention = ref(false)

// ECharts option 为复杂联合类型，保留 any
const growthOption = ref<any>(null)
const retentionOption = ref<any>(null)

function buildView() {
  const list = rows.value
  if (!list.length) {
    growthOption.value = null
    retentionOption.value = null
    hasRetention.value = false
    return
  }
  const dates = list.map((r) => r.date.slice(5))

  growthOption.value = {
    grid: { top: 40, right: 20, bottom: 30, left: 50 },
    legend: { data: ['DAU', '新增用户'], top: 0 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: dates, axisLabel: { color: '#999', fontSize: 12 }, axisTick: { show: false } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#F0F0F0' } }, axisLabel: { color: '#999', fontSize: 12 } },
    series: [
      { name: 'DAU', type: 'line', smooth: true, data: list.map((r) => r.metrics.dau ?? 0), lineStyle: { color: '#FF6B6B', width: 3 }, itemStyle: { color: '#FF6B6B' } },
      { name: '新增用户', type: 'line', smooth: true, data: list.map((r) => r.metrics.newUsers ?? 0), lineStyle: { color: '#5B8FF9', width: 3 }, itemStyle: { color: '#5B8FF9' } },
    ],
  }

  // 次日留存：字段按日可缺省（诚实降级），全缺省则整图空态
  const retention = list.map((r) => (typeof r.metrics.d1Retention === 'number' ? Math.round(r.metrics.d1Retention * 10000) / 100 : null))
  hasRetention.value = retention.some((v) => v !== null)
  retentionOption.value = hasRetention.value
    ? {
        grid: { top: 30, right: 20, bottom: 30, left: 50 },
        tooltip: { trigger: 'axis', valueFormatter: (v: number) => (v == null ? '—' : `${v}%`) },
        xAxis: { type: 'category', data: dates, axisLabel: { color: '#999', fontSize: 12 }, axisTick: { show: false } },
        yAxis: { type: 'value', max: 100, splitLine: { lineStyle: { color: '#F0F0F0' } }, axisLabel: { color: '#999', fontSize: 12, formatter: '{value}%' } },
        series: [{ name: '次日留存率', type: 'line', smooth: true, connectNulls: true, data: retention, lineStyle: { color: '#61C29B', width: 3 }, itemStyle: { color: '#61C29B' } }],
      }
    : null
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
      <h3>运营看板 · 增长</h3>
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
      sub-title="无法获取增长数据，请检查网络或稍后重试"
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
      <el-row
        v-if="rows.length"
        :gutter="20"
        class="charts-row"
      >
        <el-col :span="24">
          <ChartCard
            title="DAU / 新增用户 · 近30日"
            :option="growthOption"
            :height="340"
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
            v-if="hasRetention"
            title="次日留存率 · 近30日"
            :option="retentionOption"
            :height="320"
          />
          <div
            v-else
            class="section-card"
          >
            <div class="section-card__title">
              次日留存率 · 近30日
            </div>
            <el-empty
              description="暂无留存数据（前一日无新用户时该字段省略）"
              :image-size="48"
            />
          </div>
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
.charts-row { margin-bottom: 20px; }
.section-card {
  background: var(--color-bg-card); border-radius: 16px; padding: 20px 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}
.section-card__title { font-size: 14px; font-weight: 500; color: var(--color-text-secondary); margin-bottom: 16px; }
</style>
