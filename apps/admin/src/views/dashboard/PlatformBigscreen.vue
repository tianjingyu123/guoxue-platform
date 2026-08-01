<template>
  <div
    v-loading="loading"
    class="bigscreen platform"
  >
    <header class="bs-header">
      <div class="bs-title">
        国学传统文化综合平台 · 实时数据大屏
      </div>
      <div class="bs-time">
        {{ nowStr }}
      </div>
    </header>

    <el-result
      v-if="loadError"
      icon="error"
      title="数据加载失败"
      sub-title="无法获取大屏数据，请检查网络或稍后重试"
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

    <el-empty
      v-else-if="!hasData"
      description="暂无数据"
    />

    <div
      v-else
      class="bs-body"
    >
      <!-- 核心数字 -->
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">
            累计用户
          </div>
          <div class="stat-value blue">
            {{ fmt(data.totalUsers) }}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">
            今日新增
          </div>
          <div class="stat-value green">
            {{ fmt(data.todayNewUsers) }}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">
            当前在线
          </div>
          <div class="stat-value orange">
            {{ fmt(data.dailyActiveUsers) }}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">
            课程总数
          </div>
          <div class="stat-value cyan">
            {{ fmt(data.totalCourses) }}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">
            圈子总数
          </div>
          <div class="stat-value purple">
            {{ fmt(data.totalCircles) }}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">
            商品总数
          </div>
          <div class="stat-value blue">
            {{ fmt(data.totalProducts) }}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">
            古籍总数
          </div>
          <div class="stat-value green">
            {{ fmt(data.totalClassicBooks) }}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">
            文章总数
          </div>
          <div class="stat-value orange">
            {{ fmt(data.totalArticles) }}
          </div>
        </div>
        <div class="stat-card accent">
          <div class="stat-label">
            累计交易额
          </div>
          <div class="stat-value gold">
            ¥{{ (data.totalGmv || 0).toLocaleString() }}
          </div>
        </div>
      </div>

      <!-- 内容资产构成（填充下半屏·纯数字卡补 mini 图表·仅有数据时渲染） -->
      <div class="bs-chart-panel">
        <h3>📊 平台内容资产构成</h3>
        <div
          v-show="hasComposition"
          ref="compChartRef"
          class="comp-chart"
        />
        <el-empty
          v-if="!hasComposition && !loading"
          description="暂无内容资产数据"
          :image-size="60"
        />
      </div>
    </div>

    <footer class="bs-footer">
      <span>数据更新时间：{{ data.updatedAt ? new Date(data.updatedAt).toLocaleString('zh-CN') : '--' }}</span>
      <span class="watermark">{{ BRAND.name }} · 数据大屏 · {{ nowStr.slice(0, 10) }}</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useRoute } from "vue-router";
import { bigscreenApi } from "@/api";
import { BRAND } from "@/lib/brand";
import echarts from "@/utils/echarts";
import type { EChartsType } from "echarts/core";

const route = useRoute();
/** 平台综合大屏聚合数据（字段宽松 optional，仅声明模板实际访问字段） */
interface PlatformScreen {
  totalUsers?: number;
  todayNewUsers?: number;
  dailyActiveUsers?: number;
  totalCourses?: number;
  totalCircles?: number;
  totalProducts?: number;
  totalClassicBooks?: number;
  totalArticles?: number;
  totalGmv?: number;
  updatedAt?: string;
}
const data = ref<PlatformScreen>({});
const nowStr = ref(new Date().toLocaleString("zh-CN"));
const loading = ref(true);
const loadError = ref(false);
const hasData = computed(() => Object.keys(data.value || {}).length > 0);

let timer: ReturnType<typeof setInterval> | undefined = undefined;
let clockTimer: ReturnType<typeof setInterval> | undefined = undefined;

// 内容资产构成图（填充下半屏·仅有数据时渲染）
const compChartRef = ref<HTMLElement | null>(null);
let compChart: EChartsType | null = null;
const hasComposition = ref(false);

function fmt(v: unknown) {
  return v != null ? Number(v).toLocaleString() : "0";
}

function renderComposition() {
  const d = data.value;
  const items = [
    { name: "课程", value: Number(d.totalCourses || 0), color: "#36cfc9" },
    { name: "圈子", value: Number(d.totalCircles || 0), color: "#b37feb" },
    { name: "商品", value: Number(d.totalProducts || 0), color: "#4facfe" },
    { name: "古籍", value: Number(d.totalClassicBooks || 0), color: "#43e97b" },
    { name: "文章", value: Number(d.totalArticles || 0), color: "#fa8c16" },
  ];
  hasComposition.value = items.some((i) => i.value > 0);
  if (!hasComposition.value) {
    compChart?.dispose();
    compChart = null;
    return;
  }
  if (!compChartRef.value) return;
  if (!compChart) {
    compChart = echarts.init(compChartRef.value);
    window.addEventListener("resize", onResize);
  }
  compChart.setOption({
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { top: 20, right: 30, bottom: 30, left: 60 },
    xAxis: { type: "category", data: items.map((i) => i.name), axisLabel: { color: "#8892b0" }, axisLine: { lineStyle: { color: "rgba(255,255,255,.2)" } } },
    yAxis: { type: "value", axisLabel: { color: "#8892b0" }, splitLine: { lineStyle: { color: "rgba(255,255,255,.08)" } } },
    series: [{
      type: "bar", barMaxWidth: 64,
      data: items.map((i) => ({ value: i.value, itemStyle: { color: i.color, borderRadius: [6, 6, 0, 0] } })),
      label: { show: true, position: "top", color: "#e0e6ff", fontSize: 13 },
    }],
  }, true);
}

function onResize() {
  compChart?.resize();
}

// 首次加载/重试：展示 loading 与错误态
async function load() {
  loading.value = true;
  loadError.value = false;
  try {
    const token = (route.query.token as string) || undefined;
    const { data: d } = await bigscreenApi.platform(token);
    data.value = d || {};
    await nextTick();
    renderComposition();
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

// 定时静默刷新：失败时保留上一次数据，不打断展示
async function refresh() {
  try {
    const token = (route.query.token as string) || undefined;
    const { data: d } = await bigscreenApi.platform(token);
    data.value = d || {};
    loadError.value = false;
    await nextTick();
    renderComposition();
  } catch { /* 静默刷新失败：保留上一次数据 */ }
}

onMounted(() => {
  load();
  timer = setInterval(refresh, 30000);
  clockTimer = setInterval(() => {
    nowStr.value = new Date().toLocaleString("zh-CN");
  }, 1000);
});

onBeforeUnmount(() => {
  clearInterval(timer);
  clearInterval(clockTimer);
  window.removeEventListener("resize", onResize);
  compChart?.dispose();
  compChart = null;
});
</script>

<style scoped>
/* 整屏 flex 纵向铺满，body 自适应撑开，杜绝纯数字卡下方大片纯黑空白 */
.bigscreen { background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%); color: #e0e6ff; min-height: 100vh; font-family: 'Microsoft YaHei', sans-serif; display: flex; flex-direction: column; }
.bs-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 40px; border-bottom: 1px solid rgba(255,255,255,.1); }
.bs-title { font-size: 28px; letter-spacing: 4px; background: linear-gradient(90deg, #4facfe, #00f2fe); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.bs-time { font-size: 16px; color: #8892b0; }
.bs-body { padding: 30px 40px; flex: 1; display: flex; flex-direction: column; gap: 24px; }
.bs-chart-panel { flex: 1; min-height: 300px; background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 8px; padding: 20px 24px; }
.bs-chart-panel h3 { margin: 0 0 12px; font-size: 16px; color: #c8d2f0; font-weight: 500; }
.comp-chart { width: 100%; height: 100%; min-height: 260px; }

.stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.stat-card { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 8px; padding: 24px; text-align: center; transition: all .3s; }
.stat-card:hover { background: rgba(255,255,255,.08); transform: translateY(-2px); }
.stat-card.accent { grid-column: span 2; background: linear-gradient(135deg, rgba(255,193,7,.1), rgba(255,152,0,.1)); border-color: rgba(255,193,7,.3); }
.stat-label { font-size: 15px; color: #8892b0; margin-bottom: 10px; }
.stat-value { font-size: 36px; font-weight: 700; }
.stat-value.blue { color: #4facfe; }
.stat-value.green { color: #43e97b; }
.stat-value.orange { color: #fa8c16; }
.stat-value.cyan { color: #36cfc9; }
.stat-value.purple { color: #b37feb; }
.stat-value.gold { color: #ffc107; font-size: 42px; }

.bs-footer { display: flex; justify-content: space-between; padding: 12px 40px; font-size: 13px; color: #5a6380; border-top: 1px solid rgba(255,255,255,.06); }
.watermark { opacity: .3; }
</style>
