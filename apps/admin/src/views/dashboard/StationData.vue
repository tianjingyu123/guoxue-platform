<script setup lang="ts">
/**
 * StationData.vue — 分站数据看板
 * 对齐后端嵌套契约 entity-dashboard.service.getStationDashboard：
 *   { basicInfo:{name,masterName,code,status,joinedAt},
 *     promotion:{totalClicks,totalConversions,conversionRate},
 *     commission:{totalCommission,settled,pending},
 *     channelAnalysis:[{channel,clicks,conversions}],
 *     team:{subordinateCount,totalCommission} }
 * 分站改为对象选择器（filterable 远程搜索），不再手输 UUID；
 * 后端 200 返回 {error:"分站不存在"} 识别为错误态；后端 null 字段显 "—" 不画 0。
 */
import { ref, onMounted, type Component } from "vue"
import { useRoute } from "vue-router"
import { stationApi, dashboardApi } from "@/api"
import ChartCard from "@/components/ChartCard.vue"
import { downloadCsvRows } from "@/utils/export"
import {
  OfficeBuilding, User, Postcard, CircleCheck,
  View, Goods, DataLine, Money, Coin, Wallet, Share,
} from "@element-plus/icons-vue"

const route = useRoute()

// ==================== 后端契约类型 ====================
interface StationDashboard {
  basicInfo?: { name?: string; masterName?: string; code?: string; status?: string; joinedAt?: string }
  promotion?: { totalClicks?: number; totalConversions?: number; conversionRate?: string }
  commission?: { totalCommission?: number; settled?: number; pending?: number }
  channelAnalysis?: { channel?: string; clicks?: number; conversions?: number }[]
  team?: { subordinateCount?: number; totalCommission?: number }
  error?: string
}

// ==================== 分站选择器（远程搜索） ====================
interface StationOption { id: string; name: string }
const entityId = ref("")
const stationOptions = ref<StationOption[]>([])
const optionsLoading = ref(false)

async function searchStations(query: string) {
  optionsLoading.value = true
  try {
    const res = await stationApi.list({ page: 1, pageSize: 50, keyword: query?.trim() || undefined })
    const d = res.data as { items?: StationOption[]; stations?: StationOption[] }
    const list = d?.items || d?.stations || (Array.isArray(res.data) ? res.data : [])
    stationOptions.value = (list as StationOption[]).filter((s) => s?.id && s?.name)
  } catch {
    stationOptions.value = []
  } finally {
    optionsLoading.value = false
  }
}

// ==================== 状态 ====================
const loading = ref(false)
const loadError = ref(false)
const errorMsg = ref("")
const data = ref<StationDashboard | null>(null)

// ==================== 统计卡片 ====================
interface CardDef { label: string; value: string; icon: Component; hint?: string }
const cards = ref<CardDef[]>([])

const STATION_STATUS_MAP: Record<string, string> = {
  ACTIVE: "运营中", PENDING: "待审核", DISABLED: "已停用",
  SUSPENDED: "已暂停", CLOSED: "已关闭", EXPIRED: "已到期",
}

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

// ==================== ECharts 选项 ====================
// echarts option 结构复杂，统一用 any（框架类型）
const channelOption = ref<any>(null)
const commissionOption = ref<any>(null)

function buildChannelOption(list: NonNullable<StationDashboard["channelAnalysis"]>) {
  const items = list.filter((c) => (c.clicks ?? 0) > 0 || (c.conversions ?? 0) > 0)
  if (!items.length) return null
  const labels = items.map((c) => c.channel || "未标注")
  return {
    grid: { top: 40, right: 20, bottom: 30, left: 50 },
    legend: { data: ["点击", "转化"], top: 0 },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    xAxis: { type: "category", data: labels, axisTick: { show: false }, axisLabel: { color: "#999", fontSize: 12 } },
    yAxis: { type: "value", minInterval: 1, splitLine: { lineStyle: { color: "#F0F0F0" } }, axisLabel: { color: "#999", fontSize: 12 } },
    series: [
      { name: "点击", type: "bar", data: items.map((c) => c.clicks ?? 0), itemStyle: { color: "#5B8FF9", borderRadius: [4, 4, 0, 0] }, barMaxWidth: 28 },
      { name: "转化", type: "bar", data: items.map((c) => c.conversions ?? 0), itemStyle: { color: "#61C29B", borderRadius: [4, 4, 0, 0] }, barMaxWidth: 28 },
    ],
  }
}

function buildCommissionOption(c: NonNullable<StationDashboard["commission"]>) {
  const items = [
    { name: "已结算", value: c.settled ?? 0 },
    { name: "待结算", value: c.pending ?? 0 },
  ]
  if (items.every((i) => !i.value)) return null
  return {
    tooltip: { trigger: "item", valueFormatter: (v: number) => fmtMoney(v) },
    legend: { bottom: 0 },
    series: [{
      type: "pie", radius: ["45%", "70%"], center: ["50%", "45%"],
      data: items.map((i, idx) => ({ ...i, itemStyle: { color: ["#61C29B", "#F6BD16"][idx] } })),
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
  cards.value = []
  channelOption.value = null
  commissionOption.value = null
  try {
    const res = await dashboardApi.station(entityId.value)
    const d = (res.data ?? {}) as StationDashboard
    // 后端异常时 200 返回 {error:"分站不存在"/"获取站长看板失败"}，识别为错误态
    if (d.error) {
      loadError.value = true
      errorMsg.value = d.error
      return
    }
    data.value = d

    const b = d.basicInfo ?? {}
    const p = d.promotion ?? {}
    const c = d.commission ?? {}
    const t = d.team ?? {}
    cards.value = [
      { label: "分站名称", value: b.name ?? "—", icon: OfficeBuilding },
      { label: "站长", value: b.masterName ?? "—", icon: User },
      { label: "分站编码", value: b.code ?? "—", icon: Postcard },
      { label: "状态", value: STATION_STATUS_MAP[b.status ?? ""] ?? b.status ?? "—", icon: CircleCheck, hint: b.joinedAt ? `开通于 ${fmtDate(b.joinedAt)}` : undefined },
      { label: "累计点击", value: fmtNum(p.totalClicks), icon: View },
      { label: "转化订单", value: fmtNum(p.totalConversions), icon: Goods },
      { label: "转化率", value: p.conversionRate ?? "—", icon: DataLine },
      { label: "累计佣金", value: fmtMoney(c.totalCommission), icon: Money },
      { label: "已结算", value: fmtMoney(c.settled), icon: Wallet },
      { label: "待结算", value: fmtMoney(c.pending), icon: Coin },
      { label: "下级团队", value: fmtNum(t.subordinateCount), icon: Share, hint: "ACTIVE 状态推荐关系" },
    ]

    channelOption.value = d.channelAnalysis?.length ? buildChannelOption(d.channelAnalysis) : null
    commissionOption.value = d.commission ? buildCommissionOption(d.commission) : null
  } catch {
    data.value = null
    loadError.value = true
  } finally {
    loading.value = false
  }
}

// 支持从分站管理页面跳转过来时自动查询
onMounted(() => {
  const q = route.query.stationId
  if (q && typeof q === "string") {
    entityId.value = q
    searchStations("")
    fetchData()
  }
})

// ==================== 导出 CSV ====================
function exportCSV() {
  const d = data.value
  if (!d) return
  const rows: (string | number)[][] = [["指标", "值"]]
  cards.value.forEach((c) => rows.push([c.label, c.value]))
  const ch = d.channelAnalysis ?? []
  if (ch.length) {
    rows.push([], ["推广渠道", "点击", "转化"])
    for (const c of ch) rows.push([c.channel || "未标注", c.clicks ?? 0, c.conversions ?? 0])
  }
  downloadCsvRows(`分站数据_${d.basicInfo?.name ?? entityId.value}_${new Date().toISOString().slice(0, 10)}`, rows)
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h3>分站数据看板</h3>
      <div class="toolbar-right">
        <el-select
          v-model="entityId"
          placeholder="搜索并选择分站"
          style="width:240px"
          filterable
          remote
          clearable
          :remote-method="searchStations"
          :loading="optionsLoading"
          @focus="!stationOptions.length && searchStations('')"
          @change="fetchData"
        >
          <el-option
            v-for="s in stationOptions"
            :key="s.id"
            :label="s.name"
            :value="s.id"
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
        :sub-title="errorMsg ? '请重新选择分站后再查询' : '无法获取分站数据，请稍后重试'"
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
              <div
                v-if="card.hint"
                class="stat-card__hint"
              >
                {{ card.hint }}
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
              title="推广渠道分析（点击 × 转化）"
              :option="channelOption"
              :height="320"
            />
          </el-col>
          <el-col
            :xs="24"
            :md="10"
          >
            <ChartCard
              title="佣金结算构成"
              :option="commissionOption"
              :height="320"
            />
          </el-col>
        </el-row>
      </template>

      <el-empty
        v-else-if="!loading"
        description="请选择分站查看数据（支持按名称搜索）"
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
.stat-card__hint { margin-top: 6px; font-size: 12px; color: var(--color-text-secondary); }
.charts-row { margin-bottom: 20px; }
@media (max-width: 768px) { .stat-card { margin-bottom: 12px; } }
</style>
