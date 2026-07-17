<script setup lang="ts">
/**
 * OperationDashboard.vue — 运营管理员面板
 * 用户增长 / 内容审核 / 活跃度监控
 */
import { ref, computed, onMounted, onBeforeUnmount } from "vue"
import type { Component } from "vue"
import { useRouter } from "vue-router"
import { api } from "@/api"
import * as echarts from "echarts"
import GreetingHeader from "@/components/GreetingHeader.vue"
import AnimatedCounter from "@/components/AnimatedCounter.vue"
import AnomalyAlert from "@/components/AnomalyAlert.vue"
import ChartCard from "@/components/ChartCard.vue"
import { useAuthStore } from "@/store/auth"
import { Plus, Document, Edit, WarningFilled, View, User, Collection, Calendar,
  Promotion, Star, Odometer, CaretTop, CaretBottom } from "@element-plus/icons-vue"

const router = useRouter()
const auth = useAuthStore()
// 真实用户名取自 auth store（原来恒空致问候语退化成"管理员"·2026-07-18 修）
const username = computed(() => auth.user?.nickname || "运营管理员")

// ==================== 快捷操作（运营高频管理页）====================
interface QuickAction { label: string; path: string; icon: Component }
const quickActions: QuickAction[] = [
  { label: "内容管理", path: "/contents", icon: Document },
  { label: "内容审核", path: "/contents/audit", icon: Edit },
  { label: "推荐规则", path: "/recommend/rules", icon: Star },
  { label: "营销活动", path: "/marketing/activities", icon: Promotion },
  { label: "用户管理", path: "/users", icon: User },
  { label: "数据驾驶舱", path: "/cockpit", icon: Odometer },
]
// 待办角标（真实计数，无则为 0 不显示）
const badges = ref<Record<string, number>>({})

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

function onCardClick(card: { label: string; value: number; icon: Component }) {
  const route = cardRoutes[card.label]
  if (route) router.push(route)
}

// ==================== 报警信息 ====================
/** 报警条目（字段宽松 optional·后端 RiskAlert 文案在 title、level 为大写枚举，展示前映射） */
interface AlertItem { text?: string; title?: string; count?: number; level?: string }
const alerts = ref<AlertItem[]>([])

// ==================== 统计卡片 ====================
interface CardDelta { value: number; dir: "up" | "down" | "flat"; label: string }
interface CardDef { label: string; value: number; icon: Component; delta?: CardDelta }
const cards = ref<CardDef[]>([])

// ==================== 加载状态 ====================
const loading = ref(true)
const loadError = ref(false)

// ==================== 用户增长趋势 (ECharts) ====================
// userGrowthOption 为 ECharts option，类型为复杂联合，框架类型不匹配，保留 any
const userGrowthOption = ref<any>({})
const hasUserGrowth = ref(false)

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
      // params 为 ECharts tooltip 回调参数（复杂联合类型），保留 any
      formatter: (params: any) => {
        const p = params[0]
        return `<div style="font-weight:600;margin-bottom:4px">${p.name}</div>
                <div>新增用户：<span style="color:#FF6B6B;font-weight:600">${p.value}</span></div>`
      },
    },
  }
}

// 30 秒自动刷新（与 SuperAdminDashboard 同族一致）
let refreshTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  load()
  refreshTimer = setInterval(load, 30000)
})

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})

async function load() {
  loading.value = true
  loadError.value = false
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

    // 真实日环比：今日新增用户 vs 昨日（取自 today-overview 的 trendData 近7日序列），昨日为 0 无法计算则不显示
    const trend = Array.isArray(o.trendData) ? o.trendData : []
    if (trend.length >= 2) {
      const todayUsers = Number(trend[trend.length - 1]?.users ?? 0)
      const yestUsers = Number(trend[trend.length - 2]?.users ?? 0)
      if (yestUsers > 0) {
        const g = (todayUsers - yestUsers) / yestUsers * 100
        const card = cards.value.find((c) => c.label === "今日新增用户")
        if (card) {
          card.delta = {
            value: Math.abs(Math.round(g * 10) / 10),
            dir: g > 0 ? "up" : g < 0 ? "down" : "flat",
            label: "环比昨日",
          }
        }
      }
    }

    // 待办角标（真实计数）
    badges.value = {
      "/contents/audit": o.pendingAudits ?? 0,
    }

    // 用户增长趋势
    const t = trendsRes.data ?? {}
    const dates = t.dates ?? []
    const values = t.userTrend ?? []
    if (dates.length && values.length) {
      userGrowthOption.value = buildUserGrowthOption(dates, values)
      hasUserGrowth.value = true
    } else {
      hasUserGrowth.value = false
    }

    // 报警取前 3 条（后端返回 {alerts:[],total,page,pageSize,levelCounts} 对象，非裸数组，需取 .alerts；
    // 原来对对象直接 .slice 抛 TypeError 把整页打成错误态·2026-07-18 P0 修）
    // 字段映射：RiskAlert 文案在 title（非 text）、level 为大写 WARN/DANGER/CRITICAL（AnomalyAlert 内部归一）
    const rawAlert = alertRes.data
    const list: AlertItem[] = Array.isArray(rawAlert)
      ? rawAlert
      : ((rawAlert as { alerts?: AlertItem[] })?.alerts ?? [])
    alerts.value = list.slice(0, 3).map((a: AlertItem) => ({
      text: a.title ?? a.text ?? "", count: a.count, level: a.level ?? "warning",
    }))
  } catch {
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

    <!-- 快捷操作：运营高频管理页直达（始终可用）-->
    <div class="section-card quick-actions">
      <div class="section-card__title">
        快捷操作
      </div>
      <div class="qa-grid">
        <div
          v-for="qa in quickActions"
          :key="qa.path"
          class="qa-item"
          @click="router.push(qa.path)"
        >
          <el-badge
            :value="badges[qa.path] || 0"
            :hidden="!badges[qa.path]"
            :max="99"
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

    <!-- 错误态 -->
    <el-result
      v-if="loadError"
      icon="error"
      title="数据加载失败"
      sub-title="无法获取运营数据，请检查网络或稍后重试"
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
          <div
            v-if="card.delta"
            class="stat-card__delta"
            :class="`stat-card__delta--${card.delta.dir}`"
          >
            <el-icon :size="12">
              <component :is="card.delta.dir === 'down' ? CaretBottom : CaretTop" />
            </el-icon>
            <span>{{ card.delta.value }}% {{ card.delta.label }}</span>
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
          v-if="hasUserGrowth"
          title="用户增长趋势 · 近30天"
          :option="userGrowthOption"
          :height="320"
        />
        <el-empty
          v-else
          description="暂无用户增长数据"
        />
      </el-col>
    </el-row>
    </template>
  </div>
</template>

<style scoped>
.dashboard { padding: 0; }
.alerts-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
.stats-row { margin-bottom: 20px; }
.stat-card {
  background: var(--color-bg-card); border-radius: 16px; padding: 20px 22px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04); transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer; margin-bottom: 20px;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
.stat-card__top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.stat-card__label { font-size: 13px; color: var(--color-text-secondary); }
.stat-card__icon {
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(255,107,107,0.1); color: #FF6B6B;
  display: flex; align-items: center; justify-content: center;
}
.stat-card__value { font-size: 28px; font-weight: 700; color: #1A1A1A; font-feature-settings: "tnum"; line-height: 1.2; }
.stat-card__value--alert { color: #FF6B6B; }
.stat-card__delta { display: flex; align-items: center; gap: 3px; margin-top: 8px; font-size: 12px; font-weight: 600; }
.stat-card__delta--up { color: var(--color-error, #F56C6C); }
.stat-card__delta--down { color: var(--color-success, #67C23A); }
.stat-card__delta--flat { color: var(--color-text-secondary); }

/* 快捷操作 */
.section-card {
  background: var(--color-bg-card); border-radius: 16px; padding: 20px 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04); margin-bottom: 20px;
}
.section-card__title { font-size: 14px; font-weight: 500; color: var(--color-text-secondary); margin-bottom: 16px; }
.qa-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }
.qa-item {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 16px 8px; border-radius: 12px; cursor: pointer;
  background: var(--color-bg-page); transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.qa-item:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
.qa-icon {
  width: 44px; height: 44px; border-radius: 12px;
  background: rgba(255,107,107,0.1); color: #FF6B6B;
  display: flex; align-items: center; justify-content: center;
}
.qa-label { font-size: 13px; color: var(--color-text-body); font-weight: 500; }
.charts-row { margin-bottom: 20px; }
@media (max-width: 1100px) { .qa-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 768px) { .stat-card { margin-bottom: 12px; } .qa-grid { grid-template-columns: repeat(3, 1fr); } }
</style>
