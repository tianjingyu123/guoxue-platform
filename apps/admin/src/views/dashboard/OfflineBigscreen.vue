<template>
  <div
    v-loading="loading"
    class="bigscreen offline"
    element-loading-background="rgba(13,26,18,0.6)"
  >
    <header class="bs-header">
      <div class="bs-title">
        线下驿站分布数据大屏
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
          <span class="kpi-label">全国驿站</span><span class="kpi-value blue">{{ data.totalStations || 0 }}</span>
        </div>
        <div class="kpi-item">
          <span class="kpi-label">线下课程</span><span class="kpi-value green">{{ data.totalCourses || 0 }}</span>
        </div>
        <div class="kpi-item">
          <span class="kpi-label">学员总数</span><span class="kpi-value orange">{{ fmt(data.totalStudents) }}</span>
        </div>
        <div class="kpi-item">
          <span class="kpi-label">营收总额</span><span class="kpi-value cyan">¥{{ fmt(data.totalRevenue) }}</span>
        </div>
        <div class="kpi-item">
          <span class="kpi-label">订单总数</span><span class="kpi-value purple">{{ data.totalOrders || 0 }}</span>
        </div>
      </div>

      <div class="bs-grid-2">
        <!-- 城市分布 -->
        <div class="bs-panel">
          <h3>🏙️ 城市驿站分布</h3>
          <div
            v-if="data.cityDistribution?.length"
            ref="cityChartRef"
            style="height:320px"
          />
          <el-empty
            v-else
            description="暂无数据"
            :image-size="60"
          />
        </div>
        <!-- 驿站列表 -->
        <div class="bs-panel">
          <h3>📍 驿站列表</h3>
          <div class="station-scroll">
            <div
              v-for="s in (data.stations || [])"
              :key="s.id"
              class="station-row"
            >
              <span class="s-name">{{ s.name }}</span>
              <el-tag
                size="small"
                effect="dark"
              >
                {{ s.city }}
              </el-tag>
              <span class="s-addr">{{ s.address }}</span>
            </div>
            <el-empty
              v-if="!(data.stations?.length)"
              description="暂无驿站"
              :image-size="60"
            />
          </div>
        </div>
      </div>
    </div>

    <footer class="bs-footer">
      <span>更新：{{ data.updatedAt ? new Date(data.updatedAt).toLocaleString('zh-CN') : '--' }}</span>
      <span class="watermark">{{ BRAND.name }} · 驿站大屏 · {{ nowStr.slice(0, 10) }}</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useRoute } from "vue-router";
import { bigscreenApi } from "@/api";
import echarts from "@/utils/echarts";
import type { EChartsType } from "echarts/core";
import { BRAND } from "@/lib/brand";

const route = useRoute();
/** 线下驿站大屏聚合数据（字段宽松 optional，仅声明模板/脚本实际访问字段） */
interface OfflineScreen {
  totalStations?: number;
  totalCourses?: number;
  totalStudents?: number;
  totalRevenue?: number;
  totalOrders?: number;
  cityDistribution?: { city?: string; count?: number }[];
  stations?: { id?: string; name?: string; city?: string; address?: string }[];
  updatedAt?: string;
}
const data = ref<OfflineScreen>({});
const nowStr = ref(new Date().toLocaleString("zh-CN"));
const loading = ref(true);
const loadError = ref(false);

const cityChartRef = ref<HTMLDivElement>();
let cityChart: EChartsType | null = null;
let timer: ReturnType<typeof setInterval> | undefined = undefined;
let clockTimer: ReturnType<typeof setInterval> | undefined = undefined;

function fmt(v: unknown) { return v != null ? Number(v).toLocaleString() : "0"; }

function renderCityChart() {
  if (!cityChartRef.value) return;
  if (!cityChart) cityChart = echarts.init(cityChartRef.value);
  const cd = data.value.cityDistribution || [];
  cityChart.setOption({
    tooltip: { trigger: "axis" },
    grid: { left: 100, right: 40, top: 10, bottom: 20 },
    xAxis: { type: "value", axisLabel: { color: "#8892b0" } },
    yAxis: { type: "category", data: cd.map((c) => c.city).reverse(), axisLabel: { color: "#8892b0", fontSize: 12 } },
    series: [{
      type: "bar",
      data: cd.map((c) => c.count).reverse(),
      itemStyle: { color: "#3fb950", borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: "right", color: "#8892b0" },
    }],
  }, true);
}

async function fetchData() {
  try {
    const token = (route.query.token as string) || undefined;
    const { data: d } = await bigscreenApi.offlineMap(token);
    data.value = d || {};
    loadError.value = false;
    await nextTick();
    renderCityChart();
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
  cityChart?.dispose();
});
</script>

<style scoped>
.bigscreen { background: linear-gradient(135deg, #0d1a12 0%, #14281c 100%); color: #c8e8d0; min-height: 100vh; }
.bs-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 40px; border-bottom: 1px solid rgba(80,180,100,.1); }
.bs-title { font-size: 28px; letter-spacing: 4px; color: #5cdb8a; }
.bs-time { font-size: 16px; color: #5a7864; }
.bs-body { padding: 24px 40px; }

.kpi-bar { display: flex; gap: 20px; margin-bottom: 24px; }
.kpi-item { flex: 1; background: rgba(80,180,100,.05); border: 1px solid rgba(80,180,100,.1); border-radius: 8px; padding: 20px; text-align: center; }
.kpi-label { display: block; font-size: 13px; color: #5a7864; margin-bottom: 8px; }
.kpi-value { font-size: 30px; font-weight: 700; }
.kpi-value.blue { color: #7cb7ff; }
.kpi-value.green { color: #5cdb8a; }
.kpi-value.orange { color: #f0a050; }
.kpi-value.cyan { color: #4dd9c8; }
.kpi-value.purple { color: #e890e8; }

.bs-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.bs-panel { background: rgba(80,180,100,.03); border: 1px solid rgba(80,180,100,.08); border-radius: 8px; padding: 20px; }
.bs-panel h3 { margin: 0 0 16px; font-size: 16px; color: #b8dcc0; }

.station-scroll { max-height: 320px; overflow-y: auto; }
.station-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid rgba(80,180,100,.06); }
.s-name { font-weight: 600; font-size: 14px; }
.s-addr { color: #5a7864; font-size: 12px; margin-left: auto; }

.bs-footer { display: flex; justify-content: space-between; padding: 12px 40px; font-size: 13px; color: #3d5848; border-top: 1px solid rgba(80,180,100,.06); }
.watermark { opacity: .25; }
</style>
