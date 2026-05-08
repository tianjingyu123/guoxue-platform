<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import {
  User, Document, ChatDotRound, Reading, Notebook, VideoPlay,
  DataLine, Box, View, Star, ChatLineSquare, Collection,
  Plus, Calendar, List, Warning
} from '@element-plus/icons-vue'

// ===== Mock 数据（来自需求文档）=====
const stats = ref({
  userCount: 3,
  articleCount: 291,
  circleCount: 62,
  courseCount: 80,
  classicBookCount: 90,
  videoCount: 54,
  liveRoomCount: 5,
  productCount: 5,
  totalViews: 867630,
  totalLikes: 0,
  totalComments: 110,
  totalCollects: 0,
  todayNewUsers: 0,
  monthNewUsers: 3,
  orderCount: 11,
  pendingReports: 0
})

const chartsData = ref({
  topArticles: [
    { title: '《楚辞·离骚》节选', author: '王清音', viewCount: 2978, likeCount: 235, commentCount: 42 },
    { title: '《诗经·秦风·蒹葭》', author: '王清音', viewCount: 3012, likeCount: 142, commentCount: 28 },
    { title: '八字入门：十天干精解', author: '李玄明', viewCount: 2456, likeCount: 198, commentCount: 35 },
    { title: '《易经》乾卦解读', author: '李玄明', viewCount: 2103, likeCount: 167, commentCount: 31 },
    { title: '紫微斗数十二宫详解', author: '赵命理', viewCount: 1890, likeCount: 145, commentCount: 22 },
    { title: '《道德经》第一章解读', author: '王清音', viewCount: 1654, likeCount: 123, commentCount: 19 },
    { title: '风水基础：峦头与理气', author: '赵命理', viewCount: 1432, likeCount: 98, commentCount: 15 },
    { title: '《论语》为政篇', author: '王清音', viewCount: 1287, likeCount: 87, commentCount: 12 },
    { title: '梅花易数入门', author: '李玄明', viewCount: 1156, likeCount: 76, commentCount: 9 },
    { title: '《心经》全文解读', author: '释明心', viewCount: 1023, likeCount: 65, commentCount: 8 }
  ],
  userGrowth: [
    { date: '2026-04-08', count: 0 }, { date: '2026-04-15', count: 1 },
    { date: '2026-04-22', count: 1 }, { date: '2026-04-29', count: 2 },
    { date: '2026-05-01', count: 3 }, { date: '2026-05-05', count: 3 },
    { date: '2026-05-08', count: 3 }
  ],
  contentDistribution: [
    { name: '文章', count: 291 }, { name: '课程', count: 80 },
    { name: '视频', count: 54 }, { name: '古籍', count: 90 }
  ]
})

// ===== 16 张统计卡片配置 =====
interface StatCard {
  field: keyof typeof stats.value
  label: string
  icon: any
  color: string   // Element Plus 主题色
}

const statsCards: StatCard[] = [
  // 第一行：核心指标
  { field: 'userCount',        label: '总用户数',     icon: User,      color: '' },
  { field: 'articleCount',     label: '总文章数',     icon: Document,  color: 'success' },
  { field: 'circleCount',      label: '总圈子数',     icon: ChatDotRound, color: 'warning' },
  { field: 'courseCount',      label: '课程总数',     icon: Reading,   color: '' },
  // 第二行：内容指标
  { field: 'classicBookCount', label: '古籍总数',     icon: Notebook,  color: 'danger' },
  { field: 'videoCount',       label: '视频总数',     icon: VideoPlay, color: '' },
  { field: 'liveRoomCount',    label: '直播房间',     icon: DataLine,  color: 'success' },
  { field: 'productCount',     label: '商品总数',     icon: Box,       color: 'warning' },
  // 第三行：流量指标
  { field: 'totalViews',       label: '总浏览量',     icon: View,      color: '' },
  { field: 'totalLikes',       label: '总点赞数',     icon: Star,      color: 'danger' },
  { field: 'totalComments',    label: '总评论数',     icon: ChatLineSquare, color: 'success' },
  { field: 'totalCollects',    label: '总收藏数',     icon: Collection, color: 'warning' },
  // 第四行：运营指标
  { field: 'todayNewUsers',   label: '今日新增用户', icon: Plus,      color: '' },
  { field: 'monthNewUsers',    label: '本月新增用户', icon: Calendar,  color: '' },
  { field: 'orderCount',       label: '总订单数',     icon: List,      color: 'success' },
  { field: 'pendingReports',   label: '待处理举报',   icon: Warning,   color: 'danger' },
]

// ===== 数字格式化 =====
function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1).replace(/\.0$/, '') + 'w'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  }
  return String(num)
}

// ===== ECharts 实例引用 =====
const lineChartRef = ref<HTMLElement>()
const pieChartRef = ref<HTMLElement>()

function initCharts() {
  if (!lineChartRef.value || !pieChartRef.value) return

  // ---- 折线图：用户增长趋势 ----
  const lineChart = echarts.init(lineChartRef.value)
  const dates = chartsData.value.userGrowth.map(d => {
    const p = d.date.split('-')
    return p[1] + '-' + p[2]
  })
  const counts = chartsData.value.userGrowth.map(d => d.count)

  lineChart.setOption({
    grid: { top: 30, right: 20, bottom: 30, left: 50 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: '#F0F0F0' } },
      axisTick: { show: false },
      axisLabel: { color: '#999', fontSize: 12 }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: '#F0F0F0' } },
      axisLabel: { color: '#999', fontSize: 12 },
      axisLine: { show: false },
      axisTick: { show: false }
    },
    series: [{
      type: 'line',
      data: counts,
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { color: '#FF6B6B', width: 3 },
      itemStyle: { color: '#FF6B6B', borderWidth: 2, borderColor: '#fff' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(255,107,107,0.15)' },
            { offset: 1, color: 'rgba(255,107,107,0)' }
          ]
        }
      }
    }],
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#F0F0F0',
      borderWidth: 1,
      textStyle: { color: '#1A1A1A', fontSize: 13 },
      formatter: (params: any) => {
        const p = params[0]
        return `<div style="font-weight:600;margin-bottom:4px">${p.name}</div>
                <div>新增用户：<span style="color:#FF6B6B;font-weight:600">${p.value}</span></div>`
      }
    }
  })

  // ---- 环形图：内容类型分布 ----
  const pieChart = echarts.init(pieChartRef.value)
  const dist = chartsData.value.contentDistribution
  const total = dist.reduce((s, d) => s + d.count, 0)
  const palette = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3']

  pieChart.setOption({
    tooltip: {
      trigger: 'item',
      backgroundColor: '#fff',
      borderColor: '#F0F0F0',
      borderWidth: 1,
      textStyle: { color: '#1A1A1A', fontSize: 13 },
      formatter: (p: any) => `${p.name}：${p.value}（${p.percent}%）`
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'middle',
      itemWidth: 12,
      itemHeight: 12,
      itemGap: 16,
      textStyle: { color: '#666', fontSize: 13 },
      formatter: (name: string) => {
        const item = dist.find(d => d.name === name)
        const pct = item ? ((item.count / total) * 100).toFixed(1) : '0'
        return `${name}  ${pct}%`
      }
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['38%', '50%'],
      avoidLabelOverlap: false,
      label: { show: false },
      labelLine: { show: false },
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 3 },
      data: dist.map((d, i) => ({
        ...d,
        itemStyle: { color: palette[i] }
      }))
    }]
  })

  // 响应式 resize
  window.addEventListener('resize', () => {
    lineChart.resize()
    pieChart.resize()
  })
}

onMounted(() => {
  nextTick(() => initCharts())
})
</script>

<template>
  <div class="admin-layout">
    <!-- ===== 侧边栏 ===== -->
    <aside class="sidebar">
      <div class="sidebar-logo">
        <div class="logo-icon">国</div>
        <div>
          <div class="logo-text">国学文化平台</div>
          <div class="logo-sub">管理后台 v1.0</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section-title">概览</div>
        <a class="nav-item active" href="#">
          <el-icon><DataLine /></el-icon>
          数据概览
        </a>

        <div class="nav-section-title">内容管理</div>
        <a class="nav-item" href="#">
          <el-icon><Document /></el-icon>
          文章管理
        </a>
        <a class="nav-item" href="#">
          <el-icon><Notebook /></el-icon>
          古籍管理
        </a>
        <a class="nav-item" href="#">
          <el-icon><VideoPlay /></el-icon>
          视频管理
        </a>
        <a class="nav-item" href="#">
          <el-icon><Reading /></el-icon>
          课程管理
        </a>
        <a class="nav-item" href="#">
          <el-icon><ChatDotRound /></el-icon>
          圈子管理
        </a>

        <div class="nav-section-title">运营</div>
        <a class="nav-item" href="#">
          <el-icon><List /></el-icon>
          订单管理
        </a>
        <a class="nav-item" href="#">
          <el-icon><Box /></el-icon>
          商品管理
        </a>
        <a class="nav-item" href="#">
          <el-icon><Warning /></el-icon>
          举报管理
        </a>
      </nav>

      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-avatar">管</div>
          <div>
            <div class="user-name">管理员</div>
            <div class="user-role">超级管理员</div>
          </div>
        </div>
      </div>
    </aside>

    <!-- ===== 主内容 ===== -->
    <main class="main-content">
      <div class="page-header">
        <div>
          <div class="page-title">数据概览</div>
          <div class="page-sub">国学文化平台运营数据一览</div>
        </div>
      </div>

      <!-- 统计卡片 4×4 -->
      <div class="stats-grid">
        <div
          v-for="card in statsCards"
          :key="card.field"
          class="stat-card"
        >
          <div class="stat-card-top">
            <span class="stat-label">{{ card.label }}</span>
            <div class="stat-icon" :style="{ background: 'rgba(255,107,107,0.1)', color: '#FF6B6B' }">
              <el-icon :size="20"><component :is="card.icon" /></el-icon>
            </div>
          </div>
          <div
            class="stat-value"
            :class="{ 'stat-alert': card.field === 'pendingReports' && stats[card.field] > 0 }"
          >
            {{ formatNumber(stats[card.field]) }}
          </div>
        </div>
      </div>

      <!-- 图表区域 -->
      <div class="charts-row">
        <div class="chart-card">
          <div class="chart-title">用户增长趋势 · 近30天</div>
          <div ref="lineChartRef" class="chart-container"></div>
        </div>
        <div class="chart-card">
          <div class="chart-title">内容类型分布</div>
          <div ref="pieChartRef" class="chart-container"></div>
        </div>
      </div>

      <!-- TOP10 表格 -->
      <div class="table-card">
        <div class="table-header">
          <span class="table-title">TOP10 热门文章</span>
        </div>
        <el-table
          :data="chartsData.topArticles"
          style="width: 100%"
          :header-cell-style="{
            background: '#FAFAFA',
            color: '#999',
            fontSize: '12px',
            fontWeight: 500,
            borderBottom: '1px solid #F0F0F0'
          }"
          :cell-style="{
            color: '#666',
            fontSize: '14px',
            borderBottom: '1px solid #F0F0F0'
          }"
          row-hover
        >
          <el-table-column label="排名" width="60" align="center">
            <template #default="{ $index }">
              <span
                class="rank-badge"
                :class="
                  $index < 3
                    ? ('rank-' + ($index + 1))
                    : 'rank-normal'
                "
              >
                {{ $index + 1 }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="标题" min-width="200">
            <template #default="{ row }">
              <span class="article-title">{{ row.title }}</span>
            </template>
          </el-table-column>
          <el-table-column label="作者" prop="author" width="100" />
          <el-table-column label="浏览量" width="100" align="right">
            <template #default="{ row }">{{ formatNumber(row.viewCount) }}</template>
          </el-table-column>
          <el-table-column label="点赞" width="80" align="right">
            <template #default="{ row }">{{ formatNumber(row.likeCount) }}</template>
          </el-table-column>
          <el-table-column label="评论" width="80" align="right">
            <template #default="{ row }">{{ row.commentCount }}</template>
          </el-table-column>
        </el-table>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* ===== 布局 ===== */
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: #F5F5F5;
}

/* ===== 侧边栏 ===== */
.sidebar {
  position: fixed;
  left: 0; top: 0;
  width: 240px;
  height: 100vh;
  background: #FFFFFF;
  border-right: 1px solid #F0F0F0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.sidebar-logo {
  padding: 24px 24px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #F0F0F0;
}
.logo-icon {
  width: 36px; height: 36px;
  background: linear-gradient(135deg, #FF6B6B, #F38181);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 18px; font-weight: 700;
}
.logo-text { font-size: 16px; font-weight: 600; color: #1A1A1A; }
.logo-sub { font-size: 11px; color: #999; margin-top: 1px; }

.sidebar-nav { flex: 1; padding: 16px 12px; }
.nav-section-title {
  font-size: 11px; font-weight: 500; color: #BBB;
  letter-spacing: 0.5px; padding: 12px 12px 8px;
}
.nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 10px;
  font-size: 14px; color: #666; text-decoration: none;
  transition: all 0.15s ease; margin-bottom: 2px;
}
.nav-item:hover { background: #FAFAFA; color: #1A1A1A; }
.nav-item.active { background: #FFF0F0; color: #FF6B6B; font-weight: 500; }
.nav-item .el-icon { font-size: 18px; opacity: 0.65; }
.nav-item.active .el-icon { opacity: 1; }

.sidebar-footer { padding: 16px; border-top: 1px solid #F0F0F0; }
.user-info { display: flex; align-items: center; gap: 10px; }
.user-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: linear-gradient(135deg, #4ECDC4, #44A8A1);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 14px; font-weight: 600;
}
.user-name { font-size: 14px; font-weight: 500; color: #1A1A1A; }
.user-role { font-size: 12px; color: #999; }

/* ===== 主内容 ===== */
.main-content {
  margin-left: 240px;
  flex: 1;
  padding: 24px 28px 40px;
  min-height: 100vh;
}
.page-header { margin-bottom: 24px; }
.page-title { font-size: 20px; font-weight: 600; color: #1A1A1A; }
.page-sub { font-size: 13px; color: #999; margin-top: 4px; }

/* ===== 统计卡片 ===== */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}
.stat-card {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 20px 22px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  transition: all 0.2s ease;
  cursor: default;
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
}
.stat-card-top {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14px;
}
.stat-label { font-size: 13px; color: #999; }
.stat-icon {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
}
.stat-value {
  font-size: 28px; font-weight: 700; color: #1A1A1A;
  font-feature-settings: "tnum"; line-height: 1.2;
}
.stat-alert { color: #FF6B6B; }

/* ===== 图表 ===== */
.charts-row {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 20px;
  margin-bottom: 24px;
}
.chart-card {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}
.chart-title { font-size: 14px; font-weight: 500; color: #999; margin-bottom: 16px; }
.chart-container { width: 100%; height: 320px; }

/* ===== 表格 ===== */
.table-card {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}
.table-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }

/* 排名徽章 */
.rank-badge {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; border-radius: 6px;
  font-size: 12px; font-weight: 600;
}
.rank-1 { background: linear-gradient(135deg, #FFD700, #FFA500); color: #fff; }
.rank-2 { background: linear-gradient(135deg, #C0C0C0, #A8A8A8); color: #fff; }
.rank-3 { background: linear-gradient(135deg, #CD7F32, #B8690E); color: #fff; }
.rank-normal { background: #F0F0F0; color: #999; }

.article-title {
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1A1A1A;
  font-weight: 500;
  cursor: pointer;
}
.article-title:hover { color: #FF6B6B; }

/* ===== 响应式 ===== */
@media (max-width: 1200px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .charts-row { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .sidebar { display: none; }
  .main-content { margin-left: 0; padding: 16px; }
  .stats-grid { grid-template-columns: 1fr; }
}
</style>
