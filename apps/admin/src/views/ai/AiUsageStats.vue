<template>
  <div class="page">
    <div class="page-header">
      <h3>AI调用日志与成本追踪</h3>
      <el-button
        :loading="loading"
        @click="refresh"
      >
        刷新
      </el-button>
    </div>

    <!-- 错误态 -->
    <el-alert
      v-if="loadErr"
      type="error"
      :closable="false"
      show-icon
      title="部分数据加载失败"
      style="margin-bottom:16px"
    >
      <template #default>
        <el-button
          type="primary"
          size="small"
          @click="refresh"
        >
          重试
        </el-button>
      </template>
    </el-alert>

    <!-- 统计卡片 -->
    <el-row
      :gutter="16"
      style="margin-bottom:16px"
    >
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ stats.totalCalls?.toLocaleString() || 0 }}</span><span class="label">总调用次数</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ stats.todayCalls?.toLocaleString() || 0 }}</span><span class="label">今日调用</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ formatTokens(stats.todayTokens) }}</span><span class="label">今日Token</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">¥{{ estimatedCost.toFixed(2) }}</span><span class="label">今日估算费用</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card info">
          <span class="value">{{ stats.successRate || 0 }}%</span><span class="label">成功率</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card warn">
          <span class="value">{{ alerts.length }}</span><span class="label">异常告警</span>
        </div>
      </el-col>
    </el-row>

    <!-- 筛选栏 -->
    <el-card style="margin-bottom:16px">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <el-select
          v-model="filters.scene"
          placeholder="场景"
          size="small"
          clearable
          style="width:160px"
          @change="fetchLogs"
        >
          <el-option
            v-for="s in sceneOptions"
            :key="s"
            :label="s"
            :value="s"
          />
        </el-select>
        <el-select
          v-model="filters.model"
          placeholder="模型"
          size="small"
          clearable
          style="width:180px"
          @change="fetchLogs"
        >
          <el-option
            v-for="m in modelOptions"
            :key="m.value"
            :label="m.label"
            :value="m.value"
          />
        </el-select>
        <el-select
          v-model="filters.status"
          placeholder="状态"
          size="small"
          clearable
          style="width:110px"
          @change="fetchLogs"
        >
          <el-option
            label="成功"
            value="success"
          />
          <el-option
            label="失败"
            value="error"
          />
          <el-option
            label="超时"
            value="timeout"
          />
        </el-select>
        <el-date-picker
          v-model="filters.dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始"
          end-placeholder="结束"
          size="small"
          style="width:260px"
          @change="fetchLogs"
        />
        <el-button
          size="small"
          @click="fetchLogs"
        >
          搜索
        </el-button>
        <el-button
          size="small"
          @click="exportCSV"
        >
          导出CSV
        </el-button>
      </div>
    </el-card>

    <!-- Token用量趋势 -->
    <el-row
      :gutter="16"
      style="margin-bottom:16px"
    >
      <el-col :span="14">
        <el-card>
          <template #header>
            <span>Token用量趋势（近7天）</span>
          </template>
          <div
            v-show="scenarioDistribution.length"
            ref="trendChartRef"
            style="height:280px"
          />
          <el-empty
            v-if="!loading && scenarioDistribution.length === 0"
            description="暂无趋势数据"
            :image-size="60"
          />
        </el-card>
      </el-col>
      <el-col :span="10">
        <el-card>
          <template #header>
            <span>场景分布（今日）</span>
          </template>
          <div
            v-show="scenarioDistribution.length"
            ref="sceneChartRef"
            style="height:280px"
          />
          <el-empty
            v-if="!loading && scenarioDistribution.length === 0"
            description="暂无场景数据"
            :image-size="60"
          />
        </el-card>
      </el-col>
    </el-row>

    <!-- 场景维度成本分析 -->
    <el-card style="margin-bottom:16px">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>场景维度成本分析</span>
          <el-radio-group v-model="sceneDimensionSort" size="small" @change="renderSceneDimension">
            <el-radio-button value="cost">按费用</el-radio-button>
            <el-radio-button value="tokens">按Token</el-radio-button>
            <el-radio-button value="calls">按调用量</el-radio-button>
          </el-radio-group>
        </div>
      </template>
      <el-table :data="sceneDimensionData" stripe size="small" max-height="360">
        <el-table-column prop="scene" label="场景" min-width="150" show-overflow-tooltip />
        <el-table-column label="调用次数" width="110" align="right" sortable prop="calls">
          <template #default="{ row }">{{ row.calls?.toLocaleString() || 0 }}</template>
        </el-table-column>
        <el-table-column label="Token用量" width="120" align="right" sortable prop="tokens">
          <template #default="{ row }">{{ formatTokens(row.tokens) }}</template>
        </el-table-column>
        <el-table-column label="估算费用" width="110" align="right" sortable prop="cost">
          <template #default="{ row }">¥{{ (row.cost || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="平均延迟" width="100" align="right" sortable prop="avgLatency">
          <template #default="{ row }">{{ row.avgLatency ? row.avgLatency + 'ms' : '-' }}</template>
        </el-table-column>
        <el-table-column label="成功率" width="90" align="center" sortable prop="successRate">
          <template #default="{ row }">
            <el-tag :type="(row.successRate ?? 100) >= 95 ? 'success' : 'warning'" size="small">
              {{ row.successRate ?? 100 }}%
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="费用占比" width="100" align="center">
          <template #default="{ row }">
            <el-progress :percentage="row.costPercent || 0" :stroke-width="8" :show-text="false" />
            <span style="font-size:12px;color:var(--color-text-secondary)">{{ row.costPercent || 0 }}%</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 调用日志表 -->
    <el-card>
      <template #header>
        <span>调用日志</span>
      </template>
      <el-table
        v-loading="loading"
        :data="logs"
        stripe
        size="small"
        max-height="500"
      >
        <el-table-column
          label="场景"
          width="160"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.scene || '-' }}
          </template>
        </el-table-column>
        <el-table-column
          label="模型"
          width="180"
          prop="modelName"
          show-overflow-tooltip
        />
        <el-table-column
          label="Token"
          width="110"
        >
          <template #default="{ row }">
            <span v-if="row.tokenUsage">P:{{ row.tokenUsage.promptTokens }} C:{{ row.tokenUsage.completionTokens }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column
          label="估算费用"
          width="90"
        >
          <template #default="{ row }">
            <span v-if="row.tokenUsage">¥{{ calcCost(row.modelName, row.tokenUsage).toFixed(4) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column
          label="延迟"
          width="70"
        >
          <template #default="{ row }">
            {{ row.latencyMs ? row.latencyMs + 'ms' : '-' }}
          </template>
        </el-table-column>
        <el-table-column
          label="状态"
          width="70"
        >
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'success' ? 'success' : 'danger'"
              size="small"
            >
              {{ row.status || 'ok' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="时间"
          width="160"
        >
          <template #default="{ row }">
            {{ fmt(row.createdAt) }}
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="pagination.page"
        :total="pagination.total"
        :page-size="20"
        layout="total, prev, pager, next"
        style="margin-top:12px;justify-content:flex-end"
        @current-change="fetchLogs"
      />
    </el-card>

    <!-- 异常告警 -->
    <el-card
      v-if="alerts.length"
      style="margin-top:16px"
    >
      <template #header>
        <span>异常告警 ({{ alerts.length }})</span>
      </template>
      <el-table
        :data="alerts"
        stripe
        size="small"
      >
        <el-table-column
          prop="type"
          label="类型"
          width="100"
        />
        <el-table-column
          prop="title"
          label="标题"
          min-width="200"
        />
        <el-table-column
          label="级别"
          width="80"
        >
          <template #default="{ row }">
            <el-tag
              :type="row.level === 'CRITICAL' ? 'danger' : row.level === 'WARN' ? 'warning' : 'info'"
              size="small"
            >
              {{ row.level }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="时间"
          width="160"
        >
          <template #default="{ row }">
            {{ fmt(row.createdAt) }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from "vue";
import { ElMessage } from "element-plus";
import { aiAdminApi } from "@/api";
import * as echarts from "echarts";

// 模型单价（元/千Token - 输入/输出）
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "deepseek-v4-flash": { input: 0.001, output: 0.002 },
  "deepseek-v4-pro": { input: 0.003, output: 0.006 },
  "deepseek-r1": { input: 0.004, output: 0.016 },
  "claude-opus-4-7": { input: 0.015, output: 0.075 },
  "claude-sonnet-4-6": { input: 0.003, output: 0.015 },
  "claude-haiku-4-5": { input: 0.0008, output: 0.004 },
  "gpt-5": { input: 0.0025, output: 0.01 },
};

/** 场景维度成本行（字段宽松 optional） */
interface SceneDimensionRow {
  scene?: string;
  calls?: number;
  tokens?: number;
  cost?: number;
  avgLatency?: number;
  successRate?: number;
  costPercent?: number;
}
/** 调用日志行（tokenUsage 内字段必填，由 v-if 收窄保证存在） */
interface CallLogRow {
  scene?: string;
  modelName: string;
  tokenUsage?: { promptTokens: number; completionTokens: number };
  latencyMs?: number;
  status?: string;
  createdAt?: string;
}
/** 异常告警行 */
interface AlertRow {
  type?: string;
  title?: string;
  level?: string;
  createdAt?: string;
}
/** 趋势/场景分布点 */
interface TrendPoint {
  date?: string;
  day?: string;
  tokens?: number;
  calls?: number;
  scene?: string;
  name?: string;
}
/** 调用统计接口响应 */
interface CallStatsResponse {
  totalCalls?: number;
  todayCalls?: number;
  todayTokens?: number;
  successRate?: number;
  sceneDistribution?: TrendPoint[];
  estimatedCost?: number;
  sceneBreakdown?: SceneDimensionRow[];
  scenes?: string[];
  models?: string[];
}
/** 调用日志接口响应 */
interface LogsResponse { list?: CallLogRow[]; data?: CallLogRow[]; total?: number }
/** 告警接口响应 */
interface AlertsResponse { alerts?: AlertRow[]; data?: AlertRow[] }

const stats = reactive({ totalCalls: 0, todayCalls: 0, todayTokens: 0, successRate: 0 });
const logs = ref<CallLogRow[]>([]);
const loading = ref(false);
const loadErr = ref(false);
const scenarioDistribution = ref<TrendPoint[]>([]);

const sceneOptions = ref<string[]>([]);
const modelOptions = ref<Array<{ label: string; value: string }>>([]);

const filters = reactive({
  scene: "",
  model: "",
  status: "",
  dateRange: null as [Date, Date] | null,
});

const pagination = reactive({ page: 1, total: 0 });

const alerts = ref<AlertRow[]>([]);
const trendChartRef = ref<HTMLElement | null>(null);
const sceneChartRef = ref<HTMLElement | null>(null);
let trendChart: echarts.ECharts | null = null;
let sceneChart: echarts.ECharts | null = null;

const estimatedCost = ref(0);
const sceneBreakdown = ref<SceneDimensionRow[]>([]);
const sceneDimensionSort = ref("cost");
const sceneDimensionData = ref<SceneDimensionRow[]>([]);

function fmt(d: string) { return d ? new Date(d).toLocaleString("zh-CN", { hour12: false }) : "-"; }

function formatTokens(n: number): string {
  if (!n || n === 0) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function calcCost(modelName: string, tokenUsage: { promptTokens: number; completionTokens: number }): number {
  const pricing = MODEL_PRICING[modelName] || { input: 0.001, output: 0.002 };
  return (tokenUsage.promptTokens / 1000) * pricing.input + (tokenUsage.completionTokens / 1000) * pricing.output;
}

onMounted(() => refresh());

async function refresh() {
  loadErr.value = false;
  await Promise.all([fetchStats(), fetchLogs(), fetchAlerts()]);
}

async function fetchStats() {
  try {
    const { data } = await aiAdminApi.getCallStats("week");
    const d = data as CallStatsResponse;
    stats.totalCalls = d?.totalCalls || 0;
    stats.todayCalls = d?.todayCalls || 0;
    stats.todayTokens = d?.todayTokens || 0;
    stats.successRate = d?.successRate || 0;

    // 场景分布
    scenarioDistribution.value = d?.sceneDistribution || [];
    estimatedCost.value = d?.estimatedCost || 0;
    sceneBreakdown.value = d?.sceneBreakdown || [];

    // 场景/模型选项
    sceneOptions.value = d?.scenes || [];
    modelOptions.value = (d?.models || []).map((m: string) => ({ label: m, value: m }));

    renderSceneDimension();
  } catch { loadErr.value = true; }
}

async function fetchLogs() {
  loading.value = true;
  try {
    const params: Record<string, string | number> = { page: pagination.page, pageSize: 20 };
    if (filters.scene) params.scene = filters.scene;
    if (filters.model) params.model = filters.model;
    if (filters.status) params.status = filters.status;
    if (filters.dateRange) {
      params.startDate = filters.dateRange[0]?.toISOString();
      params.endDate = filters.dateRange[1]?.toISOString();
    }

    const { data } = await aiAdminApi.getCallLogs(params);
    const d = data as LogsResponse;
    logs.value = d?.list || d?.data || [];
    pagination.total = d?.total || logs.value.length;

    // Refresh charts after data load
    await nextTick();
    renderCharts();
  } catch { loadErr.value = true; } finally { loading.value = false; }
}

async function fetchAlerts() {
  try {
    const { data } = await aiAdminApi.getAbnormalCalls();
    const d = data as AlertsResponse;
    alerts.value = d?.alerts || d?.data || [];
  } catch { loadErr.value = true; }
}

function renderCharts() {
  // Trend chart - use scenario distribution
  if (trendChartRef.value && scenarioDistribution.value.length > 0) {
    if (trendChart) trendChart.dispose();
    trendChart = echarts.init(trendChartRef.value);

    const dates = scenarioDistribution.value.map((d) => d.date || d.day || "");
    const tokens = scenarioDistribution.value.map((d) => d.tokens || 0);
    const calls = scenarioDistribution.value.map((d) => d.calls || 0);

    trendChart.setOption({
      tooltip: { trigger: "axis" },
      legend: { data: ["Token", "调用"], bottom: 0 },
      grid: { left: 55, right: 40, top: 10, bottom: 30 },
      xAxis: { type: "category", data: dates, axisLabel: { fontSize: 10 } },
      yAxis: [
        { type: "value", name: "Token", axisLabel: { formatter: (v: number) => v >= 1000 ? (v / 1000).toFixed(0) + "K" : v.toString() } },
        { type: "value", name: "次" },
      ],
      series: [
        { name: "Token", type: "bar", data: tokens, itemStyle: { color: "#409eff" }, barMaxWidth: 30 },
        { name: "调用", type: "line", yAxisIndex: 1, data: calls, itemStyle: { color: "#67c23a" }, smooth: true },
      ],
    });
  }

  // Scene pie chart
  if (sceneChartRef.value && scenarioDistribution.value.length > 0) {
    if (sceneChart) sceneChart.dispose();
    sceneChart = echarts.init(sceneChartRef.value);

    const pieData = scenarioDistribution.value.map((d) => ({
      name: d.scene || d.name || "其他",
      value: d.tokens || 0,
    }));

    sceneChart.setOption({
      tooltip: { trigger: "item", formatter: "{b}: {c} Token ({d}%)" },
      series: [{
        type: "pie",
        radius: ["45%", "75%"],
        center: ["50%", "50%"],
        data: pieData,
        label: { fontSize: 10, formatter: "{b}\n{d}%" },
      }],
    });
  }
}

function renderSceneDimension() {
  const data = [...(sceneBreakdown.value || [])];
  if (data.length === 0) {
    sceneDimensionData.value = [];
    return;
  }
  const totalCost = data.reduce((sum, d) => sum + (d.cost || 0), 0);
  data.forEach((d) => {
    // Number(undefined) -> NaN，与原 `d.cost / totalCost` 行为一致
    d.costPercent = totalCost > 0 ? Math.round((Number(d.cost) / totalCost) * 100) : 0;
  });
  const sortKey = sceneDimensionSort.value as keyof SceneDimensionRow;
  data.sort((a, b) => (Number(b[sortKey]) || 0) - (Number(a[sortKey]) || 0));
  sceneDimensionData.value = data;
}

function exportCSV() {
  if (logs.value.length === 0) { ElMessage.warning("暂无数据可导出"); return; }

  const headers = ["场景", "模型", "PromptToken", "CompletionToken", "估算费用", "延迟ms", "状态", "时间"];
  const rows = logs.value.map((r) => [
    r.scene || "", r.modelName || "",
    r.tokenUsage?.promptTokens || 0, r.tokenUsage?.completionTokens || 0,
    r.tokenUsage ? calcCost(r.modelName, r.tokenUsage).toFixed(4) : "0",
    r.latencyMs || "", r.status || "", r.createdAt || "",
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `ai-call-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  ElMessage.success("导出成功");
}
</script>

<style scoped>
.page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.stat-card { background: var(--color-bg-page); border-radius: 8px; padding: 14px; text-align: center; }
.stat-card .value { display: block; font-size: 24px; font-weight: 700; color: var(--color-text-title); }
.stat-card .label { display: block; font-size: 12px; color: var(--color-text-secondary); margin-top: 2px; }
.stat-card.warn .value { color: var(--color-warning); }
.stat-card.info .value { color: var(--color-info); }
</style>
