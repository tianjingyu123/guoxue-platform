<template>
  <div class="search-analytics">
    <div class="page-header">
      <h3>搜索分析与AI监控</h3>
      <el-button
        size="small"
        :loading="refreshing"
        @click="refresh"
      >
        刷新
      </el-button>
    </div>

    <!-- 概览卡片：总/今日搜索为后端全库统计；AI 延迟为当前页口径。
         原「零结果率/AI覆盖率」两卡无任何后端数据源（/search/stats 不返回该字段·恒显 0% 属假指标）已下架，
         已记后端清单：需 SearchHistory 增加结果数/AI命中埋点后再上。 -->
    <el-row
      :gutter="16"
      style="margin-bottom:16px"
    >
      <el-col :span="6">
        <div class="stat-card">
          <span class="value">{{ fmtNum(stats.totalSearches) }}</span><span class="label">总搜索次数（全量）</span>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <span class="value">{{ fmtNum(stats.todaySearches) }}</span><span class="label">今日搜索</span>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card info">
          <span class="value">{{ fmtNum(stats.aiCallCount) }}</span><span class="label">AI任务调用数（全量）</span>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <span class="value">{{ stats.avgAiLatency ? stats.avgAiLatency + 'ms' : '—' }}</span><span class="label">AI平均响应（当前页）</span>
        </div>
      </el-col>
    </el-row>

    <el-tabs
      v-model="activeTab"
    >
      <!-- 搜索分析 -->
      <el-tab-pane
        label="搜索分析"
        name="analytics"
      >
        <el-row :gutter="16">
          <el-col :span="14">
            <el-card>
              <template #header>
                <span>热搜关键词 TOP20</span>
              </template>
              <div
                v-if="stats.hotKeywords?.length"
                class="keyword-cloud"
              >
                <el-tag
                  v-for="(kw, idx) in stats.hotKeywords"
                  :key="kw.keyword"
                  :type="idx < 3 ? 'danger' : idx < 10 ? 'warning' : 'info'"
                  size="large"
                  class="keyword-tag"
                >
                  {{ kw.keyword }} <span class="kw-count">({{ kw.count }})</span>
                </el-tag>
              </div>
              <el-empty
                v-else
                description="暂无热搜数据"
              />
            </el-card>
          </el-col>
          <el-col :span="10">
            <el-card>
              <template #header>
                <span>最近搜索</span>
              </template>
              <div
                v-if="stats.recentSearches?.length"
                class="recent-list"
              >
                <div
                  v-for="s in stats.recentSearches"
                  :key="s.keyword + s.createdAt"
                  class="recent-item"
                >
                  <span class="recent-keyword">{{ s.keyword }}</span>
                  <span class="recent-meta">{{ s.user?.nickname || '匿名' }} · {{ fmtTime(s.createdAt) }}</span>
                </div>
              </div>
              <el-empty
                v-else
                description="暂无搜索记录"
              />
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <!-- AI监控 -->
      <el-tab-pane
        label="AI搜索监控"
        name="ai-monitor"
      >
        <el-alert
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom:12px"
          title="AI 自动化能力 · 后续迁入 AI 工作区"
          description="本页日志来自 AI 媒体任务（图像审核/语音合成/语音转写）执行记录；AI 搜索专项日志待后端埋点后单列。"
        />

        <!-- 筛选：后端 /ai/media/tasks 仅支持 type 筛选（原关键词/状态/日期筛选后端不接收参数=假筛选，已移除；
             内容检索/状态筛选已记后端清单） -->
        <el-card style="margin-bottom:12px">
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <span style="font-size:13px;color:var(--color-text-secondary)">任务类型</span>
            <el-select
              v-model="aiFilter.type"
              placeholder="全部"
              size="small"
              clearable
              style="width:150px"
              @change="onAiTypeChange"
            >
              <el-option
                label="图像审核"
                value="image_audit"
              />
              <el-option
                label="语音合成"
                value="tts"
              />
              <el-option
                label="语音转写"
                value="transcribe"
              />
            </el-select>
            <el-button
              size="small"
              type="primary"
              :loading="aiLoading"
              @click="fetchAiLogs"
            >
              查询
            </el-button>
          </div>
        </el-card>

        <!-- AI任务日志表 -->
        <el-card>
          <template #header>
            <span>AI 任务调用日志</span>
          </template>
          <el-table
            v-loading="aiLoading"
            :data="aiLogs"
            stripe
            size="small"
            max-height="450"
          >
            <template #empty>
              <el-empty
                description="暂无 AI 调用记录"
                :image-size="60"
              />
            </template>
            <el-table-column
              label="用户"
              width="120"
            >
              <template #default="{ row }">
                <span
                  v-if="row.userId"
                  class="copyable-id"
                  :title="row.userId"
                  @click="copyText(row.userId)"
                >{{ shortId(row.userId) }}</span>
                <span v-else>匿名</span>
              </template>
            </el-table-column>
            <el-table-column
              label="场景"
              width="100"
            >
              <template #default="{ row }">
                {{ sceneLabel(row.scene) }}
              </template>
            </el-table-column>
            <el-table-column
              label="模型"
              width="130"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                {{ row.modelUsed || row.modelName || '—' }}
              </template>
            </el-table-column>
            <el-table-column
              label="输入摘要"
              min-width="180"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                {{ row.inputSummary || '—' }}
              </template>
            </el-table-column>
            <el-table-column
              label="输出摘要"
              min-width="220"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                {{ row.outputSummary || row.analysisContent || '—' }}
              </template>
            </el-table-column>
            <el-table-column
              label="Token"
              width="110"
            >
              <template #default="{ row }">
                {{ tokenText(row.tokenUsage) }}
              </template>
            </el-table-column>
            <el-table-column
              label="延迟"
              width="80"
            >
              <template #default="{ row }">
                {{ row.latency ? row.latency + 'ms' : '—' }}
              </template>
            </el-table-column>
            <el-table-column
              label="时间"
              width="150"
            >
              <template #default="{ row }">
                {{ fmtTime(row.createdAt) }}
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-model:current-page="aiPagination.page"
            :total="aiPagination.total"
            :page-size="20"
            layout="total, prev, pager, next"
            style="margin-top:12px;justify-content:flex-end"
            @current-change="fetchAiLogs"
          />
        </el-card>
      </el-tab-pane>

      <!-- AI搜索效果分析 -->
      <el-tab-pane
        label="AI效果分析"
        name="ai-effect"
      >
        <el-row
          :gutter="16"
          style="margin-bottom:16px"
        >
          <el-col :span="12">
            <el-card>
              <template #header>
                <span>搜索量趋势（近7天）</span>
              </template>
              <div
                v-show="trendHasData"
                ref="trendChartRef"
                style="height:300px"
              />
              <el-empty
                v-if="!trendHasData"
                description="近7天暂无搜索记录"
                :image-size="80"
                style="height:300px"
              />
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card>
              <template #header>
                <span>搜索场景分布</span>
              </template>
              <el-empty
                description="该指标暂无场景分类数据源（待后端埋点统计）"
                :image-size="80"
                style="height:300px"
              />
            </el-card>
          </el-col>
        </el-row>

        <!-- 零结果关键词。原「AI生成内容/加入知识库」两按钮仅 toast 不调任何 API（后端无对应端点）
             属假按钮已删除；已记后端清单：零结果词 AI 补内容/知识库候选端点。 -->
        <el-card>
          <template #header>
            <span>近期搜索词（零结果专项统计待后端埋点）</span>
          </template>
          <el-table
            :data="zeroResultKeywords"
            stripe
            size="small"
            max-height="300"
          >
            <template #empty>
              <el-empty
                description="暂无搜索词记录"
                :image-size="60"
              />
            </template>
            <el-table-column
              prop="keyword"
              label="关键词"
              min-width="180"
            />
            <el-table-column
              label="搜索次数"
              width="100"
              align="center"
            >
              <template #default="{ row }">
                {{ row.count ?? '—' }}
              </template>
            </el-table-column>
            <el-table-column
              label="搜索时间"
              width="160"
            >
              <template #default="{ row }">
                {{ fmtTime(row.createdAt) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick, onBeforeUnmount } from "vue";
import { ElMessage } from "element-plus";
import * as echarts from "echarts";
import { api, aiAdminApi, searchApi } from "@/api";

const activeTab = ref("analytics");

/** AI 调用日志行（对齐后端 AiAnalysisRecord select 字段·ai-logger.service.ts：
 *  无 status/query/response 字段，延迟字段为 latency 非 latencyMs） */
interface AiLogRow {
  id?: string;
  userId?: string;
  scene?: string;
  modelName?: string;
  modelUsed?: string;
  inputSummary?: string;
  outputSummary?: string;
  analysisContent?: string;
  tokenUsage?: unknown;
  latency?: number;
  cost?: number;
  createdAt?: string;
}
/** 零结果关键词行（后端 getZeroResults 返回 {keywords:[{keyword,createdAt}]}·无 count 字段） */
interface ZeroResultRow {
  keyword: string;
  count?: number;
  createdAt?: string;
}

const stats = reactive({
  totalSearches: 0, todaySearches: 0, aiCallCount: 0, avgAiLatency: 0,
  hotKeywords: [] as { keyword: string; count: number }[],
  recentSearches: [] as { keyword: string; createdAt: string; user?: { nickname: string } }[],
});

// AI任务日志
const aiLogs = ref<AiLogRow[]>([]);
const aiLoading = ref(false);
const aiFilter = reactive({ type: "" });
const aiPagination = reactive({ page: 1, total: 0 });
const refreshing = ref(false);

// AI效果分析
const zeroResultKeywords = ref<ZeroResultRow[]>([]);

// 搜索量趋势（近7天，真实聚合）
const trendChartRef = ref<HTMLElement | null>(null);
const trendHasData = ref(false);
let trendChart: echarts.ECharts | null = null;

function fmtNum(v: number): string {
  if (!v) return "0";
  if (v >= 10000) return (v / 10000).toFixed(1) + "w";
  if (v >= 1000) return (v / 1000).toFixed(1) + "k";
  return String(v);
}

function fmtTime(t?: string): string {
  if (!t) return "—";
  const d = new Date(t);
  return d.toLocaleString("zh-CN", { hour12: false });
}

function shortId(id?: string): string {
  if (!id) return "—";
  return id.length > 8 ? id.slice(0, 8) + "…" : id;
}

async function copyText(text?: string) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success("已复制");
  } catch {
    ElMessage.warning("复制失败，请手动选择复制");
  }
}

const SCENE_MAP: Record<string, string> = {
  media_audit: "图像审核",
  media_tts: "语音合成",
  media_transcribe: "语音转写",
  smart_search: "AI搜索",
};
function sceneLabel(s?: string) { return SCENE_MAP[s ?? ""] || s || "—"; }

function tokenText(t: unknown): string {
  if (!t || typeof t !== "object") return "—";
  const u = t as { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  if (u.promptTokens !== undefined || u.completionTokens !== undefined) {
    return `P:${u.promptTokens ?? 0} C:${u.completionTokens ?? 0}`;
  }
  if (u.totalTokens !== undefined) return `共${u.totalTokens}`;
  return "—";
}

onMounted(() => refresh());

async function refresh() {
  refreshing.value = true;
  try {
    await Promise.all([fetchStats(), fetchAiLogs(), fetchZeroResults(), fetchTrend()]);
  } finally { refreshing.value = false; }
}

async function fetchTrend() {
  try {
    const { data } = await api.get("/search/admin/trend", { params: { days: 7 } });
    const series: { date: string; total: number }[] =
      (data as { series?: { date: string; total: number }[] })?.series || [];
    const hasData = series.some((s) => s.total > 0);
    trendHasData.value = hasData;
    if (!hasData) {
      trendChart?.dispose();
      trendChart = null;
      return;
    }
    await nextTick();
    if (!trendChartRef.value) return;
    if (!trendChart) trendChart = echarts.init(trendChartRef.value);
    trendChart.setOption({
      tooltip: { trigger: "axis" },
      grid: { left: 45, right: 24, top: 16, bottom: 28 },
      xAxis: {
        type: "category",
        data: series.map((s) => s.date.slice(5)),
        axisLabel: { fontSize: 10 },
      },
      yAxis: { type: "value", name: "搜索次数", minInterval: 1 },
      series: [{
        name: "搜索次数",
        type: "line",
        smooth: true,
        areaStyle: { opacity: 0.12 },
        itemStyle: { color: "#409eff" },
        data: series.map((s) => s.total),
      }],
    });
  } catch { trendHasData.value = false; }
}

onBeforeUnmount(() => {
  trendChart?.dispose();
  trendChart = null;
});

async function fetchStats() {
  try {
    // /search/stats 返回 {totalSearches, todaySearches, hotKeywords, recentSearches}（全库统计）
    const { data } = await searchApi.getStats();
    const d = data as Partial<typeof stats> | null;
    if (d && typeof d === "object") {
      stats.totalSearches = d.totalSearches ?? 0;
      stats.todaySearches = d.todaySearches ?? 0;
      stats.hotKeywords = Array.isArray(d.hotKeywords) ? d.hotKeywords : [];
      stats.recentSearches = Array.isArray(d.recentSearches) ? d.recentSearches : [];
    }
  } catch { /* 概览卡降级为 0，不阻塞页面 */ }
}

function onAiTypeChange() {
  aiPagination.page = 1;
  fetchAiLogs();
}

async function fetchAiLogs() {
  aiLoading.value = true;
  try {
    // /ai/media/tasks 仅接收 page/pageSize/type；后端返回 {list,total}，
    // 全局响应拦截器统一规范化为 {items,total,...}，故优先读 items
    const params: Record<string, string | number> = { page: aiPagination.page, pageSize: 20 };
    if (aiFilter.type) params.type = aiFilter.type;
    const { data } = await aiAdminApi.getCallLogs(params);
    const d = data as { items?: AiLogRow[]; list?: AiLogRow[]; data?: AiLogRow[]; total?: number } | AiLogRow[] | null;
    const rawList = Array.isArray(d) ? d : (d?.items || d?.list || d?.data || []);
    aiLogs.value = Array.isArray(rawList) ? rawList : [];
    aiPagination.total = (Array.isArray(d) ? d.length : d?.total) || aiLogs.value.length;

    // 概览卡：AI 调用总数=全量 total；平均响应=当前页口径（卡片已标注）
    stats.aiCallCount = aiPagination.total;
    const latencies = aiLogs.value.map((l) => l.latency).filter((v): v is number => typeof v === "number" && v > 0);
    stats.avgAiLatency = latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;
  } catch { aiLogs.value = []; } finally { aiLoading.value = false; }
}

async function fetchZeroResults() {
  try {
    const { data } = await api.get("/search/zero-results");
    const d = data as { keywords?: ZeroResultRow[]; data?: ZeroResultRow[] } | ZeroResultRow[] | null;
    const rawList = Array.isArray(d) ? d : (d?.keywords || d?.data || []);
    zeroResultKeywords.value = Array.isArray(rawList) ? rawList : [];
  } catch { zeroResultKeywords.value = []; }
}
</script>

<style scoped>
.search-analytics { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.stat-card { background: #f5f7fa; border-radius: 8px; padding: 14px; text-align: center; }
.stat-card .value { display: block; font-size: 24px; font-weight: 700; color: #303133; }
.stat-card .label { display: block; font-size: 12px; color: #909399; margin-top: 2px; }
.stat-card.info .value { color: #409eff; }
.copyable-id { cursor: pointer; }
.copyable-id:hover { color: #409eff; text-decoration: underline; }

.keyword-cloud { display: flex; flex-wrap: wrap; gap: 10px; padding: 8px 0; }
.keyword-tag { cursor: default; }
.kw-count { opacity: 0.7; font-size: 11px; margin-left: 2px; }

.recent-list { max-height: 360px; overflow-y: auto; }
.recent-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f5f5f5; }
.recent-keyword { font-size: 14px; color: #333; }
.recent-meta { font-size: 12px; color: #bbb; }
</style>
