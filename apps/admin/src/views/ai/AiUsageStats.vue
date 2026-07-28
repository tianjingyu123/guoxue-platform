<template>
  <div class="page">
    <div class="page-header">
      <h3>AI调用中心</h3>
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
      title="数据加载失败，请重试"
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

    <!-- 统计周期切换 -->
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <el-radio-group
        v-model="period"
        size="small"
        @change="fetchStats"
      >
        <el-radio-button value="day">今日</el-radio-button>
        <el-radio-button value="week">近7天</el-radio-button>
        <el-radio-button value="month">近30天</el-radio-button>
      </el-radio-group>
      <span style="font-size:12px;color:var(--color-text-secondary)">统计口径：全平台 AI 调用记录（含排盘解析/网关调用等全场景）</span>
    </div>

    <!-- 统计卡片（字段与 GET /ai/usage-stats 真实返回一一对应） -->
    <el-row
      :gutter="16"
      style="margin-bottom:16px"
    >
      <el-col :span="8">
        <div
          v-loading="statsLoading"
          class="stat-card"
        >
          <span class="value">{{ stats.totalCalls.toLocaleString() }}</span>
          <span class="label">调用次数（{{ periodLabel }}）</span>
        </div>
      </el-col>
      <el-col :span="8">
        <div
          v-loading="statsLoading"
          class="stat-card"
        >
          <span class="value">{{ formatTokens(stats.totalTokens) }}</span>
          <span class="label">Token 总量（{{ periodLabel }}）</span>
        </div>
      </el-col>
      <el-col :span="8">
        <div
          v-loading="statsLoading"
          class="stat-card info"
        >
          <span class="value">¥{{ stats.estimatedCost.toFixed(4) }}</span>
          <span class="label">估算费用（按模型标价估算·非账单）</span>
        </div>
      </el-col>
    </el-row>

    <!-- 趋势与模型分布 -->
    <el-row
      :gutter="16"
      style="margin-bottom:16px"
    >
      <el-col :span="14">
        <el-card>
          <template #header>
            <span>调用趋势（{{ periodLabel }}）</span>
          </template>
          <div
            v-show="trend.length"
            ref="trendChartRef"
            style="height:280px"
          />
          <el-empty
            v-if="!statsLoading && trend.length === 0"
            description="所选周期内暂无调用记录，切换周期试试"
            :image-size="60"
          />
        </el-card>
      </el-col>
      <el-col :span="10">
        <el-card>
          <template #header>
            <span>按模型分布（{{ periodLabel }}）</span>
          </template>
          <el-table
            v-loading="statsLoading"
            :data="byService"
            stripe
            size="small"
            max-height="280"
          >
            <el-table-column
              prop="service"
              label="模型"
              min-width="140"
              show-overflow-tooltip
            />
            <el-table-column
              label="调用"
              width="80"
              align="right"
            >
              <template #default="{ row }">
                {{ row.count.toLocaleString() }}
              </template>
            </el-table-column>
            <el-table-column
              label="Token"
              width="90"
              align="right"
            >
              <template #default="{ row }">
                {{ formatTokens(row.totalTokens) }}
              </template>
            </el-table-column>
            <el-table-column
              label="估算费用"
              width="100"
              align="right"
            >
              <template #default="{ row }">
                ¥{{ row.estimatedCost.toFixed(4) }}
              </template>
            </el-table-column>
          </el-table>
          <el-empty
            v-if="!statsLoading && byService.length === 0"
            description="暂无模型调用数据"
            :image-size="60"
          />
        </el-card>
      </el-col>
    </el-row>

    <!-- 调用日志（GET /ai/call-logs 全场景真实记录） -->
    <el-card>
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>调用日志</span>
          <div style="display:flex;gap:10px;align-items:center">
            <el-select
              v-model="logFilter.service"
              placeholder="按模型筛选"
              size="small"
              clearable
              style="width:200px"
              @change="onFilterChange"
            >
              <el-option
                v-for="m in modelOptions"
                :key="m"
                :label="m"
                :value="m"
              />
            </el-select>
            <el-button
              size="small"
              @click="exportCSV"
            >
              导出CSV
            </el-button>
          </div>
        </div>
      </template>
      <el-table
        v-loading="loading"
        :data="logs"
        stripe
        size="small"
        max-height="520"
      >
        <el-table-column
          label="用户"
          width="160"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <span v-if="row.userNickname">{{ row.userNickname }}</span>
            <span
              v-else-if="row.userId === 'system'"
              style="color:var(--color-text-secondary)"
            >系统</span>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column
          label="类型"
          width="130"
        >
          <template #default="{ row }">
            <el-tag
              size="small"
              type="info"
            >
              {{ analyzeTypeLabel(row.analyzeType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="模型"
          min-width="160"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.modelName || '—' }}
          </template>
        </el-table-column>
        <el-table-column
          label="Token（输入/输出）"
          width="150"
          align="right"
        >
          <template #default="{ row }">
            <span v-if="row.tokenUsage">{{ tokenOf(row, 'promptTokens') }} / {{ tokenOf(row, 'completionTokens') }}</span>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column
          label="缓存命中"
          width="90"
          align="center"
        >
          <template #default="{ row }">
            <el-tag
              v-if="row.isCached"
              type="success"
              size="small"
            >
              命中
            </el-tag>
            <span
              v-else
              style="color:var(--color-text-secondary)"
            >否</span>
          </template>
        </el-table-column>
        <el-table-column
          label="记录ID"
          width="110"
        >
          <template #default="{ row }">
            <el-tooltip
              :content="row.id"
              placement="top"
            >
              <span
                class="id-cell"
                @click="copyId(row.id)"
              >{{ row.id.slice(0, 8) }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column
          label="时间"
          width="150"
        >
          <template #default="{ row }">
            <el-tooltip
              :content="fmtFull(row.createdAt)"
              placement="top"
            >
              <span>{{ fmtShort(row.createdAt) }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
      <el-empty
        v-if="!loading && logs.length === 0"
        description="暂无调用日志，等平台产生 AI 调用后这里会自动记录"
        :image-size="60"
      />
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        style="margin-top:12px;justify-content:flex-end"
        @current-change="fetchLogs"
        @size-change="onFilterChange"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { ElMessage } from "element-plus";
import { api } from "@/api";
import echarts from "@/utils/echarts";
import type { EChartsType } from "echarts/core";

/** GET /ai/usage-stats 真实返回体（ai.service.ts getAiUsageStats） */
interface UsageStatsResponse {
  period: string;
  totalCalls: number;
  totalTokens: number;
  estimatedCost: number;
  byService: Array<{ service: string; count: number; totalTokens: number; estimatedCost: number }>;
  trend: Array<{ date: string; count: number; totalTokens: number }>;
}

/** GET /ai/call-logs 真实返回体单条（ai.service.ts getAiCallLogs） */
interface CallLogItem {
  id: string;
  userId: string;
  userNickname: string;
  userAvatar: string;
  analyzeType: string;
  modelName: string | null;
  tokenUsage: Record<string, unknown> | null;
  isCached: boolean;
  createdAt: string;
}
interface CallLogsResponse {
  items: CallLogItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const ANALYZE_TYPE_LABELS: Record<string, string> = {
  GENERAL: "通用解析",
  BAZI_SCHOOL: "八字流派点评",
  ZIWEI_GENERAL: "紫微解析",
  HEHUN: "合婚分析",
};

const period = ref<"day" | "week" | "month">("day");
const periodLabel = computed(() => ({ day: "今日", week: "近7天", month: "近30天" }[period.value]));

const stats = reactive({ totalCalls: 0, totalTokens: 0, estimatedCost: 0 });
const byService = ref<UsageStatsResponse["byService"]>([]);
const trend = ref<UsageStatsResponse["trend"]>([]);
const modelOptions = computed(() => byService.value.map((s) => s.service).filter((s) => s && s !== "unknown"));

const logs = ref<CallLogItem[]>([]);
const loading = ref(false);
const statsLoading = ref(false);
const loadErr = ref(false);
const logFilter = reactive({ service: "" });
const pagination = reactive({ page: 1, pageSize: 20, total: 0 });

const trendChartRef = ref<HTMLElement | null>(null);
let trendChart: EChartsType | null = null;

function fmtShort(d: string) {
  if (!d) return "—";
  const t = new Date(d);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(t.getMonth() + 1)}-${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}`;
}
function fmtFull(d: string) { return d ? new Date(d).toLocaleString("zh-CN", { hour12: false }) : "—"; }

function formatTokens(n: number): string {
  if (!n) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function analyzeTypeLabel(t: string): string {
  return ANALYZE_TYPE_LABELS[t] || t || "—";
}

/** tokenUsage 为 Json 列，字段可能缺省，安全取数 */
function tokenOf(row: CallLogItem, key: string): string {
  const v = row.tokenUsage?.[key];
  return typeof v === "number" ? v.toLocaleString() : "0";
}

async function copyId(id: string) {
  try {
    await navigator.clipboard.writeText(id);
    ElMessage.success("已复制");
  } catch {
    ElMessage.error("复制失败，请手动选择");
  }
}

onMounted(() => refresh());
onBeforeUnmount(() => { trendChart?.dispose(); trendChart = null; });

async function refresh() {
  loadErr.value = false;
  await Promise.all([fetchStats(), fetchLogs()]);
}

async function fetchStats() {
  statsLoading.value = true;
  try {
    const { data } = await api.get("/ai/usage-stats", { params: { period: period.value } });
    const d = data as UsageStatsResponse;
    stats.totalCalls = d?.totalCalls || 0;
    stats.totalTokens = d?.totalTokens || 0;
    stats.estimatedCost = d?.estimatedCost || 0;
    byService.value = d?.byService || [];
    trend.value = d?.trend || [];
    await nextTick();
    renderTrend();
  } catch {
    loadErr.value = true;
  } finally {
    statsLoading.value = false;
  }
}

function onFilterChange() {
  pagination.page = 1;
  fetchLogs();
}

async function fetchLogs() {
  loading.value = true;
  try {
    const params: Record<string, string | number> = { page: pagination.page, pageSize: pagination.pageSize };
    if (logFilter.service) params.service = logFilter.service;
    const { data } = await api.get("/ai/call-logs", { params });
    const d = data as CallLogsResponse;
    logs.value = d?.items || [];
    pagination.total = d?.total || 0;
  } catch {
    loadErr.value = true;
  } finally {
    loading.value = false;
  }
}

function renderTrend() {
  if (!trendChartRef.value || trend.value.length === 0) return;
  if (!trendChart) trendChart = echarts.init(trendChartRef.value);
  trendChart.setOption({
    tooltip: { trigger: "axis" },
    legend: { data: ["Token", "调用次数"], bottom: 0 },
    grid: { left: 55, right: 45, top: 10, bottom: 30 },
    xAxis: { type: "category", data: trend.value.map((t) => t.date), axisLabel: { fontSize: 10 } },
    yAxis: [
      { type: "value", name: "Token", axisLabel: { formatter: (v: number) => (v >= 1000 ? (v / 1000).toFixed(0) + "K" : v.toString()) } },
      { type: "value", name: "次" },
    ],
    series: [
      { name: "Token", type: "bar", data: trend.value.map((t) => t.totalTokens), itemStyle: { color: "#409eff" }, barMaxWidth: 30 },
      { name: "调用次数", type: "line", yAxisIndex: 1, data: trend.value.map((t) => t.count), itemStyle: { color: "#67c23a" }, smooth: true },
    ],
  }, true);
}

function exportCSV() {
  if (logs.value.length === 0) { ElMessage.warning("暂无数据可导出"); return; }
  const headers = ["记录ID", "用户", "类型", "模型", "输入Token", "输出Token", "缓存命中", "时间"];
  const rows = logs.value.map((r) => [
    r.id,
    r.userNickname || (r.userId === "system" ? "系统" : r.userId),
    analyzeTypeLabel(r.analyzeType),
    r.modelName || "",
    Number(r.tokenUsage?.promptTokens) || 0,
    Number(r.tokenUsage?.completionTokens) || 0,
    r.isCached ? "是" : "否",
    r.createdAt || "",
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ai-call-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  ElMessage.success("导出成功");
}
</script>

<style scoped>
.page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.stat-card { background: var(--color-bg-page); border-radius: 8px; padding: 16px; text-align: center; }
.stat-card .value { display: block; font-size: 24px; font-weight: 700; color: var(--color-text-title); }
.stat-card .label { display: block; font-size: 12px; color: var(--color-text-secondary); margin-top: 2px; }
.stat-card.info .value { color: var(--color-info); }
.id-cell { cursor: pointer; color: var(--el-color-primary); font-family: monospace; }
</style>
