<template>
  <div class="interaction-page">
    <div class="page-header">
      <h3>互动数据看板</h3>
      <el-button
        size="small"
        @click="refresh"
      >
        刷新
      </el-button>
    </div>

    <el-result
      v-if="loadError && !loading"
      icon="error"
      title="加载失败"
      sub-title="请检查网络后重试"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="refresh"
        >
          重试
        </el-button>
      </template>
    </el-result>

    <!-- 核心指标 -->
    <el-row
      v-show="!loadError"
      v-loading="loading"
      :gutter="16"
      style="margin-bottom:16px"
    >
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ stats.total.likes }}</span>
          <span class="label">累计点赞</span>
          <span class="sub">今日 +{{ stats.today.likes }}</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ stats.total.comments }}</span>
          <span class="label">累计评论</span>
          <span class="sub">今日 +{{ stats.today.comments }}</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ stats.total.follows }}</span>
          <span class="label">累计关注</span>
          <span class="sub">今日 +{{ stats.today.follows }}</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ stats.total.collects }}</span>
          <span class="label">累计收藏</span>
          <span class="sub">今日 +{{ stats.today.collects }}</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card warn">
          <span class="value">{{ stats.total.reports }}</span>
          <span class="label">累计举报</span>
          <span class="sub">今日 +{{ stats.today.reports }}</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ weekTotal.toLocaleString() }}</span>
          <span class="label">近7天互动</span>
          <span class="sub">点赞+评论+关注+收藏</span>
        </div>
      </el-col>
    </el-row>

    <!-- 互动趋势图 -->
    <el-row
      v-show="!loadError"
      :gutter="16"
      style="margin-bottom:16px"
    >
      <el-col :span="16">
        <el-card>
          <template #header>
            <span>互动趋势（近7天）</span>
          </template>
          <div
            ref="trendChart"
            style="height:300px"
          />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header>
            <span>热门内容排行</span>
          </template>
          <el-table
            v-loading="loading"
            :data="topContent"
            stripe
            size="small"
            max-height="300"
          >
            <el-table-column
              label="排名"
              width="60"
              align="center"
            >
              <template #default="{ $index }">
                {{ $index + 1 }}
              </template>
            </el-table-column>
            <el-table-column
              label="类型"
              prop="targetType"
              width="80"
            >
              <template #default="{ row }">
                {{ typeLabel(row.targetType) }}
              </template>
            </el-table-column>
            <el-table-column
              label="内容"
              min-width="140"
            >
              <template #default="{ row }">
                <div class="content-cell">
                  <el-tooltip
                    :content="row.targetId || '—'"
                    placement="top"
                  >
                    <span
                      class="id-copy"
                      @click="copyId(row.targetId)"
                    >{{ shortId(row.targetId) }}</span>
                  </el-tooltip>
                  <el-button
                    v-if="jumpRoute(row.targetType)"
                    link
                    type="primary"
                    size="small"
                    @click="jump(row)"
                  >
                    查看
                  </el-button>
                </div>
              </template>
            </el-table-column>
            <el-table-column
              label="点赞"
              prop="likeCount"
              width="70"
              align="center"
            >
              <template #default="{ row }">
                {{ (row.likeCount ?? 0).toLocaleString() }}
              </template>
            </el-table-column>
            <template #empty>
              <el-empty
                description="暂无热门内容"
                :image-size="80"
              />
            </template>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <!-- 快捷入口 -->
    <el-card>
      <template #header>
        <span>互动管理入口</span>
      </template>
      <el-row :gutter="12">
        <el-col :span="6">
          <el-button
            style="width:100%;height:56px"
            @click="router.push('/comments')"
          >
            评论管理
          </el-button>
        </el-col>
        <el-col :span="6">
          <el-button
            style="width:100%;height:56px"
            @click="router.push('/reports')"
          >
            ⚠️ 举报管理
          </el-button>
        </el-col>
        <el-col :span="6">
          <el-button
            style="width:100%;height:56px"
            @click="router.push('/risk/timeline')"
          >
            用户行为轨迹
          </el-button>
        </el-col>
        <el-col :span="6">
          <el-button
            style="width:100%;height:56px"
            @click="router.push('/risk/fraud')"
          >
            刷单识别
          </el-button>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { interactionApi } from "@/api";
import echarts from "@/utils/echarts";
import type { EChartsType } from "echarts/core";

/** 互动统计分组（累计/今日/近7天） */
interface StatsGroup { likes: number; comments: number; follows: number; collects: number; reports: number }
/** 互动统计响应 */
interface InteractionStatsResp { total?: StatsGroup; today?: StatsGroup; thisWeek?: StatsGroup }
/** 互动趋势单点 */
interface TrendPoint { date: string; likes: number; comments: number; follows: number; collects: number }
/** 热门内容行 */
interface TopContentRow { targetType?: string; targetId?: string; likeCount?: number }

const router = useRouter();

const stats = reactive({
  total: { likes: 0, comments: 0, follows: 0, collects: 0, reports: 0 },
  today: { likes: 0, comments: 0, follows: 0, collects: 0, reports: 0 },
  thisWeek: { likes: 0, comments: 0, follows: 0, collects: 0 },
});

const topContent = ref<TopContentRow[]>([]);
const trendChart = ref<HTMLElement | null>(null);
let chart: EChartsType | null = null;
const loading = ref(false);
const loadError = ref(false);

/** 近7天互动总量 = 点赞+评论+关注+收藏（与卡片文案口径对齐，原先只显示 likes 一项与文案不符） */
const weekTotal = computed(() => {
  const w = stats.thisWeek;
  return w.likes + w.comments + w.follows + w.collects;
});

function typeLabel(t?: string) {
  const m: Record<string, string> = { ARTICLE: "文章", COURSE: "课程", CIRCLE: "圈子", PRODUCT: "商品", CLASSIC: "古籍" };
  return t ? (m[t] || t) : "—";
}

/** 长 ID 截断显示前 8 位（标准§四.4） */
function shortId(id?: string) {
  if (!id) return "—";
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

/** 点击复制完整 ID（标准§四.4：截断+悬浮全文+点击复制） */
async function copyId(id?: string) {
  if (!id) return;
  try {
    await navigator.clipboard.writeText(id);
    ElMessage.success("已复制内容 ID");
  } catch {
    ElMessage.warning("复制失败，请手动选择");
  }
}

/** 各内容类型对应的管理页路由（仅登记确有的路由，未知类型不给跳转避免 404） */
const TYPE_ROUTE: Record<string, string> = {
  ARTICLE: "/contents", CLASSIC: "/contents",
  COURSE: "/courses", CIRCLE: "/circles",
};
function jumpRoute(t?: string): string | undefined {
  return t ? TYPE_ROUTE[t] : undefined;
}
function jump(row: TopContentRow) {
  const r = jumpRoute(row.targetType);
  // 带上 id 作为 query，管理页可据此高亮/搜索；无 id 时仅跳列表
  if (r) router.push({ path: r, query: row.targetId ? { id: row.targetId } : {} });
}

onMounted(() => refresh());

onBeforeUnmount(() => {
  window.removeEventListener("resize", onResize);
  chart?.dispose();
  chart = null;
});

function onResize() {
  chart?.resize();
}

async function refresh() {
  loading.value = true;
  loadError.value = false;
  try {
    const [statsRes, trendsRes, topRes] = await Promise.all([
      interactionApi.getAdminStats(),
      interactionApi.getAdminTrends(7),
      interactionApi.getAdminTopContent(10),
    ]);

    const s = statsRes.data as InteractionStatsResp;
    if (s) {
      stats.total = s.total || stats.total;
      stats.today = s.today || stats.today;
      stats.thisWeek = s.thisWeek || stats.thisWeek;
    }

    const trends = trendsRes.data as TrendPoint[];
    if (trends && trendChart.value) renderTrendChart(trends);

    const top = topRes.data as TopContentRow[];
    if (top) topContent.value = top;
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

function renderTrendChart(trends: TrendPoint[]) {
  // 复用实例，避免每次刷新重复 init 造成内存泄漏与「已有实例」告警
  if (!chart) {
    chart = echarts.init(trendChart.value!);
    window.addEventListener("resize", onResize);
  }
  chart.setOption({
    tooltip: { trigger: "axis" },
    legend: { data: ["点赞", "评论", "关注", "收藏"], bottom: 0 },
    xAxis: { type: "category", data: trends.map((t) => t.date.slice(5)) },
    yAxis: { type: "value" },
    series: [
      { name: "点赞", type: "line", smooth: true, data: trends.map((t) => t.likes), itemStyle: { color: "#409eff" } },
      { name: "评论", type: "line", smooth: true, data: trends.map((t) => t.comments), itemStyle: { color: "#67c23a" } },
      { name: "关注", type: "line", smooth: true, data: trends.map((t) => t.follows), itemStyle: { color: "#e6a23c" } },
      { name: "收藏", type: "line", smooth: true, data: trends.map((t) => t.collects), itemStyle: { color: "#f56c6c" } },
    ],
    grid: { left: 50, right: 20, top: 20, bottom: 40 },
  }, true);
}
</script>

<style scoped>
.interaction-page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.stat-card { background: var(--color-bg-page); border-radius: 10px; padding: 18px 14px; text-align: center; border: 1px solid var(--color-border); }
.stat-card .value { display: block; font-size: 28px; font-weight: 700; color: var(--color-text-title); }
.stat-card .label { display: block; font-size: 13px; color: var(--color-text-secondary); margin-top: 4px; }
.stat-card .sub { display: block; font-size: 11px; color: var(--color-success); margin-top: 2px; }
.stat-card.warn .sub { color: var(--color-error); }
.content-cell { display: flex; align-items: center; gap: 8px; }
.id-copy { font-family: var(--font-mono, monospace); font-size: 12px; color: var(--color-text-secondary); cursor: pointer; }
.id-copy:hover { color: var(--el-color-primary, #409eff); text-decoration: underline; }
</style>
