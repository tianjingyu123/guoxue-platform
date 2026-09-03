<template>
  <div
    v-loading="loading"
    class="bigscreen tech-screen transaction"
  >
    <header class="bs-header">
      <div class="bs-title">
        实时交易数据大屏
      </div>
      <div class="bs-header-tools">
        <div class="bs-time">
          {{ nowStr }}
        </div>
        <BigscreenActions @resize="resizeCharts" />
      </div>
    </header>

    <el-result
      v-if="loadError"
      icon="error"
      title="数据加载失败"
      sub-title="无法获取交易数据，请检查网络或稍后重试"
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

    <div
      v-else
      class="bs-body"
    >
      <!-- 指标栏 -->
      <div class="kpi-bar">
        <div class="kpi-item">
          <span class="kpi-label">今日订单</span><span class="kpi-value blue">{{ data.todayOrders || 0 }}</span>
        </div>
        <div class="kpi-item">
          <span class="kpi-label">今日营收</span><span class="kpi-value green">¥{{ fmt(data.todayRevenue) }}</span>
        </div>
        <div class="kpi-item">
          <span class="kpi-label">近1小时</span><span class="kpi-value orange">{{ data.hourOrders || 0 }}单</span>
        </div>
      </div>

      <div class="bs-grid-2">
        <!-- 品类占比 -->
        <div class="bs-panel">
          <h3>今日品类交易占比</h3>
          <div
            v-show="data.typeBreakdown?.length"
            ref="pieChartRef"
            style="height:300px"
          />
          <el-empty
            v-if="!(data.typeBreakdown?.length)"
            description="暂无品类数据"
            :image-size="60"
          />
        </div>
        <!-- 最近订单滚动 -->
        <div class="bs-panel">
          <h3>最近成交订单</h3>
          <div class="order-scroll">
            <div
              v-for="o in data.recentOrders || []"
              :key="o.id"
              class="order-row"
            >
              <span class="order-id">#{{ o.id?.slice(-8) }}</span>
              <el-tag
                size="small"
                effect="dark"
              >
                {{ typeLabel(o.type) }}
              </el-tag>
              <span class="order-amount">¥{{ Number(o.amount).toFixed(2) }}</span>
              <span class="order-time">{{ fmtTime(o.at) }}</span>
            </div>
            <el-empty
              v-if="!(data.recentOrders?.length)"
              description="暂无订单"
              :image-size="60"
            />
          </div>
        </div>
      </div>
    </div>

    <footer class="bs-footer">
      <span>更新：{{ data.updatedAt ? new Date(data.updatedAt).toLocaleString('zh-CN') : '--' }}</span>
      <span class="watermark">{{ BRAND.name }} · 交易大屏 · {{ nowStr.slice(0, 10) }}</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import BigscreenActions from "@/components/BigscreenActions.vue";
import { ref, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useRoute } from "vue-router";
import { bigscreenApi } from "@/api";
import echarts from "@/utils/echarts";
import type { EChartsType } from "echarts/core";
import { BRAND } from "@/lib/brand";

const route = useRoute();
/** 交易大屏聚合数据（字段宽松 optional，仅声明模板/脚本实际访问字段） */
interface TxnScreen {
  todayOrders?: number;
  todayRevenue?: number;
  hourOrders?: number;
  typeBreakdown?: { type: string; amount?: number }[];
  recentOrders?: { id?: string; type: string; amount?: number; at: string }[];
  updatedAt?: string;
}
const data = ref<TxnScreen>({});
const nowStr = ref(new Date().toLocaleString("zh-CN"));
const loading = ref(true);
const loadError = ref(false);

const pieChartRef = ref<HTMLDivElement>();
let pieChart: EChartsType | null = null;
let timer: ReturnType<typeof setInterval> | undefined = undefined;
let clockTimer: ReturnType<typeof setInterval> | undefined = undefined;

const TYPE_LABELS: Record<string, string> = {
  COURSE: "课程", PRODUCT: "商品", MEMBER: "会员", CIRCLE_JOIN: "入圈",
  BOT_SERVICE: "智能体", PAIPAN: "排盘", LIVESTREAM: "直播",
};

function typeLabel(t: string) { return TYPE_LABELS[t] || t; }
function fmt(v: unknown) { return v != null ? Number(v).toLocaleString() : "0"; }
function fmtTime(t: string) { return t ? new Date(t).toLocaleTimeString("zh-CN") : "--"; }

function renderPie() {
  if (!pieChartRef.value) return;
  if (!pieChart) pieChart = echarts.init(pieChartRef.value, "tech-screen");
  const bd = data.value.typeBreakdown || [];
  pieChart.setOption({
    tooltip: { trigger: "item", formatter: "{b}: ¥{c} ({d}%)" },
    series: [{
      type: "pie",
      radius: ["55%", "80%"],
      center: ["50%", "55%"],
      itemStyle: { borderRadius: 4, borderColor: "transparent", borderWidth: 3 },
      label: { color: "#8892b0", fontSize: 12 },
      data: bd.map((t) => ({ name: typeLabel(t.type), value: t.amount })),
    }],
  }, true);
}

// 首次加载/重试：展示 loading 与错误态
async function load() {
  loading.value = true;
  loadError.value = false;
  try {
    const token = (route.query.token as string) || undefined;
    const { data: d } = await bigscreenApi.transactions(token);
    data.value = d || {};
    await nextTick();
    renderPie();
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
    const { data: d } = await bigscreenApi.transactions(token);
    data.value = d || {};
    loadError.value = false;
    await nextTick();
    renderPie();
  } catch { /* 静默刷新失败：保留上一次数据 */ }
}

function resizeCharts() {
  pieChart?.resize();
}

onMounted(() => {
  load();
  timer = setInterval(refresh, 15000);
  clockTimer = setInterval(() => { nowStr.value = new Date().toLocaleString("zh-CN"); }, 1000);
});

onBeforeUnmount(() => {
  clearInterval(timer);
  clearInterval(clockTimer);
  pieChart?.dispose();
});
</script>

<style scoped>
.bigscreen { background: linear-gradient(135deg, #0d1117 0%, #161b22 100%); color: #c9d1d9; min-height: 100vh; }
.bs-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 40px; border-bottom: 1px solid #21262d; }
.bs-title { font-size: 28px; letter-spacing: 4px; color: #58a6ff; }
.bs-time { font-size: 16px; color: #8b949e; }
.bs-body { padding: 24px 40px; }

.kpi-bar { display: flex; gap: 24px; margin-bottom: 24px; }
.kpi-item { flex: 1; background: rgba(255,255,255,.03); border: 1px solid #21262d; border-radius: 8px; padding: 20px; text-align: center; }
.kpi-label { display: block; font-size: 13px; color: #8b949e; margin-bottom: 8px; }
.kpi-value { font-size: 28px; font-weight: 700; }
.kpi-value.blue { color: #58a6ff; }
.kpi-value.green { color: #3fb950; }
.kpi-value.orange { color: #d2991d; }

.bs-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.bs-panel { background: rgba(255,255,255,.02); border: 1px solid #21262d; border-radius: 8px; padding: 20px; }
.bs-panel h3 { margin: 0 0 16px; font-size: 16px; color: #c9d1d9; }

.order-scroll { max-height: 300px; overflow-y: auto; }
.order-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid #21262d; font-size: 14px; }
.order-id { color: #58a6ff; font-family: monospace; width: 80px; }
.order-amount { color: #3fb950; font-weight: 600; margin-left: auto; }
.order-time { color: #8b949e; font-size: 12px; }

.bs-footer { display: flex; justify-content: space-between; padding: 12px 40px; font-size: 13px; color: #484f58; border-top: 1px solid #21262d; }
.watermark { opacity: .25; }
</style>
