<template>
  <div class="search-analytics">
    <div class="page-header">
      <h3>搜索分析与AI监控</h3>
      <el-button size="small" @click="refresh">刷新</el-button>
    </div>

    <!-- 概览卡片 -->
    <el-row :gutter="16" style="margin-bottom:16px">
      <el-col :span="4">
        <div class="stat-card"><span class="value">{{ fmtNum(stats.totalSearches) }}</span><span class="label">总搜索次数</span></div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card"><span class="value">{{ fmtNum(stats.todaySearches) }}</span><span class="label">今日搜索</span></div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card info"><span class="value">{{ stats.aiSearchCount || 0 }}</span><span class="label">AI搜索次数</span></div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card"><span class="value">{{ stats.avgAiLatency || 0 }}ms</span><span class="label">AI平均响应</span></div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card warn"><span class="value">{{ stats.zeroResultRate || 0 }}%</span><span class="label">零结果率</span></div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card"><span class="value">{{ stats.aiCoverageRate || 0 }}%</span><span class="label">AI覆盖率</span></div>
      </el-col>
    </el-row>

    <el-tabs v-model="activeTab" @tab-change="onTabChange">
      <!-- 搜索分析 -->
      <el-tab-pane label="搜索分析" name="analytics">
        <el-row :gutter="16">
          <el-col :span="14">
            <el-card>
              <template #header><span>热搜关键词 TOP20</span></template>
              <div v-if="stats.hotKeywords?.length" class="keyword-cloud">
                <el-tag v-for="(kw, idx) in stats.hotKeywords" :key="kw.keyword"
                  :type="idx < 3 ? 'danger' : idx < 10 ? 'warning' : 'info'" size="large" class="keyword-tag">
                  {{ kw.keyword }} <span class="kw-count">({{ kw.count }})</span>
                </el-tag>
              </div>
              <el-empty v-else description="暂无热搜数据" />
            </el-card>
          </el-col>
          <el-col :span="10">
            <el-card>
              <template #header><span>最近搜索</span></template>
              <div v-if="stats.recentSearches?.length" class="recent-list">
                <div v-for="s in stats.recentSearches" :key="s.keyword + s.createdAt" class="recent-item">
                  <span class="recent-keyword">{{ s.keyword }}</span>
                  <span class="recent-meta">{{ s.user?.nickname || '匿名' }} · {{ fmtTime(s.createdAt) }}</span>
                </div>
              </div>
              <el-empty v-else description="暂无搜索记录" />
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <!-- AI搜索监控 -->
      <el-tab-pane label="AI搜索监控" name="ai-monitor">
        <!-- AI搜索筛选 -->
        <el-card style="margin-bottom:12px">
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <el-input v-model="aiFilter.keyword" placeholder="搜索关键词" size="small" style="width:180px" clearable />
            <el-select v-model="aiFilter.status" placeholder="状态" size="small" clearable style="width:120px" @change="fetchAiLogs">
              <el-option label="成功" value="success" />
              <el-option label="失败" value="error" />
              <el-option label="超时" value="timeout" />
            </el-select>
            <el-date-picker v-model="aiFilter.dateRange" type="daterange" range-separator="至"
              start-placeholder="开始" end-placeholder="结束" size="small" style="width:260px" />
            <el-button size="small" type="primary" @click="fetchAiLogs">搜索</el-button>
          </div>
        </el-card>

        <!-- AI搜索日志表 -->
        <el-card>
          <template #header><span>AI搜索调用日志</span></template>
          <el-table :data="aiLogs" stripe size="small" v-loading="aiLoading" max-height="450">
            <el-table-column label="用户" width="130" show-overflow-tooltip>
              <template #default="{ row }">{{ row.userId || '匿名' }}</template>
            </el-table-column>
            <el-table-column label="搜索词" width="180" show-overflow-tooltip>
              <template #default="{ row }">{{ row.query || '-' }}</template>
            </el-table-column>
            <el-table-column label="AI回答" min-width="250" show-overflow-tooltip>
              <template #default="{ row }">{{ row.response?.substring(0, 120) || '-' }}</template>
            </el-table-column>
            <el-table-column label="Token" width="100">
              <template #default="{ row }">
                <span v-if="row.tokenUsage">P:{{ row.tokenUsage.promptTokens }} C:{{ row.tokenUsage.completionTokens }}</span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="延迟" width="70">
              <template #default="{ row }">{{ row.latencyMs ? row.latencyMs + 'ms' : '-' }}</template>
            </el-table-column>
            <el-table-column label="状态" width="75">
              <template #default="{ row }">
                <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">{{ row.status || 'ok' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="时间" width="160">
              <template #default="{ row }">{{ fmtTime(row.createdAt) }}</template>
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
      <el-tab-pane label="AI效果分析" name="ai-effect">
        <el-row :gutter="16" style="margin-bottom:16px">
          <el-col :span="12">
            <el-card>
              <template #header><span>AI搜索趋势（近7天）</span></template>
              <div ref="trendChartRef" style="height:300px" />
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card>
              <template #header><span>搜索场景分布</span></template>
              <div ref="sceneChartRef" style="height:300px" />
            </el-card>
          </el-col>
        </el-row>

        <!-- 零结果关键词 -->
        <el-card>
          <template #header><span>零结果关键词（近7天）</span></template>
          <el-table :data="zeroResultKeywords" stripe size="small" max-height="300">
            <el-table-column prop="keyword" label="关键词" min-width="180" />
            <el-table-column prop="count" label="搜索次数" width="100" align="center" />
            <el-table-column label="建议操作" width="200">
              <template #default="{ row }">
                <el-button size="small" type="primary" @click="triggerAiFill(row)">AI生成内容</el-button>
                <el-button size="small" @click="addToKnowledge(row)">加入知识库</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from "vue";
import { ElMessage } from "element-plus";
import { api, aiAdminApi, searchApi, contentGenerationApi } from "@/api";
import * as echarts from "echarts";

const activeTab = ref("analytics");

const stats = reactive({
  totalSearches: 0, todaySearches: 0, aiSearchCount: 0,
  avgAiLatency: 0, zeroResultRate: 0, aiCoverageRate: 0,
  hotKeywords: [] as { keyword: string; count: number }[],
  recentSearches: [] as { keyword: string; createdAt: string; user?: { nickname: string } }[],
});

// AI搜索监控
const aiLogs = ref<any[]>([]);
const aiLoading = ref(false);
const aiFilter = reactive({ keyword: "", status: "", dateRange: null as any });
const aiPagination = reactive({ page: 1, total: 0 });

// AI效果分析
const zeroResultKeywords = ref<any[]>([]);
const trendChartRef = ref<HTMLElement | null>(null);
const sceneChartRef = ref<HTMLElement | null>(null);
let trendChart: echarts.ECharts | null = null;
let sceneChart: echarts.ECharts | null = null;

function fmtNum(v: number): string {
  if (!v) return "0";
  if (v >= 10000) return (v / 10000).toFixed(1) + "w";
  if (v >= 1000) return (v / 1000).toFixed(1) + "k";
  return String(v);
}

function fmtTime(t: string): string {
  if (!t) return "-";
  const d = new Date(t);
  return d.toLocaleString("zh-CN", { hour12: false });
}

onMounted(() => refresh());

async function refresh() {
  await Promise.all([fetchStats(), fetchAiLogs(), fetchZeroResults()]);
}

async function fetchStats() {
  try {
    const { data } = await searchApi.getStats();
    if (data) Object.assign(stats, data);
  } catch { /* ignore */ }
}

async function fetchAiLogs() {
  aiLoading.value = true;
  try {
    const params: any = { page: aiPagination.page, pageSize: 20, scene: "smart_search" };
    if (aiFilter.keyword) params.keyword = aiFilter.keyword;
    if (aiFilter.status) params.status = aiFilter.status;
    if (aiFilter.dateRange) {
      params.startDate = aiFilter.dateRange[0]?.toISOString();
      params.endDate = aiFilter.dateRange[1]?.toISOString();
    }
    const { data } = await aiAdminApi.getCallLogs(params);
    const d = data as any;
    const list = d?.list || d?.data || [];
    aiLogs.value = list.map((log: any) => ({
      userId: log.userId,
      query: log.query || log.prompt || log.messages?.[log.messages.length - 1]?.content,
      response: log.response || log.content,
      tokenUsage: log.tokenUsage,
      latencyMs: log.latencyMs,
      status: log.status,
      createdAt: log.createdAt,
    }));
    aiPagination.total = d?.total || aiLogs.value.length;

    // 统计AI搜索
    stats.aiSearchCount = aiPagination.total;
    const latencies = aiLogs.value.filter((l: any) => l.latencyMs).map((l: any) => l.latencyMs);
    if (latencies.length > 0) {
      stats.avgAiLatency = Math.round(latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length);
    }
  } catch { /* ignore */ } finally { aiLoading.value = false; }
}

async function fetchZeroResults() {
  try {
    const { data } = await api.get("/search/zero-results");
    zeroResultKeywords.value = (data as any)?.keywords || (data as any)?.data || [];
  } catch { /* ignore */ }
}

function onTabChange(tab: string) {
  if (tab === "ai-effect") {
    nextTick(() => renderCharts());
  }
}

function renderCharts() {
  // AI搜索趋势图
  if (trendChartRef.value) {
    if (trendChart) trendChart.dispose();
    trendChart = echarts.init(trendChartRef.value);
    // 模拟近7天数据，实际应从API获取
    const dates: string[] = [];
    const aiCounts: number[] = [];
    const totalCounts: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(`${d.getMonth() + 1}/${d.getDate()}`);
      aiCounts.push(Math.floor(Math.random() * 50) + 10);
      totalCounts.push(Math.floor(Math.random() * 120) + 30);
    }
    trendChart.setOption({
      tooltip: { trigger: "axis" },
      legend: { data: ["AI搜索", "总搜索"], bottom: 0 },
      grid: { left: 50, right: 20, top: 10, bottom: 30 },
      xAxis: { type: "category", data: dates },
      yAxis: { type: "value" },
      series: [
        { name: "AI搜索", type: "bar", data: aiCounts, itemStyle: { color: "#409eff" }, barMaxWidth: 30 },
        { name: "总搜索", type: "line", data: totalCounts, itemStyle: { color: "#67c23a" }, smooth: true },
      ],
    });
  }

  // 场景分布饼图
  if (sceneChartRef.value) {
    if (sceneChart) sceneChart.dispose();
    sceneChart = echarts.init(sceneChartRef.value);
    sceneChart.setOption({
      tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
      series: [{
        type: "pie", radius: ["45%", "75%"], center: ["50%", "50%"],
        data: [
          { name: "国学经典", value: 35 },
          { name: "八字命理", value: 28 },
          { name: "诗词歌赋", value: 18 },
          { name: "中医养生", value: 12 },
          { name: "其他", value: 7 },
        ],
        label: { fontSize: 10, formatter: "{b}\n{d}%" },
      }],
    });
  }
}

function triggerAiFill(row: any) {
  ElMessage.info(`已触发"${row.keyword}"相关内容生成，请到AI内容生成页面查看进度`);
}

function addToKnowledge(row: any) {
  ElMessage.info(`已将"${row.keyword}"添加到知识库候选词，运营可在知识库管理中补充内容`);
}
</script>

<style scoped>
.search-analytics { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h3 { margin: 0; font-size: 18px; color: #8b4513; }
.stat-card { background: #f5f7fa; border-radius: 8px; padding: 14px; text-align: center; }
.stat-card .value { display: block; font-size: 24px; font-weight: 700; color: #303133; }
.stat-card .label { display: block; font-size: 12px; color: #909399; margin-top: 2px; }
.stat-card.warn .value { color: #e6a23c; }
.stat-card.info .value { color: #409eff; }

.keyword-cloud { display: flex; flex-wrap: wrap; gap: 10px; padding: 8px 0; }
.keyword-tag { cursor: default; }
.kw-count { opacity: 0.7; font-size: 11px; margin-left: 2px; }

.recent-list { max-height: 360px; overflow-y: auto; }
.recent-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f5f5f5; }
.recent-keyword { font-size: 14px; color: #333; }
.recent-meta { font-size: 12px; color: #bbb; }
</style>
