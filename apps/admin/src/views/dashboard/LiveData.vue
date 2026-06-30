<script setup lang="ts">
/**
 * LiveData.vue — 直播数据看板
 * 输入直播房间 ID 查询核心指标 + 观看人数趋势
 * Route meta: roles ["SUPER_ADMIN", "OPERATION_ADMIN"]
 */
import { ref } from 'vue'
import { dashboardApi } from '@/api'
import * as echarts from 'echarts'
import ChartCard from '@/components/ChartCard.vue'
import { VideoCamera, View, TrendCharts, Coin, Money, Timer } from '@element-plus/icons-vue'

const loading = ref(false)
const loadError = ref(false)
const entityId = ref('')
const data = ref<any>(null)

interface CardDef {
  label: string
  value: number | string
  icon: any
  prefix?: string
  suffix?: string
}
const cards = ref<CardDef[]>([])
const chartOption = ref<any>({})

/** 构建观看人数趋势折线图 option */
function buildViewerTrendOption(timeline: { time: string; count: number }[]) {
  const times = timeline.map((t) => t.time)
  const counts = timeline.map((t) => t.count ?? 0)
  return {
    grid: { top: 30, right: 20, bottom: 30, left: 50 },
    xAxis: {
      type: 'category',
      data: times,
      axisLine: { lineStyle: { color: '#F0F0F0' } },
      axisTick: { show: false },
      axisLabel: { color: '#999', fontSize: 12 },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: '#F0F0F0' } },
      axisLabel: { color: '#999', fontSize: 12 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'line',
        data: counts,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: '#4ECDC4', width: 3 },
        itemStyle: { color: '#4ECDC4', borderWidth: 2, borderColor: '#fff' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(78,205,196,0.15)' },
              { offset: 1, color: 'rgba(78,205,196,0)' },
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
                <div>观看人数：<span style="color:#4ECDC4;font-weight:600">${Number(p.value).toLocaleString()}</span></div>`
      },
    },
  }
}

async function fetchData() {
  if (!entityId.value) return
  loading.value = true
  loadError.value = false
  data.value = null
  cards.value = []
  chartOption.value = {}
  try {
    const res = await dashboardApi.live(entityId.value)
    const d = res.data ?? {}
    data.value = d

    cards.value = [
      { label: '直播标题',   value: d.title ?? '-',         icon: VideoCamera },
      { label: '观看人数',   value: d.viewerCount ?? 0,     icon: View },
      { label: '峰值在线',   value: d.peakOnline ?? 0,      icon: TrendCharts },
      { label: '打赏总额',   value: d.tipTotal ?? 0,        icon: Coin, prefix: '¥' },
      { label: '成交额',     value: d.revenue ?? 0,         icon: Money, prefix: '¥' },
      { label: '平均观看时长', value: d.avgWatchDuration ?? 0, icon: Timer, suffix: '分' },
    ]

    // 观看人数趋势图
    const timeline = d.timeline ?? []
    if (timeline.length > 0) {
      chartOption.value = buildViewerTrendOption(timeline)
    }
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function exportCSV() {
  const rows: string[][] = [['指标', '数值']]
  cards.value.forEach((c) => {
    let v = ''
    if (c.prefix) v = c.prefix + String(c.value)
    else if (c.suffix) v = String(c.value) + c.suffix
    else v = String(c.value)
    rows.push([c.label, v])
  })
  if (chartOption.value?.series?.[0]?.data?.length) {
    const xData = chartOption.value.xAxis?.data ?? []
    const yData = chartOption.value.series[0].data ?? []
    rows.push([])
    rows.push(['时间', '观看人数'])
    xData.forEach((time: string, i: number) => {
      rows.push([time, String(yData[i] ?? 0)])
    })
  }
  const csv = '﻿' + rows.map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `直播数据_${entityId.value || 'unknown'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div
    v-loading="loading"
    class="page"
  >
    <div class="toolbar">
      <h3>直播数据看板</h3>
      <div class="toolbar-right">
        <el-input
          v-model="entityId"
          placeholder="输入直播房间ID"
          style="width:200px"
          clearable
          @keyup.enter="fetchData"
        />
        <el-button
          type="primary"
          :loading="loading"
          @click="fetchData"
        >
          查询
        </el-button>
        <el-button
          :disabled="!data"
          @click="exportCSV"
        >
          导出CSV
        </el-button>
      </div>
    </div>

    <!-- 错误态 -->
    <el-result
      v-if="loadError"
      icon="error"
      title="数据加载失败"
      sub-title="无法获取直播数据，请检查网络或稍后重试"
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
    <!-- 统计卡片 -->
    <el-row
      v-if="data"
      :gutter="20"
      class="stats-row"
    >
      <el-col
        v-for="card in cards"
        :key="card.label"
        :xs="24"
        :sm="12"
        :md="8"
      >
        <div class="stat-card">
          <div class="stat-card__top">
            <span class="stat-card__label">{{ card.label }}</span>
            <div class="stat-card__icon">
              <el-icon :size="18">
                <component :is="card.icon" />
              </el-icon>
            </div>
          </div>
          <div class="stat-card__value">
            <template v-if="card.prefix">
              {{ card.prefix }}{{ typeof card.value === 'number' ? card.value.toLocaleString() : card.value }}
            </template>
            <template v-else-if="card.suffix">
              {{ card.value }}{{ card.suffix }}
            </template>
            <template v-else>
              {{ card.value }}
            </template>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 观看人数趋势图 -->
    <el-row
      v-if="data && chartOption?.series?.[0]?.data?.length"
      :gutter="20"
      class="charts-row"
    >
      <el-col
        :xs="24"
        :md="24"
      >
        <ChartCard
          title="观看人数趋势"
          :option="chartOption"
          :height="320"
        />
      </el-col>
    </el-row>
    <el-empty
      v-else-if="data && !loading"
      description="暂无观看趋势数据"
      :image-size="48"
    />

    <el-empty
      v-if="!data && !loading"
      description="请输入直播房间ID查询"
      :image-size="48"
    />
    </template>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }
.toolbar-right { display: flex; gap: 8px; }
.stats-row { margin-bottom: 20px; }
.stat-card {
  background: var(--color-bg-card); border-radius: 16px; padding: 20px 22px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04); transition: transform 0.2s, box-shadow 0.2s;
  cursor: default; margin-bottom: 20px;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
.stat-card__top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.stat-card__label { font-size: 13px; color: var(--color-text-secondary); }
.stat-card__icon {
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(255,107,107,0.1); color: #FF6B6B;
  display: flex; align-items: center; justify-content: center;
}
.stat-card__value { font-size: 28px; font-weight: 700; color: #1A1A1A; font-feature-settings: "tnum"; line-height: 1.2; }
.charts-row { margin-bottom: 20px; }
@media (max-width: 768px) { .stat-card { margin-bottom: 12px; } }
</style>
