<template>
  <div
    v-loading="loading"
    class="cockpit"
  >
    <el-result
      v-if="loadError"
      icon="error"
      title="数据加载失败"
      sub-title="无法获取驾驶舱数据，请检查网络或稍后重试"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="refreshAll"
        >
          重试
        </el-button>
      </template>
    </el-result>
    <template v-else>
      <!-- 页面头部 -->
      <div class="page-header">
        <div class="page-header__title">
          <span class="hero-mark">热</span>
          <div class="hero-heading">
            <span>全域经营决策台</span>
            <h2>管理驾驶舱</h2>
          </div>
          <el-tooltip
            placement="bottom-start"
            content="驾驶舱为「老板视角」实时估算口径（本月/今日即时聚合、5分钟缓存），与「运营看板·总览」的天级聚合表口径各自独立，两处同名指标（GMV/新增用户等）可能略有差异，属正常。"
          >
            <span class="caliber-tip">口径说明</span>
          </el-tooltip>
        </div>
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
      <div class="kpi-row">
        <div
          v-for="card in kpiCards"
          :key="card.label"
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
        </div>
      </div>

      <!-- 图表区：收入构成 + 用户增长 -->
      <el-row
        :gutter="16"
        class="chart-row"
      >
        <el-col :span="12">
          <el-card shadow="hover">
            <template #header>
              <h3>本月收入构成</h3>
            </template>
            <div
              v-if="revenueComposition.length"
              ref="revenueChartRef"
              style="height:320px"
            />
            <el-empty
              v-else
              description="暂无收入数据"
              :image-size="80"
            />
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card shadow="hover">
            <template #header>
              <h3>用户增长与获客成本</h3>
            </template>
            <div
              v-if="userGrowthTrends.length"
              ref="userGrowthChartRef"
              style="height:320px"
            />
            <el-empty
              v-else
              description="暂无用户增长数据"
              :image-size="80"
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
              <h3>近 30 天业务线收入趋势</h3>
            </template>
            <div
              v-if="businessTrends.length"
              ref="businessTrendRef"
              style="height:340px"
            />
            <el-empty
              v-else
              description="暂无业务趋势数据"
              :image-size="80"
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
                <h3>异常预警</h3>
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
                <b :style="{ color: parseFloat(alertData.refundStats.refundRate || '') > 10 ? '#f56c6c' : '#67c23a' }">
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
              <h4>热门课程 · Top 5</h4>
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
              <h4>活跃圈子 · Top 5</h4>
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
              <h4>推广达人 · Top 5</h4>
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
              <h4>新入驻分站</h4>
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
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useRoute } from "vue-router";
import { ElMessage } from "element-plus";
import { cockpitApi } from "@/api";
import echarts from "@/utils/echarts";

const route = useRoute();
const previewMode = computed(() => import.meta.env.DEV && route.path.startsWith("/__qa/"));

const loading = ref(true);
const loadError = ref(false);
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
  /** 净利润是否为估算值（后端可缺省·缺省时按估算处理·契约未上线时前端诚实降级） */
  isEstimate?: boolean;
}

const overview = ref<Overview>({
  todayGmv: 0, monthGmv: 0, totalPaidUsers: 0, monthPaidUsers: 0,
  totalUsers: 0, onlineUsers: 0, totalCommissionPaid: 0, monthCommissionPaid: 0, estimatedNetProfit: 0,
});

/** 核心指标卡片 */
interface KpiCard { label: string; value: string; color: string; sub?: string }
const kpiCards = ref<KpiCard[]>([]);

function buildKpiCards() {
  const o = overview.value;
  kpiCards.value = [
    { label: "今日GMV", value: `¥${o.todayGmv.toLocaleString()}`, color: "#315F88" },
    { label: "本月GMV", value: `¥${o.monthGmv.toLocaleString()}`, color: "#168A62" },
    { label: "本月付费用户", value: o.monthPaidUsers.toLocaleString(), sub: `累计 ${o.totalPaidUsers.toLocaleString()}`, color: "#B8893F" },
    { label: "当前在线", value: o.onlineUsers.toLocaleString(), sub: `总用户 ${o.totalUsers.toLocaleString()}`, color: "#B4233E" },
    { label: "本月分佣支出", value: `¥${o.monthCommissionPaid.toLocaleString()}`, color: "#64748B" },
    // 净利润为估算值：估算口径 = GMV − 佣金 − 退款（后端 isEstimate 契约未上线时默认按估算展示）
    { label: o.isEstimate === false ? "本月净利润" : "本月净利润(估)", value: `¥${o.estimatedNetProfit.toLocaleString()}`, color: o.estimatedNetProfit >= 0 ? "#168A62" : "#C73E4E", sub: "估算 = GMV − 佣金 − 退款" },
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
/** 收入构成项 */
interface RevenueItem { label?: string; type?: string; amount?: number }
const revenueComposition = ref<RevenueItem[]>([]);

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
      data: comp.map((c) => ({ name: c.label || c.type, value: c.amount })),
    }],
  }, true);
}

// ─── 用户增长 ───
/** 用户增长与获客成本趋势项 */
interface UserGrowthItem { date: string; newUsers?: number; acquisitionCost?: number }
const userGrowthTrends = ref<UserGrowthItem[]>([]);

function renderUserGrowthChart() {
  if (!userGrowthChartRef.value) return;
  if (!userGrowthChart) userGrowthChart = echarts.init(userGrowthChartRef.value, "guoxue");
  const data = userGrowthTrends.value;
  userGrowthChart.setOption({
    tooltip: { trigger: "axis" },
    // 图例置顶留白，网格顶部下压 44px，避免图例/Y轴名与旋转的 X 轴标签互相重叠
    legend: { data: ["新增用户", "获客成本"], top: 0 },
    grid: { left: 60, right: 60, bottom: 48, top: 44 },
    xAxis: { type: "category", data: data.map((d) => d.date.slice(5)), axisLabel: { rotate: 45, fontSize: 10 } },
    yAxis: [
      { type: "value", name: "用户数" },
      { type: "value", name: "¥", axisLabel: { formatter: "¥{value}" } },
    ],
    series: [
      { name: "新增用户", type: "bar", data: data.map((d) => d.newUsers), itemStyle: { color: "#315F88", borderRadius: [5, 5, 0, 0] } },
      { name: "获客成本", type: "line", yAxisIndex: 1, data: data.map((d) => d.acquisitionCost), itemStyle: { color: "#B4233E" }, lineStyle: { color: "#B4233E", width: 2.5 } },
    ],
  }, true);
}

// ─── 业务趋势 ───
/** 业务线收入趋势项（按业务类型动态键 + date） */
interface BusinessTrendItem { date: string; [key: string]: number | string }
const businessTrends = ref<BusinessTrendItem[]>([]);

function renderBusinessTrendChart() {
  if (!businessTrendRef.value) return;
  if (!businessChart) businessChart = echarts.init(businessTrendRef.value, "guoxue");
  const data = businessTrends.value;

  const typeColors: Record<string, string> = {
    COURSE: "#315F88", PRODUCT: "#168A62", MEMBER: "#B8893F",
    CIRCLE_JOIN: "#B4233E", BOT_SERVICE: "#64748B", PAIPAN: "#765A8D",
    LIVESTREAM: "#C87954", STATION_MASTER: "#4D8396", OPERATOR: "#9A6C2C",
  };
  const typeLabels: Record<string, string> = {
    COURSE: "课程", PRODUCT: "商品", MEMBER: "会员", CIRCLE_JOIN: "入圈",
    BOT_SERVICE: "智能体", PAIPAN: "排盘", LIVESTREAM: "直播",
    STATION_MASTER: "站长", OPERATOR: "运营商",
  };

  const allTypes = new Set<string>();
  data.forEach((d) => Object.keys(d).forEach(k => { if (k !== "date") allTypes.add(k); }));

  businessChart.setOption({
    tooltip: { trigger: "axis" },
    legend: { data: Array.from(allTypes).map(t => typeLabels[t] || t), type: "scroll", bottom: 0 },
    grid: { left: 60, right: 20, top: 10, bottom: 40 },
    xAxis: { type: "category", data: data.map((d) => d.date.slice(5)), axisLabel: { fontSize: 10 } },
    yAxis: { type: "value", axisLabel: { formatter: "¥{value}" } },
    series: Array.from(allTypes).map(t => ({
      name: typeLabels[t] || t,
      type: "line",
      stack: "total",
      areaStyle: {},
      emphasis: { focus: "series" },
      data: data.map((d) => d[t] || 0),
      itemStyle: { color: typeColors[t] || "#999" },
    })),
  }, true);
}

// ─── 预警 ───
/** 系统告警项 */
interface SystemAlert { type?: string; message?: string; level?: string }
/** 风控告警项 */
interface RiskAlert { id?: string | number; type?: string; title?: string; level?: string }
/** 退款统计 */
interface RefundStats { todayRefunds?: number; refundRate?: string }
/** 预警数据聚合 */
interface AlertData { systemAlerts?: SystemAlert[]; riskAlerts?: RiskAlert[]; refundStats?: RefundStats }
const alertData = ref<AlertData>({ systemAlerts: [], riskAlerts: [], refundStats: {} });
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
/** 热门课程 */
interface CourseRank { id?: string | number; title?: string; studentCount?: number }
/** 活跃圈子 */
interface CircleRank { id?: string | number; name?: string; memberCount?: number }
/** 推广达人 */
interface PromoterRank { stationId?: string | number; name?: string; monthEarned?: number | string }
/** 新入驻分站 */
interface StationRank { id?: string | number; name?: string; createdAt?: string }
/** 排行榜聚合数据 */
interface RankingData {
  topCourses?: CourseRank[];
  topCircles?: CircleRank[];
  topPromoters?: PromoterRank[];
  topNewStations?: StationRank[];
}
const rankingData = ref<RankingData>({});

// ─── 工具函数 ───
function formatDate(d?: string) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("zh-CN");
}

// ─── 数据加载 ───
async function refreshAll() {
  loading.value = true;
  loadError.value = false;
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

    revenueComposition.value = rc.data?.composition || [];
    userGrowthTrends.value = ug.data?.trends || [];
    businessTrends.value = bt.data?.trends || [];
    alertData.value = al.data || {};
    processAlerts();
    rankingData.value = rk.data || {};

    await nextTick();
    renderRevenueChart();
    renderUserGrowthChart();
    renderBusinessTrendChart();
  } catch {
    loadError.value = true;
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
  if (previewMode.value) {
    overview.value = {
      todayGmv: 286430,
      monthGmv: 8652040,
      totalPaidUsers: 68240,
      monthPaidUsers: 8426,
      totalUsers: 286430,
      onlineUsers: 38520,
      totalCommissionPaid: 1698200,
      monthCommissionPaid: 268400,
      estimatedNetProfit: 2146800,
      isEstimate: true,
    };
    buildKpiCards();
    revenueComposition.value = [
      { label: "课程", amount: 3260000 }, { label: "商品", amount: 2480000 },
      { label: "会员", amount: 1460000 }, { label: "咨询", amount: 920000 }, { label: "直播", amount: 532000 },
    ];
    userGrowthTrends.value = Array.from({ length: 10 }, (_, i) => ({
      date: new Date(2026, 7, 23 + i).toISOString().slice(0, 10),
      newUsers: 720 + i * 76 + (i % 3) * 110,
      acquisitionCost: 28 - i * .7 + (i % 2) * 1.4,
    }));
    businessTrends.value = Array.from({ length: 10 }, (_, i) => ({
      date: new Date(2026, 7, 23 + i).toISOString().slice(0, 10),
      COURSE: 82000 + i * 7600,
      PRODUCT: 61000 + i * 5200 + (i % 3) * 9000,
      MEMBER: 33000 + i * 3100,
      LIVESTREAM: 18000 + i * 2400,
    }));
    alertData.value = {
      systemAlerts: [{ type: "内容审核", message: "2 条高风险内容将在 30 分钟内超时", level: "warn" }],
      riskAlerts: [{ id: 1, type: "交易风控", title: "检测到 1 笔异常大额退款", level: "danger" }],
      refundStats: { todayRefunds: 12, refundRate: "1.8%" },
    };
    processAlerts();
    rankingData.value = {
      topCourses: ["易学入门十二讲", "宋代美学通识", "古籍版本鉴赏", "家庭礼仪实践", "书法临习课"].map((title, i) => ({ id: i, title, studentCount: 2860 - i * 320 })),
      topCircles: ["松风雅集", "知止读书会", "杏坛讲堂", "文脉研究社", "东方生活美学"].map((name, i) => ({ id: i, name, memberCount: 9860 - i * 880 })),
      topPromoters: ["杭州文脉站", "苏州雅集站", "成都知止站", "西安长安站", "泉州海丝站"].map((name, i) => ({ stationId: i, name, monthEarned: 68000 - i * 7200 })),
      topNewStations: ["洛阳河洛驿站", "绍兴兰亭驿站", "曲阜杏坛驿站", "大理苍山驿站", "敦煌鸣沙驿站"].map((name, i) => ({ id: i, name, createdAt: `2026-08-${String(28 - i).padStart(2, "0")}` })),
    };
    lastRefreshTime.value = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    loading.value = false;
    nextTick(() => {
      renderRevenueChart();
      renderUserGrowthChart();
      renderBusinessTrendChart();
    });
    window.addEventListener("resize", handleResize);
    return;
  }
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
.cockpit { max-width: 1760px; margin: 0 auto; padding: 0; }
.page-header {
  position: relative;
  display: flex;
  min-height: 132px;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  overflow: hidden;
  margin-bottom: 18px;
  padding: 26px 30px;
  border: 1px solid rgba(69, 110, 145, .18);
  border-radius: 22px;
  color: #fff;
  background:
    radial-gradient(circle at 84% 10%, rgba(208, 173, 101, .24), transparent 27%),
    linear-gradient(125deg, #10263f 0%, #1d496c 62%, #5c503d 126%);
  box-shadow: 0 18px 42px rgba(19, 48, 75, .16);
}
.page-header::after {
  position: absolute;
  right: -44px;
  top: -118px;
  width: 290px;
  height: 290px;
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 50%;
  box-shadow: 0 0 0 42px rgba(255,255,255,.03), 0 0 0 84px rgba(255,255,255,.018);
  content: "";
}
.page-header__title, .header-actions { position: relative; z-index: 1; }
.page-header__title { display: flex; align-items: center; gap: 14px; }
.hero-mark { display: grid; width: 48px; height: 48px; place-items: center; border: 1px solid rgba(255,255,255,.2); border-radius: 15px; color: #f4dda4; font: 700 22px var(--font-family-display); background: rgba(255,255,255,.08); }
.hero-heading > span { display: block; margin-bottom: 4px; color: rgba(225,236,246,.6); font-size: 11px; letter-spacing: .12em; }
.page-header h2 { margin: 0; color: #fff; font-family: var(--font-family-display); font-size: 27px; letter-spacing: .035em; }
.caliber-tip { margin-left: 3px; color: rgba(232,240,247,.62); font-size: 11px; cursor: help; border-bottom: 1px dashed rgba(232,240,247,.35); }
.header-actions { display: flex; gap: 9px; align-items: center; color: rgba(255,255,255,.7); }
.header-actions :deep(.el-button) { color: #fff; border-color: rgba(255,255,255,.22); background: rgba(255,255,255,.08); }
.header-actions :deep(.el-tag) { border-color: rgba(230,193,116,.25); color: #f2dca7; background: rgba(230,193,116,.1); }
.header-actions :deep(.el-switch__label) { color: rgba(255,255,255,.7); }

.kpi-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-bottom: 18px; }
.kpi-row > div { min-width: 0; }
.kpi-row .kpi-card { height: 100%; }
@media (min-width: 1800px) { .kpi-row { grid-template-columns: repeat(6, minmax(0, 1fr)); } }
.kpi-card { position: relative; min-height: 125px; overflow: hidden; text-align: left; }
.kpi-card::after { position: absolute; top: -34px; right: -28px; width: 110px; height: 110px; border-radius: 50%; background: rgba(45, 96, 139, .075); content: ""; }
.kpi-label { margin-bottom: 13px; color: var(--color-text-secondary); font-size: 12px; }
.kpi-value { margin-bottom: 6px; font-family: var(--font-family-number); font-size: 30px; font-weight: 650; letter-spacing: -.035em; }
.kpi-sub { color: #949daa; font-size: 11px; }

.chart-row { margin-bottom: 18px; }
.kpi-row, .chart-row { margin-right: 0 !important; margin-left: 0 !important; }
.chart-row h3, .chart-row h4 { margin: 0; color: var(--color-text-title); font-size: 14px; font-weight: 650; }
.chart-row :deep(.el-card) { height: 100%; border-radius: 18px !important; }
.chart-row h3, .chart-row h4 { display: inline-flex; align-items: center; gap: 9px; }
.chart-row h3::before, .chart-row h4::before { width: 6px; height: 6px; border-radius: 50%; background: var(--color-gold); content: ""; }

.alert-panel { height: 100%; }
.alert-list { max-height: 320px; overflow-y: auto; }
.alert-item { display: flex; gap: 10px; padding: 11px 0; border-bottom: 1px solid var(--color-divider); align-items: flex-start; }
.alert-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; background: var(--color-warning); }
.alert-dot.danger { background: var(--color-error); }
.alert-dot.warn { background: var(--color-warning); }
.alert-type { font-size: 12px; color: var(--color-text-secondary); }
.alert-msg { font-size: 13px; color: var(--color-text-title); line-height: 1.4; }

.refund-row { font-size: 13px; color: var(--color-text-body); }

.rank-list { max-height: 240px; overflow-y: auto; }
.rank-item { display: flex; min-height: 42px; align-items: center; gap: 9px; padding: 8px 0; border-bottom: 1px solid var(--color-border-light); font-size: 13px; }
.rank-num { width: 23px; height: 23px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font: 650 11px var(--font-family-number); color: #667085; background: #eef1f4; flex-shrink: 0; }
.rank-num.top1 { color: #7b5420; background: #f1e4c9; }
.rank-num.top2 { color: #52677e; background: #e5ebf1; }
.rank-num.top3 { color: #855a45; background: #f0e2da; }
.rank-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rank-val { color: var(--color-text-secondary); font-size: 12px; flex-shrink: 0; }
@media (max-width: 900px) {
  .page-header { align-items: flex-start; flex-direction: column; }
  .header-actions { width: 100%; flex-wrap: wrap; }
  .kpi-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .chart-row > :deep(.el-col) { max-width: 100%; flex: 0 0 100%; margin-bottom: 14px; }
}
@media (max-width: 560px) {
  .page-header { padding: 22px 18px; }
  .hero-mark { display: none; }
  .kpi-row { grid-template-columns: minmax(0, 1fr); }
}
</style>
