<script setup lang="ts">
/**
 * CourseData.vue — 课程数据看板
 * 对齐后端嵌套契约 entity-dashboard.service.getCourseDashboard：
 *   { basicInfo:{title,lecturer,price,originalPrice,type,createdAt,studentCount},
 *     sales:{totalSales,dailySales:[{date,count,revenue}]},
 *     funnel:{totalEnrolled,started,completed50,completed100,completionRate},
 *     ratingDistribution:{1..5}, churnNodes:[{chapterTitle,completedCount,churnRate}] }
 * 课程改为对象选择器（filterable 远程搜索），不再手输 UUID；
 * 后端 200 返回 {error:"课程不存在"} 识别为错误态。
 * Route meta: roles ["SUPER_ADMIN", "OPERATION_ADMIN", "CONTENT_AUDITOR"]
 */
import { ref } from 'vue'
import type { Component } from 'vue'
import { dashboardApi, courseApi } from '@/api'
import ChartCard from '@/components/ChartCard.vue'
import { Reading, Avatar, Money, Goods, CircleCheckFilled, User } from '@element-plus/icons-vue'
import { downloadCsvRows } from '@/utils/export'

// ==================== 后端契约类型 ====================
interface CourseDashboard {
  basicInfo?: {
    title?: string; lecturer?: string; price?: number; originalPrice?: number | null
    type?: string; createdAt?: string; studentCount?: number
  }
  sales?: { totalSales?: number; dailySales?: { date: string; count: number; revenue: number }[] }
  funnel?: { totalEnrolled?: number; started?: number; completed50?: number; completed100?: number; completionRate?: string }
  ratingDistribution?: Record<number, number>
  churnNodes?: { chapterTitle: string; completedCount: number; churnRate: string }[]
  error?: string
}

// ==================== 课程选择器（远程搜索） ====================
interface CourseOption { id: string; title: string }
const entityId = ref('')
const courseOptions = ref<CourseOption[]>([])
const optionsLoading = ref(false)

async function searchCourses(query: string) {
  optionsLoading.value = true
  try {
    const res = await courseApi.list({ page: 1, pageSize: 50, keyword: query?.trim() || undefined })
    const d = res.data as { items?: CourseOption[]; courses?: CourseOption[] }
    const list = d?.items || d?.courses || (Array.isArray(res.data) ? res.data : [])
    courseOptions.value = (list as CourseOption[]).filter((c) => c?.id && c?.title)
  } catch {
    courseOptions.value = []
  } finally {
    optionsLoading.value = false
  }
}

// ==================== 状态 ====================
const loading = ref(false)
const loadError = ref(false)
const errorMsg = ref('')
const data = ref<CourseDashboard | null>(null)

interface CardDef { label: string; value: string; icon: Component }
const cards = ref<CardDef[]>([])
// ECharts option 为复杂联合类型，保留 any
const salesOption = ref<any>(null)
const funnelOption = ref<any>(null)
const ratingOption = ref<any>(null)

// ==================== 格式化 ====================
function fmtNum(v: number | null | undefined): string {
  return v == null ? '—' : Number(v).toLocaleString('zh-CN')
}
function fmtMoney(v: number | null | undefined): string {
  return v == null ? '—' : `¥${Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
const COURSE_TYPE_MAP: Record<string, string> = {
  VIDEO: '视频课', AUDIO: '音频课', LIVE: '直播课', TEXT: '图文课', OFFLINE: '线下课',
}

// ==================== 图表构建 ====================
function buildSalesOption(daily: { date: string; count: number; revenue: number }[]) {
  return {
    grid: { top: 40, right: 60, bottom: 30, left: 50 },
    legend: { data: ['销量', '销售额'], top: 0 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: daily.map((d) => d.date.slice(5)), axisTick: { show: false }, axisLabel: { color: '#999', fontSize: 12 } },
    yAxis: [
      { type: 'value', name: '销量', minInterval: 1, splitLine: { lineStyle: { color: '#F0F0F0' } }, axisLabel: { color: '#999', fontSize: 12 } },
      { type: 'value', name: '销售额', splitLine: { show: false }, axisLabel: { color: '#999', fontSize: 12, formatter: '¥{value}' } },
    ],
    series: [
      { name: '销量', type: 'bar', data: daily.map((d) => d.count ?? 0), itemStyle: { color: '#5B8FF9', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 16 },
      { name: '销售额', type: 'line', yAxisIndex: 1, smooth: true, data: daily.map((d) => d.revenue ?? 0), lineStyle: { color: '#F6BD16', width: 3 }, itemStyle: { color: '#F6BD16' } },
    ],
  }
}

function buildFunnelOption(f: NonNullable<CourseDashboard['funnel']>) {
  const steps = [
    { name: '报名', value: f.totalEnrolled ?? 0 },
    { name: '开始学习', value: f.started ?? 0 },
    { name: '完成50%', value: f.completed50 ?? 0 },
    { name: '完课', value: f.completed100 ?? 0 },
  ]
  if (steps.every((s) => !s.value)) return null
  const colors = ['#FF6B6B', '#FFA94D', '#69DB7C', '#4ECDC4']
  return {
    tooltip: {
      trigger: 'item',
      // params 为 ECharts tooltip 回调参数（复杂联合类型），保留 any
      formatter: (params: any) => `${params.name}：${Number(params.value).toLocaleString()} 人`,
    },
    series: [{
      type: 'funnel', left: '10%', right: '10%', top: 20, bottom: 20,
      minSize: '20%', maxSize: '100%', sort: 'descending', gap: 4,
      label: {
        show: true, position: 'inside', color: '#fff', fontSize: 13, fontWeight: 600,
        // params 为 ECharts label 回调参数，保留 any
        formatter: (params: any) => `${params.name}\n${params.value}人`,
      },
      labelLine: { show: false },
      itemStyle: { borderColor: '#fff', borderWidth: 2 },
      data: steps.map((s, i) => ({ ...s, itemStyle: { color: colors[i % colors.length] } })),
    }],
  }
}

function buildRatingOption(dist: Record<number, number>) {
  const values = [1, 2, 3, 4, 5].map((star) => dist[star] ?? 0)
  if (values.every((v) => !v)) return null
  return {
    grid: { top: 30, right: 20, bottom: 30, left: 50 },
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${Number(v ?? 0).toLocaleString()} 条` },
    xAxis: { type: 'category', data: ['1星', '2星', '3星', '4星', '5星'], axisTick: { show: false }, axisLabel: { color: '#999', fontSize: 12 } },
    yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#F0F0F0' } }, axisLabel: { color: '#999', fontSize: 12 } },
    series: [{ name: '评价数', type: 'bar', data: values, itemStyle: { color: '#F6BD16', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 32 }],
  }
}

// ==================== 数据获取 ====================
async function fetchData() {
  if (!entityId.value) return
  loading.value = true
  loadError.value = false
  errorMsg.value = ''
  data.value = null
  cards.value = []
  salesOption.value = null
  funnelOption.value = null
  ratingOption.value = null
  try {
    const res = await dashboardApi.course(entityId.value)
    const d = (res.data ?? {}) as CourseDashboard
    // 后端异常时 200 返回 {error:"课程不存在"/"获取课程看板失败"}，识别为错误态
    if (d.error) {
      loadError.value = true
      errorMsg.value = d.error
      return
    }
    data.value = d

    const b = d.basicInfo ?? {}
    const f = d.funnel ?? {}
    cards.value = [
      { label: '课程名称', value: b.title ?? '—', icon: Reading },
      { label: '讲师', value: b.lecturer ?? '—', icon: Avatar },
      { label: `售价（${COURSE_TYPE_MAP[b.type ?? ''] ?? b.type ?? '课程'}）`, value: fmtMoney(b.price), icon: Money },
      { label: '累计销量', value: fmtNum(d.sales?.totalSales), icon: Goods },
      { label: '学员数', value: fmtNum(b.studentCount), icon: User },
      { label: '完课率', value: f.completionRate ?? '—', icon: CircleCheckFilled },
    ]

    const daily = d.sales?.dailySales ?? []
    salesOption.value = daily.length ? buildSalesOption(daily) : null
    funnelOption.value = d.funnel ? buildFunnelOption(d.funnel) : null
    ratingOption.value = d.ratingDistribution ? buildRatingOption(d.ratingDistribution) : null
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

// ==================== 导出 CSV ====================
function exportCSV() {
  const d = data.value
  if (!d) return
  const rows: (string | number)[][] = [['指标', '数值']]
  cards.value.forEach((c) => rows.push([c.label, c.value]))
  const daily = d.sales?.dailySales ?? []
  if (daily.length) {
    rows.push([], ['日期', '销量', '销售额'])
    for (const s of daily) rows.push([s.date, s.count ?? 0, s.revenue ?? 0])
  }
  const churn = d.churnNodes ?? []
  if (churn.length) {
    rows.push([], ['章节', '完课人数', '较上一章流失率'])
    for (const c of churn) rows.push([c.chapterTitle ?? '', c.completedCount ?? 0, c.churnRate ?? ''])
  }
  downloadCsvRows(`课程数据_${d.basicInfo?.title ?? entityId.value}`, rows)
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>课程数据看板</h3>
      <div class="toolbar-right">
        <el-select
          v-model="entityId"
          placeholder="搜索并选择课程"
          style="width:240px"
          filterable
          remote
          clearable
          :remote-method="searchCourses"
          :loading="optionsLoading"
          @focus="!courseOptions.length && searchCourses('')"
          @change="fetchData"
        >
          <el-option
            v-for="c in courseOptions"
            :key="c.id"
            :label="c.title"
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
        :sub-title="errorMsg ? '请重新选择课程后再查询' : '无法获取课程数据，请稍后重试'"
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
        <!-- 统计卡片 -->
        <el-row
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
                {{ card.value }}
              </div>
            </div>
          </el-col>
        </el-row>

        <!-- 30日销售趋势 -->
        <el-row
          :gutter="20"
          class="charts-row"
        >
          <el-col :span="24">
            <ChartCard
              title="销售趋势 · 近30日（销量 × 销售额）"
              :option="salesOption"
              :height="320"
            />
          </el-col>
        </el-row>

        <!-- 学习漏斗 + 评分分布 -->
        <el-row
          :gutter="20"
          class="charts-row"
        >
          <el-col
            :xs="24"
            :md="12"
          >
            <ChartCard
              title="学习漏斗（报名 → 完课）"
              :option="funnelOption"
              :height="360"
            />
          </el-col>
          <el-col
            :xs="24"
            :md="12"
          >
            <ChartCard
              title="评分分布"
              :option="ratingOption"
              :height="360"
            />
          </el-col>
        </el-row>

        <!-- 章节流失明细 -->
        <div class="section-card">
          <div class="section-card__title">
            章节完课与流失（按章节顺序）
          </div>
          <el-table
            v-if="data.churnNodes?.length"
            :data="data.churnNodes"
            size="default"
          >
            <el-table-column
              label="章节"
              prop="chapterTitle"
              min-width="240"
              show-overflow-tooltip
            />
            <el-table-column
              label="完课人数"
              width="140"
              align="right"
            >
              <template #default="{ row }">
                {{ fmtNum(row.completedCount) }}
              </template>
            </el-table-column>
            <el-table-column
              label="较上一章流失率"
              width="160"
              align="right"
            >
              <template #default="{ row }">
                {{ row.churnRate ?? '—' }}
              </template>
            </el-table-column>
          </el-table>
          <el-empty
            v-else
            description="该课程暂无章节或暂无完课记录"
            :image-size="48"
          />
        </div>
      </template>

      <el-empty
        v-else-if="!loading"
        description="请选择课程查看数据（支持按名称搜索）"
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
.stat-card__value { font-size: 24px; font-weight: 700; color: #1A1A1A; font-feature-settings: "tnum"; line-height: 1.2; word-break: break-all; }
.charts-row { margin-bottom: 20px; }
.section-card {
  background: var(--color-bg-card); border-radius: 16px; padding: 20px 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04); margin-bottom: 20px;
}
.section-card__title { font-size: 14px; font-weight: 500; color: var(--color-text-secondary); margin-bottom: 16px; }
@media (max-width: 768px) { .stat-card { margin-bottom: 12px; } }
</style>
