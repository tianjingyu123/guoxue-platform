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
import { Money, Goods, WarningFilled, User, Document, TrendCharts, Download, Sell } from "@element-plus/icons-vue"

const username = ref("财务管理员")
const router = useRouter()

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
interface CardDef { label: string; value: number; icon: any; format?: string }
const cards = ref<CardDef[]>([])

// ==================== 月度营收柱状图 (ECharts) ====================
const monthRevenueOption = ref<any>({})

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

onMounted(async () => {
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

    // 月度营收柱状图
    const months = r.monthLabels ?? ["1月","2月","3月","4月","5月","6月"]
    const values = r.monthlyRevenue ?? []
    if (values.length) {
      monthRevenueOption.value = buildMonthRevenueOption(months, values)
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
  } catch {
    // 静默失败
  }
})
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
          <div class="stat-card__value" :class="{ 'stat-card__value--alert': card.label === '退款率' && card.value > 5 }">
            <AnimatedCounter :value="card.value" />
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 月度营收柱状图 -->
    <el-row :gutter="20" class="charts-row">
      <el-col :xs="24" :md="24">
        <ChartCard title="月度营收" :option="monthRevenueOption" :height="320" />
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
