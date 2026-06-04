<template>
  <div
    v-loading="loading"
    class="live-dashboard"
  >
    <div class="page-header">
      <div>
        <el-button
          text
          @click="$router.back()"
        >
          ← 返回
        </el-button>
        <h2 style="display:inline-block;margin:0 0 0 8px;vertical-align:middle">
          📡 直播间数据大屏
        </h2>
        <el-tag
          v-if="overview.liveStatus"
          :type="overview.liveStatus === 'LIVING' ? 'danger' : 'info'"
          size="small"
          style="margin-left:12px"
        >
          {{ overview.liveStatus === 'LIVING' ? '直播中' : '已结束' }}
        </el-tag>
      </div>
      <div>
        <el-button
          :loading="loading"
          @click="refreshAll"
        >
          刷新
        </el-button>
        <el-button
          type="primary"
          @click="openReport"
        >
          复盘报告
        </el-button>
      </div>
    </div>

    <!-- 核心指标卡片 -->
    <el-row
      :gutter="12"
      class="kpi-row"
    >
      <el-col
        v-for="card in kpiCards"
        :key="card.label"
        :span="4"
      >
        <el-card
          class="kpi-card"
          shadow="hover"
        >
          <div class="kpi-label">
            {{ card.label }}
          </div>
          <div
            class="kpi-value"
            :style="{ color: card.color }"
          >
            {{ card.value }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Tab 面板 -->
    <el-tabs
      v-model="activeTab"
      type="border-card"
    >
      <el-tab-pane
        label="实时趋势"
        name="trends"
      >
        <div
          ref="trendsChartRef"
          class="tab-chart"
          style="height:360px"
        />
      </el-tab-pane>
      <el-tab-pane
        label="商品转化"
        name="products"
      >
        <el-table
          :data="productData"
          stripe
          size="small"
        >
          <el-table-column
            prop="name"
            label="商品名称"
            min-width="160"
          />
          <el-table-column
            prop="price"
            label="价格"
            width="100"
          >
            <template #default="{ row }">
              ¥{{ row.price }}
            </template>
          </el-table-column>
          <el-table-column
            prop="clicks"
            label="点击次数"
            width="100"
          />
          <el-table-column
            prop="orders"
            label="成交订单"
            width="100"
          />
          <el-table-column
            label="转化率"
            width="100"
          >
            <template #default="{ row }">
              {{ row.clicks > 0 ? (row.orders / row.clicks * 100).toFixed(1) + '%' : '0%' }}
            </template>
          </el-table-column>
          <el-table-column
            prop="revenue"
            label="成交额"
            width="120"
          >
            <template #default="{ row }">
              ¥{{ row.revenue || 0 }}
            </template>
          </el-table-column>
        </el-table>
        <el-empty
          v-if="!productData.length"
          description="暂无商品数据"
        />
      </el-tab-pane>
      <el-tab-pane
        label="观众画像"
        name="audience"
      >
        <el-descriptions
          v-if="audienceData"
          :column="3"
          border
        >
          <el-descriptions-item label="性别分布">
            {{ audienceData.gender || '--' }}
          </el-descriptions-item>
          <el-descriptions-item label="年龄分布">
            {{ audienceData.age || '--' }}
          </el-descriptions-item>
          <el-descriptions-item label="地域分布">
            {{ audienceData.region || '--' }}
          </el-descriptions-item>
          <el-descriptions-item label="兴趣标签">
            {{ audienceData.interests || '--' }}
          </el-descriptions-item>
        </el-descriptions>
        <el-empty
          v-else
          description="暂无观众画像"
        />
      </el-tab-pane>
      <el-tab-pane
        label="互动打赏"
        name="interactions"
      >
        <div
          ref="interChartRef"
          class="tab-chart"
          style="height:280px"
        />
        <el-divider />
        <h4>打赏排行</h4>
        <div
          v-for="(g, i) in (giftRanking || [])"
          :key="i"
          class="gift-row"
        >
          <span class="g-rank">{{ i + 1 }}</span>
          <span class="g-user">{{ g.userName || g.userId }}</span>
          <span class="g-amount">{{ g.totalCoin || 0 }} 币</span>
        </div>
        <el-empty
          v-if="!(giftRanking?.length)"
          description="暂无打赏"
          :image-size="60"
        />
      </el-tab-pane>
      <el-tab-pane
        label="主播表现"
        name="host"
      >
        <el-descriptions
          v-if="hostData"
          :column="2"
          border
        >
          <el-descriptions-item label="累计讲解时长">
            {{ hostData.totalDuration || '--' }}
          </el-descriptions-item>
          <el-descriptions-item label="讲解商品数">
            {{ hostData.productCount || 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="商品讲解覆盖率">
            {{ hostData.coverage || '0%' }}
          </el-descriptions-item>
          <el-descriptions-item label="平均停留时长">
            {{ hostData.avgStayDuration || '--' }}
          </el-descriptions-item>
        </el-descriptions>
        <el-empty
          v-else
          description="暂无主播数据"
        />
      </el-tab-pane>
    </el-tabs>

    <!-- 复盘报告对话框 -->
    <el-dialog
      v-model="showReport"
      title="📋 直播复盘报告"
      width="720px"
    >
      <div v-if="reportData">
        <el-descriptions
          :column="2"
          border
          size="small"
        >
          <el-descriptions-item
            v-for="item in reportItems"
            :key="item.label"
            :label="item.label"
          >
            {{ item.value }}
          </el-descriptions-item>
        </el-descriptions>
        <div style="margin-top:16px;display:flex;gap:8px">
          <el-button
            type="primary"
            size="small"
            @click="exportReport('pdf')"
          >
            导出 PDF
          </el-button>
          <el-button
            type="success"
            size="small"
            @click="exportReport('excel')"
          >
            导出 Excel
          </el-button>
          <el-button
            size="small"
            @click="fetchCompare"
          >
            与上一场对比
          </el-button>
        </div>
        <div
          v-if="compareData"
          style="margin-top:12px"
        >
          <el-divider>与上一场对比</el-divider>
          <el-table
            :data="compareRows"
            size="small"
          >
            <el-table-column
              prop="label"
              label="指标"
              width="140"
            />
            <el-table-column
              prop="current"
              label="本场"
            />
            <el-table-column
              prop="previous"
              label="上一场"
            />
            <el-table-column
              prop="diff"
              label="变化"
            />
          </el-table>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from "vue";
import { useRoute } from "vue-router";
import { ElMessage } from "element-plus";
import { liveDashboardApi } from "@/api";
import * as echarts from "echarts";

const route = useRoute();
const roomId = computed(() => route.params.id as string);

const loading = ref(false);
const activeTab = ref("trends");

// 概览
const overview = ref<Record<string, any>>({});

const kpiCards = computed(() => {
  const o = overview.value;
  return [
    { label: "在线人数", value: o.onlineCount || 0, color: "#f56c6c" },
    { label: "累计观看", value: (o.totalViews || 0).toLocaleString(), color: "#409eff" },
    { label: "新增粉丝", value: (o.newFans || 0).toLocaleString(), color: "#67c23a" },
    { label: "打赏", value: `${o.giftAmount || 0}币`, color: "#e6a23c" },
    { label: "GMV", value: `¥${(o.gmv || 0).toLocaleString()}`, color: "#f56c6c" },
    { label: "订单数", value: o.orderCount || 0, color: "#909399" },
  ];
});

// 趋势图
const trendsChartRef = ref<HTMLDivElement>();
let trendsChart: echarts.ECharts | null = null;
const trendsData = ref<any[]>([]);

function renderTrendsChart() {
  if (!trendsChartRef.value) return;
  if (!trendsChart) trendsChart = echarts.init(trendsChartRef.value);

  const t = trendsData.value;
  const times = t.length > 0
    ? t.map((d: any) => d.minute?.slice(11, 16) || '')
    : ['--'];
  const onlineData = t.length > 0 ? t.map((d: any) => d.online || 0) : [overview.value.onlineCount || 0];
  const gmvData = t.length > 0 ? t.map((d: any) => (d.gmv || 0)) : [0];
  const commentData = t.length > 0 ? t.map((d: any) => (d.comments || 0) + (d.likes || 0)) : [0];

  trendsChart.setOption({
    tooltip: { trigger: "axis" },
    legend: { data: ["在线人数", "成交额", "互动数"], bottom: 0 },
    grid: { left: 60, right: 60, top: 10, bottom: 35 },
    xAxis: { type: "category", data: times },
    yAxis: [
      { type: "value", name: "人数" },
      { type: "value", name: "金额", axisLabel: { formatter: "¥{value}" } },
    ],
    series: [
      { name: "在线人数", type: "line", data: onlineData, smooth: true, itemStyle: { color: "#f56c6c" } },
      { name: "成交额", type: "line", yAxisIndex: 1, data: gmvData, smooth: true, itemStyle: { color: "#e6a23c" } },
      { name: "互动数", type: "bar", data: commentData, itemStyle: { color: "#409eff" } },
    ],
  }, true);
}

// 商品
const productData = ref<any[]>([]);

// 互动
const interChartRef = ref<HTMLDivElement>();
let interChart: echarts.ECharts | null = null;
const giftRanking = ref<any[]>([]);

function renderInterChart() {
  if (!interChartRef.value) return;
  if (!interChart) interChart = echarts.init(interChartRef.value);

  // 从打赏排行提取词云
  const words = (giftRanking.value || []).map((g: any) => ({
    name: g.nickname || g.userId,
    value: g.totalCoin || 0,
  }));

  interChart.setOption({
    tooltip: { trigger: "item" },
    series: [{
      type: "wordCloud",
      shape: "circle",
      left: "center", top: "center", width: "80%", height: "80%",
      right: null, bottom: null,
      sizeRange: [14, 40],
      rotationRange: [-30, 30],
      textStyle: {
        color() { return ['#409eff','#67c23a','#e6a23c','#f56c6c','#909399','#b37feb'][Math.floor(Math.random()*6)]; },
      },
      data: words.length > 0 ? words : [{ name: "暂无数据", value: 1 }],
    }],
  }, true);
}

// 观众
const audienceData = ref<any>(null);

// 主播
const hostData = ref<any>(null);

// 复盘
const showReport = ref(false);
const reportData = ref<any>(null);
const compareData = ref<any>(null);

const reportItems = computed(() => {
  if (!reportData.value) return [];
  return Object.entries(reportData.value)
    .filter(([k]) => !["id", "roomId", "createdAt", "updatedAt"].includes(k))
    .map(([k, v]) => ({ label: k, value: typeof v === "object" ? JSON.stringify(v) : String(v) }));
});

const compareRows = computed(() => {
  if (!compareData.value) return [];
  return Object.entries(compareData.value).map(([k, v]: [string, any]) => ({
    label: k, current: v?.current ?? "-", previous: v?.previous ?? "-", diff: v?.diff ?? "-",
  }));
});

async function refreshAll() {
  loading.value = true;
  try {
    const [ov, tp, pd, ad, ip, hs] = await Promise.all([
      liveDashboardApi.overview(roomId.value),
      liveDashboardApi.trends(roomId.value),
      liveDashboardApi.products(roomId.value),
      liveDashboardApi.audience(roomId.value),
      liveDashboardApi.interactions(roomId.value),
      liveDashboardApi.hostStats(roomId.value),
    ]);
    overview.value = ov.data || {};
    const td: any = tp.data || {};
    trendsData.value = td.trends || [];
    productData.value = (pd.data as any[]) || [];
    audienceData.value = ad.data || null;
    const interData: any = ip.data || {};
    giftRanking.value = interData.topGifters || interData.gifts || [];
    hostData.value = hs.data || null;

    await nextTick();
    renderTrendsChart();
    renderInterChart();
  } catch {
    ElMessage.error("加载直播间数据失败");
  } finally {
    loading.value = false;
  }
}

async function openReport() {
  try {
    const { data } = await liveDashboardApi.report(roomId.value);
    reportData.value = data;
    compareData.value = null;
    showReport.value = true;
  } catch { /* ignore */ }
}

async function fetchCompare() {
  try {
    const { data } = await liveDashboardApi.compare(roomId.value);
    compareData.value = data;
  } catch { /* ignore */ }
}

function exportReport(format: "pdf" | "excel") {
  liveDashboardApi.exportReport(roomId.value, format).then(({ data }) => {
    const blob = new Blob([data]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `live-report-${roomId.value}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    ElMessage.success(`报告已导出为 ${format.toUpperCase()}`);
  }).catch(() => {});
}

let timer: any = null;

function handleResize() {
  trendsChart?.resize();
  interChart?.resize();
}

onMounted(() => {
  refreshAll();
  timer = setInterval(refreshAll, 15000);
  window.addEventListener("resize", handleResize);
});

onBeforeUnmount(() => {
  clearInterval(timer);
  window.removeEventListener("resize", handleResize);
  trendsChart?.dispose();
  interChart?.dispose();
});
</script>

<style scoped>
.live-dashboard { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }

.kpi-row { margin-bottom: 16px; }
.kpi-card { text-align: center; }
.kpi-label { font-size: 13px; color: #909399; margin-bottom: 6px; }
.kpi-value { font-size: 22px; font-weight: 700; }

.tab-chart { width: 100%; }

.gift-row { display: flex; align-items: center; gap: 12px; padding: 6px 0; border-bottom: 1px solid #f5f5f5; }
.g-rank { width: 22px; height: 22px; border-radius: 4px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 12px; }
.g-user { flex: 1; }
.g-amount { color: #e6a23c; font-weight: 600; }
</style>
