<script setup lang="ts">
/**
 * LiveData.vue — 直播数据看板
 * 对齐后端嵌套契约 entity-dashboard.service.getLiveDashboard：
 *   { basicInfo:{title,host,startTime,endTime,durationSeconds,status,chargeType,chargePrice},
 *     viewData:{totalViews,peakOnline,avgWatchDuration},
 *     interaction:{comments,likes,shares}, tipping:{totalCoin,tipperCount},
 *     transaction:{orderCount,revenue}, trafficSources:null, audienceProfile:null }
 * 直播间改为对象选择器（下拉 filterable·后端房间列表不支持关键词故预载100条本地过滤）；
 * 后端 null 字段（peakOnline/avgWatchDuration 等）诚实显示"—"，不画 0；
 * 后端 200 返回 {error:"直播不存在"} 识别为错误态。
 * Route meta: roles ["SUPER_ADMIN", "OPERATION_ADMIN"]
 */
import { ref } from 'vue'
import type { Component } from 'vue'
import { dashboardApi, liveApi } from '@/api'
import ChartCard from '@/components/ChartCard.vue'
import { VideoCamera, Avatar, View, TrendCharts, Coin, Money, Timer, Goods } from '@element-plus/icons-vue'

// ==================== 后端契约类型 ====================
interface LiveDashboard {
  basicInfo?: {
    title?: string; host?: string; startTime?: string | null; endTime?: string | null
    durationSeconds?: number | null; status?: string; chargeType?: string; chargePrice?: number
  }
  viewData?: { totalViews?: number; peakOnline?: number | null; avgWatchDuration?: number | null }
  interaction?: { comments?: number; likes?: number; shares?: number }
  tipping?: { totalCoin?: number; tipperCount?: number }
  transaction?: { orderCount?: number; revenue?: number }
  error?: string
}

// ==================== 直播间选择器 ====================
interface RoomOption { id: string; title: string; status?: string }
const entityId = ref('')
const roomOptions = ref<RoomOption[]>([])
const optionsLoading = ref(false)

async function loadRooms() {
  if (roomOptions.value.length) return
  optionsLoading.value = true
  try {
    // scope=all：管理端可见全部开放范围的直播间（后端不支持关键词搜索，预载后本地过滤）
    const res = await liveApi.rooms({ pageSize: 100, scope: 'all' })
    const d = res.data as { items?: RoomOption[]; rooms?: RoomOption[] }
    const list = d?.items || d?.rooms || (Array.isArray(res.data) ? res.data : [])
    roomOptions.value = (list as RoomOption[]).filter((r) => r?.id && r?.title)
  } catch {
    roomOptions.value = []
  } finally {
    optionsLoading.value = false
  }
}

// ==================== 状态 ====================
const loading = ref(false)
const loadError = ref(false)
const errorMsg = ref('')
const data = ref<LiveDashboard | null>(null)

interface CardDef { label: string; value: string; icon: Component; hint?: string }
const cards = ref<CardDef[]>([])
// ECharts option 为复杂联合类型，保留 any
const interactionOption = ref<any>(null)

// ==================== 格式化 ====================
function fmtNum(v: number | null | undefined): string {
  return v == null ? '—' : Number(v).toLocaleString('zh-CN')
}
function fmtMoney(v: number | null | undefined): string {
  return v == null ? '—' : `¥${Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtDuration(seconds: number | null | undefined): string {
  if (seconds == null) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}小时${m}分` : `${m}分钟`
}
const LIVE_STATUS_MAP: Record<string, string> = {
  LIVING: '直播中', LIVE: '直播中', ENDED: '已结束', SCHEDULED: '未开播', PENDING: '未开播', PAUSED: '已暂停', BANNED: '已封禁',
}
const CHARGE_TYPE_MAP: Record<string, string> = { FREE: '免费', PAID: '付费', COIN: '国学币', TICKET: '门票' }

// ==================== 图表 ====================
function buildInteractionOption(d: LiveDashboard) {
  const items = [
    { name: '评论', value: d.interaction?.comments ?? 0, color: '#5B8FF9' },
    { name: '点赞', value: d.interaction?.likes ?? 0, color: '#FF6B6B' },
    { name: '打赏人数', value: d.tipping?.tipperCount ?? 0, color: '#F6BD16' },
    { name: '订单数', value: d.transaction?.orderCount ?? 0, color: '#61C29B' },
  ]
  if (items.every((i) => !i.value)) return null
  return {
    grid: { top: 30, right: 20, bottom: 30, left: 50 },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'category', data: items.map((i) => i.name), axisTick: { show: false }, axisLabel: { color: '#999', fontSize: 12 } },
    yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#F0F0F0' } }, axisLabel: { color: '#999', fontSize: 12 } },
    series: [{
      name: '数量', type: 'bar', barMaxWidth: 40,
      data: items.map((i) => ({ value: i.value, itemStyle: { color: i.color, borderRadius: [4, 4, 0, 0] } })),
      label: { show: true, position: 'top', color: '#999', fontSize: 12 },
    }],
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
  interactionOption.value = null
  try {
    const res = await dashboardApi.live(entityId.value)
    const d = (res.data ?? {}) as LiveDashboard
    // 后端异常时 200 返回 {error:"直播不存在"/"获取直播看板失败"}，识别为错误态
    if (d.error) {
      loadError.value = true
      errorMsg.value = d.error
      return
    }
    data.value = d

    const b = d.basicInfo ?? {}
    const chargeLabel = CHARGE_TYPE_MAP[b.chargeType ?? ''] ?? b.chargeType ?? '—'
    cards.value = [
      { label: '直播标题', value: b.title ?? '—', icon: VideoCamera },
      { label: '主播', value: b.host ?? '—', icon: Avatar, hint: `${LIVE_STATUS_MAP[b.status ?? ''] ?? b.status ?? '—'} · ${chargeLabel}${b.chargeType !== 'FREE' && b.chargePrice ? ` ${fmtMoney(b.chargePrice)}` : ''}` },
      { label: '累计观看', value: fmtNum(d.viewData?.totalViews), icon: View },
      { label: '峰值在线', value: fmtNum(d.viewData?.peakOnline), icon: TrendCharts, hint: d.viewData?.peakOnline == null ? '暂未采集该指标' : undefined },
      { label: '平均观看时长', value: d.viewData?.avgWatchDuration == null ? '—' : fmtDuration(d.viewData.avgWatchDuration), icon: Timer, hint: d.viewData?.avgWatchDuration == null ? '暂未采集该指标' : undefined },
      { label: '直播时长', value: fmtDuration(b.durationSeconds), icon: Timer },
      { label: '打赏国学币', value: fmtNum(d.tipping?.totalCoin), icon: Coin, hint: `${fmtNum(d.tipping?.tipperCount)} 人打赏` },
      { label: '带货成交额', value: fmtMoney(d.transaction?.revenue), icon: Money, hint: `${fmtNum(d.transaction?.orderCount)} 笔订单` },
      { label: '互动（评论/点赞）', value: `${fmtNum(d.interaction?.comments)} / ${fmtNum(d.interaction?.likes)}`, icon: Goods },
    ]
    interactionOption.value = buildInteractionOption(d)
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
  const rows: string[][] = [['指标', '数值']]
  cards.value.forEach((c) => rows.push([c.label, `"${c.value}"`]))
  const csv = '﻿' + rows.map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `直播数据_${d.basicInfo?.title ?? entityId.value}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>直播数据看板</h3>
      <div class="toolbar-right">
        <el-select
          v-model="entityId"
          placeholder="选择直播间（可输入标题过滤）"
          style="width:260px"
          filterable
          clearable
          :loading="optionsLoading"
          @focus="loadRooms"
          @change="fetchData"
        >
          <el-option
            v-for="r in roomOptions"
            :key="r.id"
            :label="`${r.title}${LIVE_STATUS_MAP[r.status ?? ''] ? `（${LIVE_STATUS_MAP[r.status ?? '']}）` : ''}`"
            :value="r.id"
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
      <!-- 错误态 -->
      <el-result
        v-if="loadError"
        icon="error"
        :title="errorMsg || '数据加载失败'"
        :sub-title="errorMsg ? '请重新选择直播间后再查询' : '无法获取直播数据，请稍后重试'"
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
              <div
                v-if="card.hint"
                class="stat-card__hint"
              >
                {{ card.hint }}
              </div>
            </div>
          </el-col>
        </el-row>

        <!-- 互动概览 -->
        <el-row
          :gutter="20"
          class="charts-row"
        >
          <el-col :span="24">
            <ChartCard
              title="互动与成交概览"
              :option="interactionOption"
              :height="300"
            />
          </el-col>
        </el-row>
      </template>

      <el-empty
        v-else-if="!loading"
        description="请选择直播间查看数据（可输入标题过滤）"
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
.stat-card__hint { margin-top: 6px; font-size: 12px; color: var(--color-text-secondary); }
.charts-row { margin-bottom: 20px; }
@media (max-width: 768px) { .stat-card { margin-bottom: 12px; } }
</style>
