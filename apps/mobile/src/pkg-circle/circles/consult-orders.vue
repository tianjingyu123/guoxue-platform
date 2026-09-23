<script setup lang="ts">
/**
 * 咨询订单 · 图文＋通话聚合 — V0 circle-consult-orders.html 还原（2026-07-10 批④）
 * 结构：顶栏+状态筛选(全部/已完成/待处理/已退款) → 累计卡 → 「我提问的」「我回答的」分组订单流。
 * 数据：图文 GET /question/my（JWT 本人参与）+ 通话 GET /consult-calls/my-page
 *       （按 circleId 过滤·记录仅当事人可见），前端合并排序分组。
 * 口径（后端为准·记台账）：
 *  - 我回答的图文收入：实际入账按平台分成规则结算（比例走 SettlementRule·无前端可读字段）→
 *    金额列展示订单原价并标注「按分成结算」，不冒充净收入；
 *  - 我回答的通话：+settledCoin×50%（后端分账硬编码 rate 0.5）；
 *  - V0「累计回答/分成收入」无可靠聚合字段 → 第二格改为真实「咨询总笔数」。
 */
import { ref, computed, onMounted } from 'vue'
import { onLoad, onReachBottom } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { questionApi, getCurrentUserId, splitQuestion, type PaidQuestion } from '@/lib/circle-consult-data'
import { callApi, type ConsultCallRecord } from '@/lib/consult-call-data'

type Bucket = 'done' | 'pending' | 'refunded'
type Filter = 'all' | Bucket

interface OrderItem {
  key: string
  kind: 'qa' | 'call'
  id: string
  mine: boolean // true=我提问的/我发起的
  title: string
  counterpart: string
  bucket: Bucket
  createdAt: string
  /** 金额列 */
  amountText: string
  amountCls: 'expense' | 'income' | 'neutral'
  /** 底部补充说明 */
  note: string
}

const circleId = ref('')
const myId = ref('')
const loading = ref(true)
const error = ref('')
const orders = ref<OrderItem[]>([])
const qaRows = ref<OrderItem[]>([])
const callRows = ref<OrderItem[]>([])
const qaPage = ref(0)
const callPage = ref(0)
const qaTotal = ref(0)
const callTotal = ref(0)
const callFetched = ref(0)
const qaError = ref('')
const callError = ref('')
const moreQaError = ref('')
const moreCallError = ref('')
const loadingMoreQa = ref(false)
const loadingMoreCall = ref(false)
const PAGE_SIZE = 20

const filterTabs: { key: Filter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'done', label: '已完成' },
  { key: 'pending', label: '待处理' },
  { key: 'refunded', label: '已退款' },
]
const filter = ref<Filter>('all')

const BADGE: Record<Bucket, { label: string; cls: string }> = {
  done: { label: '已完成', cls: 'done' },
  pending: { label: '待处理', cls: 'pending' },
  refunded: { label: '已退款', cls: 'refunded' },
}

function fmtTime(s: string) {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days <= 0) {
    const hours = Math.floor(diff / 3_600_000)
    return hours <= 0 ? '刚刚' : `${hours} 小时前`
  }
  if (days < 7) return `${days} 天前`
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function qaBucket(q: PaidQuestion): Bucket {
  if (q.status === 'ANSWERED') return 'done'
  if (q.status === 'PENDING') return 'pending'
  return 'refunded'
}
function callBucket(c: ConsultCallRecord): Bucket {
  if (c.status === 'ENDED') return 'done'
  if (c.status === 'WAITING' || c.status === 'ONGOING') return 'pending'
  return 'refunded'
}

function mapQa(q: PaidQuestion): OrderItem {
  const mine = q.askerId === myId.value
  const p = splitQuestion(q.question)
  const bucket = qaBucket(q)
  let amountText = ''
  let amountCls: OrderItem['amountCls'] = 'neutral'
  let note = ''
  if (mine) {
    if (bucket === 'refunded') { amountText = `+${q.priceCoin}`; amountCls = 'income'; note = '已原路退回' }
    else { amountText = `−${q.priceCoin}`; amountCls = 'expense'; note = bucket === 'pending' ? '托管中' : '' }
  } else {
    amountText = `${q.priceCoin}`
    amountCls = bucket === 'done' ? 'income' : 'neutral'
    note = bucket === 'done' ? '按平台分成结算' : bucket === 'pending' ? '待我回答' : '已拒答退回'
  }
  return {
    key: `qa-${q.id}`, kind: 'qa', id: q.id, mine,
    title: p.title || p.body || '图文咨询',
    counterpart: (mine ? q.answerer?.nickname : q.asker?.nickname) || (mine ? '达人' : '提问者'),
    bucket, createdAt: q.createdAt, amountText, amountCls, note,
  }
}

function mapCall(c: ConsultCallRecord): OrderItem {
  const mine = c.callerId === myId.value
  const bucket = callBucket(c)
  const minutes = Math.max(1, Math.ceil((c.durationSec || 0) / 60))
  const typeLabel = c.type === 'VIDEO' ? '视频' : '语音'
  let amountText = ''
  let amountCls: OrderItem['amountCls'] = 'neutral'
  let note = ''
  if (bucket === 'refunded') { amountText = '0'; amountCls = 'neutral'; note = '预扣已全额退回' }
  else if (bucket === 'pending') { amountText = `${c.prepaidCoin}`; amountCls = 'expense'; note = '预扣中' }
  else if (mine) { amountText = `−${c.settledCoin}`; amountCls = 'expense'; note = `${c.pricePerMinute} 金币/分钟` }
  else { amountText = `+${Math.floor(c.settledCoin * 0.5)}`; amountCls = 'income'; note = '分账 50% 已入账' }
  return {
    key: `call-${c.id}`, kind: 'call', id: c.id, mine,
    title: bucket === 'done' ? `${typeLabel}连麦 ${minutes} 分钟` : `${typeLabel}连麦`,
    counterpart: (mine ? c.expertName : c.callerName) || '对方',
    bucket, createdAt: c.createdAt, amountText, amountCls, note,
  }
}

const filtered = computed(() => filter.value === 'all' ? orders.value : orders.value.filter(o => o.bucket === filter.value))
const askedOrders = computed(() => filtered.value.filter(o => o.mine))
const answeredOrders = computed(() => filtered.value.filter(o => !o.mine))

/** 累计咨询消费（我提问的图文未退款 + 我发起的已结算通话·金币） */
const totalSpent = computed(() =>
  orders.value.filter(o => o.mine && o.bucket !== 'refunded').reduce((s, o) => {
    const n = Math.abs(parseInt(o.amountText.replace(/[^0-9-]/g, ''), 10) || 0)
    return s + n
  }, 0),
)
const totalCount = computed(() => orders.value.length)
const allLoaded = computed(() => !qaError.value && !callError.value && qaRows.value.length >= qaTotal.value && callFetched.value >= callTotal.value)
const hasMoreQa = computed(() => qaPage.value > 0 && qaRows.value.length < qaTotal.value)
const hasMoreCalls = computed(() => callPage.value > 0 && callFetched.value < callTotal.value)

function mergeOrders() {
  orders.value = [...qaRows.value, ...callRows.value].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

async function loadQaPage() {
  if (loadingMoreQa.value || (qaPage.value > 0 && !hasMoreQa.value)) return
  loadingMoreQa.value = true
  moreQaError.value = ''
  try {
    const next = qaPage.value + 1
    const result = await questionApi.listMine({ circleId: circleId.value || undefined, participantId: myId.value, page: next, pageSize: PAGE_SIZE })
    qaRows.value = next === 1 ? result.items.map(mapQa) : qaRows.value.concat(result.items.map(mapQa))
    qaTotal.value = result.total
    if (next > 1 && !result.items.length) qaTotal.value = qaRows.value.length
    qaPage.value = next
    qaError.value = ''
    mergeOrders()
  } catch (e) {
    const message = (e as Error)?.message || '图文咨询加载失败'
    if (!qaPage.value) qaError.value = message
    else moreQaError.value = message
  } finally {
    loadingMoreQa.value = false
  }
}

async function loadCallPage() {
  if (loadingMoreCall.value || (callPage.value > 0 && !hasMoreCalls.value)) return
  loadingMoreCall.value = true
  moreCallError.value = ''
  try {
    const next = callPage.value + 1
    const result = await callApi.myCallsPage(next, PAGE_SIZE)
    const pageRows = circleId.value ? result.items.filter(c => c.circleId === circleId.value) : result.items
    callRows.value = next === 1 ? pageRows.map(mapCall) : callRows.value.concat(pageRows.map(mapCall))
    callFetched.value = next === 1 ? result.items.length : callFetched.value + result.items.length
    callTotal.value = result.total
    if (next > 1 && !result.items.length) callTotal.value = callFetched.value
    callPage.value = next
    callError.value = ''
    mergeOrders()
  } catch (e) {
    const message = (e as Error)?.message || '通话记录加载失败'
    if (!callPage.value) callError.value = message
    else moreCallError.value = message
  } finally {
    loadingMoreCall.value = false
  }
}

async function load() {
  if (!myId.value) { error.value = '请先登录'; loading.value = false; return }
  loading.value = true
  error.value = ''
  qaRows.value = []
  callRows.value = []
  qaPage.value = 0
  callPage.value = 0
  qaTotal.value = 0
  callTotal.value = 0
  callFetched.value = 0
  qaError.value = ''
  callError.value = ''
  moreQaError.value = ''
  moreCallError.value = ''
  orders.value = []
  await Promise.all([loadQaPage(), loadCallPage()])
  if (qaError.value && callError.value) error.value = '咨询记录加载失败，请重试'
  loading.value = false
}

onReachBottom(() => {
  if (hasMoreQa.value && !moreQaError.value) void loadQaPage()
  if (hasMoreCalls.value && !moreCallError.value) void loadCallPage()
})

function openDetail(o: OrderItem) {
  if (o.kind === 'qa') navigateTo(`/pkg-circle/circles/question-detail?id=${o.id}`)
  else if (o.bucket !== 'pending') navigateTo(`/pkg-circle/circles/call-end?id=${o.id}`)
}

onLoad((opt) => { circleId.value = (opt?.circleId || opt?.id || '') as string })
onMounted(() => { myId.value = getCurrentUserId(); load() })
</script>

<template>
  <view class="cor-page">
    <!-- 顶栏 + 状态筛选 -->
    <view class="cor-topbar">
      <view class="cor-topbar-row">
        <view class="cor-back" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
        <text class="cor-title">咨询订单</text>
      </view>
      <view class="cor-filters">
        <view
          v-for="f in filterTabs" :key="f.key"
          class="cor-filter" :class="{ 'is-active': filter === f.key }"
          @tap="filter = f.key"
        >
          <text class="cor-filter-t" :class="{ 'is-active': filter === f.key }">{{ f.label }}</text>
        </view>
      </view>
    </view>

    <!-- 三态 -->
    <view v-if="loading" class="cor-state"><view class="cor-skel" /><view class="cor-skel" /></view>
    <view v-else-if="error" class="cor-state">
      <text class="cor-state-t">{{ error }}</text>
      <view class="cor-retry" @tap="load"><text class="cor-retry-t">重试</text></view>
    </view>
    <view v-else-if="orders.length === 0 && !qaError && !callError" class="cor-state"><text class="cor-state-t">暂无咨询订单</text></view>

    <template v-else>
      <view v-if="qaError" class="cor-warning">
        <text class="cor-warning-t">图文咨询未加载：{{ qaError }}</text>
        <view class="cor-warning-action" @tap="loadQaPage">重试</view>
      </view>
      <view v-if="callError" class="cor-warning">
        <text class="cor-warning-t">通话记录未加载：{{ callError }}</text>
        <view class="cor-warning-action" @tap="loadCallPage">重试</view>
      </view>
      <!-- 累计数据 -->
      <view v-if="orders.length" class="cor-total">
        <view class="cor-total-item">
          <text class="cor-total-label">{{ allLoaded ? '咨询已付及托管' : '已显示的已付及托管' }}</text>
          <text class="cor-total-num">{{ totalSpent }}<text class="cor-total-unit"> 金币</text></text>
        </view>
        <view class="cor-total-item bordered">
          <text class="cor-total-label">{{ allLoaded ? '咨询总笔数' : '已显示笔数' }}</text>
          <text class="cor-total-num">{{ totalCount }}<text class="cor-total-unit"> 笔</text></text>
        </view>
      </view>

      <!-- 我提问的 -->
      <template v-if="askedOrders.length">
        <text class="cor-group">我提问的 · {{ askedOrders.length }} 笔</text>
        <view v-for="o in askedOrders" :key="o.key" class="cor-order" @tap="openDetail(o)">
          <view class="cor-order-head">
            <text class="cor-type">{{ o.kind === 'qa' ? '图文' : '通话' }}</text>
            <text class="cor-order-title">{{ o.title }}</text>
            <text class="cor-badge" :class="'cor-badge-' + o.bucket">{{ BADGE[o.bucket].label }}</text>
          </view>
          <view class="cor-order-foot">
            <text class="cor-foot-t">{{ o.counterpart }} · {{ fmtTime(o.createdAt) }}{{ o.note ? ' · ' + o.note : '' }}</text>
            <view class="cor-spacer" />
            <text class="cor-amount" :class="'cor-amount-' + o.amountCls">{{ o.amountText }}<text class="cor-amount-unit"> 金币</text></text>
          </view>
        </view>
      </template>

      <!-- 我回答的 -->
      <template v-if="answeredOrders.length">
        <text class="cor-group">我回答的 · {{ answeredOrders.length }} 笔</text>
        <view v-for="o in answeredOrders" :key="o.key" class="cor-order" @tap="openDetail(o)">
          <view class="cor-order-head">
            <text class="cor-type">{{ o.kind === 'qa' ? '图文' : '通话' }}</text>
            <text class="cor-order-title">{{ o.title }}</text>
            <text class="cor-badge" :class="'cor-badge-' + o.bucket">{{ BADGE[o.bucket].label }}</text>
          </view>
          <view class="cor-order-foot">
            <text class="cor-foot-t">{{ o.counterpart }} {{ o.kind === 'qa' ? '提问' : '发起' }} · {{ fmtTime(o.createdAt) }}{{ o.note ? ' · ' + o.note : '' }}</text>
            <view class="cor-spacer" />
            <text class="cor-amount" :class="'cor-amount-' + o.amountCls">{{ o.amountText }}<text class="cor-amount-unit"> 金币</text></text>
          </view>
        </view>
      </template>
      <view v-if="hasMoreQa || moreQaError" class="cor-more" @tap="loadQaPage">
        {{ loadingMoreQa ? '正在加载图文咨询…' : moreQaError ? `图文咨询加载失败，点击重试` : '查看更多图文咨询' }}
      </view>
      <view v-if="hasMoreCalls || moreCallError" class="cor-more" @tap="loadCallPage">
        {{ loadingMoreCall ? '正在加载通话记录…' : moreCallError ? '通话记录加载失败，点击重试' : '查看更多通话记录' }}
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.cor-page { min-height: 100vh; background: var(--bg-page, #faf8f5); padding-bottom: 64rpx; }

/* 顶栏 + 筛选 */
.cor-topbar {
  position: sticky; top: 0; z-index: 10;
  padding: 24rpx 32rpx 0;
  padding-top: calc(var(--status-bar-height, 0px) + 24rpx);
  background: rgba(250, 248, 245, 0.92); backdrop-filter: blur(24rpx);
}
.cor-topbar-row { display: flex; align-items: center; gap: 20rpx; }
.cor-back { display: flex; padding: 8rpx; margin-left: -8rpx; }
.cor-title { flex: 1; font-size: 34rpx; font-weight: 600; color: var(--text-primary, #2c2c2c); }
.cor-filters { display: flex; gap: 16rpx; padding: 24rpx 0; }
.cor-filter { padding: 12rpx 28rpx; border-radius: 30rpx; background: var(--bg-card, #fff); box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05); }
.cor-filter.is-active { background: var(--text-primary, #2c2c2c); }
.cor-filter-t { font-size: 26rpx; color: var(--text-secondary, #6e6e73); }
.cor-filter-t.is-active { color: #fff; font-weight: 500; }

/* 三态 */
.cor-state { padding: 120rpx 32rpx; display: flex; flex-direction: column; align-items: center; gap: 24rpx; }
.cor-state-t { font-size: 26rpx; color: var(--text-tertiary, #999); }
.cor-retry { padding: 14rpx 56rpx; border-radius: 999rpx; background: var(--brand, #c41e3a); }
.cor-retry-t { font-size: 26rpx; color: #fff; }
.cor-warning { margin: 24rpx 32rpx; padding: 24rpx; display: flex; align-items: center; gap: 16rpx; border-radius: 20rpx; background: #fff4e8; }
.cor-warning-t { flex: 1; font-size: 24rpx; color: #775022; }
.cor-warning-action { min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center; color: var(--brand, #c41e3a); font-size: 26rpx; }
.cor-more { margin: 24rpx 32rpx; min-height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 20rpx; background: #fff; color: var(--brand, #c41e3a); font-size: 26rpx; }
.cor-skel { width: 100%; height: 170rpx; border-radius: 36rpx; background: #ede7dd; }

/* 累计卡 */
.cor-total {
  margin: 8rpx 32rpx 0; padding: 28rpx 32rpx;
  display: flex; align-items: center;
  background: var(--bg-warm, #f8f4ec); border-radius: 28rpx;
}
.cor-total-item { flex: 1; }
.cor-total-item.bordered { border-left: 1rpx solid var(--separator, #ede7dd); padding-left: 32rpx; }
.cor-total-label { display: block; font-size: 22rpx; color: var(--text-tertiary, #999); }
.cor-total-num { display: block; font-size: 38rpx; font-weight: 700; color: var(--gold, #c9a96e); margin-top: 4rpx; }
.cor-total-unit { font-size: 20rpx; font-weight: 400; color: var(--text-tertiary, #999); }

/* 分组 */
.cor-group { display: block; margin: 36rpx 36rpx 16rpx; font-size: 24rpx; color: var(--text-tertiary, #999); }

/* 订单条目 */
.cor-order {
  margin: 0 32rpx 20rpx; padding: 28rpx 32rpx;
  background: var(--bg-card, #fff); border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(44, 44, 44, 0.05);
}
.cor-order-head { display: flex; align-items: center; gap: 16rpx; }
.cor-type { flex-shrink: 0; padding: 1rpx 14rpx; border-radius: 10rpx; font-size: 20rpx; border: 1rpx solid var(--separator, #ede7dd); color: var(--text-tertiary, #999); }
.cor-order-title { flex: 1; min-width: 0; font-size: 26rpx; font-weight: 500; color: var(--text-primary, #2c2c2c); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cor-badge { flex-shrink: 0; padding: 4rpx 16rpx; border-radius: 12rpx; font-size: 20rpx; }
.cor-badge-done { background: rgba(91, 138, 94, 0.1); color: #5b8a5e; }
.cor-badge-pending { background: rgba(201, 123, 45, 0.1); color: #c97b2d; }
.cor-badge-refunded { background: var(--bg-warm, #f8f4ec); color: var(--text-tertiary, #999); }
.cor-order-foot {
  display: flex; align-items: center; gap: 16rpx;
  margin-top: 18rpx; padding-top: 18rpx; border-top: 1rpx solid var(--separator, #ede7dd);
}
.cor-foot-t { font-size: 22rpx; color: var(--text-tertiary, #999); }
.cor-spacer { flex: 1; }
.cor-amount { font-size: 26rpx; font-weight: 700; flex-shrink: 0; }
.cor-amount-expense { color: var(--text-primary, #2c2c2c); }
.cor-amount-income { color: var(--gold, #c9a96e); }
.cor-amount-neutral { color: var(--text-secondary, #6e6e73); }
.cor-amount-unit { font-size: 20rpx; font-weight: 400; color: var(--text-tertiary, #999); }
</style>
