<template>
  <div class="payment-page">
    <div class="toolbar">
      <h3>支付流水</h3>
      <el-button @click="handleExport">
        导出CSV（当前页）
      </el-button>
    </div>

    <!-- 统计卡片 -->
    <el-row
      :gutter="16"
      style="margin-bottom:16px"
    >
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">¥{{ fmt(stats.todayAmount) }}</span><span class="label">今日交易额</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ stats.todayCount }}</span><span class="label">今日笔数</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">¥{{ fmt(stats.yesterdayAmount) }}</span><span class="label">昨日交易额</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">¥{{ fmt(stats.monthAmount) }}</span><span class="label">本月累计</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">{{ stats.monthCount }}</span><span class="label">本月笔数</span>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <span class="value">¥{{ fmt(stats.totalAmount) }}</span><span class="label">历史累计</span>
        </div>
      </el-col>
    </el-row>
    <div class="stats-caliber">
      统计口径：含已支付 / 已发货 / 已完成 订单（发货与完成同为已收款）；金额按每状态最多近 500 单汇总，历史累计每状态最多近 2000 单。
    </div>

    <el-row
      :gutter="12"
      class="filter-row"
    >
      <el-col :span="6">
        <el-input
          v-model="filters.orderNo"
          placeholder="订单号"
          clearable
        />
      </el-col>
      <el-col :span="6">
        <el-input
          v-model="filters.userId"
          placeholder="用户ID/手机号"
          clearable
        />
      </el-col>
      <el-col :span="4">
        <el-select
          v-model="filters.status"
          placeholder="状态"
          clearable
          style="width:100%"
        >
          <el-option
            v-for="(label, key) in statusLabels"
            :key="key"
            :label="label"
            :value="key"
          />
        </el-select>
      </el-col>
      <el-col :span="4">
        <el-date-picker
          v-model="filters.dateRange"
          type="daterange"
          range-separator="~"
          start-placeholder="开始"
          end-placeholder="结束"
          value-format="YYYY-MM-DD"
          style="width:100%"
        />
      </el-col>
      <el-col :span="4">
        <el-button
          type="primary"
          @click="fetchList"
        >
          查询
        </el-button>
      </el-col>
    </el-row>

    <el-alert
      v-if="error"
      type="error"
      :closable="false"
      show-icon
      style="margin-top:12px"
    >
      <template #title>
        加载失败，请
        <el-button
          link
          type="primary"
          @click="fetchList"
        >
          重试
        </el-button>
      </template>
    </el-alert>

    <el-table
      v-loading="loading"
      :data="list"
      stripe
      style="margin-top:12px"
    >
      <template #empty>
        <el-empty description="暂无支付流水" />
      </template>
      <el-table-column
        label="订单号"
        prop="orderNo"
        width="190"
      />
      <el-table-column
        label="用户"
        width="120"
      >
        <template #default="{ row }">
          {{ row.user?.nickname || row.user?.phone || row.userId }}
        </template>
      </el-table-column>
      <el-table-column
        label="类型"
        width="100"
      >
        <template #default="{ row }">
          {{ typeLabel(row.type || row.orderType) }}
        </template>
      </el-table-column>
      <el-table-column
        label="金额"
        width="110"
        align="right"
      >
        <template #default="{ row }">
          ¥{{ fmt(row.amount || row.totalAmount) }}
        </template>
      </el-table-column>
      <el-table-column
        label="支付方式"
        width="100"
      >
        <template #default="{ row }">
          {{ payMethodLabel(row.payMethod || row.paymentMethod) }}
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="90"
      >
        <template #default="{ row }">
          <el-tag
            :type="statusTagTypes[row.status] || 'info'"
            size="small"
          >
            {{ statusLabels[row.status] || row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="支付时间"
        width="170"
      >
        <template #default="{ row }">
          {{ formatDate(row.paidAt || row.createdAt) }}
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      :total="total"
      :page-size="20"
      layout="total, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end"
      @current-change="fetchList"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { orderApi } from '@/api'
import { exportCSV } from '@/utils/export'

/** 支付流水行（字段宽松 optional） */
interface PaymentRow {
  orderNo?: string
  userId?: string
  user?: { nickname?: string; phone?: string }
  type?: string
  orderType?: string
  amount?: number | string
  totalAmount?: number | string
  payMethod?: string
  paymentMethod?: string
  status?: string
  paidAt?: string
  createdAt?: string
}
/** 订单列表响应（解包后） */
interface OrderListResp { orders?: PaymentRow[]; data?: PaymentRow[]; total: number }

const loading = ref(false)
const error = ref(false)
const list = ref<PaymentRow[]>([])
const total = ref(0)
const page = ref(1)
const filters = reactive({ orderNo: '', userId: '', status: '', dateRange: [] as string[] })

const stats = reactive({ todayAmount: 0, todayCount: 0, yesterdayAmount: 0, yesterdayCount: 0, monthAmount: 0, monthCount: 0, totalAmount: 0, totalCount: 0 })

function fmt(v: number | string | undefined | null) {
  if (v === null || v === undefined) return "0.00"
  return Number(v).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

onMounted(() => { fetchList(); fetchStats(); })

/** OrderType 全量 12 值翻译（schema enum OrderType·漏一个就英文枚举直出员工界面） */
function typeLabel(t: string) {
  const m: Record<string, string> = {
    MEMBER: '书院会员', COURSE: '课程', PRODUCT: '商品', CIRCLE_JOIN: '入圈',
    CIRCLE_RENEW: '圈子续费', STATION_MASTER: '分站站长', OPERATOR: '运营商',
    BOT_SERVICE: '智能体服务', PAIPAN: '排盘', LIVESTREAM: '直播', BUNDLE: '课程组合包',
    PRACTITIONER_PRO: '从业者会员',
  }
  return m[t] || t || '-'
}
const statusLabels: Record<string, string> = {
  PENDING: '待支付', PAID: '已支付', SHIPPED: '已发货', COMPLETED: '已完成', REFUNDED: '已退款', CANCELLED: '已取消',
}
const statusTagTypes: Record<string, string> = {
  PENDING: 'warning', PAID: 'success', SHIPPED: 'primary', COMPLETED: 'success', REFUNDED: 'info', CANCELLED: 'info',
}
function payMethodLabel(m?: string) {
  if (!m) return '—'
  const map: Record<string, string> = {
    WECHAT: '微信支付', wechat: '微信支付', ALIPAY: '支付宝', alipay: '支付宝',
    UNIONPAY: '银联', HUIFU: '汇付', COIN: '国学币', BALANCE: '余额', MANUAL: '人工确认',
  }
  return map[m] || m
}
function formatDate(d: string) { return d ? new Date(d).toLocaleString("zh-CN", { hour12: false }) : '-' }

// 已收款订单状态口径：SHIPPED/COMPLETED 同为已收款（原统计只算 PAID，发货/完成后金额从看板"蒸发"）
const PAID_LIKE_STATUSES = ['PAID', 'SHIPPED', 'COMPLETED'] as const

/** 单状态某时间段的 笔数+金额（金额按最多 cap 条汇总·后端 listOrders 仅支持单状态过滤，故逐状态查再求和） */
async function sumOneStatus(status: string, cap: number, startDate?: string, endDate?: string) {
  const base: Record<string, string | number> = { status }
  if (startDate && endDate) { base.startDate = startDate; base.endDate = endDate }
  const head = await orderApi.list({ page: 1, pageSize: 1, ...base })
  const total = ((head.data || {}) as OrderListResp).total || 0
  let amount = 0
  if (total > 0) {
    const items = await orderApi.list({ page: 1, pageSize: Math.min(total, cap), ...base })
    const data = items.data as OrderListResp
    amount = (data?.orders || data?.data || []).reduce((s: number, r: PaymentRow) => s + Number(r.amount || r.totalAmount || 0), 0)
  }
  return { count: total, amount }
}

/** 三个已收款状态合并统计 */
async function sumPaidLike(cap: number, startDate?: string, endDate?: string) {
  const parts = await Promise.all(PAID_LIKE_STATUSES.map((s) => sumOneStatus(s, cap, startDate, endDate)))
  return parts.reduce((acc, p) => ({ count: acc.count + p.count, amount: acc.amount + p.amount }), { count: 0, amount: 0 })
}

async function fetchStats() {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

    const [td, yd, mo, al] = await Promise.all([
      sumPaidLike(500, today, today),
      sumPaidLike(500, yesterday, yesterday),
      sumPaidLike(500, monthStart, today),
      sumPaidLike(2000),
    ])
    stats.todayCount = td.count; stats.todayAmount = td.amount
    stats.yesterdayCount = yd.count; stats.yesterdayAmount = yd.amount
    stats.monthCount = mo.count; stats.monthAmount = mo.amount
    stats.totalCount = al.count; stats.totalAmount = al.amount
  } catch { /* 统计失败不阻塞列表主流程 */ }
}

async function fetchList() {
  loading.value = true
  error.value = false
  try {
    const params: { page: number; pageSize: number; orderNo?: string; userId?: string; status?: string; startDate?: string; endDate?: string } = { page: page.value, pageSize: 20 }
    if (filters.orderNo) params.orderNo = filters.orderNo
    if (filters.userId) params.userId = filters.userId
    if (filters.status) params.status = filters.status
    if (filters.dateRange?.length === 2) {
      params.startDate = filters.dateRange[0]
      params.endDate = filters.dateRange[1]
    }
    const { data } = await orderApi.list(params)
    list.value = data.items || data.orders || data.data || []
    total.value = data.total || 0
  } catch {
    list.value = []
    total.value = 0
    error.value = true
  } finally { loading.value = false }
}

function handleExport() {
  exportCSV('支付流水', [
    { label: '订单号', key: 'orderNo' },
    { label: '用户', key: 'userName' },
    { label: '类型', key: 'typeLabel' },
    { label: '金额', key: 'amount' },
    { label: '支付方式', key: 'payMethod' },
    { label: '状态', key: 'status' },
    { label: '支付时间', key: 'paidAt' },
  ], list.value.map(item => ({
    ...item,
    userName: item.user?.nickname || item.userId,
    typeLabel: typeLabel(item.type || item.orderType || ''),
    amount: `¥${fmt(item.amount || item.totalAmount)}`,
    payMethod: payMethodLabel(item.payMethod || item.paymentMethod),
    status: statusLabels[item.status ?? ''] || item.status,
    paidAt: formatDate(item.paidAt || item.createdAt || ''),
  })))
}
</script>

<style scoped>
.payment-page { padding: 0; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar h3 { margin: 0; font-size: 18px; color: var(--color-text-title); }

.stat-card { background: var(--color-bg-page); border-radius: 8px; padding: 16px; text-align: center; }
.stat-card .value { display: block; font-size: 22px; font-weight: 700; color: var(--color-text-title); }
.stat-card .label { display: block; font-size: 13px; color: var(--color-text-secondary); margin-top: 4px; }

.filter-row { background: var(--color-bg-page); padding: 12px; border-radius: 8px; }
.stats-caliber { font-size: 12px; color: var(--color-text-secondary, #909399); margin: -8px 0 12px; }
</style>
