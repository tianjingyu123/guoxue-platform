<script setup lang="ts">
/**
 * CircleData.vue — 圈子数据看板
 * 按圈子 ID 查询该圈子的详细运营指标与增长趋势
 */
import { ref, type Component } from "vue"
import { api } from "@/api"
import * as echarts from "echarts"
import ChartCard from "@/components/ChartCard.vue"
import {
  ChatDotRound, User, Document, DataLine,
  Plus, ChatLineRound, StarFilled, Avatar,
} from "@element-plus/icons-vue"

// ==================== 类型 ====================
/** 成员增长时间序列项 */
interface TimelineItem { date?: string; count?: number }
/** 圈子详情（字段宽松 optional，依模板/脚本实际访问声明） */
interface CircleDetail {
  circleName?: string
  memberCount?: number
  postCount?: number
  activity?: number
  todayNewMembers?: number
  todayInteractions?: number
  elitePostCount?: number
  expertCount?: number
  memberTimeline?: TimelineItem[]
}

// ==================== 状态 ====================
const entityId = ref("")
const loading = ref(false)
const loadError = ref(false)
const data = ref<CircleDetail | null>(null)

// ==================== 统计卡片 ====================
interface CardDef { label: string; value: string | number; icon: Component }
const cards = ref<CardDef[]>([])

// ==================== ECharts 选项 ====================
// echarts option 结构复杂，统一用 any（框架类型），不做精细收敛
const chartOption = ref<any>({})

/** 构建成员增长趋势折线图 */
function buildTrendOption(dates: string[], values: number[]) {
  return {
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
      type: "line", data: values, smooth: true,
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
      // echarts tooltip 回调参数类型复杂，保留 any（框架类型）
      formatter: (params: any) => {
        const p = params[0]
        return `<div style="font-weight:600;margin-bottom:4px">${p.name}</div>
                <div>成员数：<span style="color:#FF6B6B;font-weight:600">${p.value}</span></div>`
      },
    },
  }
}

/** 构建关键指标柱状图（回退方案） */
function buildBarOption() {
  const d = data.value
  if (!d) return {}
  const labels = ["成员数", "帖子数", "精华帖数", "达人数量"]
  const values = [
    d.memberCount ?? 0,
    d.postCount ?? 0,
    d.elitePostCount ?? 0,
    d.expertCount ?? 0,
  ]
  return {
    grid: { top: 30, right: 20, bottom: 30, left: 50 },
    xAxis: {
      type: "category", data: labels,
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
      type: "bar", data: values, barWidth: "40%",
      itemStyle: {
        color: {
          type: "linear", x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: "rgba(255,107,107,0.8)" },
            { offset: 1, color: "rgba(255,107,107,0.3)" },
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
  loadError.value = false
  data.value = null
  try {
    const [circleRes, statsRes] = await Promise.all([
      api.get(`/dashboard/circles/${entityId.value.trim()}`),
      api.get("/dashboard/stats"),
    ])
    const d = circleRes.data ?? {}
    data.value = d

    cards.value = [
      { label: "圈子名称",     value: d.circleName ?? "--",     icon: ChatDotRound },
      { label: "成员数",       value: d.memberCount ?? 0,      icon: User },
      { label: "帖子数",       value: d.postCount ?? 0,        icon: Document },
      { label: "活跃度",       value: d.activity ?? 0,         icon: DataLine },
      { label: "今日新增成员", value: d.todayNewMembers ?? 0,  icon: Plus },
      { label: "今日互动数",   value: d.todayInteractions ?? 0, icon: ChatLineRound },
      { label: "精华帖数",     value: d.elitePostCount ?? 0,   icon: StarFilled },
      { label: "达人数量",     value: d.expertCount ?? 0,      icon: Avatar },
    ]

    // 优先使用 memberTimeline 绘制折线图
    const timeline: TimelineItem[] = d.memberTimeline ?? []
    if (Array.isArray(timeline) && timeline.length > 0) {
      const dates = timeline.map((t) => t.date ?? "")
      const values = timeline.map((t) => t.count ?? 0)
      if (dates.length && values.length) {
        chartOption.value = buildTrendOption(dates, values)
      }
    } else {
      // 回退到柱状图
      chartOption.value = buildBarOption()
    }
  } catch {
    data.value = null
    loadError.value = true
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
    ["圈子名称", d.circleName ?? ""],
    ["圈子 ID", entityId.value],
    ["成员数", d.memberCount ?? 0],
    ["帖子数", d.postCount ?? 0],
    ["活跃度", d.activity ?? 0],
    ["今日新增成员", d.todayNewMembers ?? 0],
    ["今日互动数", d.todayInteractions ?? 0],
    ["精华帖数", d.elitePostCount ?? 0],
    ["达人数量", d.expertCount ?? 0],
  ]

  // 追加时间序列数据
  const timeline = d.memberTimeline ?? []
  if (Array.isArray(timeline) && timeline.length > 0) {
    rows.push([], ["日期", "成员数"])
    for (const t of timeline) {
      rows.push([t.date ?? "", t.count ?? 0])
    }
  }

  const csv = rows.map((r) => r.join(",")).join("\n")
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `圈子数据_${entityId.value}_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>圈子数据看板</h3>
      <div class="toolbar-right">
        <el-input
          v-model="entityId"
          placeholder="输入圈子ID"
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
        sub-title="无法获取圈子数据，请检查圈子ID或稍后重试"
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
      <template v-else-if="data">
        <el-row
          :gutter="20"
          class="stats-row"
        >
        <el-col
          v-for="card in cards"
          :key="card.label"
          :xs="24"
          :sm="12"
          :md="6"
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
              {{ card.value }}
            </div>
          </div>
        </el-col>
      </el-row>
      <el-row
        :gutter="20"
        class="charts-row"
      >
        <el-col
          :xs="24"
          :md="24"
        >
          <ChartCard
            title="成员增长趋势"
            :option="chartOption"
            :height="320"
          />
        </el-col>
      </el-row>
      </template>
      <el-empty
        v-else-if="!loading"
        description="请输入圈子ID查询数据"
        :image-size="48"
      />
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
  box-shadow: 0 2px 12px rgba(0,0,0,0.04); transition: transform 0.2s ease, box-shadow 0.2s ease;
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
.stat-card__value { font-size: 28px; font-weight: 700; color: #1A1A1A; margin-top: 8px; font-feature-settings: "tnum"; line-height: 1.2; }
.charts-row { margin-bottom: 20px; }
@media (max-width: 768px) { .stat-card { margin-bottom: 12px; } }
</style>
