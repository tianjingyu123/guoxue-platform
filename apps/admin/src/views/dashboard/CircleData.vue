<script setup lang="ts">
/**
 * CircleData.vue — 圈子数据看板
 * 对齐后端嵌套契约 entity-dashboard.service.getCircleDashboard：
 *   { basicInfo:{name,createdAt,memberCount,postCount}, memberGrowth:[{date,count}],
 *     engagement:{recentPosts,recentComments,recentLikes},
 *     revenueDistribution:{courseRevenue,productRevenue,tippingCoin},
 *     topContent:[{id,title,viewCount,commentCount,likeCount,createdAt,author}] }
 * 圈子改为对象选择器（filterable 远程搜索），不再手输 UUID；
 * 后端 200 返回 {error:"圈子不存在"} 识别为错误态。
 */
import { ref, type Component } from "vue"
import { circleApi, api } from "@/api"
import ChartCard from "@/components/ChartCard.vue"
import {
  ChatDotRound, User, Document, Calendar,
  Plus, ChatLineRound, StarFilled, Money,
} from "@element-plus/icons-vue"

// ==================== 后端契约类型 ====================
interface CircleDashboard {
  basicInfo?: { name?: string; createdAt?: string; memberCount?: number; postCount?: number }
  memberGrowth?: { date: string; count: number }[]
  engagement?: { recentPosts?: number; recentComments?: number; recentLikes?: number }
  revenueDistribution?: { courseRevenue?: number; productRevenue?: number; tippingCoin?: number }
  topContent?: { id: string; title: string; viewCount: number; commentCount: number; likeCount: number; createdAt: string; author: string }[]
  error?: string
}

// ==================== 圈子选择器（远程搜索） ====================
interface CircleOption { id: string; name: string }
const entityId = ref("")
const circleOptions = ref<CircleOption[]>([])
const optionsLoading = ref(false)

async function searchCircles(query: string) {
  optionsLoading.value = true
  try {
    const res = await circleApi.list({ page: 1, pageSize: 50, keyword: query?.trim() || undefined })
    const d = res.data as { items?: CircleOption[]; circles?: CircleOption[] }
    const list = d?.items || d?.circles || (Array.isArray(res.data) ? res.data : [])
    circleOptions.value = (list as CircleOption[]).filter((c) => c?.id && c?.name)
  } catch {
    circleOptions.value = []
  } finally {
    optionsLoading.value = false
  }
}

// ==================== 状态 ====================
const loading = ref(false)
const loadError = ref(false)
const errorMsg = ref("")
const data = ref<CircleDashboard | null>(null)

// ==================== 统计卡片 ====================
interface CardDef { label: string; value: string; icon: Component; money?: boolean }
const cards = ref<CardDef[]>([])

// ==================== 格式化 ====================
function fmtNum(v: number | null | undefined): string {
  return v == null ? "—" : Number(v).toLocaleString("zh-CN")
}
function fmtMoney(v: number | null | undefined): string {
  return v == null ? "—" : `¥${Number(v).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtDate(v: string | null | undefined): string {
  if (!v) return "—"
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return "—"
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
function fmtDateTime(v: string | null | undefined): string {
  if (!v) return "—"
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return "—"
  const p = (n: number) => String(n).padStart(2, "0")
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// ==================== ECharts 选项 ====================
// echarts option 结构复杂，统一用 any（框架类型）
const growthOption = ref<any>(null)
const revenueOption = ref<any>(null)

function buildGrowthOption(growth: { date: string; count: number }[]) {
  return {
    grid: { top: 30, right: 20, bottom: 30, left: 50 },
    xAxis: {
      type: "category", data: growth.map((g) => g.date.slice(5)),
      axisTick: { show: false }, axisLabel: { color: "#999", fontSize: 12 },
    },
    yAxis: {
      type: "value", minInterval: 1,
      splitLine: { lineStyle: { color: "#F0F0F0" } },
      axisLabel: { color: "#999", fontSize: 12 },
    },
    tooltip: { trigger: "axis", valueFormatter: (v: number) => `${Number(v ?? 0).toLocaleString()} 人` },
    series: [{
      name: "新增成员", type: "line", data: growth.map((g) => g.count ?? 0), smooth: true,
      symbol: "circle", symbolSize: 5,
      lineStyle: { color: "#FF6B6B", width: 3 }, itemStyle: { color: "#FF6B6B" },
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
  }
}

function buildRevenueOption(rd: NonNullable<CircleDashboard["revenueDistribution"]>) {
  const items = [
    { name: "课程收入", value: rd.courseRevenue ?? 0 },
    { name: "商品收入", value: rd.productRevenue ?? 0 },
  ]
  if (items.every((i) => !i.value)) return null
  return {
    tooltip: { trigger: "item", valueFormatter: (v: number) => fmtMoney(v) },
    legend: { bottom: 0 },
    series: [{
      type: "pie", radius: ["45%", "70%"], center: ["50%", "45%"],
      data: items.map((i, idx) => ({ ...i, itemStyle: { color: ["#5B8FF9", "#61C29B"][idx] } })),
      label: { formatter: "{b}\n{d}%" },
    }],
  }
}

// ==================== 数据获取 ====================
async function fetchData() {
  if (!entityId.value) return
  loading.value = true
  loadError.value = false
  errorMsg.value = ""
  data.value = null
  growthOption.value = null
  revenueOption.value = null
  try {
    const res = await api.get(`/dashboard/circles/${entityId.value}`)
    const d = (res.data ?? {}) as CircleDashboard
    // 后端异常时 200 返回 {error:"圈子不存在"/"获取圈子看板失败"}，识别为错误态
    if (d.error) {
      loadError.value = true
      errorMsg.value = d.error
      return
    }
    data.value = d

    const b = d.basicInfo ?? {}
    const e = d.engagement ?? {}
    cards.value = [
      { label: "圈子名称", value: b.name ?? "—", icon: ChatDotRound },
      { label: "成员总数", value: fmtNum(b.memberCount), icon: User },
      { label: "帖子总数", value: fmtNum(b.postCount), icon: Document },
      { label: "创建日期", value: fmtDate(b.createdAt), icon: Calendar },
      { label: "近30日新帖", value: fmtNum(e.recentPosts), icon: Plus },
      { label: "近30日评论", value: fmtNum(e.recentComments), icon: ChatLineRound },
      { label: "近30日点赞", value: fmtNum(e.recentLikes), icon: StarFilled },
      { label: "打赏国学币（累计）", value: fmtNum(d.revenueDistribution?.tippingCoin), icon: Money },
    ]

    const growth = d.memberGrowth ?? []
    growthOption.value = growth.length ? buildGrowthOption(growth) : null
    revenueOption.value = d.revenueDistribution ? buildRevenueOption(d.revenueDistribution) : null
  } catch {
    data.value = null
    loadError.value = true
  } finally {
    loading.value = false
  }
}

// ==================== 导出 CSV ====================
function exportCSV() {
  const d = data.value
  if (!d) return
  const rows: (string | number)[][] = [["指标", "值"]]
  cards.value.forEach((c) => rows.push([c.label, c.value]))
  const growth = d.memberGrowth ?? []
  if (growth.length) {
    rows.push([], ["日期", "新增成员"])
    for (const g of growth) rows.push([g.date, g.count ?? 0])
  }
  const top = d.topContent ?? []
  if (top.length) {
    rows.push([], ["热门内容", "作者", "浏览", "评论", "点赞"])
    for (const t of top) rows.push([`"${(t.title ?? "").replace(/"/g, '""')}"`, t.author ?? "", t.viewCount ?? 0, t.commentCount ?? 0, t.likeCount ?? 0])
  }
  const csv = rows.map((r) => r.join(",")).join("\n")
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `圈子数据_${d.basicInfo?.name ?? entityId.value}_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>圈子数据看板</h3>
      <div class="toolbar-right">
        <el-select
          v-model="entityId"
          placeholder="搜索并选择圈子"
          style="width:240px"
          filterable
          remote
          clearable
          :remote-method="searchCircles"
          :loading="optionsLoading"
          @focus="!circleOptions.length && searchCircles('')"
          @change="fetchData"
        >
          <el-option
            v-for="c in circleOptions"
            :key="c.id"
            :label="c.name"
            :value="c.id"
          />
        </el-select>
        <el-button
          type="primary"
          :loading="loading"
          :disabled="!entityId"
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
        :title="errorMsg || '数据加载失败'"
        :sub-title="errorMsg ? '请重新选择圈子后再查询' : '无法获取圈子数据，请稍后重试'"
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
            :md="14"
          >
            <ChartCard
              title="成员增长 · 近30日"
              :option="growthOption"
              :height="320"
            />
          </el-col>
          <el-col
            :xs="24"
            :md="10"
          >
            <ChartCard
              title="收入构成（课程 / 商品）"
              :option="revenueOption"
              :height="320"
            />
          </el-col>
        </el-row>
        <!-- 热门内容 -->
        <div class="section-card">
          <div class="section-card__title">
            热门内容 Top10（按浏览量）
          </div>
          <el-table
            v-if="data.topContent?.length"
            :data="data.topContent"
            size="default"
          >
            <el-table-column
              label="标题"
              prop="title"
              min-width="240"
              show-overflow-tooltip
            />
            <el-table-column
              label="作者"
              prop="author"
              width="140"
              show-overflow-tooltip
            />
            <el-table-column
              label="浏览"
              width="100"
              align="right"
            >
              <template #default="{ row }">
                {{ fmtNum(row.viewCount) }}
              </template>
            </el-table-column>
            <el-table-column
              label="评论"
              width="100"
              align="right"
            >
              <template #default="{ row }">
                {{ fmtNum(row.commentCount) }}
              </template>
            </el-table-column>
            <el-table-column
              label="点赞"
              width="100"
              align="right"
            >
              <template #default="{ row }">
                {{ fmtNum(row.likeCount) }}
              </template>
            </el-table-column>
            <el-table-column
              label="发布时间"
              width="130"
            >
              <template #default="{ row }">
                <el-tooltip
                  :content="new Date(row.createdAt).toLocaleString('zh-CN')"
                  placement="top"
                >
                  <span>{{ fmtDateTime(row.createdAt) }}</span>
                </el-tooltip>
              </template>
            </el-table-column>
          </el-table>
          <el-empty
            v-else
            description="该圈子暂无已通过审核的文章内容"
            :image-size="48"
          />
        </div>
      </template>
      <el-empty
        v-else-if="!loading"
        description="请选择圈子查看数据（支持按名称搜索）"
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
.stat-card__value { font-size: 24px; font-weight: 700; color: #1A1A1A; margin-top: 8px; font-feature-settings: "tnum"; line-height: 1.2; word-break: break-all; }
.charts-row { margin-bottom: 20px; }
.section-card {
  background: var(--color-bg-card); border-radius: 16px; padding: 20px 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04); margin-bottom: 20px;
}
.section-card__title { font-size: 14px; font-weight: 500; color: var(--color-text-secondary); margin-bottom: 16px; }
@media (max-width: 768px) { .stat-card { margin-bottom: 12px; } }
</style>
