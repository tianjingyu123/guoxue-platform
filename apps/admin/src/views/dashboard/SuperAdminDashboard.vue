<script setup lang="ts">
/**
 * SuperAdminDashboard.vue — 超级管理员总览面板
 * 全站核心指标 + 第三方服务健康监控 + 营收趋势
 */
import { ref, onMounted, onBeforeUnmount } from "vue"
import { useRouter } from "vue-router"
import { api } from "@/api"
import GreetingHeader from "@/components/GreetingHeader.vue"
import AnimatedCounter from "@/components/AnimatedCounter.vue"
import AnomalyAlert from "@/components/AnomalyAlert.vue"
import ChartCard from "@/components/ChartCard.vue"
import { User, Goods, Plus, WarningFilled, ChatDotRound, Reading, DataLine, Money } from "@element-plus/icons-vue"

const router = useRouter()

const username = ref("超级管理员")

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
const alerts = ref<any[]>([])

// ==================== 统计卡片 ====================
interface CardDef { label: string; value: number; icon: any; }
const cards = ref<CardDef[]>([])

// ==================== 服务健康状态 ====================
interface HealthItem { name: string; status: string; label: string }
const healthList = ref<HealthItem[]>([])

// ==================== 营收趋势 (ECharts) ====================
const revenueOption = ref<any>({})

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

async function fetchDashboard() {
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

    // 营收趋势
    const rev = trendsRes.data ?? {}
    const dates = rev.dates ?? []
    const values = rev.revenue ?? []
    if (dates.length && values.length) {
      revenueOption.value = buildRevenueOption(dates, values)
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

    // 报警取前 3 条
    const list = alertRes.data ?? []
    alerts.value = list.slice(0, 3).map((a: any) => ({
      text: a.text, count: a.count, level: a.level ?? "warning",
    }))
  } catch {
    // 静默失败，保留空状态
  }
}

onMounted(() => {
  fetchDashboard();
  refreshTimer = setInterval(fetchDashboard, 30000);
});

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer);
});
</script>

<template>
  <div class="dashboard">
    <GreetingHeader :username="username" />

    <!-- 报警行 -->
    <div class="alerts-row" v-if="alerts.length">
      <AnomalyAlert v-for="a in alerts" :key="a.text" v-bind="a" />
    </div>

    <!-- 统计卡片 4×2 -->
    <el-row :gutter="20" class="stats-row">
      <el-col v-for="card in cards" :key="card.label" :xs="24" :sm="12" :md="6">
        <div class="stat-card" @click="onCardClick(card)">
          <div class="stat-card__top">
            <span class="stat-card__label">{{ card.label }}</span>
            <div class="stat-card__icon"><el-icon :size="18"><component :is="card.icon" /></el-icon></div>
          </div>
          <div class="stat-card__value" :class="{ 'stat-card__value--alert': card.label === '待处理举报' && card.value > 0 }">
            <template v-if="card.label === '系统健康'">
              <el-tag :type="card.value === 1 ? 'success' : 'danger'" size="small" effect="dark">
                {{ card.value === 1 ? '正常' : '异常' }}
              </el-tag>
            </template>
            <template v-else>
              <AnimatedCounter :value="card.value" />
            </template>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 服务健康状态 -->
    <div class="section-card" v-if="healthList.length">
      <div class="section-card__title">第三方服务状态</div>
      <div class="health-grid">
        <div class="health-item" v-for="h in healthList" :key="h.name">
          <span class="health-name">{{ h.label }}</span>
          <el-tag :type="statusType(h.status)" size="small" effect="light">
            {{ h.status === 'ok' ? '正常' : h.status === 'error' ? '异常' : '降级' }}
          </el-tag>
        </div>
      </div>
    </div>

    <!-- 营收趋势折线图 -->
    <el-row :gutter="20" class="charts-row">
      <el-col :xs="24" :md="24">
        <ChartCard title="营收趋势" :option="revenueOption" :height="320" />
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
.section-card {
  background: #fff; border-radius: 16px; padding: 20px 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04); margin-bottom: 20px;
}
.section-card__title { font-size: 14px; font-weight: 500; color: #999; margin-bottom: 16px; }
.health-grid { display: flex; gap: 16px; flex-wrap: wrap; }
.health-item {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 18px; border-radius: 10px; background: #FAFAFA; min-width: 140px;
}
.health-name { font-size: 14px; color: #666; font-weight: 500; }
.charts-row { margin-bottom: 20px; }
@media (max-width: 768px) { .stat-card { margin-bottom: 12px; } }
</style>
