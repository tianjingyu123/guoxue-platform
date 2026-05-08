<script setup lang="ts">
/**
 * Dashboard.vue — 国学文化平台 · 管理后台首页
 *
 * 技术栈：Vue3 Composition API + Element Plus + ECharts 5
 * 设计风格：小红书/Notion 现代简约风（浅灰底 + 白色圆角卡片 + 柔和阴影）
 */

import { ref, onMounted, onBeforeUnmount, nextTick, computed, watch } from "vue"
import { storeToRefs } from "pinia"
import * as echarts from "echarts"
import type { EChartsType } from "echarts"
import {
  User, Document, ChatDotRound, Reading, Notebook, VideoPlay,
  DataLine, Goods, View, Star, ChatLineSquare, Collection,
  Plus, Calendar, List, WarningFilled
} from "@element-plus/icons-vue"
import { useDashboardStore } from "@/store/dashboard"

const dashboard = useDashboardStore()
const { stats, charts, loading } = storeToRefs(dashboard)

// ==================== 16 张统计卡片配置 ====================

interface StatCardDef {
  field: keyof typeof stats.value
  label: string
  icon: any
}

const statsCards: StatCardDef[] = [
  { field: "userCount",        label: "总用户数",     icon: User },
  { field: "articleCount",     label: "总文章数",     icon: Document },
  { field: "circleCount",      label: "总圈子数",     icon: ChatDotRound },
  { field: "courseCount",      label: "课程总数",     icon: Reading },
  { field: "classicBookCount", label: "古籍总数",     icon: Notebook },
  { field: "videoCount",       label: "视频总数",     icon: VideoPlay },
  { field: "liveRoomCount",    label: "直播房间",     icon: DataLine },
  { field: "productCount",     label: "商品总数",     icon: Goods },
  { field: "totalViews",       label: "总浏览量",     icon: View },
  { field: "totalLikes",       label: "总点赞数",     icon: Star },
  { field: "totalComments",    label: "总评论数",     icon: ChatLineSquare },
  { field: "totalCollects",    label: "总收藏数",     icon: Collection },
  { field: "todayNewUsers",   label: "今日新增用户", icon: Plus },
  { field: "monthNewUsers",    label: "本月新增用户", icon: Calendar },
  { field: "orderCount",       label: "总订单数",     icon: List },
  { field: "pendingReports",   label: "待处理举报",   icon: WarningFilled },
]

// ==================== 工具函数 ====================

function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1).replace(/\.0$/, "") + "w"
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k"
  return String(num)
}

// ==================== ECharts ====================

const lineChartRef = ref<HTMLElement>()
const pieChartRef = ref<HTMLElement>()
let lineChart: EChartsType | null = null
let pieChart: EChartsType | null = null

const topArticles = computed(() => charts.value?.topArticles ?? [])

function renderGrowthChart() {
  if (!lineChartRef.value || !charts.value?.userGrowth?.length) return
  if (!lineChart) lineChart = echarts.init(lineChartRef.value)
  const dates = charts.value.userGrowth.map((d) => {
    const parts = d.date.split("-")
    return parts[1] + "-" + parts[2]
  })
  const counts = charts.value.userGrowth.map((d) => d.count)
  lineChart.setOption({
    grid: { top: 30, right: 20, bottom: 30, left: 50 },
    xAxis: {
      type: "category", data: dates,
      axisLine: { lineStyle: { color: "#F0F0F0" } },
      axisTick: { show: false },
      axisLabel: { color: "#999", fontSize: 12 },
    },
    yAxis: {
      type: "value", minInterval: 1,
      splitLine: { lineStyle: { color: "#F0F0F0" } },
      axisLabel: { color: "#999", fontSize: 12 },
      axisLine: { show: false }, axisTick: { show: false },
    },
    series: [{
      type: "line", data: counts, smooth: true,
      symbol: "circle", symbolSize: 6,
      lineStyle: { color: "#FF6B6B", width: 3 },
      itemStyle: { color: "#FF6B6B", borderWidth: 2, borderColor: "#fff" },
      areaStyle: {
        color: {
          type: "linear", x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: "rgba(255,107,107,0.15)" },
            { offset: 1, color: "rgba(255,107,107,0)" },
          ],
        },
      },
    }],
    tooltip: {
      trigger: "axis", backgroundColor: "#fff",
      borderColor: "#F0F0F0", borderWidth: 1,
      textStyle: { color: "#1A1A1A", fontSize: 13 },
      formatter: (params: any) => {
        const p = params[0]
        return `<div style="font-weight:600;margin-bottom:4px">${p.name}</div>
                <div>新增用户：<span style="color:#FF6B6B;font-weight:600">${p.value}</span></div>`
      },
    },
  })
}

function renderPieChart() {
  if (!pieChartRef.value || !charts.value?.contentDistribution?.length) return
  if (!pieChart) pieChart = echarts.init(pieChartRef.value)
  const dist = charts.value.contentDistribution.filter((d) => d.count > 0)
  const total = dist.reduce((s, d) => s + d.count, 0)
  const palette = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3"]
  pieChart.setOption({
    tooltip: {
      trigger: "item", backgroundColor: "#fff",
      borderColor: "#F0F0F0", borderWidth: 1,
      textStyle: { color: "#1A1A1A", fontSize: 13 },
      formatter: (p: any) => `${p.name}：${p.value}（${p.percent}%）`,
    },
    legend: {
      orient: "vertical", right: 10, top: "middle",
      itemWidth: 12, itemHeight: 12, itemGap: 16,
      textStyle: { color: "#666", fontSize: 13 },
      formatter: (name: string) => {
        const item = dist.find((d) => d.name === name)
        const pct = item ? ((item.count / total) * 100).toFixed(1) : "0"
        return `${name}  ${pct}%`
      },
    },
    series: [{
      type: "pie", radius: ["40%", "70%"], center: ["38%", "50%"],
      avoidLabelOverlap: false, label: { show: false }, labelLine: { show: false },
      itemStyle: { borderRadius: 6, borderColor: "#fff", borderWidth: 3 },
      data: dist.map((d, i) => ({
        name: d.name, value: d.count,
        itemStyle: { color: palette[i] },
      })),
    }],
  })
}

function initCharts() {
  if (!charts.value) return
  nextTick(() => {
    renderGrowthChart()
    renderPieChart()
  })
}

function handleResize() {
  lineChart?.resize()
  pieChart?.resize()
}

watch(charts, () => { initCharts() }, { deep: true })

onMounted(async () => {
  await dashboard.fetchStats()
  dashboard.fetchTrends()
  dashboard.fetchCharts()
  nextTick(() => initCharts())
  window.addEventListener("resize", handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize)
  lineChart?.dispose()
  pieChart?.dispose()
})

// ==================== 表格样式常量 ====================

const headerCellStyle = {
  background: "#FAFAFA",
  color: "#999",
  fontSize: "12px",
  fontWeight: 500,
  borderBottom: "1px solid #F0F0F0",
}
const cellStyle = {
  color: "#666",
  fontSize: "14px",
  borderBottom: "1px solid #F0F0F0",
}
</script>

<template>
  <div class="dashboard">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">数据概览</h1>
    </div>

    <!-- 统计卡片 4×4 -->
    <el-row :gutter="20" class="stats-row">
      <el-col
        v-for="card in statsCards"
        :key="card.field"
        :xs="24" :sm="12" :md="6"
      >
        <div class="stat-card">
          <div class="stat-card__top">
            <span class="stat-card__label">{{ card.label }}</span>
            <div class="stat-card__icon">
              <el-icon :size="18"><component :is="card.icon" /></el-icon>
            </div>
          </div>
          <div
            class="stat-card__value"
            :class="{ 'stat-card__value--alert': card.field === 'pendingReports' && stats[card.field] > 0 }"
          >
            {{ formatNumber(stats[card.field]) }}
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 图表：折线图（60%）+ 环形图（40%） -->
    <el-row :gutter="20" class="charts-row">
      <el-col :xs="24" :md="14">
        <div class="chart-card">
          <div class="chart-card__title">用户增长趋势 · 近30天</div>
          <div ref="lineChartRef" class="chart-card__body"></div>
        </div>
      </el-col>
      <el-col :xs="24" :md="10">
        <div class="chart-card">
          <div class="chart-card__title">内容类型分布</div>
          <div ref="pieChartRef" class="chart-card__body"></div>
        </div>
      </el-col>
    </el-row>

    <!-- TOP10 热门文章 -->
    <div class="table-card">
      <div class="table-card__header">
        <span class="table-card__title">TOP10 热门文章</span>
      </div>
      <el-table
        :data="topArticles"
        style="width: 100%"
        :header-cell-style="headerCellStyle"
        :cell-style="cellStyle"
      >
        <el-table-column label="排名" width="60" align="center">
          <template #default="{ $index }">
            <span
              class="rank-badge"
              :class="$index < 3 ? 'rank-badge--' + ($index + 1) : 'rank-badge--normal'"
            >
              {{ $index + 1 }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="标题" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="article-title">{{ row.title }}</span>
          </template>
        </el-table-column>

        <el-table-column label="作者" prop="author" width="100" />

        <el-table-column label="浏览量" width="100" align="right" sortable>
          <template #default="{ row }">
            {{ formatNumber(row.viewCount) }}
          </template>
        </el-table-column>

        <el-table-column label="点赞" width="80" align="right">
          <template #default="{ row }">
            {{ formatNumber(row.likeCount) }}
          </template>
        </el-table-column>

        <el-table-column label="评论" width="80" align="right">
          <template #default="{ row }">
            {{ row.commentCount }}
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
/* ============================================
 * Dashboard.vue 样式
 * 设计风格：小红书 / Notion 现代简约风
 * ============================================ */

/* --- 页面头部 --- */
.page-header {
  margin-bottom: 20px;
}
.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0;
}

/* --- 统计卡片行 --- */
.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 20px 22px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: default;
  margin-bottom: 20px;
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.stat-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.stat-card__label {
  font-size: 13px;
  color: #999;
}
.stat-card__icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(255, 107, 107, 0.1);
  color: #FF6B6B;
  display: flex;
  align-items: center;
  justify-content: center;
}
.stat-card__value {
  font-size: 28px;
  font-weight: 700;
  color: #1A1A1A;
  font-feature-settings: "tnum";
  line-height: 1.2;
}
.stat-card__value--alert {
  color: #FF6B6B;
}

/* --- 图表区域 --- */
.charts-row {
  margin-bottom: 20px;
}

.chart-card {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  margin-bottom: 20px;
}
.chart-card__title {
  font-size: 14px;
  font-weight: 500;
  color: #999;
  margin-bottom: 16px;
}
.chart-card__body {
  width: 100%;
  height: 320px;
}

/* --- 表格 --- */
.table-card {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}
.table-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.table-card__title {
  font-size: 14px;
  font-weight: 500;
  color: #999;
}

/* 排名徽章 */
.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}
.rank-badge--1 { background: linear-gradient(135deg, #FFD700, #FFA500); color: #fff; }
.rank-badge--2 { background: linear-gradient(135deg, #C0C0C0, #A8A8A8); color: #fff; }
.rank-badge--3 { background: linear-gradient(135deg, #CD7F32, #B8690E); color: #fff; }
.rank-badge--normal { background: #F0F0F0; color: #999; }

.article-title {
  color: #1A1A1A;
  font-weight: 500;
  cursor: pointer;
}
.article-title:hover {
  color: #FF6B6B;
}

/* --- 响应式补充 --- */
@media (max-width: 768px) {
  .stat-card {
    margin-bottom: 12px;
  }
  .chart-card,
  .table-card {
    border-radius: 12px;
    padding: 16px;
  }
}
</style>
