<template>
  <view class="b7-page">
    <!-- 自定义导航 -->
    <view class="b7-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="b7-nav-row">
        <view class="b7-icon-btn" @tap="onBack">
          <app-icon name="chevron-left" :size="22" color="#2C2C2C" />
        </view>
        <text class="b7-nav-title">{{ detail ? '结算单详情' : '订单与结算' }}</text>
        <view class="b7-icon-btn" />
      </view>
      <!-- Tab（详情态隐藏） -->
      <view v-if="!detail" class="b7-tabs">
        <text class="b7-tab" :class="{ on: tab === 'orders' }" @tap="switchTab('orders')">订单</text>
        <text class="b7-tab" :class="{ on: tab === 'settle' }" @tap="switchTab('settle')">结算</text>
      </view>
    </view>

    <scroll-view scroll-y class="b7-body">
      <!-- 加载态 -->
      <view v-if="loading" class="b7-state">
        <view class="spinner" /><text class="b7-state-text">加载中…</text>
      </view>
      <!-- 错误态 -->
      <view v-else-if="errMsg" class="b7-state">
        <app-icon name="alert-circle" :size="44" color="#d8cfc0" /><text class="b7-state-text">{{ errMsg }}</text>
        <view class="b7-retry" @tap="load"><text class="b7-retry-text">重试</text></view>
      </view>

      <template v-else>
        <view v-if="!detail" class="b7-capability">
          <view class="b7-capability-icon"><app-icon name="alert-circle" :size="18" color="#8a6420" /></view>
          <view class="b7-capability-body">
            <text class="b7-capability-title">当前为到店支付</text>
            <text class="b7-capability-text">平台暂不代收驿站课程费用。本页只保留平台支付系统确认的历史记录；到店收款不会自动生成订单或结算单。</text>
          </view>
        </view>

        <!-- ============ 态③ 结算单详情（只读） ============ -->
        <view v-if="detail" class="b7-page-pad">
          <!-- 头卡：金额大数 + 状态 -->
          <view class="b7-detail-hero">
            <text class="b7-hero-period">{{ periodLabel(detail.period) }} 结算单</text>
            <text class="b7-hero-amount money">¥{{ fmtMoney(detail.stationShare) }}</text>
            <text class="b7-hero-status">{{ detail.settled ? '历史已标记' : '待人工核验' }}<template v-if="detail.settled && detail.settledAt"> · {{ fmtDate(detail.settledAt) }}</template></text>
          </view>

          <!-- 结算构成（后端真口径：总收入 / 驿站分成70% / 平台分成30%） -->
          <view class="b7-card">
            <view class="b7-card-head">
              <text class="b7-card-title">结算构成</text>
              <text class="b7-tagg plain">只读 · 平台核算</text>
            </view>
            <view class="b7-frow"><text class="b7-lb">本期总收入</text><text class="b7-vl">¥{{ fmtMoney(detail.totalIncome) }}</text></view>
            <view class="b7-frow"><text class="b7-lb">平台分成（30%）</text><text class="b7-vl red">− ¥{{ fmtMoney(detail.platformShare) }}</text></view>
            <view class="b7-frow"><text class="b7-lb strong">驿站应结（70%）</text><text class="b7-vl"><text class="money b7-vl-gold">¥{{ fmtMoney(detail.stationShare) }}</text></text></view>
            <text class="b7-frow-tip">仅展示历史记录；当前平台在线收款与自动结算均未开放</text>
          </view>

          <!-- 结算信息 -->
          <view class="b7-card">
            <text class="b7-card-title" style="margin-bottom:6px">结算信息</text>
            <view class="b7-frow"><text class="b7-lb">结算周期</text><text class="b7-vl">{{ periodLabel(detail.period) }}</text></view>
            <view class="b7-frow"><text class="b7-lb">记录状态</text><text class="b7-vl">{{ detail.settled ? '历史已标记' : '待人工核验' }}</text></view>
            <view class="b7-frow"><text class="b7-lb">标记时间</text><text class="b7-vl">{{ detail.settledAt ? fmtDate(detail.settledAt) : '—' }}</text></view>
            <view class="b7-frow"><text class="b7-lb">结算单号</text><text class="b7-vl">{{ detail.id }}</text></view>
          </view>

          <text class="b7-detail-note">说明：旧模型的“已标记”不等于渠道到账；真实打款接入前，平台不会新增结算单或仅改状态冒充到账。</text>
          <view class="b7-safe" />
        </view>

        <!-- ============ 态① 订单列表 ============ -->
        <view v-else-if="tab === 'orders'" class="b7-page-pad">
          <!-- 类型筛选 -->
          <view class="b7-filter">
            <text v-for="f in typeFilters" :key="f.value" class="b7-tag" :class="{ on: orderType === f.value }" @tap="setOrderType(f.value)">{{ f.label }}</text>
          </view>
          <!-- 状态筛选 -->
          <view class="b7-filter b7-filter-2">
            <text v-for="f in statusFilters" :key="f.value" class="b7-tag" :class="{ on: orderStatus === f.value }" @tap="setOrderStatus(f.value)">{{ f.label }}</text>
          </view>

          <view v-if="orderLoading" class="b7-inline-state"><view class="spinner" /></view>

          <!-- 空态 -->
          <view v-else-if="!orders.length" class="b7-empty">
            <app-icon name="file-text" :size="60" color="#d3c9b6" />
            <text class="b7-empty-title serif">暂无订单</text>
            <text class="b7-empty-sub">当前到店支付不生成平台订单；接入统一收银台后，已支付记录才会在此汇总</text>
          </view>

          <!-- 订单卡列表 -->
          <template v-else>
            <view v-for="o in orders" :key="o.id" class="b7-card" :class="{ dim: isRefunded(o.status) }">
              <view class="b7-order-top">
                <text class="b7-tagg" :class="typeTagClass(o.orderType)">{{ orderTypeLabel[o.orderType] || '订单' }}</text>
                <text class="b7-order-no">{{ shortId(o.id) }}</text>
              </view>
              <view class="b7-order-body">
                <view class="b7-order-left">
                  <text class="b7-order-title serif">{{ orderTypeLabel[o.orderType] || '订单' }}</text>
                  <text class="b7-order-sub">下单 {{ fmtDate(o.createdAt) }} · 分成 ¥{{ fmtMoney(o.stationIncome) }}</text>
                </view>
                <view class="b7-order-right">
                  <text class="b7-order-amount money" :class="{ dim: isRefunded(o.status) }">¥{{ fmtMoney(o.amount) }}</text>
                  <text class="b7-tagg" :class="statusTagClass(o.status)" style="margin-top:5px">{{ orderStatusLabel(o.status) }}</text>
                </view>
              </view>
            </view>
            <view class="b7-safe" />
          </template>
        </view>

        <!-- ============ 态② 结算列表 ============ -->
        <view v-else class="b7-page-pad">
          <!-- 总览卡（实色·毛玻璃不承载关键信息） -->
          <view class="b7-overview">
            <view class="b7-ov-row">
              <view class="b7-ov-col">
                <text class="b7-ov-num money gold">¥{{ fmtMoney(pendingTotal) }}</text>
                <text class="b7-ov-label">待人工核验</text>
              </view>
              <view class="b7-ov-divider" />
              <view class="b7-ov-col">
                <text class="b7-ov-num money white">¥{{ fmtMoney(settledTotal) }}</text>
                <text class="b7-ov-label">历史已标记</text>
              </view>
            </view>
            <text class="b7-ov-tip">历史只读 · 标记状态不等于渠道到账</text>
          </view>

          <!-- 空态 -->
          <view v-if="!settlements.length" class="b7-empty">
            <app-icon name="file-text" :size="60" color="#d3c9b6" />
            <text class="b7-empty-title serif">还没有结算单</text>
            <text class="b7-empty-sub">当前没有平台在线实收记录{{ '\n' }}到店收款请按驿站自有账目管理</text>
            <view class="b7-empty-btn" @tap="switchTab('orders')"><text class="b7-empty-btn-text">去看订单</text></view>
          </view>

          <!-- 结算单列表 -->
          <template v-else>
            <view v-for="s in settlements" :key="s.id" class="b7-card" @tap="openDetail(s)">
              <view class="b7-settle-row">
                <view class="b7-settle-left">
                  <text class="b7-settle-title serif">{{ periodLabel(s.period) }} 结算单</text>
                  <text class="b7-settle-sub">总收入 ¥{{ fmtMoney(s.totalIncome) }}</text>
                </view>
                <view class="b7-settle-right">
                  <text class="b7-settle-amount money" :class="s.settled ? 'gray' : 'gold'">¥{{ fmtMoney(s.stationShare) }}</text>
                  <text class="b7-tagg" :class="s.settled ? 'red' : 'gold'" style="margin-top:5px">{{ s.settled ? ('历史已标记' + (s.settledAt ? ' ' + fmtDate(s.settledAt) : '')) : '待人工核验' }}</text>
                </view>
              </view>
            </view>
            <view class="b7-safe" />
          </template>
        </view>
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import {
  offlineManageApi, orderTypeLabel, num, fmtDate,
  type StationOrder, type StationSettlement,
} from '@/lib/offline-data'

const statusBarHeight = ref(0)
try { statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0 } catch {}

const stationId = ref('')
const loading = ref(true)
const errMsg = ref('')

const tab = ref<'orders' | 'settle'>('orders')

// 订单态
const orders = ref<StationOrder[]>([])
const orderLoading = ref(false)
const orderType = ref<'' | string>('')
const orderStatus = ref<'' | string>('')
const typeFilters = [
  { value: '', label: '全部' },
  { value: 'OFFLINE_COURSE', label: '线下课' },
  { value: 'PRODUCT', label: '商品自提' },
]
// 后端订单状态枚举容错：待完成/已完成/已退款 三档聚合，值传后端原枚举
const statusFilters = [
  { value: '', label: '全部状态' },
  { value: 'PENDING', label: '待完成' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'REFUNDED', label: '已退款' },
]

// 结算态
const settlements = ref<StationSettlement[]>([])
const detail = ref<StationSettlement | null>(null)

// 待结算 = 未 settled 的驿站分成之和；累计已结算 = 已 settled 的驿站分成之和
const pendingTotal = computed(() => settlements.value.filter((s) => !s.settled).reduce((a, s) => a + num(s.stationShare), 0))
const settledTotal = computed(() => settlements.value.filter((s) => s.settled).reduce((a, s) => a + num(s.stationShare), 0))

// ===== 工具 =====
const fmtMoney = (v: string | number) => num(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
// 结算周期人话："2026-06" → "2026年6月"
function periodLabel(p: string): string {
  const m = /^(\d{4})-(\d{1,2})/.exec(p || '')
  return m ? `${m[1]}年${Number(m[2])}月` : (p || '')
}
// 订单号：取尾段展示，避免超长
function shortId(id: string): string {
  if (!id) return ''
  return id.length > 12 ? 'O' + id.slice(-10).toUpperCase() : id
}
const isRefunded = (st: string) => ['REFUNDED', 'REFUND', 'CANCELLED', 'CANCELED'].includes((st || '').toUpperCase())
const isCompleted = (st: string) => ['COMPLETED', 'DONE', 'FINISHED', 'PAID', 'SIGNED_IN', 'VERIFIED'].includes((st || '').toUpperCase())
// 订单状态标签：仅用后端真枚举归三档，无枚举时原样透传
function orderStatusLabel(st: string): string {
  if (isRefunded(st)) return '已退款'
  if (isCompleted(st)) return '已完成'
  const known: Record<string, string> = { PENDING: '待完成', PROCESSING: '待完成', UNPAID: '待完成' }
  return known[(st || '').toUpperCase()] || (st || '—')
}
function typeTagClass(t: string): string {
  return t === 'OFFLINE_COURSE' ? 'red' : 'plain'
}
function statusTagClass(st: string): string {
  if (isRefunded(st)) return 'plain'
  if (isCompleted(st)) return 'red'
  return 'gold'
}

// ===== 数据 =====
async function loadOrders() {
  if (!stationId.value) return
  orderLoading.value = true
  try {
    const res = await offlineManageApi.getStationOrders(stationId.value, {
      orderType: orderType.value || undefined,
      status: orderStatus.value || undefined,
      pageSize: 50,
    })
    orders.value = res.items
  } catch (e) {
    orders.value = []
    uni.showToast({ title: (e as Error)?.message || '订单加载失败', icon: 'none' })
  } finally {
    orderLoading.value = false
  }
}

async function loadSettlements() {
  if (!stationId.value) return
  const res = await offlineManageApi.getStationSettlements(stationId.value, { pageSize: 50 })
  settlements.value = res.items
}

async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    if (!stationId.value) {
      const s = await offlineManageApi.getMyStation()
      if (!s) { errMsg.value = '你还不是驿站运营者'; loading.value = false; return }
      stationId.value = s.id
    }
    // 两个 Tab 数据一次拉齐（订单默认拉，结算总览需要）
    await Promise.all([loadOrders(), loadSettlements()])
  } catch (e) {
    const msg = (e as Error)?.message
    errMsg.value = msg?.includes('未登录') ? '请先登录' : (msg || '加载失败')
  } finally {
    loading.value = false
  }
}

function switchTab(t: 'orders' | 'settle') {
  if (tab.value === t && !detail.value) return
  detail.value = null
  tab.value = t
}
function setOrderType(v: string) { if (orderType.value === v) return; orderType.value = v; loadOrders() }
function setOrderStatus(v: string) { if (orderStatus.value === v) return; orderStatus.value = v; loadOrders() }

function openDetail(s: StationSettlement) { detail.value = s }

function onBack() {
  if (detail.value) { detail.value = null; return }
  goBack()
}

onLoad((q) => {
  const opt = (q || {}) as { stationId?: string; tab?: string }
  if (opt.stationId) stationId.value = opt.stationId
  if (opt.tab === 'settle') tab.value = 'settle'
  load()
})
</script>

<style lang="scss" scoped>
.b7-page { height: 100vh; background: #F4F1EC; display: flex; flex-direction: column; }

/* 导航 */
.b7-nav { background: #F4F1EC; }
.b7-nav-row { display: flex; align-items: center; justify-content: space-between; height: 46px; padding: 0 14px; }
.b7-icon-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.b7-nav-title { font-size: 16px; font-weight: 700; color: #2C2C2C; }
.b7-tabs { display: flex; gap: 26px; padding: 0 20px; border-bottom: 1px solid #EDE9E2; }
.b7-tab { padding: 12px 2px; font-size: 14px; color: #999; position: relative; }
.b7-tab.on { color: #2C2C2C; font-weight: 700; }
.b7-tab.on::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; background: #C41E3A; border-radius: 2px; }

.b7-body { flex: 1; height: 0; min-height: 0; }
.b7-page-pad { padding: 14px 20px 40px; }
.b7-capability { margin: 14px 20px 0; padding: 13px 14px; display: flex; gap: 10px; border: 1px solid #eadcc6; border-radius: 16px; background: #faf6ef; }
.b7-capability-icon { width: 30px; height: 30px; flex-shrink: 0; border-radius: 10px; background: #f2e5d1; display: flex; align-items: center; justify-content: center; }
.b7-capability-body { flex: 1; min-width: 0; }
.b7-capability-title { display: block; font-size: 13px; font-weight: 700; color: #8a6420; }
.b7-capability-text { display: block; margin-top: 4px; font-size: 11.5px; line-height: 1.65; color: #756754; }

/* 三态 */
.b7-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 90px 40px 0; }
.b7-state-text { font-size: 14px; color: #6b5d4f; }
.spinner { width: 28px; height: 28px; border: 3px solid #EDE9E2; border-top-color: #C41E3A; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.b7-retry { margin-top: 4px; padding: 8px 22px; border: 1px solid #C41E3A; border-radius: 999px; }
.b7-retry-text { font-size: 13px; color: #C41E3A; }
.b7-inline-state { display: flex; justify-content: center; padding: 40px 0; }

/* 空态 */
.b7-empty { display: flex; flex-direction: column; align-items: center; padding: 56px 30px 0; }
.b7-empty-title { font-size: 18px; font-weight: 700; color: #2C2C2C; margin-top: 18px; }
.b7-empty-sub { font-size: 12.5px; color: #6E6E73; text-align: center; line-height: 1.7; margin-top: 10px; }
.b7-empty-btn { margin-top: 22px; padding: 11px 24px; border: 1px solid #C41E3A; border-radius: 999px; }
.b7-empty-btn-text { font-size: 13px; font-weight: 700; color: #C41E3A; }

/* 通用卡 */
.b7-card { background: #FFFFFF; border-radius: 18px; padding: 14px; box-shadow: 0 2px 10px rgba(60,40,20,0.05); margin-bottom: 12px; }
.b7-card.dim { opacity: 0.72; }
.b7-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.b7-card-title { font-size: 13.5px; font-weight: 700; color: #2C2C2C; }

.money { font-family: 'Songti SC', 'STSong', serif; font-weight: 700; }
.serif { font-family: 'Songti SC', 'STSong', serif; }

/* 标签 */
.b7-tagg { display: inline-flex; align-items: center; border-radius: 999px; padding: 2px 9px; font-size: 10px; }
.b7-tagg.red { background: rgba(196,30,58,0.08); color: #C41E3A; }
.b7-tagg.gold { border: 1px solid #C9A96E; color: #a5843f; }
.b7-tagg.plain { border: 1px solid #EDE9E2; color: #6E6E73; }

/* 筛选 */
.b7-filter { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 9px; }
.b7-filter-2 { margin-bottom: 16px; }
.b7-tag { display: inline-flex; align-items: center; border: 1px solid #EDE9E2; color: #6E6E73; border-radius: 999px; padding: 4px 13px; font-size: 12px; }
.b7-tag.on { background: #C41E3A; color: #fff; border-color: #C41E3A; }

/* 订单卡 */
.b7-order-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.b7-order-no { font-size: 11px; color: #999; }
.b7-order-body { display: flex; align-items: center; justify-content: space-between; }
.b7-order-left { flex: 1; min-width: 0; }
.b7-order-title { display: block; font-size: 15px; font-weight: 700; color: #2C2C2C; }
.b7-order-sub { display: block; font-size: 11px; color: #999; margin-top: 4px; }
.b7-order-right { text-align: right; flex-shrink: 0; margin-left: 12px; }
.b7-order-amount { display: block; font-size: 18px; color: #a5843f; }
.b7-order-amount.dim { color: #999; }

/* 结算总览（实色深卡） */
.b7-overview { background: linear-gradient(140deg, #2C2C2C, #4a3f36); border-radius: 18px; padding: 18px 14px; box-shadow: 0 10px 26px rgba(60,40,20,0.2); margin-bottom: 12px; }
.b7-ov-row { display: flex; align-items: center; }
.b7-ov-col { flex: 1; text-align: center; }
.b7-ov-num { display: block; font-size: 24px; }
.b7-ov-num.gold { color: #C9A96E; }
.b7-ov-num.white { color: #fff; }
.b7-ov-label { display: block; font-size: 11px; color: rgba(255,255,255,0.7); margin-top: 4px; }
.b7-ov-divider { width: 1px; height: 38px; background: rgba(255,255,255,0.2); }
.b7-ov-tip { display: block; font-size: 11px; color: rgba(255,255,255,0.6); text-align: center; margin-top: 12px; }

/* 结算单卡 */
.b7-settle-row { display: flex; align-items: center; justify-content: space-between; }
.b7-settle-left { flex: 1; min-width: 0; }
.b7-settle-title { display: block; font-size: 15px; font-weight: 700; color: #2C2C2C; }
.b7-settle-sub { display: block; font-size: 11px; color: #999; margin-top: 4px; }
.b7-settle-right { text-align: right; flex-shrink: 0; margin-left: 12px; }
.b7-settle-amount { display: block; font-size: 18px; }
.b7-settle-amount.gold { color: #a5843f; }
.b7-settle-amount.gray { color: #6E6E73; }

/* 结算详情头卡 */
.b7-detail-hero { background: linear-gradient(140deg, #2C2C2C, #4a3f36); border-radius: 18px; padding: 24px 12px; text-align: center; margin-bottom: 12px; box-shadow: 0 10px 26px rgba(60,40,20,0.2); }
.b7-hero-period { display: block; font-size: 11px; color: rgba(255,255,255,0.7); }
.b7-hero-amount { display: block; font-size: 32px; color: #C9A96E; margin: 10px 0; }
.b7-hero-status { display: inline-flex; align-items: center; background: rgba(255,255,255,0.12); color: #fff; font-size: 10px; border-radius: 999px; padding: 3px 12px; }

/* 明细行 */
.b7-frow { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #EDE9E2; }
.b7-frow:last-of-type { border-bottom: none; }
.b7-lb { font-size: 13.5px; color: #6E6E73; }
.b7-lb.strong { font-weight: 700; color: #2C2C2C; }
.b7-vl { font-size: 13.5px; color: #2C2C2C; text-align: right; flex: 1; margin-left: 16px; }
.b7-vl.red { color: #C41E3A; }
.b7-vl-gold { font-size: 16px; color: #a5843f; }
.b7-frow-tip { display: block; font-size: 11px; color: #999; margin-top: 8px; line-height: 1.7; }
.b7-detail-note { display: block; font-size: 11px; color: #999; padding: 0 4px; line-height: 1.8; }

.b7-safe { height: 30px; }
</style>
