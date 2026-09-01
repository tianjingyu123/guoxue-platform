<template>
  <div class="revenue-page">
    <div class="page-header">
      <div>
        <h2>用户收益总览</h2>
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

    <!-- 口径说明：三本账各看各页，本页只讲用户侧收益 -->
    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="caliber-banner"
    >
      <template #title>
        本页口径：<b>用户侧收益</b>（分给达人/圈主/讲师等的收益台账 UserEarning）。
        平台订单流水与 GMV 请看
        <el-link
          type="primary"
          @click="router.push('/finance/reports')"
        >财务报表</el-link>；
        平台抽成请看
        <el-link
          type="primary"
          @click="router.push('/platform-fee')"
        >平台抽成汇总</el-link>。
      </template>
    </el-alert>

    <!-- 核心指标卡片（仅后端真实字段：总额/笔数/本月/今日） -->
    <el-row
      :gutter="16"
      class="metric-row"
    >
      <el-col :span="6">
        <div class="metric-card">
          <div class="metric-label">
            用户收益总额
          </div>
          <div class="metric-value">
            ¥{{ fmt(metrics.totalRmb) }}
          </div>
          <div class="metric-change text-muted">
            累计 {{ fmtInt(metrics.totalCount) }} 笔
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="metric-card">
          <div class="metric-label">
            关联国学币
          </div>
          <div class="metric-value">
            {{ fmtInt(metrics.totalCoin) }}
          </div>
          <div class="metric-change text-muted">
            收益对应币数（累计）
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="metric-card">
          <div class="metric-label">
            本月收益
          </div>
          <div class="metric-value">
            ¥{{ fmt(metrics.monthRmb) }}
          </div>
          <div class="metric-change text-muted">
            本月 {{ fmtInt(metrics.monthCount) }} 笔
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="metric-card">
          <div class="metric-label">
            今日收益
          </div>
          <div class="metric-value">
            ¥{{ fmt(metrics.todayRmb) }}
          </div>
          <div class="metric-change text-muted">
            今日 {{ fmtInt(metrics.todayCount) }} 笔
          </div>
        </div>
      </el-col>
    </el-row>
    <div class="metric-note">
      指标卡为全量口径；下方趋势图与构成明细随上方时间范围变化。
    </div>

    <!-- 图表区 -->
    <el-row
      :gutter="16"
      style="margin-bottom:16px"
    >
      <el-col :span="16">
        <el-card>
          <template #header>
            <span>收益趋势</span>
          </template>
          <div
            v-loading="trendLoading"
            style="position:relative"
          >
            <el-empty
              v-if="trendEmpty && !trendLoading"
              description="该时间范围暂无收益数据"
              :image-size="80"
            />
            <div
              v-show="!trendEmpty"
              ref="trendChart"
              style="height:320px"
            />
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header>
            <span>收益构成（按场景）</span>
          </template>
          <el-empty
            v-if="breakdownItems.length === 0"
            description="该时间范围暂无数据"
            :image-size="80"
          />
          <div
            v-show="breakdownItems.length > 0"
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
      <el-col :span="24">
        <el-card>
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>收益构成明细</span>
              <el-button
                size="small"
                text
                @click="router.push('/orders/payments')"
              >
                查看支付流水 →
              </el-button>
            </div>
          </template>
          <el-table
            :data="breakdownItems"
            stripe
            size="small"
            max-height="280"
          >
            <template #empty>
              <el-empty
                description="该时间范围暂无收益记录"
                :image-size="60"
              />
            </template>
            <el-table-column
              prop="label"
              label="收益场景"
            />
            <el-table-column
              label="金额"
              width="180"
              align="right"
            >
              <template #default="{ row }">
                ¥{{ fmt(row.value) }}
              </template>
            </el-table-column>
            <el-table-column
              label="占比"
              width="100"
              align="right"
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
import { ref, reactive, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { revenueApi } from "@/api";
import echarts from "@/utils/echarts";
import type { EChartsType } from "echarts/core";
import { downloadCsvRows } from "@/utils/export";

const router = useRouter();

function fmt(v: number | string | undefined | null) {
  if (v === null || v === undefined) return "0.00";
  return Number(v).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtInt(v: number | string | undefined | null) {
  if (v === null || v === undefined) return "0";
  return Number(v).toLocaleString("zh-CN");
}

// 收益场景枚举翻译（后端 EarningScene）
const SCENE_LABELS: Record<string, string> = {
  QUESTION: "付费提问",
  PEEK: "围观答案·达人分成",
  PEEK_ASKER: "围观答案·提问者分成",
  AUDIO_CALL: "音频连麦",
  LIVE_GIFT: "直播打赏",
};
function sceneLabel(s: string) { return SCENE_LABELS[s] || s; }

// 收益构成明细项
interface BreakdownItem { label: string; value: number; percent: string }
// 收益趋势点（后端 getRevenueTrends 返回 { trends: [{date, rmb, count}], days }）
interface TrendPoint { date: string; rmb: number; count: number }

const lastUpdate = ref("");
const timeRange = ref("30d");
// el-date-picker daterange 的 v-model，类型由组件维护，保留 any 避免框架类型冲突
const customRange = ref<any>(null);

// 仅后端真实返回字段（platform/overview：totalRmb/totalCoin/totalCount/monthRmb/monthCount/todayRmb/todayCount）
const metrics = reactive({
  totalRmb: 0, totalCoin: 0, totalCount: 0,
  monthRmb: 0, monthCount: 0,
  todayRmb: 0, todayCount: 0,
});

const breakdownItems = ref<BreakdownItem[]>([]);
const trendLoading = ref(false);
const trendEmpty = ref(false);

const trendChart = ref<HTMLElement | null>(null);
const pieChart = ref<HTMLElement | null>(null);

function chartOf(el: HTMLElement | null): EChartsType | null {
  if (!el) return null;
  return echarts.getInstanceByDom(el) ?? echarts.init(el);
}

onBeforeUnmount(() => {
  // echarts 实例随页面销毁释放，避免内存泄漏
  for (const el of [trendChart.value, pieChart.value]) {
    if (el) echarts.getInstanceByDom(el)?.dispose();
  }
});

function onCustomRange() {
  if (customRange.value) {
    timeRange.value = "custom";
    refresh();
  }
}

function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 趋势接口参数：days 支持 数字 | "month" | "year"（新契约） */
function getTrendDays(): number | string {
  if (timeRange.value === "custom" && customRange.value?.length === 2) {
    const ms = customRange.value[1].getTime() - customRange.value[0].getTime();
    return Math.max(1, Math.min(366, Math.round(ms / 86400000)));
  }
  const map: Record<string, number | string> = { "7d": 7, "30d": 30, "90d": 90, thisMonth: "month", thisYear: "year" };
  return map[timeRange.value] ?? 30;
}

/** 构成接口参数：仅支持 startDate/endDate，预设档在前端换算日期窗口 */
function getBreakdownRange(): { startDate: string; endDate: string } {
  const now = new Date();
  if (timeRange.value === "custom" && customRange.value?.length === 2) {
    return { startDate: toDateStr(customRange.value[0]), endDate: toDateStr(customRange.value[1]) };
  }
  if (timeRange.value === "thisMonth") {
    return { startDate: toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: toDateStr(now) };
  }
  if (timeRange.value === "thisYear") {
    return { startDate: toDateStr(new Date(now.getFullYear(), 0, 1)), endDate: toDateStr(now) };
  }
  const days = timeRange.value === "7d" ? 7 : timeRange.value === "90d" ? 90 : 30;
  const start = new Date(now.getTime() - days * 86400000);
  return { startDate: toDateStr(start), endDate: toDateStr(now) };
}

async function refresh() {
  trendLoading.value = true;
  try {
    const [overviewRes, breakdownRes, trendsRes] = await Promise.all([
      revenueApi.platformOverview(),
      revenueApi.breakdown(getBreakdownRange()),
      // days 契约：数字 | "month" | "year"；接口签名为 number，联合类型经 as any 透传
      revenueApi.platformTrends({ days: getTrendDays() as any }),
    ]);

    const overview = overviewRes.data as Record<string, any>;
    if (overview) {
      metrics.totalRmb = Number(overview.totalRmb || 0);
      metrics.totalCoin = Number(overview.totalCoin || 0);
      metrics.totalCount = Number(overview.totalCount || 0);
      metrics.monthRmb = Number(overview.monthRmb || 0);
      metrics.monthCount = Number(overview.monthCount || 0);
      metrics.todayRmb = Number(overview.todayRmb || 0);
      metrics.todayCount = Number(overview.todayCount || 0);
    }

    // breakdown 返回 { 场景枚举: 金额 }，枚举翻译成中文
    const breakdown = breakdownRes.data as Record<string, any>;
    if (breakdown && typeof breakdown === "object") {
      const entries = Object.entries(breakdown).filter(([, v]) => Number(v) > 0);
      const total = entries.reduce((s, [, v]) => s + Number(v), 0);
      breakdownItems.value = entries
        .map(([k, v]) => ({
          label: sceneLabel(k),
          value: Number(v),
          percent: total > 0 ? ((Number(v) / total) * 100).toFixed(1) : "0",
        }))
        .sort((a, b) => b.value - a.value);
    } else {
      breakdownItems.value = [];
    }

    // 🔴 trends 返回 { trends, days } 对象（非数组），解包后渲染
    const trendsData = trendsRes.data as { trends?: TrendPoint[] } | TrendPoint[];
    const trends: TrendPoint[] = Array.isArray(trendsData) ? trendsData : (trendsData?.trends ?? []);
    trendEmpty.value = trends.length === 0 || trends.every((t) => !Number(t.rmb) && !Number(t.count));
    if (!trendEmpty.value) renderTrendChart(trends);
    if (breakdownItems.value.length > 0) renderPieChart();
  } catch (e) {
    const err = e as { response?: { data?: unknown }; message?: string }
    console.error("收益数据加载失败:", err?.response?.data || err?.message || e);
    ElMessage.error("获取收益数据失败，请重试");
  } finally {
    trendLoading.value = false;
  }
  lastUpdate.value = new Date().toLocaleString("zh-CN", { hour12: false });
}

function renderTrendChart(trends: TrendPoint[]) {
  const chart = chartOf(trendChart.value);
  if (!chart) return;
  chart.setOption({
    tooltip: { trigger: "axis" },
    legend: { data: ["收益金额", "收益笔数"], bottom: 0 },
    xAxis: { type: "category", data: trends.map((t) => t.date) },
    yAxis: [
      { type: "value", name: "金额", axisLabel: { formatter: (v: number) => (v >= 1000 ? `¥${(v / 1000).toFixed(1)}k` : `¥${v}`) } },
      { type: "value", name: "笔数", splitLine: { show: false } },
    ],
    series: [
      {
        name: "收益金额", type: "line", smooth: true, symbol: "none",
        data: trends.map((t) => Math.round(Number(t.rmb || 0) * 100) / 100),
        areaStyle: { opacity: 0.15 }, lineStyle: { color: "#409eff" },
        itemStyle: { color: "#409eff" },
      },
      {
        name: "收益笔数", type: "bar", yAxisIndex: 1,
        data: trends.map((t) => Number(t.count || 0)),
        itemStyle: { color: "#67c23a", opacity: 0.35, borderRadius: [2, 2, 0, 0] },
        barMaxWidth: 12,
      },
    ],
    grid: { left: 60, right: 50, top: 30, bottom: 40 },
  }, true);
}

function renderPieChart() {
  const chart = chartOf(pieChart.value);
  if (!chart) return;
  chart.setOption({
    tooltip: { trigger: "item", formatter: "{b}: ¥{c} ({d}%)" },
    series: [{
      type: "pie", radius: ["50%", "75%"], center: ["50%", "55%"],
      label: { formatter: "{b}\n{d}%", fontSize: 12 },
      data: breakdownItems.value.map((d) => ({ name: d.label, value: d.value })),
      emphasis: { label: { fontSize: 16, fontWeight: "bold" } },
    }],
  }, true);
}

function exportCSV() {
  const rows = [["收益场景", "金额(元)", "占比(%)"]];
  for (const item of breakdownItems.value) {
    rows.push([item.label, String(item.value), item.percent]);
  }
  downloadCsvRows(`用户收益报表_${new Date().toISOString().slice(0, 10)}`, rows);
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
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 8px; }
.page-header h2 { margin: 0 0 4px 0; font-size: 20px; }
.update-time { color: var(--color-text-secondary); font-size: 12px; }
.header-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }

.caliber-banner { margin-bottom: 14px; }

.metric-row { margin-bottom: 6px; }
.metric-card { background: #f8f9fb; border-radius: 10px; padding: 18px 14px; text-align: center; border: 1px solid var(--color-border); }
.metric-label { font-size: 13px; color: var(--color-text-secondary); margin-bottom: 6px; }
.metric-value { font-size: 24px; font-weight: 700; color: var(--color-text-title); margin-bottom: 4px; }
.metric-change { font-size: 12px; }

.metric-note { font-size: 12px; color: var(--color-text-secondary); margin: 0 0 14px 2px; }

.text-muted { color: var(--color-text-secondary); }
</style>
