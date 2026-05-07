<template>
  <div class="dashboard">
    <h3>数据仪表盘</h3>

    <!-- 统计卡片行：总用户数 / 总文章数 / 总圈子数 / 今日新增用户 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card card-blue">
          <div class="stat-inner">
            <div class="stat-icon"><el-icon><UserFilled /></el-icon></div>
            <div class="stat-info">
              <span class="stat-label">总用户数</span>
              <span class="stat-val">{{ fmt(stats.userCount) }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card card-green">
          <div class="stat-inner">
            <div class="stat-icon"><el-icon><Document /></el-icon></div>
            <div class="stat-info">
              <span class="stat-label">总文章数</span>
              <span class="stat-val">{{ fmt(stats.articleCount) }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card card-orange">
          <div class="stat-inner">
            <div class="stat-icon"><el-icon><ChatDotSquare /></el-icon></div>
            <div class="stat-info">
              <span class="stat-label">总圈子数</span>
              <span class="stat-val">{{ fmt(stats.circleCount) }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card card-purple">
          <div class="stat-inner">
            <div class="stat-icon"><el-icon><TrendCharts /></el-icon></div>
            <div class="stat-info">
              <span class="stat-label">今日新增用户</span>
              <span class="stat-val">{{ fmt(stats.todayNewUsers) }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 第二行补充卡片 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-inner" style="flex-direction:column;gap:6px">
            <span class="stat-label">总浏览量</span>
            <span class="stat-val">{{ fmt(stats.totalViews) }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-inner" style="flex-direction:column;gap:6px">
            <span class="stat-label">古籍总数</span>
            <span class="stat-val brown">{{ fmt(stats.classicBookCount) }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-inner" style="flex-direction:column;gap:6px">
            <span class="stat-label">课程总数</span>
            <span class="stat-val green">{{ fmt(stats.courseCount) }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-inner" style="flex-direction:column;gap:6px">
            <span class="stat-label">本月新用户</span>
            <span class="stat-val blue">{{ fmt(stats.monthNewUsers) }}</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 第三行业务卡片 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card card-red">
          <div class="stat-inner" style="flex-direction:column;gap:6px">
            <span class="stat-label">待处理举报</span>
            <span class="stat-val red">{{ fmt(stats.pendingReports) }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-inner" style="flex-direction:column;gap:6px">
            <span class="stat-label">订单数 (已支付)</span>
            <span class="stat-val">{{ fmt(stats.orderCount) }} <span style="font-size: 13px; color: #67c23a;">/ {{ fmt(stats.paidOrderCount) }}</span></span>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-inner" style="flex-direction:column;gap:6px">
            <span class="stat-label">直播 / 视频</span>
            <span class="stat-val">{{ fmt(stats.liveRoomCount) }} <span style="font-size: 13px; color: #999;">/ {{ fmt(stats.videoCount) }}</span></span>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-inner" style="flex-direction:column;gap:6px">
            <span class="stat-label">赞 / 评 / 藏</span>
            <span class="stat-val">{{ fmt(stats.totalLikes) }} <span style="font-size: 13px; color: #999;">/ {{ fmt(stats.totalComments) }} / {{ fmt(stats.totalCollects) }}</span></span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 趋势图表 (30天) - 保留原有 -->
    <el-row :gutter="16" class="stat-row" v-if="trends">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header><span>用户增长趋势 (30天)</span></template>
          <div ref="userChartEl" class="chart-box"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header><span>内容创建趋势 (30天)</span></template>
          <div ref="articleChartEl" class="chart-box"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域：近7天用户增长 + 内容类型分布 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="24" :sm="14">
        <el-card shadow="hover">
          <template #header><span>近7天用户增长趋势</span></template>
          <div ref="growthChartRef" class="chart-box"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="10">
        <el-card shadow="hover">
          <template #header><span>内容类型分布</span></template>
          <div ref="pieChartRef" class="chart-box"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- TOP10 热门文章 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :span="24">
        <el-card shadow="hover">
          <template #header><span>TOP10 热门文章（浏览量排行）</span></template>
          <el-table :data="topArticles" stripe size="small" v-loading="loading">
            <el-table-column type="index" label="排名" width="60" />
            <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
            <el-table-column prop="author" label="作者" width="120" />
            <el-table-column prop="viewCount" label="浏览量" width="100" sortable />
            <el-table-column prop="likeCount" label="点赞" width="80" />
            <el-table-column prop="commentCount" label="评论" width="80" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from "vue"
import { storeToRefs } from "pinia"
import { UserFilled, Document, ChatDotSquare, TrendCharts } from "@element-plus/icons-vue"
import { useDashboardStore } from "@/store/dashboard"
import * as echarts from "echarts"

const dashboard = useDashboardStore()
const { stats, trends, charts, loading } = storeToRefs(dashboard)

// ── 30天趋势图表 ──
const userChartEl = ref<HTMLElement | null>(null)
const articleChartEl = ref<HTMLElement | null>(null)

// ── 新增图表 ──
const growthChartRef = ref<HTMLDivElement>()
const pieChartRef = ref<HTMLDivElement>()
let growthChart: echarts.ECharts | null = null
let pieChart: echarts.ECharts | null = null

const topArticles = computed(() => charts.value?.topArticles ?? [])

function fmt(v: number | undefined | null): string {
  if (v === undefined || v === null) return "--"
  if (v >= 10000) return (v / 10000).toFixed(1) + "w"
  if (v >= 1000) return (v / 1000).toFixed(1) + "k"
  return String(v)
}

// ── 渲染30天趋势（原有逻辑） ──
function renderTrendCharts() {
  const t = trends.value
  if (!t) return
  const baseOption = (title: string, data: number[], color: string) => ({
    tooltip: { trigger: "axis" as const },
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    xAxis: { type: "category" as const, data: t.dates, axisLabel: { rotate: 45, fontSize: 10 } },
    yAxis: { type: "value" as const },
    series: [{
      name: title,
      type: "line" as const,
      data,
      smooth: true,
      lineStyle: { color, width: 2 },
      itemStyle: { color },
      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color },
        { offset: 1, color: "rgba(255,255,255,0.1)" },
      ]) },
    }],
  })
  if (userChartEl.value) {
    const chart = echarts.init(userChartEl.value)
    chart.setOption(baseOption("用户数", t.userTrend, "#409eff"))
  }
  if (articleChartEl.value) {
    const chart = echarts.init(articleChartEl.value)
    chart.setOption(baseOption("文章数", t.articleTrend, "#67c23a"))
  }
}

// ── 渲染近7天用户增长 ──
function renderGrowthChart() {
  if (!growthChartRef.value || !charts.value) return
  if (!growthChart) growthChart = echarts.init(growthChartRef.value)
  const dates = charts.value.userGrowth.map((d) => d.date.slice(5))
  const counts = charts.value.userGrowth.map((d) => d.count)
  growthChart.setOption({
    tooltip: { trigger: "axis" },
    grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
    xAxis: { type: "category", data: dates, axisLabel: { color: "#999" } },
    yAxis: { type: "value", axisLabel: { color: "#999" }, splitLine: { lineStyle: { color: "#f0f0f0" } } },
    series: [{
      name: "新增用户",
      type: "line",
      data: counts,
      smooth: true,
      lineStyle: { color: "#409eff", width: 2 },
      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: "rgba(64,158,255,0.3)" },
        { offset: 1, color: "rgba(64,158,255,0.05)" },
      ]) },
      itemStyle: { color: "#409eff" },
    }],
  })
}

// ── 渲染饼图 ──
function renderPieChart() {
  if (!pieChartRef.value || !charts.value) return
  if (!pieChart) pieChart = echarts.init(pieChartRef.value)
  const data = charts.value.contentDistribution
    .filter((d) => d.count > 0)
    .map((d) => ({ name: d.name, value: d.count }))
  pieChart.setOption({
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    series: [{
      type: "pie",
      radius: ["40%", "65%"],
      center: ["50%", "50%"],
      avoidLabelOverlap: false,
      label: { show: true, formatter: "{b}\n{d}%", color: "#666" },
      labelLine: { show: true },
      data,
      color: ["#409eff", "#67c23a", "#e6a23c"],
    }],
  })
}

function initNewCharts() {
  if (!charts.value) return
  nextTick(() => {
    renderGrowthChart()
    renderPieChart()
  })
}

watch(charts, () => { initNewCharts() }, { deep: true })

watch(trends, async (val) => {
  if (val) {
    await nextTick()
    renderTrendCharts()
  }
})

onMounted(async () => {
  await dashboard.fetchStats()
  dashboard.fetchTrends()
  dashboard.fetchCharts()
  await nextTick()
  renderTrendCharts()
  initNewCharts()
})

onUnmounted(() => {
  growthChart?.dispose()
  pieChart?.dispose()
})
</script>

<style scoped>
.dashboard h3 {
  margin: 0 0 16px;
  font-size: 18px;
  color: #333;
}

.stat-row { margin-bottom: 16px; }

.stat-card { border-radius: 8px; }
.stat-card.card-blue   { border-left: 4px solid #409eff; }
.stat-card.card-green  { border-left: 4px solid #67c23a; }
.stat-card.card-orange { border-left: 4px solid #e6a23c; }
.stat-card.card-purple { border-left: 4px solid #9b59b6; }
.stat-card.card-red    { border-left: 4px solid #e74c3c; }

.stat-inner {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}
.card-blue   .stat-icon { background: rgba(64,158,255,0.1); color: #409eff; }
.card-green  .stat-icon { background: rgba(103,194,58,0.1); color: #67c23a; }
.card-orange .stat-icon { background: rgba(230,162,60,0.1); color: #e6a23c; }
.card-purple .stat-icon { background: rgba(155,89,182,0.1); color: #9b59b6; }
.card-red    .stat-icon { background: rgba(231,76,60,0.1); color: #e74c3c; }

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label { font-size: 13px; color: #999; }
.stat-val { font-size: 24px; font-weight: bold; color: #333; }
.stat-val.blue  { color: #409eff; }
.stat-val.green { color: #67c23a; }
.stat-val.red   { color: #e74c3c; }
.stat-val.brown { color: #8b4513; }

.chart-box { width: 100%; height: 300px; }
</style>
