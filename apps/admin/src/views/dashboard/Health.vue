<script setup lang="ts">
/**
 * Health.vue — 运营看板·健康（看-P1）
 * 模块热度 Top10 条形图（最近聚合日）+ 错误数 30 日折线 + 错误明细跳转 /system/error-monitor
 * 数据源：GET /dashboard/daily（DashboardDaily 聚合表）
 * Route meta roles: SUPER_ADMIN / OPERATION_ADMIN / FINANCE_ADMIN
 */
import { ref, computed, onMounted } from 'vue'
import type { ChartOption } from '@/utils/chart'
import { useRouter } from 'vue-router'
import { dashboardApi } from '@/api'
import ChartCard from '@/components/ChartCard.vue'

interface DailyRow {
  date: string
  metrics: { moduleHeat?: Array<{ path: string; pv: number }>; errors24h?: number }
}

const router = useRouter()
const loading = ref(true)
const loadError = ref(false)
const rows = ref<DailyRow[]>([])

const latestDate = computed(() => rows.value[rows.value.length - 1]?.date ?? '—')
const latestErrors = computed(() => rows.value[rows.value.length - 1]?.metrics.errors24h ?? 0)
const hasHeat = ref(false)

const heatOption = ref<ChartOption | null>(null)
const errorOption = ref<ChartOption | null>(null)

function buildView() {
  const list = rows.value
  if (!list.length) {
    heatOption.value = null
    errorOption.value = null
    hasHeat.value = false
    return
  }

  // 模块热度：取最近一个聚合日的 Top10，横向条形（倒序使热度最高在最上）
  const heat = [...(list[list.length - 1]?.metrics.moduleHeat ?? [])].reverse()
  hasHeat.value = heat.length > 0
  heatOption.value = hasHeat.value
    ? {
        grid: { top: 20, right: 40, bottom: 30, left: 120 },
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        xAxis: { type: 'value', splitLine: { lineStyle: { color: '#F0F0F0' } }, axisLabel: { color: '#999', fontSize: 12 } },
        yAxis: { type: 'category', data: heat.map((h) => h.path), axisLabel: { color: '#666', fontSize: 12 }, axisTick: { show: false } },
        series: [{
          name: 'PV', type: 'bar', data: heat.map((h) => h.pv),
          itemStyle: { color: '#5B8FF9', borderRadius: [0, 4, 4, 0] }, barMaxWidth: 16,
          label: { show: true, position: 'right', color: '#999', fontSize: 12 },
        }],
      }
    : null

  errorOption.value = {
    grid: { top: 30, right: 20, bottom: 30, left: 50 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: list.map((r) => r.date.slice(5)), axisLabel: { color: '#999', fontSize: 12 }, axisTick: { show: false } },
    yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#F0F0F0' } }, axisLabel: { color: '#999', fontSize: 12 } },
    series: [{
      name: '错误数', type: 'line', smooth: true, data: list.map((r) => r.metrics.errors24h ?? 0),
      lineStyle: { color: '#F4664A', width: 3 }, itemStyle: { color: '#F4664A' },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(244,102,74,0.15)' }, { offset: 1, color: 'rgba(244,102,74,0)' }] } },
    }],
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

function goErrorMonitor() {
  router.push('/system/error-monitor')
}

onMounted(fetchData)
</script>

<template>
  <div
    v-loading="loading"
    class="page"
  >
    <div class="toolbar">
      <h3>运营看板 · 健康</h3>
      <div class="toolbar-right">
        <el-button
          :loading="loading"
          @click="fetchData"
        >
          刷新
        </el-button>
        <el-button
          type="primary"
          @click="goErrorMonitor"
        >
          错误明细
        </el-button>
      </div>
    </div>

    <!-- 错误态 -->
    <el-result
      v-if="loadError"
      icon="error"
      title="数据加载失败"
      sub-title="无法获取健康数据，请检查网络或稍后重试"
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
      <el-alert
        v-if="rows.length"
        :title="`最近聚合日 ${latestDate} · 前端错误 ${latestErrors} 条`"
        :type="latestErrors > 0 ? 'warning' : 'success'"
        show-icon
        :closable="false"
        class="health-alert"
      />

      <el-row
        v-if="rows.length"
        :gutter="20"
        class="charts-row"
      >
        <el-col :span="24">
          <ChartCard
            v-if="hasHeat"
            :title="`模块热度 Top10（${latestDate}）`"
            :option="heatOption"
            :height="380"
          />
          <div
            v-else
            class="section-card"
          >
            <div class="section-card__title">
              模块热度 Top10
            </div>
            <el-empty
              description="最近聚合日暂无页面浏览埋点"
              :image-size="48"
            />
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
            title="前端错误数 · 近30日"
            :option="errorOption"
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
.toolbar-right { display: flex; gap: 8px; }
.health-alert { margin-bottom: 20px; }
.charts-row { margin-bottom: 20px; }
.section-card {
  background: var(--color-bg-card); border-radius: 16px; padding: 20px 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}
.section-card__title { font-size: 14px; font-weight: 500; color: var(--color-text-secondary); margin-bottom: 16px; }
</style>
