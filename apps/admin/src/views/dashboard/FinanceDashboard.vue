<script setup lang="ts">
/**
 * FinanceDashboard.vue — 财务管理员面板
 * 营收概况 / 退款监控 / 月度营收柱状图
 */
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"
import { api } from "@/api"
import * as echarts from "echarts"
import GreetingHeader from "@/components/GreetingHeader.vue"
import AnimatedCounter from "@/components/AnimatedCounter.vue"
import AnomalyAlert from "@/components/AnomalyAlert.vue"
import ChartCard from "@/components/ChartCard.vue"
import { Money, Goods, WarningFilled, User, Document, TrendCharts, Download, Sell,
  RefreshLeft, Wallet, Tickets, Coin, DataAnalysis, CaretTop, CaretBottom } from "@element-plus/icons-vue"

const username = ref("财务管理员")
const router = useRouter()

// ==================== 快捷操作（财务高频管理页）====================
interface QuickAction { label: string; path: string; icon: any }
const quickActions: QuickAction[] = [
  { label: "退款审核", path: "/orders/refund", icon: RefreshLeft },
  { label: "提现审批", path: "/finance/withdrawals", icon: Download },
  { label: "支付流水", path: "/orders/payments", icon: Wallet },
  { label: "对账管理", path: "/finance/reconciliation", icon: Tickets },
  { label: "结算管理", path: "/finance/settlements", icon: Coin },
  { label: "财务报表", path: "/finance/reports", icon: DataAnalysis },
]
// 待办角标（真实计数，无则为 0 不显示）
const badges = ref<Record<string, number>>({})

const cardRoutes: Record<string, string> = {
  "平台总营收":   "/finance/reports",
  "本月营收":     "/finance/reports",
  "待提现笔数":   "/finance/withdrawals",
  "待审批结算":   "/finance/settlements",
  "总订单数":     "/orders",
  "退款率":       "/orders/refund",
  "付费用户数":   "/users",
  "客单价":       "/finance/reports",
}
function onCardClick(card: CardDef) {
  const path = cardRoutes[card.label]
  if (path) router.push(path)
}

// ==================== 报警信息 ====================
const alerts = ref<any[]>([])

// ==================== 统计卡片 ====================
interface CardDelta { value: number; dir: "up" | "down" | "flat"; label: string }
interface CardDef { label: string; value: number; icon: any; format?: string; delta?: CardDelta }
const cards = ref<CardDef[]>([])

// ==================== 月度营收柱状图 (ECharts) ====================
const monthRevenueOption = ref<any>({})
const hasMonthRevenue = ref(false)

// ==================== 加载状态 ====================
const loading = ref(true)
const loadError = ref(false)

/** 构建月度营收柱状图 option */
function buildMonthRevenueOption(months: string[], values: number[]) {
  return {
    grid: { top: 30, right: 20, bottom: 30, left: 60 },
    xAxis: {
      type: "category", data: months,
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
      type: "bar", data: values, barWidth: "40%",
      itemStyle: {
        color: {
          type: "linear", x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: "#FF6B6B" },
            { offset: 1, color: "rgba(255,107,107,0.4)" },
          ],
        },
        borderRadius: [6, 6, 0, 0],
      },
      emphasis: {
        itemStyle: { color: "#FF4D4F" },
      },
    }],
    tooltip: {
      trigger: "axis", backgroundColor: "#fff",
      borderColor: "#F0F0F0", borderWidth: 1,
      textStyle: { color: "#1A1A1A", fontSize: 13 },
      formatter: (params: any) => {
        const p = params[0]
        return `<div style="font-weight:600;margin-bottom:4px">${p.name}</div>
                <div>营收：<span style="color:#FF6B6B;font-weight:600">¥${Number(p.value).toLocaleString()}</span></div>`
      },
    },
  }
}

/** 将数值转为带单位的字符串 */
function formatCardValue(card: CardDef): string {
  if (card.format === "currency") return `¥${card.value.toLocaleString()}`
  if (card.label === "退款率") return `${card.value}%`
  if (card.label === "客单价") return `¥${card.value.toLocaleString()}`
  return String(card.value)
}

onMounted(load)

async function load() {
  loading.value = true
  loadError.value = false
  try {
    const [revenueRes, statsRes] = await Promise.all([
      api.get("/dashboard/revenue"),
      api.get("/dashboard/stats"),
    ])
    const r = revenueRes.data ?? {}
    const s = statsRes.data ?? {}
    cards.value = [
      { label: "平台总营收",   value: r.totalRevenue ?? 0,     icon: Money,        format: "currency" },
      { label: "本月营收",     value: r.monthRevenue ?? 0,     icon: TrendCharts,  format: "currency" },
      { label: "待提现笔数",   value: r.pendingWithdrawals ?? 0, icon: Download },
      { label: "待审批结算",   value: r.pendingSettlements ?? 0, icon: Document },
      { label: "总订单数",     value: s.totalOrders ?? 0,       icon: Goods },
      { label: "退款率",       value: r.refundRate ?? 0,        icon: WarningFilled },
      { label: "付费用户数",   value: r.payingUsers ?? 0,       icon: User },
      { label: "客单价",       value: r.avgOrderValue ?? 0,     icon: Sell,         format: "currency" },
    ]

    // 真实环比：本月营收 vs 上月营收（后端 lastMonthRevenue/monthOverMonthGrowth），上月为 0 时无法计算则不显示
    const lastMonthRev = Number(r.lastMonthRevenue ?? 0)
    if (lastMonthRev > 0) {
      const growth = Number(String(r.monthOverMonthGrowth ?? "0").replace("%", ""))
      const monthCard = cards.value.find((c) => c.label === "本月营收")
      if (monthCard && !Number.isNaN(growth)) {
        monthCard.delta = {
          value: Math.abs(Math.round(growth * 10) / 10),
          dir: growth > 0 ? "up" : growth < 0 ? "down" : "flat",
          label: "环比上月",
        }
      }
    }

    // 待办角标（真实计数）
    badges.value = {
      "/finance/withdrawals": r.pendingWithdrawals ?? 0,
      "/finance/settlements": r.pendingSettlements ?? 0,
    }

    // 月度营收柱状图（真连后端，无数据则空态，不回退假数据）
    const months = Array.isArray(r.monthLabels) ? r.monthLabels : []
    const values = Array.isArray(r.monthlyRevenue) ? r.monthlyRevenue : []
    if (values.length && months.length) {
      monthRevenueOption.value = buildMonthRevenueOption(months, values)
      hasMonthRevenue.value = true
    } else {
      hasMonthRevenue.value = false
    }

    // 报警：待提现 / 待审批
    const alertList: any[] = []
    if ((r.pendingWithdrawals ?? 0) > 0) {
      alertList.push({ text: "待提现", count: r.pendingWithdrawals, level: "warning" })
    }
    if ((r.pendingSettlements ?? 0) > 0) {
      alertList.push({ text: "待审批结算", count: r.pendingSettlements, level: "info" })
    }
    if ((r.refundRate ?? 0) > 5) {
      alertList.push({ text: "退款率异常", count: r.refundRate, level: "critical" })
    }
    alerts.value = alertList
  } catch (e) {
    console.error("财务仪表盘数据加载失败", e)
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

    <!-- 快捷操作：财务高频管理页直达（始终可用，便于即使数据异常也能跳转处理）-->
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
      sub-title="无法获取财务数据，请检查网络或稍后重试"
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
            :class="{ 'stat-card__value--alert': card.label === '退款率' && card.value > 5 }"
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

    <!-- 月度营收柱状图 -->
    <el-row
      :gutter="20"
      class="charts-row"
    >
      <el-col
        :xs="24"
        :md="24"
      >
        <ChartCard
          v-if="hasMonthRevenue"
          title="月度营收"
          :option="monthRevenueOption"
          :height="320"
        />
        <el-empty
          v-else-if="!loading"
          description="暂无月度营收数据"
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
