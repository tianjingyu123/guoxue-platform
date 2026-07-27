<template>
  <div class="page">
    <PageHeader title="转化漏斗" />

    <div class="filter-row">
      <el-radio-group
        v-model="funnel"
        @change="fetchData"
      >
        <el-radio-button
          v-for="f in FUNNELS"
          :key="f.key"
          :value="f.key"
        >
          {{ f.label }}
        </el-radio-button>
      </el-radio-group>
      <el-select
        v-model="days"
        style="width:110px"
        @change="fetchData"
      >
        <el-option
          :value="7"
          label="近 7 天"
        />
        <el-option
          :value="14"
          label="近 14 天"
        />
        <el-option
          :value="30"
          label="近 30 天"
        />
        <el-option
          :value="90"
          label="近 90 天"
        />
      </el-select>
      <el-button @click="fetchData">
        刷新
      </el-button>
      <el-button
        type="primary"
        :loading="rebuilding"
        @click="rebuild"
      >
        重算昨日
      </el-button>
    </div>

    <el-result
      v-if="error && !loading"
      icon="error"
      title="加载失败"
      sub-title="漏斗数据加载出错，请重试"
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

    <template v-else>
      <el-empty
        v-if="!loading && series.length === 0"
        description="所选区间暂无漏斗数据。数据由每日 00:40 聚合产出，可点「重算昨日」立即生成昨日数据。"
      />

      <div
        v-else
        v-loading="loading"
      >
        <el-row :gutter="16">
          <el-col :span="10">
            <el-card shadow="never">
              <template #header>
                区间累计漏斗（{{ days }} 天合计）
              </template>
              <div
                ref="funnelChartRef"
                class="chart chart-funnel"
              />
            </el-card>
          </el-col>
          <el-col :span="14">
            <el-card shadow="never">
              <template #header>
                每日各步骤人数趋势
              </template>
              <div
                ref="trendChartRef"
                class="chart chart-trend"
              />
            </el-card>
          </el-col>
        </el-row>

        <el-card
          shadow="never"
          class="steps-card"
        >
          <template #header>
            步骤转化明细（区间合计）
          </template>
          <el-table
            :data="stepSummary"
            border
            size="small"
          >
            <el-table-column
              label="步骤"
              width="80"
            >
              <template #default="{ $index }">
                第 {{ $index + 1 }} 步
              </template>
            </el-table-column>
            <el-table-column
              label="环节"
              min-width="160"
            >
              <template #default="{ row }">
                {{ stepLabel(row.stepKey) }}
              </template>
            </el-table-column>
            <el-table-column
              prop="count"
              label="人数（区间去重口径为按日累加）"
              width="240"
            />
            <el-table-column
              label="上一步转化率"
              width="140"
            >
              <template #default="{ row, $index }">
                <span v-if="$index === 0">—</span>
                <!-- 按日累加口径下后步人数可能大于前步（同一用户跨日重复计数），转化率会 >100%，
                     此时率无业务意义，显示 "—" 并 tooltip 说明，避免出现「300%」误导 -->
                <el-tooltip
                  v-else-if="row.rate > 1"
                  content="按日累加口径下后步人数大于前步（同一用户跨日重复计数），此处转化率无意义，故不展示。如需精确率请用去重口径专项分析。"
                  placement="top"
                >
                  <span class="rate-na">—</span>
                </el-tooltip>
                <span
                  v-else
                  :class="{ 'rate-low': row.rate < 0.1 }"
                >{{ (row.rate * 100).toFixed(1) }}%</span>
              </template>
            </el-table-column>
            <el-table-column
              label="总转化率（相对第 1 步）"
              width="180"
            >
              <template #default="{ row, $index }">
                <span v-if="$index === 0">100%</span>
                <el-tooltip
                  v-else-if="row.totalRate > 1"
                  content="按日累加口径下该步人数大于第 1 步（同一用户跨日重复计数），总转化率无意义，故不展示。"
                  placement="top"
                >
                  <span class="rate-na">—</span>
                </el-tooltip>
                <span v-else>{{ (row.totalRate * 100).toFixed(1) }}%</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from "vue";
import { ElMessage } from "element-plus";
import PageHeader from "@/components/PageHeader.vue";
import { funnelApi } from "@/api";
import echarts from "@/utils/echarts";

/** 五条漏斗定义（与后端 FunnelDailyService 对齐） */
const FUNNELS = [
  { key: "F1_activation", label: "F1 新用户激活" },
  { key: "F2_member", label: "F2 会员转化" },
  { key: "F3_commerce", label: "F3 电商转化" },
  { key: "F4_practitioner", label: "F4 从业者转化" },
  { key: "F5_customer_service", label: "F5 客服服务与成交" },
];

/** 步骤键 → 中文（与后端 upsertSteps 的 stepKey 一一对应） */
const STEP_LABELS: Record<string, string> = {
  register: "注册",
  first_paipan: "当日首次排盘",
  d1_return: "次日回访",
  member_page_view: "会员页曝光",
  member_pay_click: "支付点击",
  member_paid: "会员购买",
  detail_view: "商详曝光",
  buy_click: "购买点击",
  paid: "支付成功",
  tool_use: "工具使用",
  b_entry_view: "B端入口曝光",
  cert_apply: "认证申请",
  commission_earned: "产生佣金",
  cs_question: "发起咨询",
  cs_resolved: "问题已处理",
  cs_recommend_offered: "相关建议展示",
  cs_recommend_clicked: "点击下一步",
  cs_attributed_paid: "点击后支付",
};

interface DayRow { date: string; steps: Array<{ step: number; stepKey: string; count: number }> }
interface StepSummary { stepKey: string; count: number; rate: number; totalRate: number }

const funnel = ref("F2_member");
const days = ref(14);
const series = ref<DayRow[]>([]);
const stepSummary = ref<StepSummary[]>([]);
const loading = ref(false);
const error = ref(false);
const rebuilding = ref(false);

const funnelChartRef = ref<HTMLDivElement>();
const trendChartRef = ref<HTMLDivElement>();
let funnelChart: echarts.ECharts | null = null;
let trendChart: echarts.ECharts | null = null;

onMounted(fetchData);

onBeforeUnmount(() => {
  funnelChart?.dispose();
  trendChart?.dispose();
  window.removeEventListener("resize", onResize);
});

function onResize() {
  funnelChart?.resize();
  trendChart?.resize();
}

function stepLabel(key: string): string {
  return STEP_LABELS[key] || key;
}

async function fetchData() {
  loading.value = true;
  error.value = false;
  try {
    const { data } = await funnelApi.daily(funnel.value, days.value);
    series.value = Array.isArray(data) ? data : [];
    buildSummary();
    await nextTick();
    renderCharts();
  } catch {
    error.value = true;
    series.value = [];
    stepSummary.value = [];
    ElMessage.error("加载漏斗数据失败");
  } finally {
    loading.value = false;
  }
}

/** 区间合计：各步骤按日累加，算环比/总转化率 */
function buildSummary() {
  const sums = new Map<number, { stepKey: string; count: number }>();
  for (const day of series.value) {
    for (const s of day.steps) {
      const cur = sums.get(s.step);
      if (cur) cur.count += s.count;
      else sums.set(s.step, { stepKey: s.stepKey, count: s.count });
    }
  }
  const ordered = Array.from(sums.entries()).sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  const first = ordered[0]?.count || 0;
  stepSummary.value = ordered.map((s, i) => ({
    stepKey: s.stepKey,
    count: s.count,
    rate: i === 0 ? 1 : (ordered[i - 1].count > 0 ? s.count / ordered[i - 1].count : 0),
    totalRate: first > 0 ? s.count / first : 0,
  }));
}

function renderCharts() {
  if (stepSummary.value.length === 0) return;

  if (funnelChartRef.value) {
    if (!funnelChart) {
      funnelChart = echarts.init(funnelChartRef.value, "guoxue");
      window.addEventListener("resize", onResize);
    }
    funnelChart.setOption({
      tooltip: { trigger: "item", formatter: "{b}: {c}" },
      series: [{
        type: "funnel",
        left: "5%", right: "5%", top: 10, bottom: 10,
        minSize: "12%",
        sort: "none", // 按步骤顺序展示，不按数值重排（转化环节可能出现后步>前步的口径差）
        label: { show: true, position: "inside", formatter: "{b}\n{c}" },
        data: stepSummary.value.map((s) => ({ name: stepLabel(s.stepKey), value: s.count })),
      }],
    }, true);
  }

  if (trendChartRef.value) {
    if (!trendChart) trendChart = echarts.init(trendChartRef.value, "guoxue");
    const dates = series.value.map((d) => d.date.slice(5));
    const stepKeys = stepSummary.value.map((s) => s.stepKey);
    trendChart.setOption({
      tooltip: { trigger: "axis" },
      legend: { top: 0 },
      grid: { left: 40, right: 20, top: 32, bottom: 24 },
      xAxis: { type: "category", data: dates },
      yAxis: { type: "value", minInterval: 1 },
      series: stepKeys.map((key, i) => ({
        name: stepLabel(key),
        type: "line",
        smooth: true,
        data: series.value.map((d) => d.steps.find((s) => s.step === i + 1)?.count ?? 0),
      })),
    }, true);
  }
}

async function rebuild() {
  if (rebuilding.value) return;
  rebuilding.value = true;
  try {
    await funnelApi.rebuild();
    ElMessage.success("昨日漏斗已重算");
    fetchData();
  } catch {
    ElMessage.error("重算失败，请重试");
  } finally {
    rebuilding.value = false;
  }
}
</script>

<style scoped>
.page { padding: 0; }
.filter-row { display: flex; gap: var(--spacing-sm); align-items: center; margin-bottom: var(--spacing-lg); flex-wrap: wrap; }
.chart { width: 100%; }
.chart-funnel { height: 320px; }
.chart-trend { height: 320px; }
.steps-card { margin-top: var(--spacing-lg); }
.rate-low { color: var(--el-color-danger); font-weight: 600; }
.rate-na { color: var(--color-text-secondary, #909399); cursor: help; border-bottom: 1px dashed var(--color-divider, #dcdfe6); }
</style>
