<script setup lang="ts">
/**
 * PlatformData.vue — 平台总数据看板
 * 全站核心指标 + 用户增长趋势 + TOP10 内容排行
 * Route meta: roles ALL_ADMIN
 */
import { ref, onMounted } from 'vue'
import { api } from '@/api'
import * as echarts from 'echarts'
import ChartCard from '@/components/ChartCard.vue'
import { User, Document, Goods, Money, Plus, Coin, ChatDotRound, View } from '@element-plus/icons-vue'

const loading = ref(false)
const data = ref<any>(null)

interface CardDef {
  label: string
  value: number
  icon: any
  prefix?: string
}
const cards = ref<CardDef[]>([])
const chartOption = ref<any>({})
const topArticles = ref<any[]>([])

/** 构建用户增长折线图 option */
function buildGrowthOption(dates: string[], values: number[]) {
  return {
    grid: { top: 30, right: 20, bottom: 30, left: 50 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: '#F0F0F0' } },
      axisTick: { show: false },
      axisLabel: { color: '#999', fontSize: 12 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#F0F0F0' } },
      axisLabel: { color: '#999', fontSize: 12 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'line',
        data: values,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: '#FF6B6B', width: 3 },
        itemStyle: { color: '#FF6B6B', borderWidth: 2, borderColor: '#fff' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(255,107,107,0.15)' },
              { offset: 1, color: 'rgba(255,107,107,0)' },
            ],
          },
        },
      },
    ],
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#F0F0F0',
      borderWidth: 1,
      textStyle: { color: '#1A1A1A', fontSize: 13 },
      formatter: (params: any) => {
        const p = params[0]
        return `<div style="font-weight:600;margin-bottom:4px">${p.name}</div>
                <div>用户数：<span style="color:#FF6B6B;font-weight:600">${Number(p.value).toLocaleString()}</span></div>`
      },
    },
  }
}

async function fetchData() {
  loading.value = true
  try {
    const [statsRes, trendsRes, _revenueRes, chartsRes] = await Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/trends'),
      api.get('/dashboard/revenue'),
      api.get('/dashboard/charts'),
    ])
    const s = statsRes.data ?? {}
    const t = trendsRes.data ?? {}
    const c = chartsRes.data ?? {}

    data.value = { stats: s, trends: t, charts: c }

    cards.value = [
      { label: '总用户数',  value: s.totalUsers ?? 0,     icon: User },
      { label: '总内容数',  value: s.totalContent ?? 0,   icon: Document },
      { label: '总订单数',  value: s.totalOrders ?? 0,    icon: Goods },
      { label: '总营收',    value: s.totalRevenue ?? 0,   icon: Money, prefix: '¥' },
      { label: '今日新增用户', value: s.todayNewUsers ?? 0, icon: Plus },
      { label: '今日营收',  value: s.todayRevenue ?? 0,   icon: Coin, prefix: '¥' },
      { label: '活跃圈子',  value: s.activeCircles ?? 0,  icon: ChatDotRound },
      { label: '总浏览量',  value: s.totalPageViews ?? 0, icon: View },
    ]

    // 用户增长趋势图
    const dates = t.dates ?? []
    const values = t.userTrend ?? []
    if (dates.length && values.length) {
      chartOption.value = buildGrowthOption(dates, values)
    }

    // TOP10 内容
    topArticles.value = (c.topArticles ?? []).slice(0, 10)
  } catch {
    // 静默失败
  } finally {
    loading.value = false
  }
}

function exportCSV() {
  const rows: string[][] = [['指标', '数值']]
  cards.value.forEach((c) => {
    rows.push([c.label, c.prefix ? `${c.prefix}${c.value.toLocaleString()}` : c.value.toLocaleString()])
  })
  if (topArticles.value.length) {
    rows.push([])
    rows.push(['排名', '标题', '浏览量', '点赞', '评论'])
    topArticles.value.forEach((a: any, i: number) => {
      rows.push([String(i + 1), a.title ?? '', String(a.pageViews ?? 0), String(a.likes ?? 0), String(a.comments ?? 0)])
    })
  }
  const csv = '﻿' + rows.map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '平台总数据.csv'
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(fetchData)
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>平台总数据</h3>
      <div class="toolbar-right">
        <el-button @click="fetchData" :loading="loading">刷新</el-button>
        <el-button @click="exportCSV">导出CSV</el-button>
      </div>
    </div>

    <!-- 统计卡片 4x2 -->
    <el-row :gutter="20" class="stats-row" v-if="data">
      <el-col v-for="card in cards" :key="card.label" :xs="24" :sm="12" :md="6">
        <div class="stat-card">
          <div class="stat-card__top">
            <span class="stat-card__label">{{ card.label }}</span>
            <div class="stat-card__icon">
              <el-icon :size="18"><component :is="card.icon" /></el-icon>
            </div>
          </div>
          <div class="stat-card__value">
            <template v-if="card.prefix">{{ card.prefix }}{{ card.value.toLocaleString() }}</template>
            <template v-else>{{ card.value.toLocaleString() }}</template>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 用户增长趋势折线图 -->
    <el-row :gutter="20" class="charts-row" v-if="data">
      <el-col :xs="24" :md="24">
        <ChartCard title="用户增长趋势 · 近30天" :option="chartOption" :height="320" />
      </el-col>
    </el-row>

    <!-- TOP10 内容排行 -->
    <div class="section-card" v-if="topArticles.length">
      <div class="section-card__title">内容排行 TOP10</div>
      <el-table :data="topArticles" stripe style="width:100%">
        <el-table-column type="index" label="排名" width="64" />
        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
        <el-table-column prop="pageViews" label="浏览量" width="120" align="right" sortable />
        <el-table-column prop="likes" label="点赞" width="100" align="right" sortable />
        <el-table-column prop="comments" label="评论" width="100" align="right" sortable />
      </el-table>
    </div>

    <el-empty v-if="!data && !loading" description="加载中..." :image-size="48" />
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: #8b4513; }
.toolbar-right { display: flex; gap: 8px; }
.stats-row { margin-bottom: 20px; }
.stat-card {
  background: #fff; border-radius: 16px; padding: 20px 22px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04); transition: transform 0.2s, box-shadow 0.2s;
  cursor: default; margin-bottom: 20px;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
.stat-card__top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.stat-card__label { font-size: 13px; color: #999; }
.stat-card__icon {
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(255,107,107,0.1); color: #FF6B6B;
  display: flex; align-items: center; justify-content: center;
}
.stat-card__value { font-size: 28px; font-weight: 700; color: #1A1A1A; font-feature-settings: "tnum"; line-height: 1.2; }
.charts-row { margin-bottom: 20px; }
.section-card {
  background: #fff; border-radius: 16px; padding: 20px 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04); margin-bottom: 20px;
}
.section-card__title { font-size: 14px; font-weight: 500; color: #999; margin-bottom: 16px; }
@media (max-width: 768px) { .stat-card { margin-bottom: 12px; } }
</style>
