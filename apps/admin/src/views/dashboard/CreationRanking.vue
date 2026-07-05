<template>
  <div class="page">
    <PageHeader title="创作排行榜" />

    <div class="filter-row">
      <el-radio-group
        v-model="period"
        @change="fetchData"
      >
        <el-radio-button value="week">
          周榜（近 7 天）
        </el-radio-button>
        <el-radio-button value="month">
          月榜（近 30 天）
        </el-radio-button>
      </el-radio-group>
      <el-button @click="fetchData">
        刷新
      </el-button>
      <span
        v-if="since"
        class="since-tip"
      >统计自 {{ since }} 至今 · 质量加权内容学分 Top20</span>
    </div>

    <el-result
      v-if="error && !loading"
      icon="error"
      title="加载失败"
      sub-title="创作榜数据加载出错，请重试"
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
        v-if="!loading && items.length === 0"
        description="所选区间暂无创作学分记录。用户发布优质内容（经内容质量评分加权）后自动上榜。"
      />

      <div
        v-else
        v-loading="loading"
      >
        <!-- Top3 领奖台 -->
        <div
          v-if="top3.length"
          class="podium"
        >
          <div
            v-for="u in top3"
            :key="u.userId"
            class="podium-card"
            :class="'podium-' + u.rank"
          >
            <div class="medal">
              {{ medal(u.rank) }}
            </div>
            <el-avatar
              :size="56"
              :src="u.avatar"
            >
              {{ u.nickname.slice(0, 1) }}
            </el-avatar>
            <div class="podium-name">
              {{ u.nickname }}
            </div>
            <div class="podium-score">
              {{ u.score }} 学分
            </div>
          </div>
        </div>

        <!-- Top10 条形图 -->
        <el-card
          v-if="items.length"
          shadow="never"
          class="chart-card"
        >
          <template #header>
            Top{{ Math.min(10, items.length) }} 创作学分
          </template>
          <div
            ref="chartRef"
            class="chart"
          />
        </el-card>

        <!-- 完整榜单 -->
        <el-card
          shadow="never"
          class="table-card"
        >
          <template #header>
            完整榜单（Top{{ items.length }}）
          </template>
          <el-table
            :data="items"
            border
            size="small"
          >
            <el-table-column
              label="排名"
              width="80"
              align="center"
            >
              <template #default="{ row }">
                <span :class="rankClass(row.rank)">{{ row.rank }}</span>
              </template>
            </el-table-column>
            <el-table-column
              label="创作者"
              min-width="200"
            >
              <template #default="{ row }">
                <div class="user-cell">
                  <el-avatar
                    :size="32"
                    :src="row.avatar"
                  >
                    {{ row.nickname.slice(0, 1) }}
                  </el-avatar>
                  <span>{{ row.nickname }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column
              label="内容学分（质量加权）"
              width="280"
            >
              <template #default="{ row }">
                <div class="score-cell">
                  <el-progress
                    :percentage="pct(row.score)"
                    :show-text="false"
                    :stroke-width="10"
                  />
                  <span class="score-num">{{ row.score }}</span>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from "vue";
import { ElMessage } from "element-plus";
import PageHeader from "@/components/PageHeader.vue";
import { creationRankingApi } from "@/api";
import echarts from "@/utils/echarts";

interface RankItem { rank: number; userId: string; nickname: string; avatar: string; score: number }

const period = ref<"week" | "month">("week");
const items = ref<RankItem[]>([]);
const since = ref("");
const loading = ref(false);
const error = ref(false);

const chartRef = ref<HTMLDivElement>();
let chart: echarts.ECharts | null = null;

const top3 = computed(() => items.value.slice(0, 3));
const maxScore = computed(() => items.value.reduce((m, i) => Math.max(m, i.score), 0));

function medal(rank: number) { return rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"; }
function rankClass(rank: number) { return rank <= 3 ? `rank-top rank-top-${rank}` : ""; }
function pct(score: number) { return maxScore.value > 0 ? Math.round((score / maxScore.value) * 100) : 0; }

onMounted(fetchData);
onBeforeUnmount(() => { chart?.dispose(); window.removeEventListener("resize", onResize); });
function onResize() { chart?.resize(); }

async function fetchData() {
  loading.value = true;
  error.value = false;
  try {
    const res = await creationRankingApi.list(period.value);
    const payload = (res?.data ?? {}) as { items?: RankItem[]; since?: string };
    items.value = Array.isArray(payload.items) ? payload.items : [];
    since.value = payload.since ? new Date(payload.since).toLocaleDateString("zh-CN") : "";
    await nextTick();
    renderChart();
  } catch {
    error.value = true;
    items.value = [];
    ElMessage.error("加载创作榜失败");
  } finally {
    loading.value = false;
  }
}

function renderChart() {
  if (!chartRef.value || items.value.length === 0) return;
  if (!chart) {
    chart = echarts.init(chartRef.value, "guoxue");
    window.addEventListener("resize", onResize);
  }
  // 横向条形图：reverse 让第一名显示在顶部
  const top = items.value.slice(0, 10).slice().reverse();
  chart.setOption({
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, formatter: "{b}: {c} 学分" },
    grid: { left: 110, right: 48, top: 10, bottom: 24 },
    xAxis: { type: "value", minInterval: 1 },
    yAxis: { type: "category", data: top.map((u) => u.nickname) },
    series: [{
      type: "bar",
      data: top.map((u) => u.score),
      label: { show: true, position: "right", formatter: "{c}" },
      barMaxWidth: 22,
      itemStyle: { borderRadius: [0, 4, 4, 0] },
    }],
  }, true);
}
</script>

<style scoped>
.page { padding: 0; }
.filter-row { display: flex; gap: var(--spacing-sm); align-items: center; margin-bottom: var(--spacing-lg); flex-wrap: wrap; }
.since-tip { color: var(--el-text-color-secondary); font-size: 13px; }

/* 领奖台 */
.podium { display: flex; gap: var(--spacing-md); margin-bottom: var(--spacing-lg); }
.podium-card {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 20px 12px; border-radius: 12px; background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
}
.podium-1 { background: linear-gradient(180deg, #fff8e1, #fff); border-color: #f5c518; }
.podium-2 { background: linear-gradient(180deg, #f3f4f6, #fff); border-color: #c0c4cc; }
.podium-3 { background: linear-gradient(180deg, #fbeee0, #fff); border-color: #d9a066; }
.medal { font-size: 28px; line-height: 1; }
.podium-name { font-weight: 600; font-size: 15px; color: var(--el-text-color-primary); }
.podium-score { font-size: 13px; color: var(--el-color-primary); font-weight: 600; }

.chart-card { margin-bottom: var(--spacing-lg); }
.chart { width: 100%; height: 320px; }

.user-cell { display: flex; align-items: center; gap: 10px; }
.score-cell { display: flex; align-items: center; gap: 12px; }
.score-cell .el-progress { flex: 1; }
.score-num { font-weight: 600; color: var(--el-color-primary); min-width: 48px; text-align: right; }

.rank-top { display: inline-block; width: 26px; height: 26px; line-height: 26px; border-radius: 50%; color: #fff; font-weight: 700; }
.rank-top-1 { background: #f5c518; }
.rank-top-2 { background: #c0c4cc; }
.rank-top-3 { background: #d9a066; }
</style>
