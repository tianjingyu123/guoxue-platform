<template>
  <app-safe-area-top />
  <view class="page">
    <view class="nav">
      <text class="nav-side back" @tap="back">‹</text>
      <view class="nav-title">
        <text class="title">售后与回仓</text>
        <text class="nav-sub">协商 · 验货 · 退款分步留痕</text>
      </view>
      <text class="nav-side refresh" @tap="loadAll">刷新</text>
    </view>

    <scroll-view scroll-y class="body">
      <view class="cockpit">
        <view class="cockpit-copy">
          <text class="eyebrow">REVERSE FULFILLMENT</text>
          <text class="cockpit-title">先解决客户问题，再完成资金与库存闭环</text>
          <text class="cockpit-desc">退款、退货与换货分别处理；退回商品只有实际验收合格后才回补库存。</text>
        </view>
        <view class="pending-orb" :class="{ active: pendingCount > 0 }">
          <text class="orb-value">{{ pendingCount }}</text>
          <text class="orb-label">待处理</text>
        </view>
      </view>

      <view class="stage-grid">
        <view
          v-for="stage in stages"
          :key="stage.key"
          class="stage"
          :class="{ active: filter === stage.key, urgent: stage.urgent && stage.count > 0 }"
          @tap="filter = stage.key"
        >
          <view class="stage-head">
            <text class="stage-no">{{ stage.no }}</text>
            <text class="stage-count">{{ stage.count }}</text>
          </view>
          <text class="stage-name">{{ stage.label }}</text>
          <text class="stage-desc">{{ stage.desc }}</text>
        </view>
      </view>

      <view class="guard">
        <text class="guard-mark">盾</text>
        <view>
          <text class="guard-title">资金与库存双重校验</text>
          <text class="guard-desc">“同意退货”不会提前退款；“验收入库”会生成不可覆盖的入库流水，并以幂等请求防止重复回仓。</text>
        </view>
      </view>

      <view class="queue-head">
        <view>
          <text class="queue-title">{{ activeStage.label }}</text>
          <text class="queue-sub">{{ activeStage.tip }}</text>
        </view>
        <text class="queue-total">{{ filteredItems.length }} 件</text>
      </view>

      <view v-if="loading" class="state">
        <text class="state-title">正在读取售后单…</text>
      </view>
      <view v-else-if="error" class="state error">
        <text class="state-title">{{ error }}</text>
        <text class="retry" @tap="loadAll">重新加载</text>
      </view>
      <view v-else-if="!filteredItems.length" class="state">
        <text class="state-mark">✓</text>
        <text class="state-title">当前阶段没有待办</text>
        <text class="state-desc">售后申请和退货物流变化会自动汇总到这里。</text>
      </view>

      <view v-else class="case-list">
        <view
          v-for="item in filteredItems"
          :key="item.id"
          class="case-card"
          :class="statusTone(item.status)"
        >
          <view class="case-head">
            <view class="case-type">
              <text>{{ typeLabel(item.type) }}</text>
              <text>{{ shortOrderId(item.orderId) }}</text>
            </view>
            <view class="case-status">
              <text>{{ statusLabel(item.status) }}</text>
              <text>{{ formatTime(item.createdAt) }}</text>
            </view>
          </view>

          <view class="product">
            <image
              v-if="item.order?.productImage"
              class="product-image"
              :src="item.order.productImage"
              mode="aspectFill"
            />
            <view v-else class="product-fallback">售</view>
            <view class="product-main">
              <text class="product-title">{{ item.order?.productTitle || '订单商品' }}</text>
              <text class="product-meta">订单状态 {{ orderStatusLabel(item.order?.status) }}</text>
            </view>
            <view class="amount">
              <text>{{ isRefundType(item.type) ? '申请退款' : '售后事项' }}</text>
              <text v-if="isRefundType(item.type)">¥{{ money(item.amount ?? item.order?.amount) }}</text>
              <text v-else>无需退款</text>
            </view>
          </view>

          <view class="timeline">
            <view
              v-for="(step, index) in timelineFor(item)"
              :key="step.label"
              class="timeline-step"
              :class="{ done: index < step.current, current: index === step.current }"
            >
              <text class="timeline-dot">{{ index < step.current ? '✓' : index + 1 }}</text>
              <text>{{ step.label }}</text>
            </view>
          </view>

          <view class="reason">
            <text class="reason-label">客户诉求</text>
            <text class="reason-text">{{ item.reason || '客户未填写具体原因' }}</text>
          </view>

          <view v-if="recordText(item.logistics)" class="record">
            <text class="record-label">履约记录</text>
            <text>{{ recordText(item.logistics) }}</text>
          </view>

          <view v-if="item.status === 'PROCESSING'" class="processing">
            <text class="pulse" />
            <text>资金渠道处理中，请勿重复操作</text>
          </view>

          <view v-else-if="item.status === 'PENDING'" class="actions">
            <view class="secondary" :class="{ disabled: submittingId === item.id }" @tap="reject(item)">拒绝申请</view>
            <view class="primary" :class="{ disabled: submittingId === item.id }" @tap="approve(item)">
              {{ submittingId === item.id ? '处理中…' : approveLabel(item.type) }}
            </view>
          </view>

          <view v-else-if="item.status === 'APPROVED' && isReturnRefundType(item.type)" class="actions">
            <view class="secondary" :class="{ disabled: submittingId === item.id }" @tap="inspect(item, false)">验收不合格</view>
            <view class="primary receive" :class="{ disabled: submittingId === item.id }" @tap="inspect(item, true)">
              {{ submittingId === item.id ? '处理中…' : '验收入库并退款' }}
            </view>
          </view>

          <view v-else-if="item.status === 'APPROVED' && !isRefundType(item.type)" class="actions single">
            <view class="primary complete" :class="{ disabled: submittingId === item.id }" @tap="complete(item)">
              {{ submittingId === item.id ? '处理中…' : '确认售后完成' }}
            </view>
          </view>
        </view>
      </view>
      <view class="bottom-space" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import {
  merchantBackendApi,
  orderStatusConfig,
  type MerchantAfterSale,
  type MerchantAfterSaleStatus,
  type MerchantOrderStatus,
} from '@/pkg-merchant/lib/merchant-data'

type FilterKey = 'all' | 'decision' | 'returning' | 'inspection' | 'closed'

const loading = ref(false)
const error = ref('')
const items = ref<MerchantAfterSale[]>([])
const filter = ref<FilterKey>('decision')
const submittingId = ref('')
const inspectionRequestIds = new Map<string, string>()

const normalizeType = (type?: string | null) => {
  const value = String(type || '').trim().toLowerCase()
  if (value === 'refund') return 'refund_only'
  if (value === 'return') return 'refund_with_return'
  return value
}
const isImmediateRefundType = (type?: string | null) => normalizeType(type) === 'refund_only'
const isReturnRefundType = (type?: string | null) => normalizeType(type) === 'refund_with_return'
const isRefundType = (type?: string | null) => isImmediateRefundType(type) || isReturnRefundType(type)
const isReturning = (item: MerchantAfterSale) => (
  isReturnRefundType(item.type)
  && item.status === 'APPROVED'
  && !recordText(item.logistics).includes('退货运单')
)
const isInspection = (item: MerchantAfterSale) => (
  isReturnRefundType(item.type)
  && item.status === 'APPROVED'
  && recordText(item.logistics).includes('退货运单')
)
const isClosed = (item: MerchantAfterSale) => ['REJECTED', 'CANCELLED', 'COMPLETED'].includes(item.status)

const counts = computed(() => ({
  all: items.value.length,
  decision: items.value.filter((item) => item.status === 'PENDING' || item.status === 'PROCESSING').length,
  returning: items.value.filter(isReturning).length,
  inspection: items.value.filter(isInspection).length,
  closed: items.value.filter(isClosed).length,
}))
const pendingCount = computed(() => counts.value.decision + counts.value.returning + counts.value.inspection)
const stages = computed(() => [
  { key: 'decision' as FilterKey, no: '01', label: '待响应', desc: '判断诉求', count: counts.value.decision, urgent: true },
  { key: 'returning' as FilterKey, no: '02', label: '待退回', desc: '跟进物流', count: counts.value.returning, urgent: false },
  { key: 'inspection' as FilterKey, no: '03', label: '待验收', desc: '质检回仓', count: counts.value.inspection, urgent: true },
  { key: 'closed' as FilterKey, no: '04', label: '已闭环', desc: '留档复盘', count: counts.value.closed, urgent: false },
])
const activeStage = computed(() => {
  if (filter.value === 'all') return { label: '全部售后', tip: '查看当前店铺全部逆向履约记录' }
  const stage = stages.value.find((item) => item.key === filter.value)
  const tips: Record<FilterKey, string> = {
    all: '查看当前店铺全部逆向履约记录',
    decision: '优先处理即将超时的申请，先沟通再决定',
    returning: '已同意退货，等待客户寄回商品',
    inspection: '核对实物后决定回仓退款或记录不合格',
    closed: '已完成、已拒绝和已取消事项均可追溯',
  }
  return { label: stage?.label || '全部售后', tip: tips[filter.value] }
})
const filteredItems = computed(() => {
  if (filter.value === 'all') return items.value
  if (filter.value === 'decision') return items.value.filter((item) => item.status === 'PENDING' || item.status === 'PROCESSING')
  if (filter.value === 'returning') return items.value.filter(isReturning)
  if (filter.value === 'inspection') return items.value.filter(isInspection)
  return items.value.filter(isClosed)
})

function typeLabel(type?: string | null) {
  const map: Record<string, string> = {
    refund_only: '仅退款',
    refund_with_return: '退货退款',
    exchange: '换货',
    not_received: '未收到商品',
    not_as_described: '描述不符',
    quality_issue: '质量问题',
    other: '其他售后',
  }
  return map[normalizeType(type)] || '售后'
}
function statusLabel(status: MerchantAfterSaleStatus) {
  const map: Record<MerchantAfterSaleStatus, string> = {
    PENDING: '待商家响应',
    PROCESSING: '资金处理中',
    APPROVED: '已同意',
    REJECTED: '已拒绝',
    CANCELLED: '已取消',
    COMPLETED: '已完成',
  }
  return map[status]
}
function statusTone(status: MerchantAfterSaleStatus) {
  if (status === 'PENDING') return 'tone-wait'
  if (status === 'PROCESSING') return 'tone-process'
  if (status === 'APPROVED') return 'tone-approved'
  return 'tone-closed'
}
function approveLabel(type?: string | null) {
  if (isImmediateRefundType(type)) return '同意并退款'
  if (isReturnRefundType(type)) return '同意退货'
  if (normalizeType(type) === 'exchange') return '同意换货'
  return '同意申请'
}
function orderStatusLabel(status?: MerchantOrderStatus) {
  return status ? (orderStatusConfig[status]?.label || status) : '未知'
}
function shortOrderId(value?: string | null) {
  if (!value) return '订单号缺失'
  return value.length > 14 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value
}
function money(value?: string | number | null) {
  return Number(value || 0).toFixed(2)
}
function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}
function recordText(raw?: string | null) {
  if (!raw) return ''
  try {
    const data = JSON.parse(raw) as {
      returnAddress?: string
      company?: string
      logisticsNo?: string
      inspection?: string
      remark?: string
    }
    return [
      data.returnAddress ? `退货地址：${data.returnAddress}` : '',
      data.logisticsNo ? `退货运单：${data.company || ''} ${data.logisticsNo}` : '',
      data.inspection ? `验收：${data.inspection === 'ACCEPTED' ? '合格' : '不合格'}` : '',
      data.remark || '',
    ].filter(Boolean).join(' · ')
  } catch {
    return raw
  }
}
function timelineFor(item: MerchantAfterSale) {
  const returnFlow = isReturnRefundType(item.type)
  const labels = returnFlow
    ? ['申请受理', '商品寄回', '实物验收', '退款完成']
    : ['申请受理', '商家处理', '资金结果']
  let current = 0
  if (item.status === 'PROCESSING') current = returnFlow ? 3 : 2
  else if (item.status === 'APPROVED') current = isInspection(item) ? 2 : returnFlow ? 1 : 2
  else if (item.status === 'COMPLETED') current = labels.length
  else if (item.status === 'REJECTED' || item.status === 'CANCELLED') current = 1
  return labels.map((label) => ({ label, current }))
}

function back() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.redirectTo({ url: '/pkg-merchant/dashboard/index' })
}

async function loadAll() {
  loading.value = true
  error.value = ''
  try {
    const result = await merchantBackendApi.getAfterSales({ page: 1, pageSize: 100 })
    items.value = result.items || []
  } catch (e) {
    error.value = (e as Error)?.message || '售后数据加载失败'
  } finally {
    loading.value = false
  }
}

async function doApprove(item: MerchantAfterSale, remark?: string) {
  submittingId.value = item.id
  try {
    await merchantBackendApi.processAfterSale(item.id, 'approve', remark)
    uni.showToast({ title: isReturnRefundType(item.type) ? '已同意退货' : '申请已处理', icon: 'success' })
    await loadAll()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '处理失败', icon: 'none' })
  } finally {
    submittingId.value = ''
  }
}

function approve(item: MerchantAfterSale) {
  if (submittingId.value) return
  if (isReturnRefundType(item.type)) {
    uni.showModal({
      title: '同意退货退款',
      content: '请输入完整退货地址，客户将按此寄回商品。此时不会提前退款或回补库存。',
      editable: true,
      placeholderText: '收件人 电话 省市区详细地址',
      confirmText: '确认并发送',
      confirmColor: '#c9193f',
      success: async (result) => {
        if (!result.confirm) return
        const address = (result.content || '').trim()
        if (address.length < 8) return uni.showToast({ title: '请填写完整退货地址', icon: 'none' })
        await doApprove(item, address)
      },
    })
    return
  }
  const refund = isImmediateRefundType(item.type)
  uni.showModal({
    title: refund ? '确认同意退款' : `确认${approveLabel(item.type)}`,
    content: refund
      ? `确认将 ¥${money(item.amount ?? item.order?.amount)} 按原支付渠道退回？提交后不可撤销。`
      : `确认同意该${typeLabel(item.type)}申请？`,
    confirmText: refund ? '确认退款' : '确认同意',
    confirmColor: '#c9193f',
    success: async (result) => {
      if (result.confirm) await doApprove(item)
    },
  })
}

function reject(item: MerchantAfterSale) {
  if (submittingId.value) return
  uni.showModal({
    title: '拒绝售后申请',
    editable: true,
    placeholderText: '填写可向客户说明的拒绝原因',
    confirmText: '确认拒绝',
    confirmColor: '#c9193f',
    success: async (result) => {
      if (!result.confirm) return
      const remark = (result.content || '').trim()
      if (!remark) return uni.showToast({ title: '请填写拒绝原因', icon: 'none' })
      submittingId.value = item.id
      try {
        await merchantBackendApi.processAfterSale(item.id, 'reject', `商家拒绝：${remark}`)
        uni.showToast({ title: '已拒绝申请', icon: 'success' })
        await loadAll()
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '处理失败', icon: 'none' })
      } finally {
        submittingId.value = ''
      }
    },
  })
}

function inspectionRequestId(id: string) {
  const existing = inspectionRequestIds.get(id)
  if (existing) return existing
  const value = `return-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  inspectionRequestIds.set(id, value)
  return value
}

function inspect(item: MerchantAfterSale, accepted: boolean) {
  if (submittingId.value) return
  uni.showModal({
    title: accepted ? '确认退货验收合格' : '记录验收不合格',
    content: accepted
      ? '确认商品已经实际退回且验收合格？确认后将回补库存并提交原路退款，此操作不可撤销。'
      : '请填写破损、缺件或与申请不符等原因。',
    editable: !accepted,
    placeholderText: accepted ? undefined : '例如：外观破损、配件缺失',
    confirmText: accepted ? '入库并退款' : '确认不合格',
    confirmColor: '#c9193f',
    success: async (result) => {
      if (!result.confirm) return
      const remark = (result.content || '').trim()
      if (!accepted && !remark) return uni.showToast({ title: '请填写不合格原因', icon: 'none' })
      submittingId.value = item.id
      try {
        await merchantBackendApi.inspectReturn(item.id, {
          requestId: inspectionRequestId(item.id),
          accepted,
          remark: remark || '退货商品验收合格',
        })
        inspectionRequestIds.delete(item.id)
        uni.showToast({ title: accepted ? '已入库，退款已提交' : '已记录验收不合格', icon: 'success' })
        await loadAll()
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '验收处理失败', icon: 'none' })
      } finally {
        submittingId.value = ''
      }
    },
  })
}

function complete(item: MerchantAfterSale) {
  if (submittingId.value) return
  uni.showModal({
    title: '确认售后完成',
    content: `请确认该${typeLabel(item.type)}事项已经实际完成。`,
    confirmColor: '#c9193f',
    success: async (result) => {
      if (!result.confirm) return
      submittingId.value = item.id
      try {
        await merchantBackendApi.processAfterSale(item.id, 'complete')
        uni.showToast({ title: '售后已完成', icon: 'success' })
        await loadAll()
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '处理失败', icon: 'none' })
      } finally {
        submittingId.value = ''
      }
    },
  })
}

function loadVisualPreview() {
  const now = new Date().toISOString()
  items.value = [
    {
      id: 'preview-refund',
      orderId: 'GX20260728000918',
      type: 'refund_only',
      reason: '商品还未发出，临时不再需要，希望取消并退款。',
      status: 'PENDING',
      amount: 299.9,
      createdAt: now,
      updatedAt: now,
      order: { id: 'preview-order-1', amount: 299.9, status: 'PAID', productTitle: '国学经典诵读机' },
    },
    {
      id: 'preview-return',
      orderId: 'GX20260727000632',
      type: 'refund_with_return',
      reason: '礼盒外角运输时受损，希望退货退款。',
      status: 'APPROVED',
      amount: 899.9,
      logistics: JSON.stringify({ company: '顺丰速运', logisticsNo: 'SF142607280018', remark: '客户已寄出，今日 14:20 到达商家所在城市。' }),
      createdAt: now,
      updatedAt: now,
      order: { id: 'preview-order-2', amount: 899.9, status: 'SHIPPED', productTitle: '文房四宝精品套装' },
    },
    {
      id: 'preview-done',
      orderId: 'GX20260722000107',
      type: 'exchange',
      reason: '收到的砚台颜色与下单规格不一致。',
      status: 'COMPLETED',
      createdAt: now,
      updatedAt: now,
      order: { id: 'preview-order-3', amount: 399, status: 'COMPLETED', productTitle: '端砚入门套装' },
    },
  ]
  loading.value = false
  error.value = ''
}

onLoad((options) => {
  if (import.meta.env.DEV && options?.__preview === 'after-sales') {
    loadVisualPreview()
    return
  }
  void loadAll()
})
</script>

<style scoped>
.page{--red:#c9193f;--ink:#29251f;--muted:#887c6e;--green:#267352;--gold:#a97533;min-height:100vh;background:#f5f0e7;color:var(--ink)}
.nav{height:104rpx;padding:0 24rpx;display:flex;align-items:center;background:rgba(255,255,255,.97);position:sticky;top:var(--status-bar-height,0px);z-index:8;border-bottom:1rpx solid #eee5d8;box-sizing:border-box}.nav-side{width:96rpx;flex:none}.back{font-size:54rpx;line-height:1}.refresh{text-align:right;color:#8a5b28;font-size:25rpx}.nav-title{flex:1;text-align:center;display:flex;flex-direction:column}.title{font-size:32rpx;font-weight:760}.nav-sub{margin-top:3rpx;font-size:18rpx;color:#9a9083}.body{height:calc(100vh - 104rpx)}
.cockpit{margin:22rpx;padding:26rpx;border:1rpx solid #dfc69f;border-radius:28rpx;background:radial-gradient(circle at 90% 0,rgba(202,25,63,.12),transparent 34%),linear-gradient(135deg,#fffdfa,#fff7ea);display:flex;align-items:center;gap:22rpx;box-shadow:0 12rpx 30rpx rgba(80,55,28,.07)}.cockpit-copy{flex:1;min-width:0;display:flex;flex-direction:column}.eyebrow{font-size:17rpx;color:var(--gold);letter-spacing:.12em}.cockpit-title{margin-top:9rpx;font-size:29rpx;font-weight:760;line-height:1.4}.cockpit-desc{margin-top:9rpx;font-size:20rpx;line-height:1.55;color:#7e7263}.pending-orb{width:126rpx;height:126rpx;flex:none;border-radius:50%;background:#ede7dd;color:#83786b;display:flex;flex-direction:column;align-items:center;justify-content:center}.pending-orb.active{background:linear-gradient(145deg,#d4294c,#9f1233);color:#fff;box-shadow:0 0 0 12rpx rgba(201,25,63,.08),0 14rpx 28rpx rgba(154,17,50,.18)}.orb-value{font:700 38rpx Georgia,serif}.orb-label{margin-top:4rpx;font-size:18rpx}
.stage-grid{margin:0 22rpx 16rpx;display:grid;grid-template-columns:repeat(4,1fr);gap:10rpx}.stage{min-width:0;padding:17rpx 13rpx;border:1rpx solid #e7ded1;border-radius:20rpx;background:#fff;display:flex;flex-direction:column}.stage.active{border-color:#c99f62;background:#fffaf1;box-shadow:0 8rpx 22rpx rgba(92,61,24,.08)}.stage.urgent .stage-count{color:var(--red)}.stage-head{display:flex;align-items:center;justify-content:space-between}.stage-no{font:17rpx Georgia,serif;color:#b7aa9a}.stage-count{font:700 28rpx Georgia,serif;color:#345b49}.stage-name{margin-top:10rpx;font-size:22rpx;font-weight:750;white-space:nowrap}.stage-desc{margin-top:5rpx;font-size:17rpx;color:#9b9082;white-space:nowrap}
.guard{margin:0 22rpx 20rpx;padding:20rpx;border-radius:21rpx;background:#2d493c;color:#fff;display:flex;gap:16rpx;align-items:flex-start}.guard-mark{width:48rpx;height:48rpx;flex:none;border-radius:14rpx;background:#d7b57a;color:#2d493c;display:flex;align-items:center;justify-content:center;font-size:20rpx;font-weight:800}.guard>view{display:flex;flex-direction:column}.guard-title{font-size:23rpx;font-weight:750}.guard-desc{margin-top:7rpx;font-size:19rpx;line-height:1.5;opacity:.74}
.queue-head{margin:0 22rpx 16rpx;display:flex;align-items:flex-end;justify-content:space-between;gap:20rpx}.queue-head>view{display:flex;flex-direction:column}.queue-title{font-size:31rpx;font-weight:780}.queue-sub{margin-top:6rpx;font-size:20rpx;color:#918676}.queue-total{font-size:20rpx;color:#9c7a4c}
.case-list{padding:0 22rpx}.case-card{margin-bottom:16rpx;padding:22rpx;border-radius:24rpx;background:#fff;border:1rpx solid #e8dfd3;box-shadow:0 8rpx 24rpx rgba(61,45,28,.05);overflow:hidden}.case-card.tone-wait{border-top:5rpx solid var(--red)}.case-card.tone-process{border-top:5rpx solid #d29034}.case-card.tone-approved{border-top:5rpx solid var(--green)}.case-card.tone-closed{border-top:5rpx solid #aaa096}.case-head,.product,.actions{display:flex;align-items:center;justify-content:space-between;gap:15rpx}.case-type,.case-status{display:flex;flex-direction:column}.case-type text:first-child{font-size:23rpx;font-weight:760}.case-type text:last-child{margin-top:4rpx;font:17rpx ui-monospace,SFMono-Regular,monospace;color:#9b9083}.case-status{text-align:right}.case-status text:first-child{font-size:20rpx;color:#9a6832;font-weight:700}.case-status text:last-child{margin-top:4rpx;font-size:17rpx;color:#aaa094}
.product{margin-top:18rpx;padding:16rpx;border-radius:18rpx;background:#f8f4ed}.product-image,.product-fallback{width:82rpx;height:82rpx;flex:none;border-radius:14rpx}.product-fallback{background:linear-gradient(145deg,#eadfce,#fff);color:#9a7146;display:flex;align-items:center;justify-content:center;font-family:"Songti SC",serif;font-size:30rpx}.product-main{flex:1;min-width:0;display:flex;flex-direction:column}.product-title{font-size:24rpx;font-weight:720;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.product-meta{margin-top:7rpx;font-size:18rpx;color:#918577}.amount{flex:none;text-align:right;display:flex;flex-direction:column}.amount text:first-child{font-size:17rpx;color:#9b9083}.amount text:last-child{margin-top:5rpx;font:700 25rpx Georgia,serif;color:var(--red)}
.timeline{position:relative;margin:20rpx 4rpx 0;display:flex;justify-content:space-between}.timeline::before{content:"";position:absolute;top:17rpx;left:8%;right:8%;height:2rpx;background:#e5ddd2}.timeline-step{position:relative;z-index:1;flex:1;display:flex;flex-direction:column;align-items:center;gap:7rpx;color:#9b9083;font-size:17rpx}.timeline-dot{width:34rpx;height:34rpx;border-radius:50%;background:#eee7dc;border:4rpx solid #fff;display:flex;align-items:center;justify-content:center;font:15rpx Georgia,serif}.timeline-step.done,.timeline-step.current{color:#355c49}.timeline-step.done .timeline-dot{background:#2e7253;color:#fff}.timeline-step.current .timeline-dot{background:#fff;color:var(--red);box-shadow:0 0 0 3rpx var(--red)}
.reason,.record{margin-top:18rpx;padding:16rpx;border-radius:15rpx;background:#fffaf2;display:flex;flex-direction:column;gap:7rpx;font-size:20rpx;line-height:1.5;color:#62594f}.reason-label,.record-label{font-size:17rpx;color:#a1753c}.record{background:#eef5f0;color:#537060}.processing{margin-top:18rpx;padding:16rpx;border-radius:15rpx;background:#fff4dd;color:#8b5d1f;display:flex;align-items:center;gap:12rpx;font-size:20rpx}.pulse{width:15rpx;height:15rpx;border-radius:50%;background:#d28e2e;box-shadow:0 0 0 8rpx rgba(210,142,46,.12);animation:pulse 1.8s ease-in-out infinite}
.actions{margin-top:20rpx}.actions.single{justify-content:flex-end}.secondary,.primary{height:72rpx;border-radius:15rpx;display:flex;align-items:center;justify-content:center;font-size:22rpx;font-weight:720}.secondary{flex:.85;background:#f2ede6;color:#716659}.primary{flex:1.15;background:var(--red);color:#fff;box-shadow:0 8rpx 18rpx rgba(201,25,63,.16)}.primary.receive,.primary.complete{background:#2e7253;box-shadow:0 8rpx 18rpx rgba(46,114,83,.17)}.actions.single .primary{max-width:320rpx}.disabled{opacity:.48}
.state{margin:30rpx 22rpx;padding:80rpx 24rpx;border-radius:24rpx;background:#fff;text-align:center;display:flex;flex-direction:column;align-items:center;color:#8f8476}.state.error{color:#b44337}.state-mark{width:74rpx;height:74rpx;border-radius:50%;background:#edf5f0;color:#2e7253;display:flex;align-items:center;justify-content:center;font-size:38rpx}.state-title{margin-top:16rpx;font-size:25rpx;font-weight:720}.state-desc{margin-top:9rpx;font-size:20rpx}.retry{margin-top:18rpx;padding:14rpx 24rpx;border-radius:999rpx;background:var(--red);color:#fff}.bottom-space{height:calc(90rpx + env(safe-area-inset-bottom))}
@keyframes pulse{0%,100%{transform:scale(.88);opacity:.65}50%{transform:scale(1.12);opacity:1}}
@media (min-width:700px){.page{max-width:960px;margin:0 auto}.stage-grid{gap:16rpx}.case-list{display:grid;grid-template-columns:repeat(2,1fr);gap:18rpx}.case-card{margin-bottom:0}.case-card:first-child:last-child{grid-column:1/-1}.cockpit{padding:32rpx}.queue-head{margin-top:24rpx}}
@media (prefers-reduced-motion:reduce){.pulse{animation:none}}
</style>
