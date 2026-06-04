<script setup lang="ts">
/**
 * OperationDashboard.vue — 运营管理员面板
 * 用户增长 / 内容审核 / 活跃度监控
 */
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"
import { api } from "@/api"
import * as echarts from "echarts"
import GreetingHeader from "@/components/GreetingHeader.vue"
import AnimatedCounter from "@/components/AnimatedCounter.vue"
import AnomalyAlert from "@/components/AnomalyAlert.vue"
import ChartCard from "@/components/ChartCard.vue"
import { Plus, Document, Edit, WarningFilled, View, User, Collection, Calendar } from "@element-plus/icons-vue"

const router = useRouter()
const username = ref('')

const cardRoutes: Record<string, string> = {
  "今日新增用户": "/users",
  "今日新增内容": "/contents",
  "待审核内容":  "/contents/audit",
  "待处理举报":  "/reports",
  "今日活跃用户": "/users",
  "总用户数":    "/users",
  "总内容数":    "/contents",
  "本月新增用户": "/users",
}

function onCardClick(card: { label: string; value: number; icon: any }) {
  const route = cardRoutes[card.label]
  if (route) router.push(route)
}

// ==================== 报警信息 ====================
const alerts = ref<any[]>([])

// ==================== 统计卡片 ====================
interface CardDef { label: string; value: number; icon: any; }
const cards = ref<CardDef[]>([])

// ==================== 用户增长趋势 (ECharts) ====================
const userGrowthOption = ref<any>({})

/** 构建用户增长折线图 option */
function buildUserGrowthOption(dates: string[], values: number[]) {
  return {
    grid: { top: 30, right: 20, bottom: 30, left: 50 },
    xAxis: {
      type: "category", data: dates,
      axisLine: { lineStyle: { color: "#F0F0F0" } },
      axisTick: { show: false },
      axisLabel: { color: "#999", fontSize: 12 },
    },
    yAxis: {
      type: "value", minInterval: 1,
      splitLine: { lineStyle: { color: "#F0F0F0" } },
      axisLabel: { color: "#999", fontSize: 12 },
      axisLine: { show: false }, axisTick: { show: false },
    },
    series: [{
      type: "line", data: values, smooth: true,
      symbol: "circle", symbolSize: 6,
      lineStyle: { color: "#FF6B6B", width: 3 },
      itemStyle: { color: "#FF6B6B", borderWidth: 2, borderColor: "#fff" },
      areaStyle: {
        color: {
          type: "linear", x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: "rgba(255,107,107,0.15)" },
            { offset: 1, color: "rgba(255,107,107,0)" },
          ],
        },
      },
    }],
    tooltip: {
      trigger: "axis", backgroundColor: "#fff",
      borderColor: "#F0F0F0", borderWidth: 1,
      textStyle: { color: "#1A1A1A", fontSize: 13 },
      formatter: (params: any) => {
        const p = params[0]
        return `<div style="font-weight:600;margin-bottom:4px">${p.name}</div>
                <div>新增用户：<span style="color:#FF6B6B;font-weight:600">${p.value}</span></div>`
      },
    },
  }
}

onMounted(async () => {
  try {
    const [overviewRes, statsRes, trendsRes, alertRes] = await Promise.all([
      api.get("/dashboard/today-overview"),
      api.get("/dashboard/stats"),
      api.get("/dashboard/trends"),
      api.get("/dashboard/alerts"),
    ])
    const o = overviewRes.data ?? {}
    const s = statsRes.data ?? {}
    cards.value = [
      { label: "今日新增用户",  value: o.todayNewUsers ?? 0,  icon: Plus },
      { label: "今日新增内容",  value: o.todayNewContent ?? 0, icon: Document },
      { label: "待审核内容",    value: o.pendingAudits ?? 0,   icon: Edit },
      { label: "待处理举报",    value: o.pendingReports ?? 0,  icon: WarningFilled },
      { label: "今日活跃用户",  value: s.activeUsers ?? 0,     icon: View },
      { label: "总用户数",      value: s.totalUsers ?? 0,      icon: User },
      { label: "总内容数",      value: s.totalContent ?? 0,    icon: Collection },
      { label: "本月新增用户",  value: s.monthNewUsers ?? 0,   icon: Calendar },
    ]

    // 用户增长趋势
    const t = trendsRes.data ?? {}
    const dates = t.dates ?? []
    const values = t.userTrend ?? []
    if (dates.length && values.length) {
      userGrowthOption.value = buildUserGrowthOption(dates, values)
    }

    // 报警
    const list = alertRes.data ?? []
    alerts.value = list.slice(0, 3).map((a: any) => ({
      text: a.text, count: a.count, level: a.level ?? "warning",
    }))
  } catch {
    // 静默失败
  }
})
</script>

<template>
  <div class="dashboard">
    <GreetingHeader :username="username" />

    <!-- 报警行 -->
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

    <!-- 统计卡片 4×2 -->
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
          <div
            class="stat-card__value"
            :class="{ 'stat-card__value--alert': (card.label === '待审核内容' || card.label === '待处理举报') && card.value > 0 }"
          >
            <AnimatedCounter :value="card.value" />
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 用户增长趋势折线图 -->
    <el-row
      :gutter="20"
      class="charts-row"
    >
      <el-col
        :xs="24"
        :md="24"
      >
        <ChartCard
          title="用户增长趋势 · 近30天"
          :option="userGrowthOption"
          :height="320"
        />
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.dashboard { padding: 0; }
.alerts-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
.stats-row { margin-bottom: 20px; }
.stat-card {
  background: #fff; border-radius: 16px; padding: 20px 22px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04); transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer; margin-bottom: 20px;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
.stat-card__top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.stat-card__label { font-size: 13px; color: #999; }
.stat-card__icon {
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(255,107,107,0.1); color: #FF6B6B;
  display: flex; align-items: center; justify-content: center;
}
.stat-card__value { font-size: 28px; font-weight: 700; color: #1A1A1A; font-feature-settings: "tnum"; line-height: 1.2; }
.stat-card__value--alert { color: #FF6B6B; }
.charts-row { margin-bottom: 20px; }
@media (max-width: 768px) { .stat-card { margin-bottom: 12px; } }
</style>
