<script setup lang="ts">
/**
 * StationData.vue — 分站数据看板
 * 按分站 ID 查询推广分站的营收与运营指标
 */
import { ref, onMounted } from "vue"
import { useRoute } from "vue-router"
import { api } from "@/api"
import * as echarts from "echarts"
import ChartCard from "@/components/ChartCard.vue"
import {
  OfficeBuilding, Money, Calendar, User,
  View, DataLine, Goods, Coin,
} from "@element-plus/icons-vue"

const route = useRoute()

// ==================== 状态 ====================
const entityId = ref("")
const loading = ref(false)
const data = ref<any>(null)

// 支持从分站管理页面跳转过来时自动查询
onMounted(() => {
  const q = route.query.stationId
  if (q && typeof q === "string") {
    entityId.value = q
    fetchData()
  }
})

// ==================== 统计卡片 ====================
interface CardDef { label: string; value: string | number; icon: any }
const cards = ref<CardDef[]>([])

// ==================== ECharts 选项 ====================
const chartOption = ref<any>({})

/** 构建营收趋势折线图 */
function buildRevenueOption(dates: string[], values: number[]) {
  return {
    grid: { top: 30, right: 20, bottom: 30, left: 60 },
    xAxis: {
      type: "category", data: dates,
      axisLine: { lineStyle: { color: "#F0F0F0" } },
      axisTick: { show: false },
      axisLabel: { color: "#999", fontSize: 12 },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "#F0F0F0" } },
      axisLabel: { color: "#999", fontSize: 12, formatter: "¥{value}" },
      axisLine: { show: false }, axisTick: { show: false },
    },
    series: [{
      type: "line", data: values, smooth: true,
      symbol: "circle", symbolSize: 6,
      lineStyle: { color: "#4ECDC4", width: 3 },
      itemStyle: { color: "#4ECDC4", borderWidth: 2, borderColor: "#fff" },
      areaStyle: {
        color: {
          type: "linear", x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: "rgba(78,205,196,0.15)" },
            { offset: 1, color: "rgba(78,205,196,0)" },
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
                <div>营收：<span style="color:#4ECDC4;font-weight:600">¥${Number(p.value).toLocaleString()}</span></div>`
      },
    },
  }
}

/** 构建关键指标柱状图（回退方案） */
function buildBarOption() {
  const d = data.value
  if (!d) return {}
  const labels = ["总收益", "本月收益", "推广人数", "点击量", "订单数", "佣金总额"]
  const values = [
    d.totalRevenue ?? 0,
    d.monthRevenue ?? 0,
    d.promoters ?? 0,
    d.clicks ?? 0,
    d.orders ?? 0,
    d.commissionTotal ?? 0,
  ]
  return {
    grid: { top: 30, right: 20, bottom: 30, left: 60 },
    xAxis: {
      type: "category", data: labels,
      axisLine: { lineStyle: { color: "#F0F0F0" } },
      axisTick: { show: false },
      axisLabel: { color: "#999", fontSize: 12 },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "#F0F0F0" } },
      axisLabel: { color: "#999", fontSize: 12 },
      axisLine: { show: false }, axisTick: { show: false },
    },
    series: [{
      type: "bar", data: values, barWidth: "40%",
      itemStyle: {
        color: {
          type: "linear", x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: "rgba(78,205,196,0.8)" },
            { offset: 1, color: "rgba(78,205,196,0.3)" },
          ],
        },
        borderRadius: [4, 4, 0, 0],
      },
    }],
    tooltip: {
      trigger: "axis", backgroundColor: "#fff",
      borderColor: "#F0F0F0", borderWidth: 1,
      textStyle: { color: "#1A1A1A", fontSize: 13 },
    },
  }
}

// ==================== 数据获取 ====================
async function fetchData() {
  if (!entityId.value.trim()) return
  loading.value = true
  data.value = null
  try {
    const res = await api.get(`/dashboard/station/${entityId.value.trim()}`)
    const d = res.data ?? {}
    data.value = d

    cards.value = [
      { label: "分站名称",   value: d.stationName ?? "--",        icon: OfficeBuilding },
      { label: "总收益",     value: d.totalRevenue ?? 0,          icon: Money },
      { label: "本月收益",   value: d.monthRevenue ?? 0,          icon: Calendar },
      { label: "推广人数",   value: d.promoters ?? 0,             icon: User },
      { label: "点击量",     value: d.clicks ?? 0,                icon: View },
      { label: "转化率",     value: d.conversionRate ?? "0%",     icon: DataLine },
      { label: "订单数",     value: d.orders ?? 0,                icon: Goods },
      { label: "佣金总额",   value: d.commissionTotal ?? 0,       icon: Coin },
    ]

    // 优先使用 revenueTimeline 绘制折线图
    const timeline = d.revenueTimeline ?? []
    if (Array.isArray(timeline) && timeline.length > 0) {
      const dates = timeline.map((t: any) => t.date ?? "")
      const values = timeline.map((t: any) => t.revenue ?? 0)
      if (dates.length && values.length) {
        chartOption.value = buildRevenueOption(dates, values)
      }
    } else {
      // 回退到柱状图
      chartOption.value = buildBarOption()
    }
  } catch {
    data.value = null
  } finally {
    loading.value = false
  }
}

// ==================== 导出 CSV ====================
function exportCSV() {
  if (!data.value) return
  const d = data.value
  const rows = [
    ["指标", "值"],
    ["分站名称", d.stationName ?? ""],
    ["分站 ID", entityId.value],
    ["总收益", d.totalRevenue ?? 0],
    ["本月收益", d.monthRevenue ?? 0],
    ["推广人数", d.promoters ?? 0],
    ["点击量", d.clicks ?? 0],
    ["转化率", d.conversionRate ?? "0%"],
    ["订单数", d.orders ?? 0],
    ["佣金总额", d.commissionTotal ?? 0],
  ]

  // 追加时间序列数据
  const timeline = d.revenueTimeline ?? []
  if (Array.isArray(timeline) && timeline.length > 0) {
    rows.push([], ["日期", "营收"])
    for (const t of timeline) {
      rows.push([t.date ?? "", t.revenue ?? 0])
    }
  }

  const csv = rows.map((r) => r.join(",")).join("\n")
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `分站数据_${entityId.value}_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>分站数据看板</h3>
      <div class="toolbar-right">
        <el-input v-model="entityId" placeholder="输入分站ID" style="width:200px" clearable @keyup.enter="fetchData" />
        <el-button type="primary" @click="fetchData">查询</el-button>
        <el-button @click="exportCSV" :disabled="!data">导出CSV</el-button>
      </div>
    </div>
    <div v-if="data" v-loading="loading">
      <el-row :gutter="20" class="stats-row">
        <el-col v-for="card in cards" :key="card.label" :xs="24" :sm="12" :md="6">
          <div class="stat-card">
            <div class="stat-card__top">
              <span class="stat-card__label">{{ card.label }}</span>
              <div class="stat-card__icon"><el-icon :size="18"><component :is="card.icon" /></el-icon></div>
            </div>
            <div class="stat-card__value">{{ card.value }}</div>
          </div>
        </el-col>
      </el-row>
      <el-row :gutter="20" class="charts-row">
        <el-col :xs="24" :md="24">
          <ChartCard title="营收趋势" :option="chartOption" :height="320" />
        </el-col>
      </el-row>
    </div>
    <el-empty v-if="!data && !loading" description="请输入分站ID查询数据" :image-size="48" />
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
  box-shadow: 0 2px 12px rgba(0,0,0,0.04); transition: transform 0.2s ease, box-shadow 0.2s ease;
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
.stat-card__value { font-size: 28px; font-weight: 700; color: #1A1A1A; margin-top: 8px; font-feature-settings: "tnum"; line-height: 1.2; }
.charts-row { margin-bottom: 20px; }
@media (max-width: 768px) { .stat-card { margin-bottom: 12px; } }
</style>
