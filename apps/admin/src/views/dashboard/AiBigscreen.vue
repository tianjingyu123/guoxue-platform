<template>
  <div
    v-loading="loading"
    class="bigscreen ai"
    element-loading-background="rgba(17,11,26,0.6)"
  >
    <header class="bs-header">
      <div class="bs-title">
        AI 能力数据大屏
      </div>
      <div class="bs-time">
        {{ nowStr }}
      </div>
    </header>

    <el-result
      v-if="loadError"
      icon="error"
      title="数据加载失败"
      sub-title="无法获取数据，请检查网络或稍后重试"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="fetchData"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <div
      v-else
      class="bs-body">
      <!-- 核心指标 -->
      <div class="kpi-bar">
        <div class="kpi-item">
          <span class="kpi-label">累计调用</span><span class="kpi-value blue">{{ fmt(data.totalApiCalls) }}</span>
        </div>
        <div class="kpi-item">
          <span class="kpi-label">今日调用</span><span class="kpi-value green">{{ fmt(data.todayApiCalls) }}</span>
        </div>
        <div class="kpi-item">
          <span class="kpi-label">本月调用</span><span class="kpi-value orange">{{ fmt(data.monthApiCalls) }}</span>
        </div>
        <div class="kpi-item">
          <span class="kpi-label">智能体对话</span><span class="kpi-value cyan">{{ fmt(data.botConversations) }}</span>
        </div>
        <div class="kpi-item">
          <span class="kpi-label">知识库条目</span><span class="kpi-value purple">{{ fmt(data.knowledgeBaseSize) }}</span>
        </div>
      </div>

      <div class="bs-grid-2">
        <!-- 场景分布 -->
        <div class="bs-panel">
          <h3>🎯 场景调用分布</h3>
          <div
            v-if="data.sceneDistribution?.length"
            ref="sceneChartRef"
            style="height:300px"
          />
          <el-empty
            v-else
            description="暂无数据"
            :image-size="60"
          />
        </div>
        <!-- 模型分布 -->
        <div class="bs-panel">
          <h3>🤖 模型使用分布 (本月)</h3>
          <div
            v-if="data.modelDistribution?.length"
            ref="modelChartRef"
            style="height:300px"
          />
          <el-empty
            v-else
            description="暂无数据"
            :image-size="60"
          />
        </div>
      </div>
    </div>

    <footer class="bs-footer">
      <span>更新：{{ data.updatedAt ? new Date(data.updatedAt).toLocaleString('zh-CN') : '--' }}</span>
      <span class="watermark">热卜国学 · AI大屏 · {{ nowStr.slice(0, 10) }}</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useRoute } from "vue-router";
import { bigscreenApi } from "@/api";
import * as echarts from "echarts";

/** 场景调用分布项 */
interface SceneItem { scene?: string; count?: number }
/** 模型使用分布项 */
interface ModelItem { model?: string; count?: number }
/** AI 能力大屏数据（字段宽松 optional，依模板/脚本实际访问声明） */
interface AiCapabilityData {
  totalApiCalls?: number;
  todayApiCalls?: number;
  monthApiCalls?: number;
  botConversations?: number;
  knowledgeBaseSize?: number;
  sceneDistribution?: SceneItem[];
  modelDistribution?: ModelItem[];
  updatedAt?: string;
}

const route = useRoute();
const data = ref<AiCapabilityData>({});
const nowStr = ref(new Date().toLocaleString("zh-CN"));
const loading = ref(true);
const loadError = ref(false);

const sceneChartRef = ref<HTMLDivElement>();
const modelChartRef = ref<HTMLDivElement>();
let sceneChart: echarts.ECharts | null = null;
let modelChart: echarts.ECharts | null = null;
let timer: ReturnType<typeof setInterval> | undefined = undefined;
let clockTimer: ReturnType<typeof setInterval> | undefined = undefined;

function fmt(v: number | string | null | undefined) { return v != null ? Number(v).toLocaleString() : "0"; }

function renderCharts() {
  if (sceneChartRef.value) {
    if (!sceneChart) sceneChart = echarts.init(sceneChartRef.value);
    const sd: SceneItem[] = data.value.sceneDistribution || [];
    sceneChart.setOption({
      tooltip: { trigger: "axis" },
      grid: { left: 120, right: 30, top: 10, bottom: 20 },
      xAxis: { type: "value" },
      yAxis: { type: "category", data: sd.map((s) => s.scene).reverse(), axisLabel: { color: "#8892b0", fontSize: 11 } },
      series: [{ type: "bar", data: sd.map((s) => s.count).reverse(), itemStyle: { color: "#58a6ff", borderRadius: [0, 4, 4, 0] }, label: { show: true, position: "right", color: "#8892b0" } }],
    }, true);
  }

  if (modelChartRef.value) {
    if (!modelChart) modelChart = echarts.init(modelChartRef.value);
    const md: ModelItem[] = data.value.modelDistribution || [];
    modelChart.setOption({
      tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
      series: [{
        type: "pie",
        radius: ["50%", "78%"],
        center: ["50%", "55%"],
        itemStyle: { borderRadius: 4, borderColor: "transparent", borderWidth: 3 },
        label: { color: "#8892b0", fontSize: 12 },
        data: md.map((m) => ({ name: m.model, value: m.count })),
      }],
    }, true);
  }
}

async function fetchData() {
  try {
    const token = (route.query.token as string) || undefined;
    const { data: d } = await bigscreenApi.aiCapability(token);
    data.value = d || {};
    loadError.value = false;
    await nextTick();
    renderCharts();
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchData();
  timer = setInterval(fetchData, 30000);
  clockTimer = setInterval(() => { nowStr.value = new Date().toLocaleString("zh-CN"); }, 1000);
});

onBeforeUnmount(() => {
  clearInterval(timer);
  clearInterval(clockTimer);
  sceneChart?.dispose();
  modelChart?.dispose();
});
</script>

<style scoped>
.bigscreen { background: linear-gradient(135deg, #110b1a 0%, #1d1130 100%); color: #e0d6f0; min-height: 100vh; }
.bs-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 40px; border-bottom: 1px solid rgba(160,120,255,.1); }
.bs-title { font-size: 28px; letter-spacing: 4px; color: #b39cf0; }
.bs-time { font-size: 16px; color: #7c6b94; }
.bs-body { padding: 24px 40px; }

.kpi-bar { display: flex; gap: 20px; margin-bottom: 24px; }
.kpi-item { flex: 1; background: rgba(160,120,255,.05); border: 1px solid rgba(160,120,255,.1); border-radius: 8px; padding: 20px; text-align: center; }
.kpi-label { display: block; font-size: 13px; color: #7c6b94; margin-bottom: 8px; }
.kpi-value { font-size: 30px; font-weight: 700; }
.kpi-value.blue { color: #b39cf0; }
.kpi-value.green { color: #5cdb8a; }
.kpi-value.orange { color: #f0a050; }
.kpi-value.cyan { color: #4dd9c8; }
.kpi-value.purple { color: #e890e8; }

.bs-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.bs-panel { background: rgba(160,120,255,.03); border: 1px solid rgba(160,120,255,.08); border-radius: 8px; padding: 20px; }
.bs-panel h3 { margin: 0 0 16px; font-size: 16px; color: #cfc0f0; }

.bs-footer { display: flex; justify-content: space-between; padding: 12px 40px; font-size: 13px; color: #584878; border-top: 1px solid rgba(160,120,255,.06); }
.watermark { opacity: .25; }
</style>
