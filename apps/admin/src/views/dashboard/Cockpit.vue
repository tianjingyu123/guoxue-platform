<template>
  <div
    v-loading="loading"
    class="cockpit"
  >
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>📊 管理驾驶舱</h2>
      <div class="header-actions">
        <span
          v-if="lastRefreshTime"
          style="font-size:12px;color:#999"
        >{{ lastRefreshTime }} 更新</span>
        <el-switch
          v-model="autoRefresh"
          active-text="自动刷新"
          inactive-text=""
          size="small"
        />
        <el-tag
          type="warning"
          size="small"
        >
          老板专属
        </el-tag>
        <el-button
          :loading="loading"
          @click="refreshAll"
        >
          刷新数据
        </el-button>
      </div>
    </div>

    <!-- 核心指标卡片 -->
    <el-row
      :gutter="16"
      class="kpi-row"
    >
      <el-col
        v-for="card in kpiCards"
        :key="card.label"
        :span="6"
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
          <div
            v-if="card.sub"
            class="kpi-sub"
          >
            {{ card.sub }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区：收入构成 + 用户增长 -->
    <el-row
      :gutter="16"
      class="chart-row"
    >
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <h3>💰 本月收入构成</h3>
          </template>
          <div
            ref="revenueChartRef"
            style="height:320px"
          />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <h3>📈 用户增长与获客成本</h3>
          </template>
          <div
            ref="userGrowthChartRef"
            style="height:320px"
          />
        </el-card>
      </el-col>
    </el-row>

    <!-- 业务趋势 + 预警 -->
    <el-row
      :gutter="16"
      class="chart-row"
    >
      <el-col :span="16">
        <el-card shadow="hover">
          <template #header>
            <h3>📉 近30天业务线收入趋势</h3>
          </template>
          <div
            ref="businessTrendRef"
            style="height:340px"
          />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card
          shadow="hover"
          class="alert-panel"
        >
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <h3>⚠️ 异常预警</h3>
              <el-tag
                :type="alertSummary.hasRisk ? 'danger' : 'success'"
                size="small"
              >
                {{ alertSummary.hasRisk ? `${alertSummary.count} 条待处理` : '正常' }}
              </el-tag>
            </div>
          </template>
          <div
            v-if="alertData.systemAlerts?.length || alertData.riskAlerts?.length"
            class="alert-list"
          >
            <div
              v-for="a in alertData.systemAlerts"
              :key="a.message"
              class="alert-item"
              :class="a.level"
            >
              <span
                class="alert-dot"
                :class="a.level"
              />
              <div>
                <div class="alert-type">
                  {{ a.type }}
                </div>
                <div class="alert-msg">
                  {{ a.message }}
                </div>
              </div>
            </div>
            <div
              v-for="a in alertData.riskAlerts"
              :key="a.id"
              class="alert-item"
            >
              <span
                class="alert-dot"
                :class="a.level?.toLowerCase()"
              />
              <div>
                <div class="alert-type">
                  {{ a.type }}
                </div>
                <div class="alert-msg">
                  {{ a.title }}
                </div>
              </div>
            </div>
          </div>
          <el-empty
            v-else
            description="暂无异常"
            :image-size="80"
          />
          <div
            v-if="alertData.refundStats"
            class="refund-stats"
          >
            <el-divider />
            <div class="refund-row">
              <span>今日退款：</span>
              <b>{{ alertData.refundStats.todayRefunds }} 笔</b>
              <span style="margin-left:8px">退款率：</span>
              <b :style="{ color: parseFloat(alertData.refundStats.refundRate) > 10 ? '#f56c6c' : '#67c23a' }">
                {{ alertData.refundStats.refundRate }}
              </b>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 排行榜 -->
    <el-row
      :gutter="16"
      class="chart-row"
    >
      <el-col :span="6">
        <el-card shadow="hover">
          <template #header>
            <h4>🔥 热门课程 Top5</h4>
          </template>
          <div
            v-if="rankingData.topCourses?.length"
            class="rank-list"
          >
            <div
              v-for="(item, i) in rankingData.topCourses"
              :key="item.id"
              class="rank-item"
            >
              <span
                class="rank-num"
                :class="'top' + (i + 1)"
              >{{ i + 1 }}</span>
              <span class="rank-name">{{ item.title }}</span>
              <span class="rank-val">{{ item.studentCount }}人</span>
            </div>
          </div>
          <el-empty
            v-else
            description="暂无数据"
            :image-size="60"
          />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <template #header>
            <h4>💬 活跃圈子 Top5</h4>
          </template>
          <div
            v-if="rankingData.topCircles?.length"
            class="rank-list"
          >
            <div
              v-for="(item, i) in rankingData.topCircles"
              :key="item.id"
              class="rank-item"
            >
              <span
                class="rank-num"
                :class="'top' + (i + 1)"
              >{{ i + 1 }}</span>
              <span class="rank-name">{{ item.name }}</span>
              <span class="rank-val">{{ item.memberCount }}人</span>
            </div>
          </div>
          <el-empty
            v-else
            description="暂无数据"
            :image-size="60"
          />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <template #header>
            <h4>🏆 推广达人 Top5</h4>
          </template>
          <div
            v-if="rankingData.topPromoters?.length"
            class="rank-list"
          >
            <div
              v-for="(item, i) in rankingData.topPromoters"
              :key="item.stationId"
              class="rank-item"
            >
              <span
                class="rank-num"
                :class="'top' + (i + 1)"
              >{{ i + 1 }}</span>
              <span class="rank-name">{{ item.name }}</span>
              <span class="rank-val">¥{{ item.monthEarned }}</span>
            </div>
          </div>
          <el-empty
            v-else
            description="暂无数据"
            :image-size="60"
          />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <template #header>
            <h4>🆕 新入驻分站</h4>
          </template>
          <div
            v-if="rankingData.topNewStations?.length"
            class="rank-list"
          >
            <div
              v-for="(item, i) in rankingData.topNewStations"
              :key="item.id"
              class="rank-item"
            >
              <span
                class="rank-num"
                :class="'top' + (i + 1)"
              >{{ i + 1 }}</span>
              <span class="rank-name">{{ item.name }}</span>
              <span class="rank-val">{{ formatDate(item.createdAt) }}</span>
            </div>
          </div>
          <el-empty
            v-else
            description="暂无数据"
            :image-size="60"
          />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, watch, shallowRef } from "vue";
import { ElMessage } from "element-plus";
import { cockpitApi } from "@/api";
import echarts from "@/utils/echarts";

const loading = ref(false);
const autoRefresh = ref(true);
const lastRefreshTime = ref("");
let refreshTimer: ReturnType<typeof setInterval> | null = null;

// ─── 核心指标 ───
interface Overview {
  todayGmv: number;
  monthGmv: number;
  totalPaidUsers: number;
  monthPaidUsers: number;
  totalUsers: number;
  onlineUsers: number;
  totalCommissionPaid: number;
  monthCommissionPaid: number;
  estimatedNetProfit: number;
}

const overview = ref<Overview>({
  todayGmv: 0, monthGmv: 0, totalPaidUsers: 0, monthPaidUsers: 0,
  totalUsers: 0, onlineUsers: 0, totalCommissionPaid: 0, monthCommissionPaid: 0, estimatedNetProfit: 0,
});

const kpiCards = ref<any[]>([]);

function buildKpiCards() {
  const o = overview.value;
  kpiCards.value = [
    { label: "今日GMV", value: `¥${o.todayGmv.toLocaleString()}`, color: "#409eff" },
    { label: "本月GMV", value: `¥${o.monthGmv.toLocaleString()}`, color: "#67c23a" },
    { label: "本月付费用户", value: o.monthPaidUsers.toLocaleString(), sub: `累计 ${o.totalPaidUsers.toLocaleString()}`, color: "#e6a23c" },
    { label: "当前在线", value: o.onlineUsers.toLocaleString(), sub: `总用户 ${o.totalUsers.toLocaleString()}`, color: "#f56c6c" },
    { label: "本月分佣支出", value: `¥${o.monthCommissionPaid.toLocaleString()}`, color: "#909399" },
    { label: "本月净利润(估)", value: `¥${o.estimatedNetProfit.toLocaleString()}`, color: o.estimatedNetProfit >= 0 ? "#67c23a" : "#f56c6c" },
  ];
}

// ─── 图表 refs ───
const revenueChartRef = ref<HTMLDivElement>();
const userGrowthChartRef = ref<HTMLDivElement>();
const businessTrendRef = ref<HTMLDivElement>();

let revenueChart: echarts.ECharts | null = null;
let userGrowthChart: echarts.ECharts | null = null;
let businessChart: echarts.ECharts | null = null;

// ─── 收入构成 ───
const revenueComposition = ref<any[]>([]);

function renderRevenueChart() {
  if (!revenueChartRef.value) return;
  if (!revenueChart) revenueChart = echarts.init(revenueChartRef.value, "guoxue");
  const comp = revenueComposition.value;
  revenueChart.setOption({
    tooltip: { trigger: "item", formatter: "{b}: ¥{c} ({d}%)" },
    legend: { orient: "vertical", right: 10, top: "center" },
    series: [{
      type: "pie",
      radius: ["45%", "75%"],
      center: ["40%", "50%"],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 4, borderColor: "#fff", borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 14 } },
      data: comp.map((c: any) => ({ name: c.label || c.type, value: c.amount })),
    }],
  }, true);
}

// ─── 用户增长 ───
const userGrowthTrends = ref<any[]>([]);

function renderUserGrowthChart() {
  if (!userGrowthChartRef.value) return;
  if (!userGrowthChart) userGrowthChart = echarts.init(userGrowthChartRef.value, "guoxue");
  const data = userGrowthTrends.value;
  userGrowthChart.setOption({
    tooltip: { trigger: "axis" },
    legend: { data: ["新增用户", "获客成本"] },
    grid: { left: 60, right: 60, bottom: 30, top: 20 },
    xAxis: { type: "category", data: data.map((d: any) => d.date.slice(5)), axisLabel: { rotate: 45, fontSize: 10 } },
    yAxis: [
      { type: "value", name: "用户数" },
      { type: "value", name: "¥", axisLabel: { formatter: "¥{value}" } },
    ],
    series: [
      { name: "新增用户", type: "bar", data: data.map((d: any) => d.newUsers), itemStyle: { color: "#409eff" } },
      { name: "获客成本", type: "line", yAxisIndex: 1, data: data.map((d: any) => d.acquisitionCost), itemStyle: { color: "#f56c6c" } },
    ],
  }, true);
}

// ─── 业务趋势 ───
const businessTrends = ref<any[]>([]);

function renderBusinessTrendChart() {
  if (!businessTrendRef.value) return;
  if (!businessChart) businessChart = echarts.init(businessTrendRef.value, "guoxue");
  const data = businessTrends.value;

  const typeColors: Record<string, string> = {
    COURSE: "#409eff", PRODUCT: "#67c23a", MEMBER: "#e6a23c",
    CIRCLE_JOIN: "#f56c6c", BOT_SERVICE: "#909399", PAIPAN: "#b37feb",
    LIVESTREAM: "#ff7875", STATION_MASTER: "#36cfc9", OPERATOR: "#d48806",
  };
  const typeLabels: Record<string, string> = {
    COURSE: "课程", PRODUCT: "商品", MEMBER: "会员", CIRCLE_JOIN: "入圈",
    BOT_SERVICE: "智能体", PAIPAN: "排盘", LIVESTREAM: "直播",
    STATION_MASTER: "站长", OPERATOR: "运营商",
  };

  const allTypes = new Set<string>();
  data.forEach((d: any) => Object.keys(d).forEach(k => { if (k !== "date") allTypes.add(k); }));

  businessChart.setOption({
    tooltip: { trigger: "axis" },
    legend: { data: Array.from(allTypes).map(t => typeLabels[t] || t), type: "scroll", bottom: 0 },
    grid: { left: 60, right: 20, top: 10, bottom: 40 },
    xAxis: { type: "category", data: data.map((d: any) => d.date.slice(5)), axisLabel: { fontSize: 10 } },
    yAxis: { type: "value", axisLabel: { formatter: "¥{value}" } },
    series: Array.from(allTypes).map(t => ({
      name: typeLabels[t] || t,
      type: "line",
      stack: "total",
      areaStyle: {},
      emphasis: { focus: "series" },
      data: data.map((d: any) => d[t] || 0),
      itemStyle: { color: typeColors[t] || "#999" },
    })),
  }, true);
}

// ─── 预警 ───
const alertData = ref<any>({ systemAlerts: [], riskAlerts: [], refundStats: {} });
const alertSummary = ref({ hasRisk: false, count: 0 });

function processAlerts() {
  const sys = alertData.value.systemAlerts || [];
  const risk = alertData.value.riskAlerts || [];
  alertSummary.value = {
    hasRisk: sys.length > 0 || risk.length > 0,
    count: sys.length + risk.length,
  };
}

// ─── 排行榜 ───
const rankingData = ref<any>({});

// ─── 工具函数 ───
function formatDate(d: string) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("zh-CN");
}

// ─── 数据加载 ───
async function refreshAll() {
  loading.value = true;
  lastRefreshTime.value = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  try {
    const [ov, rc, ug, bt, al, rk] = await Promise.all([
      cockpitApi.overview(),
      cockpitApi.revenueComposition(),
      cockpitApi.userGrowth(),
      cockpitApi.businessTrends(),
      cockpitApi.alerts(),
      cockpitApi.rankings(),
    ]);
    overview.value = ov.data as Overview;
    buildKpiCards();

    revenueComposition.value = (rc.data as any)?.composition || [];
    userGrowthTrends.value = (ug.data as any)?.trends || [];
    businessTrends.value = (bt.data as any)?.trends || [];
    alertData.value = al.data || {};
    processAlerts();
    rankingData.value = rk.data || {};

    await nextTick();
    renderRevenueChart();
    renderUserGrowthChart();
    renderBusinessTrendChart();
  } catch {
    ElMessage.error("加载驾驶舱数据失败");
  } finally {
    loading.value = false;
  }
}

// ─── 窗口缩放 ───
function handleResize() {
  revenueChart?.resize();
  userGrowthChart?.resize();
  businessChart?.resize();
}

onMounted(() => {
  refreshAll();
  window.addEventListener("resize", handleResize);
  refreshTimer = setInterval(() => {
    if (autoRefresh.value) refreshAll();
  }, 30000);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);
  if (refreshTimer) clearInterval(refreshTimer);
  revenueChart?.dispose();
  userGrowthChart?.dispose();
  businessChart?.dispose();
});
</script>

<style scoped>
.cockpit { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { margin: 0; font-size: 20px; }
.header-actions { display: flex; gap: 8px; align-items: center; }

.kpi-row { margin-bottom: 16px; }
.kpi-card { text-align: center; }
.kpi-label { font-size: 13px; color: #909399; margin-bottom: 8px; }
.kpi-value { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
.kpi-sub { font-size: 12px; color: #b0b3bb; }

.chart-row { margin-bottom: 16px; }
.chart-row h3, .chart-row h4 { margin: 0; font-size: 15px; }

.alert-panel { height: 100%; }
.alert-list { max-height: 320px; overflow-y: auto; }
.alert-item { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0; align-items: flex-start; }
.alert-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; background: #e6a23c; }
.alert-dot.danger { background: #f56c6c; }
.alert-dot.warn { background: #e6a23c; }
.alert-type { font-size: 12px; color: #909399; }
.alert-msg { font-size: 13px; color: #303133; line-height: 1.4; }

.refund-row { font-size: 13px; color: #606266; }

.rank-list { max-height: 240px; overflow-y: auto; }
.rank-item { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f5f5f5; font-size: 13px; }
.rank-num { width: 20px; height: 20px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #fff; background: #b0b3bb; flex-shrink: 0; }
.rank-num.top1 { background: #f56c6c; }
.rank-num.top2 { background: #e6a23c; }
.rank-num.top3 { background: #409eff; }
.rank-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rank-val { color: #909399; font-size: 12px; flex-shrink: 0; }
</style>
