<template>
  <div class="aio-page">
    <div class="page-header">
      <h3>AI运营效果追踪</h3>
      <el-button @click="refreshAll">刷新全部</el-button>
    </div>

    <!-- AI调用概览 -->
    <el-row :gutter="16" style="margin-bottom:16px">
      <el-col :span="4">
        <div class="stat-card"><span class="value">{{ aiStats.totalCalls?.toLocaleString() || 0 }}</span><span class="label">总AI调用次数</span></div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card"><span class="value">{{ aiStats.todayCalls?.toLocaleString() || 0 }}</span><span class="label">今日调用</span></div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card info"><span class="value">{{ aiStats.activeBots || 0 }}</span><span class="label">活跃Bot数</span></div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card"><span class="value">{{ genStats.totalGenerated || 0 }}</span><span class="label">AI生成内容</span></div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card"><span class="value">{{ genStats.draftPending || 0 }}</span><span class="label">待审核草稿</span></div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card warn"><span class="value">{{ aiStats.abnormalAlerts || 0 }}</span><span class="label">异常告警</span></div>
      </el-col>
    </el-row>

    <!-- 品类生成分布 + 机器人活动 -->
    <el-row :gutter="16" style="margin-bottom:16px">
      <el-col :span="14">
        <el-card>
          <template #header><span>品类内容健康度</span></template>
          <div v-if="catStats.length" style="max-height:360px;overflow-y:auto">
            <div v-for="cat in catStats" :key="cat.level1" style="margin-bottom:8px">
              <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:2px">
                <span style="font-weight:600">{{ cat.level1 }}</span>
                <span :style="{ color: cat.emptySubs > 0 ? '#f56c6c' : '#67c23a' }">
                  {{ cat.publishedTotal }} 已发布 / {{ cat.emptySubs }} 空缺
                </span>
              </div>
              <el-progress
                :percentage="cat.subCategories === 0 ? 0 : Math.round((cat.subCategories - cat.emptySubs) / cat.subCategories * 100)"
                :status="cat.emptySubs > cat.subCategories / 2 ? 'exception' : cat.emptySubs > 0 ? 'warning' : 'success'"
                :stroke-width="12"
              />
            </div>
          </div>
          <el-empty v-else description="暂无品类数据" :image-size="60" />
        </el-card>
      </el-col>
      <el-col :span="10">
        <el-card>
          <template #header><span>虚拟运营机器人</span></template>
          <div v-if="robots.length">
            <div v-for="bot in robots" :key="bot.role" class="robot-row">
              <span class="bot-icon">{{ botIcons[bot.role] || '🤖' }}</span>
              <span class="bot-name">{{ bot.name || bot.role }}</span>
              <el-switch
                v-model="bot.enabled"
                size="small"
                :loading="botToggling === bot.role"
                @change="(v: boolean) => toggleBot(bot, v)"
              />
              <el-tag :type="bot.enabled ? 'success' : 'info'" size="small">{{ bot.enabled ? '运行中' : '已停' }}</el-tag>
            </div>
          </div>
          <el-empty v-else description="暂无机器人数据" :image-size="60" />
        </el-card>
      </el-col>
    </el-row>

    <!-- Token用量趋势 + 最新调用 -->
    <el-row :gutter="16" style="margin-bottom:16px">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>Token用量趋势（近7天）</span>
              <el-radio-group v-model="tokenPeriod" size="small" @change="fetchTokenTrend">
                <el-radio-button value="day">日</el-radio-button>
                <el-radio-button value="week">周</el-radio-button>
                <el-radio-button value="month">月</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div v-if="tokenTrend.length" :style="{ height: '240px' }" ref="chartRef" />
          <el-empty v-else description="暂无用量数据" :image-size="60" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header><span>最新AI调用日志</span></template>
          <el-table :data="recentLogs" size="small" max-height="240">
            <el-table-column label="场景" width="140" show-overflow-tooltip>
              <template #default="{ row }">{{ row.scene || row.service || '-' }}</template>
            </el-table-column>
            <el-table-column label="模型" width="120" prop="modelName" show-overflow-tooltip />
            <el-table-column label="Token" width="100">
              <template #default="{ row }">
                <span v-if="row.tokenUsage">{{ (row.tokenUsage.promptTokens || 0) + (row.tokenUsage.completionTokens || 0) }}</span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="70">
              <template #default="{ row }">
                <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">{{ row.status || 'ok' }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <!-- 内容生成任务 + 空品类 -->
    <el-row :gutter="16">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>内容生成任务</span>
              <el-button size="small" @click="showGenPanel = !showGenPanel">手动生成</el-button>
            </div>
          </template>
          <div v-if="showGenPanel" style="margin-bottom:12px;display:flex;gap:8px">
            <el-select v-model="genL1" placeholder="一级品类" size="small" style="width:150px" filterable>
              <el-option v-for="cat in catStats" :key="cat.level1" :label="cat.level1" :value="cat.level1" />
            </el-select>
            <el-select v-model="genL2" placeholder="二级品类" size="small" style="width:150px" filterable>
              <el-option v-for="sub in genL2Options" :key="sub" :label="sub" :value="sub" />
            </el-select>
            <el-button size="small" type="primary" :loading="generating" @click="triggerGen">生成</el-button>
          </div>
          <div style="font-size:13px">
            <div v-if="emptyCats.length">
              <span style="color:#f56c6c">⚠ 空品类（{{ emptyCats.length }}个）：</span>
              <el-tag v-for="cat in emptyCats.slice(0, 8)" :key="cat.level1 + cat.level2" size="small" type="danger" style="margin:2px">
                {{ cat.level1 }}/{{ cat.level2 }}
              </el-tag>
              <span v-if="emptyCats.length > 8" style="color:#909399">...还有{{ emptyCats.length - 8 }}个</span>
            </div>
            <div v-else style="color:#67c23a">所有品类均有内容填充 ✓</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header><span>快捷入口</span></template>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            <el-button size="small" @click="$router.push('/content-generation')">AI内容生成</el-button>
            <el-button size="small" @click="$router.push('/ai/chat-logs')">对话日志</el-button>
            <el-button size="small" @click="$router.push('/ai/call-monitor')">调用监控</el-button>
            <el-button size="small" @click="$router.push('/operation/engine')">运营引擎</el-button>
            <el-button size="small" @click="$router.push('/operation/robots')">运营机器人</el-button>
            <el-button size="small" type="primary" @click="$router.push('/knowledge')">知识库管理</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick, watch } from "vue";
import { ElMessage } from "element-plus";
import { aiAdminApi, contentGenerationApi } from "@/api";
import { api } from "@/api";
import * as echarts from "echarts";

const botIcons: Record<string, string> = { like_bot: "👍", comment_bot: "💬", signin_bot: "📝", question_bot: "❓" };

const aiStats = reactive({ totalCalls: 0, todayCalls: 0, activeBots: 0, abnormalAlerts: 0 });
const genStats = reactive({ totalGenerated: 0, draftPending: 0 });
const catStats = ref<any[]>([]);
const robots = ref<any[]>([]);
const botToggling = ref("");
const recentLogs = ref<any[]>([]);
const tokenTrend = ref<any[]>([]);
const tokenPeriod = ref("week");
const chartRef = ref<HTMLElement | null>(null);
let chartInstance: echarts.ECharts | null = null;

const showGenPanel = ref(false);
const genL1 = ref("");
const genL2 = ref("");
const generating = ref(false);

const genL2Options = computed(() => {
  if (!genL1.value) return [];
  const cat = catStats.value.find((c: any) => c.level1 === genL1.value);
  return cat?.subs || [];
});

const emptyCats = computed(() => {
  const result: any[] = [];
  for (const cat of catStats.value) {
    for (const sub of (cat.subs || [])) {
      if (!cat.subStats || !cat.subStats[sub] || cat.subStats[sub].total === 0) {
        result.push({ level1: cat.level1, level2: sub });
      }
    }
  }
  return result;
});

onMounted(() => refreshAll());

async function refreshAll() {
  await Promise.all([fetchAiStats(), fetchCatStats(), fetchRobots(), fetchRecentLogs(), fetchTokenTrend()]);
}

async function fetchAiStats() {
  try {
    const { data } = await aiAdminApi.getCallStats();
    const d = data as any;
    aiStats.totalCalls = d?.totalCalls || 0;
    aiStats.todayCalls = d?.todayCalls || 0;
    aiStats.activeBots = d?.activeBots || 0;
    aiStats.abnormalAlerts = d?.abnormalAlerts || 0;
  } catch { /* ignore */ }
}

async function fetchCatStats() {
  try {
    const [statsRes, treeRes] = await Promise.all([
      contentGenerationApi.getStats(),
      contentGenerationApi.getCategories(),
    ]);
    const statsData = statsRes.data as any;
    const tree = treeRes.data as Record<string, string[]>;

    const list: any[] = [];
    for (const [level1, subs] of Object.entries(tree || {})) {
      const subStats: Record<string, any> = {};
      let publishedTotal = 0, draftTotal = 0, emptySubs = 0;

      for (const sub of subs) {
        const s = (statsData?.stats || []).find((r: any) => r.level1 === level1 && r.level2 === sub);
        if (s) {
          subStats[sub] = s;
          publishedTotal += s.published;
          draftTotal += s.draft;
          if (s.total === 0) emptySubs++;
        } else {
          subStats[sub] = { published: 0, draft: 0, total: 0 };
          emptySubs++;
        }
      }

      list.push({ level1, subs, subStats, publishedTotal, draftTotal, emptySubs, subCategories: subs.length });
      genStats.totalGenerated += publishedTotal + draftTotal;
      genStats.draftPending += draftTotal;
    }
    catStats.value = list;
  } catch { /* ignore */ }
}

async function fetchRobots() {
  try {
    const { data } = await api.get("/operation-robots");
    robots.value = (data as any[]) || [];
  } catch { /* ignore */ }
}

async function fetchRecentLogs() {
  try {
    const { data } = await aiAdminApi.getCallLogs({ page: 1, pageSize: 10 });
    recentLogs.value = ((data as any)?.list || (data as any)?.data || []).slice(0, 10);
  } catch { /* ignore */ }
}

async function fetchTokenTrend() {
  try {
    const { data } = await aiAdminApi.getCallStats(tokenPeriod.value);
    tokenTrend.value = (data as any)?.trend || (data as any)?.dailyStats || [];
    await nextTick();
    renderChart();
  } catch { /* ignore */ }
}

function renderChart() {
  if (!chartRef.value || tokenTrend.value.length === 0) return;
  if (chartInstance) chartInstance.dispose();

  chartInstance = echarts.init(chartRef.value);
  const dates = tokenTrend.value.map((d: any) => d.date || d.day || "");
  const tokens = tokenTrend.value.map((d: any) => d.totalTokens || d.tokens || 0);

  chartInstance.setOption({
    tooltip: { trigger: "axis" },
    grid: { left: 50, right: 20, top: 10, bottom: 30 },
    xAxis: { type: "category", data: dates, axisLabel: { fontSize: 11 } },
    yAxis: { type: "value", name: "Token", axisLabel: { formatter: (v: number) => v >= 1000 ? (v / 1000).toFixed(1) + "K" : v.toString() } },
    series: [{
      type: "line",
      data: tokens,
      smooth: true,
      areaStyle: { opacity: 0.15 },
      lineStyle: { color: "#409eff", width: 2 },
      itemStyle: { color: "#409eff" },
    }],
  });
}

async function toggleBot(bot: any, enabled: boolean) {
  botToggling.value = bot.role;
  try {
    await api.post(`/operation-robots/${bot.role}/toggle`, { enabled });
    ElMessage.success(`机器人「${bot.name || bot.role}」已${enabled ? "开启" : "关闭"}`);
  } catch {
    bot.enabled = !enabled;
  } finally { botToggling.value = ""; }
}

async function triggerGen() {
  if (!genL1.value) { ElMessage.warning("请选择一级品类"); return; }
  generating.value = true;
  try {
    await contentGenerationApi.generate({
      categoryLevel1: genL1.value,
      categoryLevel2: genL2.value || undefined,
    });
    ElMessage.success("生成任务已触发");
    showGenPanel.value = false;
    fetchCatStats();
  } finally { generating.value = false; }
}
</script>

<style scoped>
.aio-page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h3 { margin: 0; font-size: 18px; color: #8b4513; }
.stat-card { background: #f5f7fa; border-radius: 8px; padding: 14px; text-align: center; }
.stat-card .value { display: block; font-size: 24px; font-weight: 700; color: #303133; }
.stat-card .label { display: block; font-size: 12px; color: #909399; margin-top: 2px; }
.stat-card.warn .value { color: #e6a23c; }
.stat-card.info .value { color: #409eff; }

.robot-row { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid #ebeef5; }
.robot-row:last-child { border-bottom: none; }
.bot-icon { font-size: 18px; }
.bot-name { flex: 1; font-size: 14px; }
</style>
