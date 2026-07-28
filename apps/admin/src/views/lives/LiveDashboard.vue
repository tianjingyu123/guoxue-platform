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
          <el-empty
            v-if="compareNoPrevious"
            description="该主播暂无已结束的上一场直播，无法对比"
            :image-size="60"
          />
          <el-table
            v-else
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
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useRoute } from "vue-router";
import { ElMessage } from "element-plus";
import { liveDashboardApi } from "@/api";
import echarts from "@/utils/echarts";
import type { EChartsType } from "echarts/core";

/** 概览指标（宽松 optional） */
interface LiveOverview {
  liveStatus?: string; onlineCount?: number; totalViews?: number;
  newFans?: number; giftAmount?: number; gmv?: number; orderCount?: number;
}
/** 实时趋势点 */
interface TrendPoint { minute?: string; online?: number; gmv?: number; comments?: number; likes?: number }
/** 商品转化行 */
interface ProductRow { name?: string; price?: number; clicks?: number; orders?: number; revenue?: number }
/** 打赏排行项 */
interface GiftRankItem { userId?: string; userName?: string; nickname?: string; totalCoin?: number }
/** 观众画像 */
interface AudienceData { gender?: string; age?: string; region?: string; interests?: string }
/** 主播表现 */
interface HostStats { totalDuration?: string; productCount?: number; coverage?: string; avgStayDuration?: string }

const route = useRoute();
const roomId = computed(() => route.params.id as string);

const loading = ref(false);
const activeTab = ref("trends");

// 概览
const overview = ref<LiveOverview>({});

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
let trendsChart: EChartsType | null = null;
const trendsData = ref<TrendPoint[]>([]);

function renderTrendsChart() {
  if (!trendsChartRef.value) return;
  if (!trendsChart) trendsChart = echarts.init(trendsChartRef.value);

  const t = trendsData.value;
  const times = t.length > 0
    ? t.map((d) => d.minute?.slice(11, 16) || '')
    : ['--'];
  const onlineData = t.length > 0 ? t.map((d) => d.online || 0) : [overview.value.onlineCount || 0];
  const gmvData = t.length > 0 ? t.map((d) => (d.gmv || 0)) : [0];
  const commentData = t.length > 0 ? t.map((d) => (d.comments || 0) + (d.likes || 0)) : [0];

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
const productData = ref<ProductRow[]>([]);

// 互动
const interChartRef = ref<HTMLDivElement>();
let interChart: EChartsType | null = null;
const giftRanking = ref<GiftRankItem[]>([]);

function renderInterChart() {
  if (!interChartRef.value) return;
  if (!interChart) interChart = echarts.init(interChartRef.value);

  // 互动榜直接使用条形图，避免依赖未注册的词云扩展导致图表空白
  const ranking = (giftRanking.value || []).slice(0, 10).map((g) => ({
    name: g.nickname || g.userId,
    value: g.totalCoin || 0,
  })).sort((a, b) => a.value - b.value);

  interChart.setOption({
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 20, right: 28, top: 12, bottom: 12, containLabel: true },
    xAxis: { type: "value", minInterval: 1, axisLabel: { color: "#909399" } },
    yAxis: {
      type: "category",
      data: ranking.length > 0 ? ranking.map((item) => item.name) : ["暂无数据"],
      axisLabel: { color: "#606266", width: 96, overflow: "truncate" },
    },
    series: [{
      name: "打赏热度",
      type: "bar",
      data: ranking.length > 0 ? ranking.map((item) => item.value) : [0],
      barMaxWidth: 20,
      itemStyle: { color: "#d21f3c", borderRadius: [0, 8, 8, 0] },
      label: { show: true, position: "right", color: "#909399" },
    }],
  }, true);
}

// 观众
const audienceData = ref<AudienceData | null>(null);

// 主播
const hostData = ref<HostStats | null>(null);

// 复盘
const showReport = ref(false);
const reportData = ref<Record<string, unknown> | null>(null);
const compareData = ref<Record<string, unknown> | null>(null);

// 复盘 summary 键名翻译+格式化（后端 live-report.service getReport 返回 { summary, minuteData }，
// 此前直接遍历顶层导致英文键名+minuteData 整段 JSON 直出）
const REPORT_LABELS: Record<string, { label: string; fmt?: (v: unknown) => string }> = {
  title: { label: "直播标题" },
  durationMinutes: { label: "直播时长", fmt: (v) => formatMinutes(Number(v)) },
  totalViews: { label: "累计观看", fmt: (v) => Number(v || 0).toLocaleString() + " 人次" },
  peakOnline: { label: "峰值在线", fmt: (v) => Number(v || 0).toLocaleString() + " 人" },
  avgOnline: { label: "平均在线", fmt: (v) => Number(v || 0).toLocaleString() + " 人" },
  totalGmv: { label: "成交额(GMV)", fmt: (v) => "¥" + Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
  totalOrders: { label: "成交订单", fmt: (v) => Number(v || 0).toLocaleString() + " 单" },
  totalComments: { label: "评论数", fmt: (v) => Number(v || 0).toLocaleString() },
  totalLikes: { label: "点赞数", fmt: (v) => Number(v || 0).toLocaleString() },
  totalGiftCoin: { label: "打赏(币)", fmt: (v) => Number(v || 0).toLocaleString() + " 币" },
  giftTransactions: { label: "打赏次数", fmt: (v) => Number(v || 0).toLocaleString() + " 次" },
  uniqueGifters: { label: "打赏人数", fmt: (v) => Number(v || 0).toLocaleString() + " 人" },
  interactionRate: { label: "互动率" },
};

function formatMinutes(min: number) {
  if (!min || isNaN(min)) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h} 小时 ${m} 分钟` : `${m} 分钟`;
}

const reportItems = computed(() => {
  const summary = (reportData.value as { summary?: Record<string, unknown> } | null)?.summary;
  if (!summary) return [];
  return Object.entries(summary)
    .filter(([, v]) => typeof v !== "object" || v === null) // 复杂结构不直出 JSON
    .map(([k, v]) => {
      const def = REPORT_LABELS[k];
      const raw = v === null || v === undefined || v === "" ? "—" : v;
      return { label: def?.label || k, value: def?.fmt ? def.fmt(raw === "—" ? 0 : raw) : String(raw) };
    });
});

// 对比端点真实返回 { current, previous, changes }（live-report.service getCompare），
// 逐指标翻译成"本场/上一场/变化"三列；previous 为 null 表示没有上一场
const COMPARE_LABELS: Record<string, { label: string; fmt?: (v: unknown) => string }> = {
  views: { label: "累计观看" },
  peakOnline: { label: "峰值在线" },
  gmv: { label: "成交额(GMV)", fmt: (v) => "¥" + Number(v || 0).toLocaleString() },
  orders: { label: "成交订单" },
  comments: { label: "评论数" },
  gifts: { label: "打赏(币)" },
};

const compareNoPrevious = computed(() => {
  const d = compareData.value as { previous?: unknown } | null;
  return !!d && (d.previous === null || d.previous === undefined);
});

const compareRows = computed(() => {
  const d = compareData.value as {
    current?: Record<string, unknown>; previous?: Record<string, unknown> | null; changes?: Record<string, unknown>;
  } | null;
  if (!d?.current || !d.previous) return [];
  return Object.entries(COMPARE_LABELS).map(([k, def]) => {
    const fmt = def.fmt || ((v: unknown) => String(v ?? "—"));
    return {
      label: def.label,
      current: fmt(d.current?.[k] ?? 0),
      previous: fmt(d.previous?.[k] ?? 0),
      diff: String(d.changes?.[k] ?? "—"),
    };
  });
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
    const td = (tp.data || {}) as { trends?: TrendPoint[] };
    trendsData.value = td.trends || [];
    productData.value = (pd.data as ProductRow[]) || [];
    audienceData.value = ad.data || null;
    const interData = (ip.data || {}) as { topGifters?: GiftRankItem[]; gifts?: GiftRankItem[] };
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
  } catch {
    ElMessage.error("复盘报告加载失败，请重试");
  }
}

async function fetchCompare() {
  try {
    const { data } = await liveDashboardApi.compare(roomId.value);
    compareData.value = data;
  } catch {
    ElMessage.error("对比数据加载失败，请重试");
  }
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

// setInterval 句柄：初值 null 与 clearInterval 入参类型冲突，保留 any 不改运行时
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
.kpi-label { font-size: 13px; color: var(--color-text-secondary); margin-bottom: 6px; }
.kpi-value { font-size: 22px; font-weight: 700; }

.tab-chart { width: 100%; }

.gift-row { display: flex; align-items: center; gap: 12px; padding: 6px 0; border-bottom: 1px solid var(--color-divider); }
.g-rank { width: 22px; height: 22px; border-radius: 4px; background: var(--color-divider); display: flex; align-items: center; justify-content: center; font-size: 12px; }
.g-user { flex: 1; }
.g-amount { color: var(--color-warning); font-weight: 600; }
</style>
