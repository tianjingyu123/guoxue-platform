<script setup lang="ts">
/**
 * SuperAdminDashboard.vue — 超级管理员总览面板
 * 全站核心指标 + 第三方服务健康监控 + 营收趋势
 */
import { ref, onMounted, onBeforeUnmount } from "vue"
import type { Component } from "vue"
import { useRouter } from "vue-router"
import { api } from "@/api"
import GreetingHeader from "@/components/GreetingHeader.vue"
import AnimatedCounter from "@/components/AnimatedCounter.vue"
import AnomalyAlert from "@/components/AnomalyAlert.vue"
import ChartCard from "@/components/ChartCard.vue"
import { User, Goods, Plus, WarningFilled, ChatDotRound, Reading, DataLine, Money,
  Setting, Lock, Operation, Connection, Odometer, Monitor, CaretTop, CaretBottom } from "@element-plus/icons-vue"

const router = useRouter()

const username = ref("超级管理员")

// ==================== 快捷操作（超管系统治理高频页）====================
interface QuickAction { label: string; path: string; icon: Component }
const quickActions: QuickAction[] = [
  { label: "系统设置", path: "/system-settings", icon: Setting },
  { label: "角色权限", path: "/system/role-permission", icon: Lock },
  { label: "功能开关", path: "/system/feature-flags", icon: Operation },
  { label: "第三方配置", path: "/system/third-party", icon: Connection },
  { label: "管理驾驶舱", path: "/admin/cockpit", icon: Odometer },
  { label: "平台综合大屏", path: "/bigscreen/platform", icon: Monitor },
]
// 待办角标（真实计数，无则为 0 不显示）
const badges = ref<Record<string, number>>({})

const cardRoutes: Record<string, string> = {
  "总用户数":   "/users",
  "总订单数":   "/orders",
  "今日新增用户": "/users",
  "今日营收":   "/finance/reports",
  "待处理举报":  "/reports",
  "圈子总数":   "/circles",
  "课程总数":   "/courses",
  "系统健康":   "/system/role-permission",
}

function onCardClick(card: CardDef) {
  const route = cardRoutes[card.label]
  if (route) router.push(route)
}

// ==================== 报警信息 ====================
/** 报警条目（字段宽松 optional） */
interface AlertItem { text?: string; count?: number; level?: 'critical' | 'warning' | 'info' }
const alerts = ref<AlertItem[]>([])

// ==================== 统计卡片 ====================
interface CardDelta { value: number; dir: "up" | "down" | "flat"; label: string }
interface CardDef { label: string; value: number; icon: Component; delta?: CardDelta }
const cards = ref<CardDef[]>([])

/** 日环比：仅当昨日基准>0 时计算，否则 undefined（诚实留白） */
function makeDelta(todayVal: number, yesterdayVal: number, label = "环比昨日"): CardDelta | undefined {
  if (!(yesterdayVal > 0)) return undefined
  const g = (todayVal - yesterdayVal) / yesterdayVal * 100
  return { value: Math.abs(Math.round(g * 10) / 10), dir: g > 0 ? "up" : g < 0 ? "down" : "flat", label }
}

// ==================== 服务健康状态 ====================
interface HealthItem { name: string; status: string; label: string }
const healthList = ref<HealthItem[]>([])

// ==================== 加载状态 ====================
const loading = ref(true)
const loadError = ref(false)

// ==================== 营收趋势 (ECharts) ====================
// revenueOption 为 ECharts option，类型为复杂联合，框架类型不匹配，保留 any
const revenueOption = ref<any>({})
const hasRevenue = ref(false)

/** 构建营收趋势折线图 option */
function buildRevenueOption(dates: string[], values: number[]) {
  return {
    grid: { top: 30, right: 20, bottom: 30, left: 60 },
    xAxis: {
      type: "category", data: dates,
      axisLine: { lineStyle: { color: "#F0F0F0" } },
      axisTick: { show: false },
      axisLabel: { color: "#999", fontSize: 12 },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "#F0F0F0" } },
      axisLabel: { color: "#999", fontSize: 12, formatter: "¥{value}" },
      axisLine: { show: false }, axisTick: { show: false },
    },
    series: [{
      type: "line", data: values, smooth: true,
      symbol: "circle", symbolSize: 6,
      lineStyle: { color: "#4ECDC4", width: 3 },
      itemStyle: { color: "#4ECDC4", borderWidth: 2, borderColor: "#fff" },
      areaStyle: {
        color: {
          type: "linear", x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: "rgba(78,205,196,0.15)" },
            { offset: 1, color: "rgba(78,205,196,0)" },
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
                <div>营收：<span style="color:#4ECDC4;font-weight:600">¥${Number(p.value).toLocaleString()}</span></div>`
      },
    },
  }
}

/** 状态标签 type */
function statusType(status: string): "success" | "danger" | "warning" {
  if (status === "ok") return "success"
  if (status === "error") return "danger"
  return "warning"
}

let refreshTimer: ReturnType<typeof setInterval> | null = null;

async function load() {
  loading.value = true
  loadError.value = false
  try {
    const [statsRes, trendsRes, healthRes, alertRes] = await Promise.all([
      api.get("/dashboard/stats"),
      api.get("/dashboard/revenue"),
      api.get("/dashboard/system-health"),
      api.get("/dashboard/alerts"),
    ])
    const s = statsRes.data ?? {}
    cards.value = [
      { label: "总用户数",   value: s.totalUsers ?? 0,   icon: User },
      { label: "总订单数",   value: s.totalOrders ?? 0,  icon: Goods },
      { label: "今日新增用户", value: s.todayNewUsers ?? 0, icon: Plus },
      { label: "今日营收",   value: s.todayRevenue ?? 0, icon: Money },
      { label: "待处理举报",  value: s.pendingReports ?? 0, icon: WarningFilled },
      { label: "圈子总数",   value: s.totalCircles ?? 0, icon: ChatDotRound },
      { label: "课程总数",   value: s.totalCourses ?? 0, icon: Reading },
      { label: "系统健康",   value: s.systemOk ?? 1,     icon: DataLine },
    ]

    // 真实日环比：今日新增用户/今日营收 vs 昨日同口径（后端 stats 已补昨日基准）
    // 总用户/总订单/圈子/课程为累计快照，待处理举报为实时快照，无历史可比，诚实留白
    const newUserCard = cards.value.find((c) => c.label === "今日新增用户")
    if (newUserCard) newUserCard.delta = makeDelta(s.todayNewUsers ?? 0, s.todayNewUsersYesterday ?? 0)
    const revenueCard = cards.value.find((c) => c.label === "今日营收")
    if (revenueCard) revenueCard.delta = makeDelta(s.todayRevenue ?? 0, s.todayRevenueYesterday ?? 0)

    // 营收趋势
    const rev = trendsRes.data ?? {}
    const dates = rev.dates ?? []
    const values = rev.revenue ?? []
    if (dates.length && values.length) {
      revenueOption.value = buildRevenueOption(dates, values)
      hasRevenue.value = true
    } else {
      hasRevenue.value = false
    }

    // 服务健康
    const h = healthRes.data ?? {}
    healthList.value = [
      { name: "Redis", status: h.redis?.status ?? "ok", label: "Redis 缓存" },
      { name: "SMS",   status: h.sms?.status ?? "ok",    label: "短信服务" },
      { name: "AI",    status: h.deepSeek?.status ?? "ok", label: "AI 服务" },
      { name: "COS",   status: h.tencentCloud?.status ?? "ok", label: "对象存储" },
      { name: "支付",   status: h.wechatPay?.status ?? "ok",  label: "微信支付" },
    ]

    // 待办角标：第三方配置异常/降级服务数（真实取自 system-health）
    const abnormal = healthList.value.filter((x) => x.status !== "ok").length
    badges.value = { "/system/third-party": abnormal }

    // 报警取前 3 条（后端返回 {alerts:[],total,...} 对象，非裸数组，需取 .alerts）
    const rawAlert = alertRes.data
    const list: AlertItem[] = Array.isArray(rawAlert)
      ? rawAlert
      : ((rawAlert as { alerts?: AlertItem[] })?.alerts ?? [])
    alerts.value = list.slice(0, 3).map((a: AlertItem) => ({
      text: a.text, count: a.count, level: a.level ?? "warning",
    }))
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  load();
  refreshTimer = setInterval(load, 30000);
});

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer);
});
</script>

<template>
  <div
    v-loading="loading"
    class="dashboard"
  >
    <GreetingHeader :username="username" />

    <!-- 快捷操作：超管系统治理高频页直达（始终可用）-->
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
      sub-title="无法获取总览数据，请检查网络或稍后重试"
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
            :class="{ 'stat-card__value--alert': card.label === '待处理举报' && card.value > 0 }"
          >
            <template v-if="card.label === '系统健康'">
              <el-tag
                :type="card.value === 1 ? 'success' : 'danger'"
                size="small"
                effect="dark"
              >
                {{ card.value === 1 ? '正常' : '异常' }}
              </el-tag>
            </template>
            <template v-else>
              <AnimatedCounter :value="card.value" />
            </template>
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

    <!-- 服务健康状态 -->
    <div
      v-if="healthList.length"
      class="section-card"
    >
      <div class="section-card__title">
        第三方服务状态
      </div>
      <div class="health-grid">
        <div
          v-for="h in healthList"
          :key="h.name"
          class="health-item"
        >
          <span class="health-name">{{ h.label }}</span>
          <el-tag
            :type="statusType(h.status)"
            size="small"
            effect="light"
          >
            {{ h.status === 'ok' ? '正常' : h.status === 'error' ? '异常' : '降级' }}
          </el-tag>
        </div>
      </div>
    </div>

    <!-- 营收趋势折线图 -->
    <el-row
      :gutter="20"
      class="charts-row"
    >
      <el-col
        :xs="24"
        :md="24"
      >
        <ChartCard
          v-if="hasRevenue"
          title="营收趋势"
          :option="revenueOption"
          :height="320"
        />
        <el-empty
          v-else
          description="暂无营收趋势数据"
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
@media (max-width: 1100px) { .qa-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 768px) { .qa-grid { grid-template-columns: repeat(3, 1fr); } }
.health-grid { display: flex; gap: 16px; flex-wrap: wrap; }
.health-item {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 18px; border-radius: 10px; background: var(--color-bg-page); min-width: 140px;
}
.health-name { font-size: 14px; color: var(--color-text-body); font-weight: 500; }
.charts-row { margin-bottom: 20px; }
@media (max-width: 768px) { .stat-card { margin-bottom: 12px; } }
</style>
