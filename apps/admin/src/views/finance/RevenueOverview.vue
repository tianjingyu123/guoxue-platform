<template>
  <div class="revenue-page">
    <div class="page-header">
      <div>
        <h2>营收总览</h2>
        <span
          v-if="lastUpdate"
          class="update-time"
        >数据更新于 {{ lastUpdate }}</span>
      </div>
      <div class="header-actions">
        <el-radio-group
          v-model="timeRange"
          size="small"
          @change="refresh"
        >
          <el-radio-button value="7d">
            近7天
          </el-radio-button>
          <el-radio-button value="30d">
            近30天
          </el-radio-button>
          <el-radio-button value="90d">
            近90天
          </el-radio-button>
          <el-radio-button value="thisMonth">
            本月
          </el-radio-button>
          <el-radio-button value="thisYear">
            本年
          </el-radio-button>
        </el-radio-group>
        <el-date-picker
          v-model="customRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          size="small"
          style="margin-left:8px"
          @change="onCustomRange"
        />
        <el-button
          size="small"
          style="margin-left:8px"
          @click="refresh"
        >
          刷新
        </el-button>
        <el-button
          size="small"
          @click="exportCSV"
        >
          导出报表
        </el-button>
      </div>
    </div>

    <!-- 核心指标卡片 -->
    <el-row
      :gutter="16"
      class="metric-row"
    >
      <el-col :span="4">
        <div class="metric-card">
          <div class="metric-label">
            平台总收入
          </div>
          <div class="metric-value">
            ¥{{ fmt(metrics.totalRevenue) }}
          </div>
          <div
            class="metric-change"
            :class="metrics.revenueUp ? 'up' : 'down'"
          >
            {{ metrics.revenueUp ? '↑' : '↓' }} {{ metrics.revenueChange }}% 环比
          </div>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="metric-card">
          <div class="metric-label">
            平台分佣
          </div>
          <div class="metric-value">
            ¥{{ fmt(metrics.platformCommission) }}
          </div>
          <div class="metric-change text-muted">
            占总收入 {{ metrics.commissionRate }}%
          </div>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="metric-card">
          <div class="metric-label">
            用户收益
          </div>
          <div class="metric-value">
            ¥{{ fmt(metrics.userEarnings) }}
          </div>
          <div class="metric-change text-muted">
            商家/讲师/分站长
          </div>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="metric-card">
          <div class="metric-label">
            订单总数
          </div>
          <div class="metric-value">
            {{ metrics.orderCount }}
          </div>
          <div
            class="metric-change"
            :class="metrics.orderUp ? 'up' : 'down'"
          >
            {{ metrics.orderUp ? '↑' : '↓' }} {{ metrics.orderChange }}% 环比
          </div>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="metric-card">
          <div class="metric-label">
            退款金额
          </div>
          <div class="metric-value warn">
            ¥{{ fmt(metrics.refundAmount) }}
          </div>
          <div class="metric-change text-muted">
            退款率 {{ metrics.refundRate }}%
          </div>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="metric-card">
          <div class="metric-label">
            客单价
          </div>
          <div class="metric-value">
            ¥{{ fmt(metrics.avgOrder) }}
          </div>
          <div class="metric-change text-muted">
            付费用户 {{ metrics.payingUsers }} 人
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 图表区 -->
    <el-row
      :gutter="16"
      style="margin-bottom:16px"
    >
      <el-col :span="16">
        <el-card>
          <template #header>
            <span>营收趋势</span>
          </template>
          <div
            ref="trendChart"
            style="height:320px"
          />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header>
            <span>收入构成</span>
          </template>
          <div
            ref="pieChart"
            style="height:320px"
          />
        </el-card>
      </el-col>
    </el-row>

    <el-row
      :gutter="16"
      style="margin-bottom:16px"
    >
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>支付渠道分布</span>
          </template>
          <div
            ref="channelChart"
            style="height:280px"
          />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>收入明细</span>
              <el-button
                size="small"
                text
                @click="router.push('/orders/payments')"
              >
                查看全部 →
              </el-button>
            </div>
          </template>
          <el-table
            :data="breakdownItems"
            stripe
            size="small"
            max-height="280"
          >
            <el-table-column
              prop="label"
              label="分类"
            />
            <el-table-column
              label="金额"
              width="140"
            >
              <template #default="{ row }">
                ¥{{ fmt(row.value) }}
              </template>
            </el-table-column>
            <el-table-column
              label="占比"
              width="80"
            >
              <template #default="{ row }">
                {{ row.percent }}%
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <!-- 快捷入口 -->
    <el-card>
      <template #header>
        <span>财务快捷入口</span>
      </template>
      <el-row :gutter="12">
        <el-col
          v-for="link in quickLinks"
          :key="link.path"
          :span="4"
        >
          <el-button
            style="width:100%; height:64px"
            @click="router.push(link.path)"
          >
            <div>
              <span style="font-size:18px">{{ link.icon }}</span>
              <div style="margin-top:4px; font-size:12px">
                {{ link.label }}
              </div>
            </div>
          </el-button>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { revenueApi } from "@/api";
import * as echarts from "echarts";

const router = useRouter();

function fmt(v: number | string | undefined | null) {
  if (v === null || v === undefined) return "0.00";
  return Number(v).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// 收入构成明细项
interface BreakdownItem { label: string; value: number; percent: string }
// 营收趋势点（后端字段不固定，宽松定义）
interface TrendPoint { date?: string; amount?: number; revenue?: number; value?: number; refund?: number }

const lastUpdate = ref("");
const timeRange = ref("30d");
// el-date-picker daterange 的 v-model，类型由组件维护，保留 any 避免框架类型冲突
const customRange = ref<any>(null);

const metrics = reactive({
  totalRevenue: 0, revenueUp: false, revenueChange: "0",
  platformCommission: 0, commissionRate: "0",
  userEarnings: 0,
  orderCount: 0, orderUp: false, orderChange: "0",
  refundAmount: 0, refundRate: "0",
  avgOrder: 0, payingUsers: 0,
});

const breakdownItems = ref<BreakdownItem[]>([]);

const trendChart = ref(null);
const pieChart = ref(null);
const channelChart = ref(null);

function onCustomRange() {
  if (customRange.value) {
    timeRange.value = "custom";
    refresh();
  }
}

function getTimeParams() {
  if (timeRange.value === "custom" && customRange.value?.length === 2) {
    return {
      startDate: customRange.value[0].toISOString().slice(0, 10),
      endDate: customRange.value[1].toISOString().slice(0, 10),
    };
  }
  const days = timeRange.value === "7d" ? 7 : timeRange.value === "30d" ? 30 : timeRange.value === "90d" ? 90 : timeRange.value === "thisMonth" ? "month" : "year";
  return { days };
}

async function refresh() {
  const params = getTimeParams();
  try {
    // params 形状随时间范围而变（{days} 或 {startDate,endDate}），与各接口入参类型不完全一致，保留 as any
    const [overviewRes, statsRes, breakdownRes, trendsRes] = await Promise.all([
      revenueApi.platformOverview(),
      revenueApi.stats(params as any),
      revenueApi.breakdown(params as any),
      revenueApi.platformTrends(params as any),
    ]);

    const overview = overviewRes.data as Record<string, any>;
    if (overview) {
      // 后端返回 totalRmb / totalCoin / totalCount / monthRmb / todayRmb / byScene
      metrics.totalRevenue = Number(overview.totalRmb || overview.totalRevenue || overview.total || 0);
      metrics.platformCommission = Number(overview.platformCommission || 0);
      metrics.userEarnings = Number(overview.userEarnings || 0);
      metrics.orderCount = Number(overview.totalCount || overview.orderCount || 0);
      metrics.refundAmount = Number(overview.refundAmount || 0);
      metrics.refundRate = (overview.refundRate ?? 0).toFixed(1);
      metrics.avgOrder = Number(overview.avgOrder || 0);
      metrics.payingUsers = Number(overview.payingUsers || 0);
      metrics.commissionRate = metrics.totalRevenue > 0
        ? ((metrics.platformCommission / metrics.totalRevenue) * 100).toFixed(1)
        : "0";
      metrics.revenueChange = Number(overview.revenueChange || 0).toFixed(1);
      metrics.revenueUp = Number(overview.revenueChange || 0) >= 0;
      metrics.orderChange = Number(overview.orderChange || 0).toFixed(1);
      metrics.orderUp = Number(overview.orderChange || 0) >= 0;
    }

    const breakdown = breakdownRes.data as Record<string, any>;
    if (breakdown) {
      const total = Object.values(breakdown).reduce((s: number, v) => s + Number(v), 0);
      breakdownItems.value = Object.entries(breakdown).map(([k, v]) => ({
        label: k,
        value: Number(v),
        percent: total > 0 ? ((Number(v) / total) * 100).toFixed(1) : "0",
      }));
    }

    const trends = trendsRes.data as TrendPoint[];
    if (trendChart.value && trends) {
      renderTrendChart(trends);
    }

    if (pieChart.value && breakdown) {
      renderPieChart();
    }

    if (channelChart.value) {
      renderChannelChart(overviewRes.data);
    }
  } catch (e) {
    const err = e as { response?: { data?: unknown }; message?: string }
    console.error("营收数据加载失败:", err?.response?.data || err?.message || e);
    ElMessage.error("获取营收数据失败");
  }
  lastUpdate.value = new Date().toLocaleString("zh-CN", { hour12: false });
}

function renderTrendChart(trends: TrendPoint[]) {
  const chart = echarts.init(trendChart.value!);
  chart.setOption({
    tooltip: { trigger: "axis" },
    legend: { data: ["收入", "退款"], bottom: 0 },
    xAxis: { type: "category", data: trends.map((t) => t.date) },
    yAxis: { type: "value", axisLabel: { formatter: (v: number) => `¥${(v / 1000).toFixed(0)}k` } },
    series: [
      {
        name: "收入", type: "line", smooth: true, symbol: "none",
        data: trends.map((t) => t.amount || t.revenue || t.value || 0),
        areaStyle: { opacity: 0.15 }, lineStyle: { color: "#409eff" },
        itemStyle: { color: "#409eff" },
      },
      {
        name: "退款", type: "line", smooth: true, symbol: "none",
        data: trends.map((t) => t.refund || 0),
        areaStyle: { opacity: 0.08 }, lineStyle: { color: "#f56c6c" },
        itemStyle: { color: "#f56c6c" },
      },
    ],
    grid: { left: 60, right: 20, top: 20, bottom: 40 },
  });
}

function renderPieChart() {
  const chart = echarts.init(pieChart.value!);
  chart.setOption({
    tooltip: { trigger: "item", formatter: "{b}: ¥{c} ({d}%)" },
    series: [{
      type: "pie", radius: ["50%", "75%"], center: ["50%", "55%"],
      label: { formatter: "{b}\n{d}%", fontSize: 12 },
      data: breakdownItems.value.map((d) => ({ name: d.label, value: d.value })),
      emphasis: { label: { fontSize: 16, fontWeight: "bold" } },
    }],
  });
}

function renderChannelChart(overview: Record<string, any> | null | undefined) {
  const chart = echarts.init(channelChart.value!);
  const channels = (overview?.channelBreakdown || overview?.channels) as Record<string, number> | undefined;
  if (!channels) {
    chart.setOption({
      title: { text: "暂无渠道数据", left: "center", top: "center", textStyle: { color: "#909399", fontSize: 14 } },
    });
    return;
  }
  const data = Object.entries(channels).map(([name, value]) => ({ name, value }));
  chart.setOption({
    tooltip: { trigger: "axis", formatter: (p: any) => `${p[0].name}: ¥${p[0].value}` },
    xAxis: { type: "category", data: data.map((d) => d.name) },
    yAxis: { type: "value" },
    series: [{
      type: "bar", data: data.map((d) => d.value),
      itemStyle: { borderRadius: [4, 4, 0, 0], color: "#409eff" },
      barMaxWidth: 40,
    }],
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
  });
}

function exportCSV() {
  const rows = [["分类", "金额"]];
  for (const item of breakdownItems.value) {
    rows.push([item.label, String(item.value)]);
  }
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `营收报表_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  ElMessage.success("导出成功");
}

const quickLinks = [
  { icon: "📋", label: "订单管理", path: "/orders" },
  { icon: "💳", label: "支付流水", path: "/orders/payments" },
  { icon: "↩️", label: "退款审核", path: "/orders/refund" },
  { icon: "📊", label: "对账中心", path: "/finance/reconciliation" },
  { icon: "🧾", label: "发票管理", path: "/finance/invoices" },
  { icon: "💰", label: "结算管理", path: "/finance/settlements" },
  { icon: "🏦", label: "提现审批", path: "/finance/withdrawals" },
  { icon: "📈", label: "财务报表", path: "/finance/reports" },
  { icon: "🔒", label: "资金冻结", path: "/finance/freeze" },
  { icon: "💎", label: "充值记录", path: "/recharges" },
  { icon: "🤝", label: "佣金配置", path: "/commission-config" },
  { icon: "💸", label: "提现审核", path: "/withdrawals" },
];

onMounted(() => refresh());
</script>

<style scoped>
.revenue-page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
.page-header h2 { margin: 0 0 4px 0; font-size: 20px; }
.update-time { color: var(--color-text-secondary); font-size: 12px; }
.header-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }

.metric-row { margin-bottom: 16px; }
.metric-card { background: #f8f9fb; border-radius: 10px; padding: 18px 14px; text-align: center; border: 1px solid var(--color-border); }
.metric-label { font-size: 13px; color: var(--color-text-secondary); margin-bottom: 6px; }
.metric-value { font-size: 24px; font-weight: 700; color: var(--color-text-title); margin-bottom: 4px; }
.metric-value.warn { color: var(--color-error); }
.metric-change { font-size: 12px; }
.metric-change.up { color: var(--color-success); }
.metric-change.down { color: var(--color-error); }

.text-muted { color: var(--color-text-secondary); }
</style>
