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

    <!-- 核心指标 -->
    <el-row
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
          <span class="value">{{ stats.thisWeek.likes }}</span>
          <span class="label">近7天互动</span>
          <span class="sub">点赞+评论+关注+收藏</span>
        </div>
      </el-col>
    </el-row>

    <!-- 互动趋势图 -->
    <el-row
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
              label="ID"
              prop="targetId"
              width="180"
              show-overflow-tooltip
            />
            <el-table-column
              label="点赞"
              prop="likeCount"
              width="70"
              align="center"
            />
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
            💬 评论管理
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
            👣 用户行为轨迹
          </el-button>
        </el-col>
        <el-col :span="6">
          <el-button
            style="width:100%;height:56px"
            @click="router.push('/risk/fraud')"
          >
            🚫 刷单识别
          </el-button>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { interactionApi } from "@/api";
import * as echarts from "echarts";

const router = useRouter();

const stats = reactive({
  total: { likes: 0, comments: 0, follows: 0, collects: 0, reports: 0 },
  today: { likes: 0, comments: 0, follows: 0, collects: 0, reports: 0 },
  thisWeek: { likes: 0, comments: 0, follows: 0, collects: 0 },
});

const topContent = ref<any[]>([]);
const trendChart = ref(null);

function typeLabel(t: string) {
  const m: Record<string, string> = { ARTICLE: "文章", COURSE: "课程", CIRCLE: "圈子", PRODUCT: "商品", CLASSIC: "古籍" };
  return m[t] || t;
}

onMounted(() => refresh());

async function refresh() {
  try {
    const [statsRes, trendsRes, topRes] = await Promise.all([
      interactionApi.getAdminStats(),
      interactionApi.getAdminTrends(7),
      interactionApi.getAdminTopContent(10),
    ]);

    const s = statsRes.data as any;
    if (s) {
      stats.total = s.total || stats.total;
      stats.today = s.today || stats.today;
      stats.thisWeek = s.thisWeek || stats.thisWeek;
    }

    const trends = trendsRes.data as any[];
    if (trends && trendChart.value) renderTrendChart(trends);

    const top = topRes.data as any[];
    if (top) topContent.value = top;
  } catch { /* ignore */ }
}

function renderTrendChart(trends: any[]) {
  const chart = echarts.init(trendChart.value!);
  chart.setOption({
    tooltip: { trigger: "axis" },
    legend: { data: ["点赞", "评论", "关注", "收藏"], bottom: 0 },
    xAxis: { type: "category", data: trends.map((t: any) => t.date.slice(5)) },
    yAxis: { type: "value" },
    series: [
      { name: "点赞", type: "line", smooth: true, data: trends.map((t: any) => t.likes), itemStyle: { color: "#409eff" } },
      { name: "评论", type: "line", smooth: true, data: trends.map((t: any) => t.comments), itemStyle: { color: "#67c23a" } },
      { name: "关注", type: "line", smooth: true, data: trends.map((t: any) => t.follows), itemStyle: { color: "#e6a23c" } },
      { name: "收藏", type: "line", smooth: true, data: trends.map((t: any) => t.collects), itemStyle: { color: "#f56c6c" } },
    ],
    grid: { left: 50, right: 20, top: 20, bottom: 40 },
  });
}
</script>

<style scoped>
.interaction-page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.stat-card { background: #f5f7fa; border-radius: 10px; padding: 18px 14px; text-align: center; border: 1px solid #ebeef5; }
.stat-card .value { display: block; font-size: 28px; font-weight: 700; color: #303133; }
.stat-card .label { display: block; font-size: 13px; color: #909399; margin-top: 4px; }
.stat-card .sub { display: block; font-size: 11px; color: #67c23a; margin-top: 2px; }
.stat-card.warn .sub { color: #f56c6c; }
</style>
