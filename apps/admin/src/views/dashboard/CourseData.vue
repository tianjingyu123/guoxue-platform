<script setup lang="ts">
/**
 * CourseData.vue — 课程数据看板
 * 输入课程 ID 查询核心指标 + 章节完课漏斗
 * Route meta: roles ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"]
 */
import { ref } from 'vue'
import { dashboardApi } from '@/api'
import * as echarts from 'echarts'
import ChartCard from '@/components/ChartCard.vue'
import { Reading, Goods, Money, Star, CircleCheckFilled, User } from '@element-plus/icons-vue'

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

/** 构建章节完课漏斗图 option */
function buildFunnelOption(chapters: { name: string; completionCount: number }[]) {
  const colors = ['#FF6B6B', '#FFA94D', '#FFD43B', '#69DB7C', '#4ECDC4', '#748FFC', '#9775FA', '#DA77F2']
  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: '#fff',
      borderColor: '#F0F0F0',
      borderWidth: 1,
      textStyle: { color: '#1A1A1A', fontSize: 13 },
      formatter: (params: any) => {
        return `<div style="font-weight:600;margin-bottom:4px">${params.name}</div>
                <div>完课人数：<span style="color:#FF6B6B;font-weight:600">${params.value}</span></div>`
      },
    },
    series: [
      {
        type: 'funnel',
        left: '10%',
        right: '10%',
        top: 20,
        bottom: 20,
        minSize: '20%',
        maxSize: '100%',
        sort: 'descending',
        gap: 4,
        label: {
          show: true,
          position: 'inside',
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
          formatter: (params: any) => `${params.name}\n${params.value}人`,
        },
        labelLine: { show: false },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 2,
        },
        emphasis: {
          label: { fontSize: 15 },
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.15)' },
        },
        data: chapters.map((ch, i) => ({
          name: ch.name,
          value: ch.completionCount ?? 0,
          itemStyle: { color: colors[i % colors.length] },
        })),
      },
    ],
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
    const res = await dashboardApi.course(entityId.value)
    const d = res.data ?? {}
    data.value = d

    cards.value = [
      { label: '课程名称', value: d.title ?? '-', icon: Reading },
      { label: '总销量', value: d.totalSales ?? 0, icon: Goods },
      { label: '总营收', value: d.totalRevenue ?? 0, icon: Money, prefix: '¥' },
      { label: '评分', value: d.rating ?? 0, icon: Star, suffix: '分' },
      { label: '完课率', value: d.completionRate ?? 0, icon: CircleCheckFilled, suffix: '%' },
      { label: '在学人数', value: d.activeStudents ?? 0, icon: User },
    ]

    // 章节完课漏斗图
    const chapters = d.chapters ?? []
    if (chapters.length > 0) {
      chartOption.value = buildFunnelOption(chapters)
    }
  } catch {
    // 失败不吞错：进入错误态，由模板提示并提供重试
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
    rows.push([])
    rows.push(['章节', '完课人数'])
    chartOption.value.series[0].data.forEach((item: any) => {
      rows.push([item.name, String(item.value)])
    })
  }
  const csv = '﻿' + rows.map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `课程数据_${entityId.value || 'unknown'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>课程数据看板</h3>
      <div class="toolbar-right">
        <el-input
          v-model="entityId"
          placeholder="输入课程ID"
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

    <div
      v-loading="loading"
      class="content"
    >
      <el-result
        v-if="loadError"
        icon="error"
        title="数据加载失败"
        sub-title="无法获取课程数据，请检查课程ID或稍后重试"
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

    <!-- 章节完课漏斗图 -->
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
          title="章节完课漏斗"
          :option="chartOption"
          :height="400"
        />
      </el-col>
        </el-row>

        <el-empty
          v-if="!data && !loading"
          description="请输入课程ID查询"
          :image-size="48"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.content { min-height: 200px; }
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
