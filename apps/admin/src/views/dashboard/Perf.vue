<template>
  <div class="page">
    <PageHeader title="性能观测" />

    <div class="filter-row">
      <el-select
        v-model="minutes"
        style="width:130px"
        @change="fetchApiPerf"
      >
        <el-option
          :value="15"
          label="API 近 15 分钟"
        />
        <el-option
          :value="60"
          label="API 近 1 小时"
        />
        <el-option
          :value="120"
          label="API 近 2 小时"
        />
      </el-select>
      <el-select
        v-model="vitalsDays"
        style="width:120px"
        @change="fetchVitals"
      >
        <el-option
          :value="7"
          label="RUM 近 7 天"
        />
        <el-option
          :value="14"
          label="RUM 近 14 天"
        />
        <el-option
          :value="30"
          label="RUM 近 30 天"
        />
      </el-select>
      <el-button @click="fetchAll">
        刷新
      </el-button>
    </div>

    <el-result
      v-if="error && !loading"
      icon="error"
      title="加载失败"
      sub-title="性能数据加载出错，请重试"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="fetchAll"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <div
      v-else
      v-loading="loading"
    >
      <!-- RUM 真实用户性能 -->
      <el-card
        shadow="never"
        class="block"
      >
        <template #header>
          RUM 真实用户性能（H5·p75）
          <el-tooltip content="LCP 最大内容绘制（良好<2500ms）· INP 交互延迟（良好<200ms）· CLS 布局偏移（良好<0.1）· TTFB 首字节（良好<800ms）">
            <el-icon class="hint-icon">
              <QuestionFilled />
            </el-icon>
          </el-tooltip>
        </template>
        <el-empty
          v-if="vitalsSeries.length === 0"
          description="暂无 RUM 数据。H5 端已接 web-vitals 埋点，有真实用户访问后自动积累。"
          :image-size="80"
        />
        <template v-else>
          <el-row
            :gutter="12"
            class="stat-row"
          >
            <el-col
              v-for="m in RUM_METRICS"
              :key="m.key"
              :span="6"
            >
              <div class="stat-card">
                <div class="stat-label">
                  {{ m.key }} <span class="stat-sub">{{ m.label }}</span>
                </div>
                <div
                  class="stat-value"
                  :class="rumGradeClass(m.key, latestVital(m.key)?.p75)"
                >
                  {{ fmtVital(m.key, latestVital(m.key)?.p75) }}
                </div>
                <div class="stat-sub">
                  样本 {{ latestVital(m.key)?.samples ?? 0 }}（最近日）
                </div>
              </div>
            </el-col>
          </el-row>
          <div
            ref="vitalsChartRef"
            class="chart"
          />
        </template>
      </el-card>

      <!-- 服务端 API 性能 -->
      <el-card
        shadow="never"
        class="block"
      >
        <template #header>
          服务端 API 性能（近 {{ apiPerf.windowMinutes }} 分钟·cluster 全实例聚合）
          <span class="header-stat">
            总请求 {{ apiPerf.totalCount }} · 5xx {{ apiPerf.totalErrCount }}
            （{{ apiPerf.totalCount ? ((apiPerf.totalErrCount / apiPerf.totalCount) * 100).toFixed(2) : 0 }}%）
          </span>
        </template>
        <el-empty
          v-if="apiPerf.routes.length === 0"
          description="窗口内暂无请求数据（每分钟落一次 Redis，稍等或换更长窗口）"
          :image-size="80"
        />
        <template v-else>
          <div
            ref="qpsChartRef"
            class="chart chart-qps"
          />
          <el-table
            :data="apiPerf.routes.slice(0, 30)"
            border
            stripe
            size="small"
            :default-sort="{ prop: 'count', order: 'descending' }"
          >
            <el-table-column
              prop="route"
              label="路由"
              min-width="280"
              show-overflow-tooltip
            />
            <el-table-column
              prop="count"
              label="请求数"
              width="90"
              sortable
              align="right"
            />
            <el-table-column
              prop="avgMs"
              label="平均(ms)"
              width="100"
              sortable
              align="right"
            />
            <el-table-column
              prop="p95Ms"
              label="p95(ms)"
              width="100"
              sortable
              align="right"
            >
              <template #default="{ row }">
                <span :class="{ 'rate-bad': row.p95Ms > 1000 }">{{ row.p95Ms }}</span>
              </template>
            </el-table-column>
            <el-table-column
              prop="p99Ms"
              label="p99(ms)"
              width="100"
              sortable
              align="right"
            />
            <el-table-column
              label="5xx率"
              width="90"
              align="right"
            >
              <template #default="{ row }">
                <span :class="{ 'rate-bad': row.errRate > 0.01 }">{{ (row.errRate * 100).toFixed(2) }}%</span>
              </template>
            </el-table-column>
          </el-table>
        </template>
      </el-card>

      <!-- nginx 接入层 -->
      <el-card
        shadow="never"
        class="block"
      >
        <template #header>
          nginx 接入层（5 分钟窗口·含静态资源）
        </template>
        <el-empty
          v-if="!nginxLatest"
          description="暂无接入层数据（分析器每 5 分钟解析一次 access.log 增量）"
          :image-size="80"
        />
        <template v-else>
          <el-row
            :gutter="12"
            class="stat-row"
          >
            <el-col :span="6">
              <div class="stat-card">
                <div class="stat-label">
                  窗口请求数
                </div>
                <div class="stat-value">
                  {{ nginxLatest.total }}
                </div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-card">
                <div class="stat-label">
                  5xx 率
                </div>
                <div
                  class="stat-value"
                  :class="{ 'rate-bad': nginxLatest.rate5xx > 0.05 }"
                >
                  {{ (nginxLatest.rate5xx * 100).toFixed(2) }}%
                </div>
                <div class="stat-sub">
                  5xx {{ nginxLatest.s5xx }} · 4xx {{ nginxLatest.s4xx }}
                </div>
              </div>
            </el-col>
            <el-col :span="12">
              <div
                ref="nginxChartRef"
                class="chart chart-nginx"
              />
            </el-col>
          </el-row>
          <el-row :gutter="12">
            <el-col :span="12">
              <div class="sub-title">
                Top 路由（按请求量）
              </div>
              <el-table
                :data="nginxLatest.topPaths"
                size="small"
                border
              >
                <el-table-column
                  prop="path"
                  label="路径"
                  min-width="220"
                  show-overflow-tooltip
                />
                <el-table-column
                  prop="count"
                  label="次数"
                  width="80"
                  align="right"
                />
              </el-table>
            </el-col>
            <el-col :span="12">
              <div class="sub-title">
                Top 5xx 路由
              </div>
              <el-empty
                v-if="nginxLatest.top5xxPaths.length === 0"
                description="窗口内无 5xx"
                :image-size="60"
              />
              <el-table
                v-else
                :data="nginxLatest.top5xxPaths"
                size="small"
                border
              >
                <el-table-column
                  prop="path"
                  label="路径"
                  min-width="220"
                  show-overflow-tooltip
                />
                <el-table-column
                  prop="count"
                  label="5xx次数"
                  width="90"
                  align="right"
                />
              </el-table>
            </el-col>
          </el-row>
        </template>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from "vue";
import { ElMessage } from "element-plus";
import { QuestionFilled } from "@element-plus/icons-vue";
import PageHeader from "@/components/PageHeader.vue";
import { observabilityApi } from "@/api";
import echarts from "@/utils/echarts";

interface RouteRow { route: string; count: number; errCount: number; errRate: number; avgMs: number; p95Ms: number; p99Ms: number }
interface ApiPerf { windowMinutes: number; totalCount: number; totalErrCount: number; routes: RouteRow[]; series: Array<{ minute: string; count: number; errCount: number }> }
interface VitalDay { date: string; [metric: string]: unknown }
interface NginxStat { at: string; total: number; s4xx: number; s5xx: number; rate5xx: number; topPaths: Array<{ path: string; count: number }>; top5xxPaths: Array<{ path: string; count: number }> }

const RUM_METRICS = [
  { key: "LCP", label: "最大内容绘制", good: 2500, poor: 4000 },
  { key: "INP", label: "交互延迟", good: 200, poor: 500 },
  { key: "CLS", label: "布局偏移", good: 0.1, poor: 0.25 },
  { key: "TTFB", label: "首字节", good: 800, poor: 1800 },
];

const loading = ref(false);
const error = ref(false);
const minutes = ref(60);
const vitalsDays = ref(7);
const apiPerf = ref<ApiPerf>({ windowMinutes: 60, totalCount: 0, totalErrCount: 0, routes: [], series: [] });
const vitalsSeries = ref<VitalDay[]>([]);
const nginxLatest = ref<NginxStat | null>(null);
const nginxRecent = ref<NginxStat[]>([]);

const vitalsChartRef = ref<HTMLDivElement>();
const qpsChartRef = ref<HTMLDivElement>();
const nginxChartRef = ref<HTMLDivElement>();
let vitalsChart: echarts.ECharts | null = null;
let qpsChart: echarts.ECharts | null = null;
let nginxChart: echarts.ECharts | null = null;

onMounted(fetchAll);
onBeforeUnmount(() => {
  vitalsChart?.dispose();
  qpsChart?.dispose();
  nginxChart?.dispose();
});

async function fetchAll() {
  loading.value = true;
  error.value = false;
  try {
    await Promise.all([fetchApiPerf(), fetchVitals(), fetchNginx()]);
  } catch {
    error.value = true;
    ElMessage.error("加载性能数据失败");
  } finally {
    loading.value = false;
  }
}

async function fetchApiPerf() {
  const { data } = await observabilityApi.apiPerf(minutes.value);
  apiPerf.value = data;
  await nextTick();
  renderQps();
}

async function fetchVitals() {
  const { data } = await observabilityApi.webVitals(vitalsDays.value);
  vitalsSeries.value = data.series || [];
  await nextTick();
  renderVitals();
}

async function fetchNginx() {
  const { data } = await observabilityApi.nginx();
  nginxLatest.value = data.latest;
  nginxRecent.value = data.recent || [];
  await nextTick();
  renderNginx();
}

function latestVital(metric: string): { p75: number; samples: number } | undefined {
  for (let i = vitalsSeries.value.length - 1; i >= 0; i--) {
    const v = vitalsSeries.value[i][metric] as { p75: number; samples: number } | undefined;
    if (v) return v;
  }
  return undefined;
}

function fmtVital(metric: string, v?: number): string {
  if (v === undefined || v === null) return "—";
  return metric === "CLS" ? v.toFixed(3) : `${Math.round(v)}ms`;
}

function rumGradeClass(metric: string, v?: number): string {
  if (v === undefined || v === null) return "";
  const def = RUM_METRICS.find((m) => m.key === metric);
  if (!def) return "";
  if (v <= def.good) return "rate-good";
  if (v <= def.poor) return "rate-warn";
  return "rate-bad";
}

function renderVitals() {
  if (!vitalsChartRef.value || vitalsSeries.value.length === 0) return;
  if (!vitalsChart) vitalsChart = echarts.init(vitalsChartRef.value, "guoxue");
  const dates = vitalsSeries.value.map((d) => d.date.slice(5));
  const pick = (metric: string) =>
    vitalsSeries.value.map((d) => (d[metric] as { p75: number } | undefined)?.p75 ?? null);
  vitalsChart.setOption({
    tooltip: { trigger: "axis" },
    legend: { top: 0 },
    grid: { left: 50, right: 50, top: 32, bottom: 24 },
    xAxis: { type: "category", data: dates },
    yAxis: [
      { type: "value", name: "ms" },
      { type: "value", name: "CLS", max: 0.5 },
    ],
    series: [
      { name: "LCP p75", type: "line", smooth: true, data: pick("LCP") },
      { name: "INP p75", type: "line", smooth: true, data: pick("INP") },
      { name: "TTFB p75", type: "line", smooth: true, data: pick("TTFB") },
      { name: "CLS p75", type: "line", smooth: true, yAxisIndex: 1, data: pick("CLS") },
    ],
  }, true);
}

function renderQps() {
  if (!qpsChartRef.value || apiPerf.value.series.length === 0) return;
  if (!qpsChart) qpsChart = echarts.init(qpsChartRef.value, "guoxue");
  qpsChart.setOption({
    tooltip: { trigger: "axis" },
    legend: { top: 0 },
    grid: { left: 50, right: 20, top: 32, bottom: 24 },
    xAxis: { type: "category", data: apiPerf.value.series.map((s) => s.minute.slice(11)) },
    yAxis: { type: "value", minInterval: 1 },
    series: [
      { name: "每分钟请求", type: "line", areaStyle: { opacity: 0.15 }, smooth: true, data: apiPerf.value.series.map((s) => s.count) },
      { name: "每分钟 5xx", type: "line", smooth: true, data: apiPerf.value.series.map((s) => s.errCount) },
    ],
  }, true);
}

function renderNginx() {
  if (!nginxChartRef.value || nginxRecent.value.length === 0) return;
  if (!nginxChart) nginxChart = echarts.init(nginxChartRef.value, "guoxue");
  nginxChart.setOption({
    tooltip: { trigger: "axis" },
    legend: { top: 0 },
    grid: { left: 45, right: 20, top: 28, bottom: 24 },
    xAxis: { type: "category", data: nginxRecent.value.map((w) => w.at.slice(11, 16)) },
    yAxis: { type: "value", minInterval: 1 },
    series: [
      { name: "窗口请求数", type: "bar", data: nginxRecent.value.map((w) => w.total) },
      { name: "5xx", type: "line", data: nginxRecent.value.map((w) => w.s5xx) },
    ],
  }, true);
}
</script>

<style scoped>
.page { padding: 0; }
.filter-row { display: flex; gap: var(--spacing-sm); align-items: center; margin-bottom: var(--spacing-lg); flex-wrap: wrap; }
.block { margin-bottom: var(--spacing-lg); }
.hint-icon { margin-left: 6px; color: var(--el-text-color-secondary); vertical-align: middle; cursor: help; }
.header-stat { margin-left: 12px; font-size: 12px; color: var(--el-text-color-secondary); }
.stat-row { margin-bottom: var(--spacing-sm); }
.stat-card { padding: 12px; border: 1px solid var(--el-border-color-lighter); border-radius: 6px; }
.stat-label { font-size: 13px; color: var(--el-text-color-secondary); }
.stat-value { font-size: 24px; font-weight: 600; margin: 4px 0; }
.stat-sub { font-size: 12px; color: var(--el-text-color-secondary); }
.sub-title { font-size: 13px; font-weight: 600; margin: 8px 0; }
.chart { width: 100%; height: 280px; }
.chart-qps { height: 220px; margin-bottom: var(--spacing-sm); }
.chart-nginx { height: 140px; }
.rate-good { color: var(--el-color-success); }
.rate-warn { color: var(--el-color-warning); }
.rate-bad { color: var(--el-color-danger); }
</style>
