<!--
  B9 · 消息中心（V0 重构版）
  合并平台通知 / 售后处理 / 违规处置为单页三态 Tab：
    ①平台通知(getNotices) ②售后处理(getAfterSales·真实资金链) ③违规处置(getViolations·只读+申诉 appealViolation)
  Tab 上带未读红点角标。违规记录由平台后台产生，商家侧只读，可申诉。
  设计token：页底#FAF8F5 / 卡片#FFF / 朱红#C41E3A / 金#C9A96E / 描边#EDEAE4 / 圆角18px / 胶囊999px
-->
<template>
  <view class="page">
    <!-- 顶部导航（朱红渐变） -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack">
          <app-icon name="arrow-left" :size="22" color="#ffffff" />
        </view>
        <text class="nav-title">消息中心</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <!-- 三态 Tab（带未读红点角标） -->
    <view class="segs" :style="{ top: navHeight + 'px' }">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="seg"
        :class="{ on: active === tab.key }"
        @tap="switchTab(tab.key)"
      >
        <text class="seg-text">{{ tab.label }}</text>
        <view v-if="badgeOf(tab.key) > 0" class="seg-rd">
          <text class="seg-rd-text">{{ badgeOf(tab.key) > 99 ? '99+' : badgeOf(tab.key) }}</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ paddingTop: scrollTop + 'px' }">
      <!-- ══════════ 态A 平台通知 ══════════ -->
      <template v-if="active === 'notices'">
        <view v-if="noticeState.loading" class="state"><text class="state-text">加载中…</text></view>
        <view v-else-if="noticeState.error" class="state">
          <app-icon name="alert-circle" :size="40" color="#dc2626" />
          <text class="state-text">{{ noticeState.error }}</text>
          <view class="state-btn" @tap="loadNotices"><text class="state-btn-text">重试</text></view>
        </view>
        <view v-else-if="notices.length === 0" class="state">
          <app-icon name="bell" :size="40" color="#C9A96E" />
          <text class="state-text">暂无平台通知</text>
        </view>
        <view v-else class="body">
          <view
            v-for="n in notices"
            :key="n.id"
            class="ncard"
            :class="{ unread: !n.read }"
            @tap="openNotice(n)"
          >
            <view class="nhead">
              <text class="ntag" :class="{ sys: n.type === 'system' || n.type === 'important' }">{{ n.category || typeLabel(n.type) }}</text>
              <text class="ntime">{{ formatTime(n.time) }}</text>
            </view>
            <text class="ntitle">{{ n.title }}</text>
            <text class="ntext">{{ n.content }}</text>
          </view>
        </view>
      </template>

      <!-- ══════════ 态B 售后处理 ══════════ -->
      <template v-else-if="active === 'afterSales'">
        <view v-if="afterSaleState.loading" class="state"><text class="state-text">加载中…</text></view>
        <view v-else-if="afterSaleState.error" class="state">
          <app-icon name="alert-circle" :size="40" color="#dc2626" />
          <text class="state-text">{{ afterSaleState.error }}</text>
          <view class="state-btn" @tap="loadAfterSales"><text class="state-btn-text">重试</text></view>
        </view>
        <view v-else-if="afterSales.length === 0" class="state">
          <view class="ph-icon"><app-icon name="check-circle" :size="36" color="#C9A96E" /></view>
          <text class="state-text">暂无售后申请</text>
          <text class="state-sub">新的退款、退货或换货申请会集中显示在这里。</text>
        </view>
        <view v-else class="body">
          <view class="after-banner">
            <app-icon name="shield-check" :size="16" color="#8a6d2f" />
            <text class="after-banner-text">退款类申请确认后将进入原支付渠道，请核对原因与金额后再操作。</text>
          </view>
          <view
            v-for="item in afterSales"
            :key="item.id"
            class="acard"
            :class="{ pending: item.status === 'PENDING' || item.status === 'PROCESSING' }"
          >
            <view class="ahead">
              <view class="atype"><text class="atype-text">{{ afterSaleTypeLabel(item.type) }}</text></view>
              <text class="astatus" :class="afterSaleStatusTone(item.status)">{{ afterSaleStatusLabel(item.status) }}</text>
              <text class="ntime">{{ formatTime(item.createdAt) }}</text>
            </view>
            <view class="aproduct">
              <image v-if="item.order?.productImage" class="aproduct-img" :src="item.order.productImage" mode="aspectFill" />
              <view v-else class="aproduct-ph"><app-icon name="package" :size="22" color="#C9A96E" /></view>
              <view class="aproduct-main">
                <text class="aproduct-title">{{ item.order?.productTitle || '订单商品' }}</text>
                <text class="aproduct-order">订单 {{ shortOrderId(item.orderId) }} · {{ orderStatusLabel(item.order?.status) }}</text>
              </view>
              <text v-if="isRefundType(item.type)" class="aamount">¥{{ money(item.amount ?? item.order?.amount) }}</text>
              <text v-else class="aamount muted">非退款售后</text>
            </view>
            <view class="areason">
              <text class="areason-label">申请原因</text>
              <text class="areason-text">{{ item.reason || '用户未填写原因' }}</text>
            </view>
            <view v-if="afterSaleRecord(item.logistics)" class="aremark"><text class="aremark-text">{{ afterSaleRecord(item.logistics) }}</text></view>
            <view v-if="item.status === 'PROCESSING'" class="aprocessing">
              <app-icon name="clock" :size="15" color="#b45309" />
              <text class="aprocessing-text">资金处理中，请勿重复操作</text>
            </view>
            <view v-else-if="item.status === 'PENDING'" class="aactions">
              <view class="abtn abtn-ghost" :class="{ disabled: submittingId === item.id }" @tap="rejectAfterSale(item)">
                <text class="abtn-ghost-text">拒绝申请</text>
              </view>
              <view class="abtn abtn-primary" :class="{ disabled: submittingId === item.id }" @tap="approveAfterSale(item)">
                <text class="abtn-primary-text">{{ submittingId === item.id ? '处理中…' : approveLabel(item.type) }}</text>
              </view>
            </view>
            <view v-else-if="item.status === 'APPROVED' && isReturnRefundType(item.type)" class="aactions">
              <view class="abtn abtn-ghost" :class="{ disabled: submittingId === item.id }" @tap="inspectReturnedItem(item, false)">
                <text class="abtn-ghost-text">验收不合格</text>
              </view>
              <view class="abtn abtn-primary" :class="{ disabled: submittingId === item.id }" @tap="inspectReturnedItem(item, true)">
                <text class="abtn-primary-text">{{ submittingId === item.id ? '处理中…' : '验收入库并退款' }}</text>
              </view>
            </view>
            <view v-else-if="item.status === 'APPROVED' && !isRefundType(item.type)" class="aactions single">
              <view class="abtn abtn-ghost" :class="{ disabled: submittingId === item.id }" @tap="completeAfterSale(item)">
                <text class="abtn-ghost-text">{{ submittingId === item.id ? '处理中…' : '确认售后完成' }}</text>
              </view>
            </view>
          </view>
        </view>
      </template>
      <!-- ══════════ 态C 违规处置（只读+申诉） ══════════ -->
      <template v-else>
        <view v-if="violationState.loading" class="state"><text class="state-text">加载中…</text></view>
        <view v-else-if="violationState.error" class="state">
          <app-icon name="alert-circle" :size="40" color="#dc2626" />
          <text class="state-text">{{ violationState.error }}</text>
          <view class="state-btn" @tap="loadViolations"><text class="state-btn-text">重试</text></view>
        </view>
        <view v-else class="body">
          <view class="banner-warn">
            <text class="banner-warn-text">违规记录由平台管理后台产生，商家侧只读；如有异议可提交申诉。</text>
          </view>

          <view v-if="violations.length === 0" class="empty">
            <text class="empty-text">暂无违规记录 · 请继续保持合规经营</text>
          </view>

          <view v-else>
            <view v-for="v in violations" :key="v.id" class="vcard">
              <view class="vhead">
                <text class="vlevel">{{ typeConfig[v.type]?.label || v.type }}违规</text>
                <text class="ntime">{{ formatTime(v.createdAt) }}</text>
              </view>
              <text class="vtitle">{{ v.title }}</text>
              <text class="vtext">{{ v.description }}</text>
              <view class="vinfo">
                <view class="vinfo-row">
                  <text class="vinfo-label">当前状态：</text>
                  <text class="vinfo-val" :style="{ color: statusConfig[v.status]?.color }">{{ statusConfig[v.status]?.label || v.status }}</text>
                </view>
                <view v-if="Number(v.penalty) > 0" class="vinfo-row">
                  <text class="vinfo-label">罚款：</text>
                  <text class="vinfo-hl">¥{{ Number(v.penalty) }}</text>
                </view>
              </view>

              <!-- 已申诉：展示申诉内容 -->
              <view v-if="v.appeal" class="appeal-box">
                <view class="appeal-head">
                  <app-icon name="message-square" :size="14" color="#C41E3A" />
                  <text class="appeal-tag">我的申诉</text>
                  <text v-if="v.appealAt" class="appeal-time">{{ formatTime(v.appealAt) }}</text>
                </view>
                <text class="appeal-text">{{ v.appeal }}</text>
              </view>

              <!-- 待处理且未申诉：可申诉 -->
              <view
                v-else-if="v.status === 'PENDING'"
                class="vappeal"
                :class="{ 'vappeal-disabled': submittingId === v.id }"
                @tap="onAppeal(v)"
              >
                <text class="vappeal-text">{{ submittingId === v.id ? '提交中…' : '我要申诉' }}</text>
              </view>
            </view>
          </view>
        </view>
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import {
  merchantBackendApi,
  violationTypeConfig,
  violationStatusConfig,
  orderStatusConfig,
  type MerchantNotice,
  type MerchantViolation,
  type MerchantAfterSale,
  type MerchantAfterSaleStatus,
  type MerchantOrderStatus,
} from '@/pkg-merchant/lib/merchant-data'

const statusBarHeight = ref(0)
const navHeight = ref(44)
const scrollTop = ref(0)

const sys = uni.getSystemInfoSync()
statusBarHeight.value = sys.statusBarHeight || 0
navHeight.value = (sys.statusBarHeight || 0) + 44
// segs 高度约 46px，scroll 内容起点 = nav + segs
scrollTop.value = navHeight.value + 46

const typeConfig = violationTypeConfig
const statusConfig = violationStatusConfig

type TabKey = 'notices' | 'afterSales' | 'violations'
const tabs: { key: TabKey; label: string }[] = [
  { key: 'notices', label: '平台通知' },
  { key: 'afterSales', label: '售后处理' },
  { key: 'violations', label: '违规处置' },
]
const active = ref<TabKey>('notices')

// 各态数据
const notices = ref<MerchantNotice[]>([])
const afterSales = ref<MerchantAfterSale[]>([])
const violations = ref<MerchantViolation[]>([])

// 各态独立加载/错误态
const noticeState = reactive({ loading: false, error: '', loaded: false })
const afterSaleState = reactive({ loading: false, error: '', loaded: false })
const violationState = reactive({ loading: false, error: '', loaded: false })

const submittingId = ref('')

// 未读红点角标（真实数据聚合）
function badgeOf(key: TabKey): number {
  if (key === 'notices') return notices.value.filter((n) => !n.read).length
  if (key === 'afterSales') return afterSales.value.filter((item) => item.status === 'PENDING' || item.status === 'PROCESSING').length
  return violations.value.filter((v) => v.status === 'PENDING' && !v.appeal).length
}

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    system: '系统',
    important: '重要',
    activity: '活动',
    warning: '提醒',
  }
  return map[type] || '通知'
}

function formatTime(t?: string | null): string {
  if (!t) return ''
  return String(t).replace('T', ' ').slice(0, 16)
}

function switchTab(key: TabKey) {
  if (active.value === key) return
  active.value = key
  ensureLoaded(key)
}

function ensureLoaded(key: TabKey) {
  if (key === 'notices' && !noticeState.loaded) loadNotices()
  else if (key === 'afterSales' && !afterSaleState.loaded) loadAfterSales()
  else if (key === 'violations' && !violationState.loaded) loadViolations()
}

async function loadNotices() {
  noticeState.loading = true
  noticeState.error = ''
  try {
    notices.value = await merchantBackendApi.getNotices()
    noticeState.loaded = true
  } catch (e) {
    noticeState.error = (e as Error)?.message || '加载失败'
  } finally {
    noticeState.loading = false
  }
}

async function loadAfterSales() {
  afterSaleState.loading = true
  afterSaleState.error = ''
  try {
    const res = await merchantBackendApi.getAfterSales({ page: 1, pageSize: 100 })
    afterSales.value = res.items
    afterSaleState.loaded = true
  } catch (e) {
    afterSaleState.error = (e as Error)?.message || '加载失败'
  } finally {
    afterSaleState.loading = false
  }
}

async function loadViolations() {
  violationState.loading = true
  violationState.error = ''
  try {
    const res = await merchantBackendApi.getViolations({ page: 1, pageSize: 100 })
    violations.value = res.items
    violationState.loaded = true
  } catch (e) {
    violationState.error = (e as Error)?.message || '加载失败'
  } finally {
    violationState.loading = false
  }
}

function openNotice(n: MerchantNotice) {
  // 通知详情弹窗展示（本页无独立详情路由，复用系统弹窗，避免造假跳转）
  uni.showModal({
    title: n.title,
    content: n.content,
    showCancel: false,
    confirmText: '知道了',
  })
  if (!n.read) n.read = true
}

function normalizeAfterSaleType(type?: string | null): string {
  const value = String(type || '').trim().toLowerCase()
  if (value === 'refund') return 'refund_only'
  if (value === 'return') return 'refund_with_return'
  return value
}

function isImmediateRefundType(type?: string | null): boolean {
  return normalizeAfterSaleType(type) === 'refund_only'
}

function isReturnRefundType(type?: string | null): boolean {
  return normalizeAfterSaleType(type) === 'refund_with_return'
}

function isRefundType(type?: string | null): boolean {
  return isImmediateRefundType(type) || isReturnRefundType(type)
}

function afterSaleTypeLabel(type?: string | null): string {
  const value = normalizeAfterSaleType(type)
  const map: Record<string, string> = {
    refund_only: '仅退款',
    refund_with_return: '退货退款',
    exchange: '换货',
    not_received: '未收到商品申诉',
    not_as_described: '描述不符申诉',
    quality_issue: '质量问题申诉',
    other: '其他售后',
  }
  return map[value] || '售后'
}

function afterSaleRecord(raw?: string | null): string {
  if (!raw) return ''
  try {
    const data = JSON.parse(raw) as {
      returnAddress?: string
      company?: string
      logisticsNo?: string
      inspection?: string
      remark?: string
    }
    const parts = [
      data.returnAddress ? `退货地址：${data.returnAddress}` : '',
      data.logisticsNo ? `退货运单：${data.company || ''} ${data.logisticsNo}` : '',
      data.inspection ? `验收：${data.inspection === 'ACCEPTED' ? '合格' : '不合格'}` : '',
      data.remark || '',
    ].filter(Boolean)
    return parts.join(' · ')
  } catch {
    return raw
  }
}

function afterSaleStatusLabel(status: MerchantAfterSaleStatus): string {
  const map: Record<MerchantAfterSaleStatus, string> = {
    PENDING: '待处理', PROCESSING: '处理中', APPROVED: '已同意', REJECTED: '已拒绝', CANCELLED: '已取消', COMPLETED: '已完成',
  }
  return map[status] || status
}

function afterSaleStatusTone(status: MerchantAfterSaleStatus): string {
  if (status === 'PENDING') return 'tone-wait'
  if (status === 'PROCESSING') return 'tone-process'
  if (status === 'APPROVED' || status === 'COMPLETED') return 'tone-done'
  return 'tone-muted'
}

function approveLabel(type?: string | null): string {
  if (isRefundType(type)) return '同意并退款'
  if (String(type).toLowerCase() === 'return') return '同意退货'
  if (String(type).toLowerCase() === 'exchange') return '同意换货'
  return '同意申请'
}

function shortOrderId(id?: string | null): string {
  if (!id) return '—'
  return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id
}

function orderStatusLabel(status?: MerchantOrderStatus): string {
  return status ? (orderStatusConfig[status]?.label || status) : '—'
}

function money(value?: string | number | null): string {
  return Number(value || 0).toFixed(2)
}

async function doApproveAfterSale(item: MerchantAfterSale, remark?: string) {
  submittingId.value = item.id
  try {
    await merchantBackendApi.processAfterSale(item.id, 'approve', remark)
    uni.showToast({
      title: isImmediateRefundType(item.type) ? '退款已提交' : isReturnRefundType(item.type) ? '已同意退货' : '已同意申请',
      icon: 'success',
    })
    afterSaleState.loaded = false
    await loadAfterSales()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '处理失败', icon: 'none' })
  } finally {
    submittingId.value = ''
  }
}

function approveAfterSale(item: MerchantAfterSale) {
  if (submittingId.value) return
  if (isReturnRefundType(item.type)) {
    uni.showModal({
      title: '同意退货退款',
      content: '请输入完整退货地址（收件人、电话和详细地址），买家将按此寄回商品。',
      editable: true,
      placeholderText: '收件人 电话 省市区详细地址',
      confirmText: '确认并发送',
      confirmColor: '#C41E3A',
      success: async (r) => {
        if (!r.confirm) return
        const address = (r.content || '').trim()
        if (address.length < 8) {
          uni.showToast({ title: '请填写完整退货地址', icon: 'none' })
          return
        }
        await doApproveAfterSale(item, address)
      },
    })
    return
  }

  const refund = isImmediateRefundType(item.type)
  uni.showModal({
    title: refund ? '确认同意退款' : `确认${approveLabel(item.type)}`,
    content: refund
      ? `确认将 ¥${money(item.amount ?? item.order?.amount)} 按原支付渠道全额退回买家？提交后不可撤销。`
      : `确认同意该${afterSaleTypeLabel(item.type)}申请？`,
    confirmText: refund ? '确认退款' : '确认同意',
    confirmColor: '#C41E3A',
    success: async (r) => {
      if (r.confirm) await doApproveAfterSale(item)
    },
  })
}

function rejectAfterSale(item: MerchantAfterSale) {
  if (submittingId.value) return
  uni.showModal({
    title: '拒绝售后申请',
    editable: true,
    placeholderText: '请填写拒绝原因（将展示给买家）',
    confirmText: '确认拒绝',
    confirmColor: '#C41E3A',
    success: async (r) => {
      if (!r.confirm) return
      const remark = (r.content || '').trim()
      if (!remark) {
        uni.showToast({ title: '请填写拒绝原因', icon: 'none' })
        return
      }
      submittingId.value = item.id
      try {
        await merchantBackendApi.processAfterSale(item.id, 'reject', `商家拒绝：${remark}`)
        uni.showToast({ title: '已拒绝申请', icon: 'success' })
        afterSaleState.loaded = false
        await loadAfterSales()
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '处理失败', icon: 'none' })
      } finally {
        submittingId.value = ''
      }
    },
  })
}

const inspectionRequestIds = new Map<string, string>()
function inspectionRequestId(id: string): string {
  const existing = inspectionRequestIds.get(id)
  if (existing) return existing
  const value = `return-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  inspectionRequestIds.set(id, value)
  return value
}

function inspectReturnedItem(item: MerchantAfterSale, accepted: boolean) {
  if (submittingId.value) return
  uni.showModal({
    title: accepted ? '确认退货验收合格' : '标记验收不合格',
    content: accepted
      ? '确认商品已经实际退回且验收合格？确认后将回补库存并按原支付渠道全额退款，此操作不可撤销。'
      : '请填写验收不合格原因，该原因会展示给买家。',
    editable: !accepted,
    placeholderText: accepted ? undefined : '如：商品破损、配件不全',
    confirmText: accepted ? '验收入库并退款' : '确认不合格',
    confirmColor: '#C41E3A',
    success: async (r) => {
      if (!r.confirm) return
      const remark = (r.content || '').trim()
      if (!accepted && !remark) {
        uni.showToast({ title: '请填写验收不合格原因', icon: 'none' })
        return
      }
      submittingId.value = item.id
      try {
        await merchantBackendApi.inspectReturn(item.id, {
          requestId: inspectionRequestId(item.id),
          accepted,
          remark: remark || '退货商品验收合格',
        })
        inspectionRequestIds.delete(item.id)
        uni.showToast({ title: accepted ? '已验收入库，退款已提交' : '已记录验收不合格', icon: 'success' })
        afterSaleState.loaded = false
        await loadAfterSales()
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '验收处理失败', icon: 'none' })
      } finally {
        submittingId.value = ''
      }
    },
  })
}

function completeAfterSale(item: MerchantAfterSale) {
  if (submittingId.value) return
  uni.showModal({
    title: '确认售后完成',
    content: `请确认该${afterSaleTypeLabel(item.type)}事项已经实际完成。`,
    confirmColor: '#C41E3A',
    success: async (r) => {
      if (!r.confirm) return
      submittingId.value = item.id
      try {
        await merchantBackendApi.processAfterSale(item.id, 'complete')
        uni.showToast({ title: '售后已完成', icon: 'success' })
        afterSaleState.loaded = false
        await loadAfterSales()
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '处理失败', icon: 'none' })
      } finally {
        submittingId.value = ''
      }
    },
  })
}
function onAppeal(v: MerchantViolation) {
  if (submittingId.value) return
  uni.showModal({
    title: '提交申诉',
    editable: true,
    placeholderText: '请输入申诉理由…',
    success: async (r) => {
      if (!r.confirm) return
      const text = (r.content || '').trim()
      if (!text) {
        uni.showToast({ title: '请输入申诉理由', icon: 'none' })
        return
      }
      submittingId.value = v.id
      try {
        await merchantBackendApi.appealViolation(v.id, text)
        uni.showToast({ title: '申诉已提交', icon: 'success' })
        violationState.loaded = false
        await loadViolations()
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '提交失败', icon: 'none' })
      } finally {
        submittingId.value = ''
      }
    },
  })
}

onLoad((opts) => {
  if (String(opts?.tab || '') === 'after-sales') {
    active.value = 'afterSales'
    loadAfterSales()
  } else {
    loadNotices()
  }
})
</script>

<style lang="scss" scoped>
$paper: #faf8f5;
$card: #ffffff;
$red: #c41e3a;
$gold: #c9a96e;
$t1: #2c2c2c;
$t2: #6e6e73;
$t3: #999999;
$line: #edeae4;

.page {
  min-height: 100vh;
  background: $paper;
}

/* 顶部导航 */
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 60;
  background: linear-gradient(135deg, #c41e3a, #a01830);
}
.nav-bar {
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 16px;
}
.nav-back {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
}
.nav-title {
  flex: 1;
  text-align: center;
  font-size: 34rpx;
  font-weight: 700;
  color: #ffffff;
}
.nav-placeholder {
  width: 32px;
}

/* 三态 Tab */
.segs {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 55;
  display: flex;
  background: $card;
  border-bottom: 1px solid $line;
}
.seg {
  flex: 1;
  position: relative;
  padding: 26rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.seg-text {
  font-size: 26rpx;
  color: $t2;
}
.seg.on .seg-text {
  color: $red;
  font-weight: 600;
}
.seg.on::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 56rpx;
  height: 6rpx;
  background: $red;
  border-radius: 4rpx;
}
.seg-rd {
  position: absolute;
  top: 12rpx;
  right: 40rpx;
  min-width: 30rpx;
  height: 30rpx;
  padding: 0 8rpx;
  border-radius: 999px;
  background: $red;
  display: flex;
  align-items: center;
  justify-content: center;
}
.seg-rd-text {
  font-size: 18rpx;
  color: #ffffff;
  line-height: 1;
}

/* 滚动区 */
.scroll {
  height: 100vh;
  box-sizing: border-box;
  padding-bottom: 40rpx;
}
.body {
  padding: 28rpx 40rpx 60rpx;
}

/* ── 态A 通知卡 ── */
.ncard {
  background: $card;
  border-radius: 18px;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}
.ncard.unread {
  border-left: 6rpx solid $red;
}
.nhead {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}
.ntag {
  font-size: 20rpx;
  color: $t2;
  border: 1px solid #dddddd;
  border-radius: 8rpx;
  padding: 2rpx 16rpx;
}
.ntag.sys {
  color: #8a6d2f;
  border-color: $gold;
  background: #fbf7ef;
}
.ntime {
  font-size: 22rpx;
  color: $t3;
}
.ntitle {
  font-size: 28rpx;
  font-weight: 600;
  color: $t1;
  display: block;
  margin-bottom: 8rpx;
}
.ntext {
  font-size: 24rpx;
  color: $t2;
  line-height: 1.6;
  display: block;
}

/* ── 态B 售后卡 ── */
.after-banner {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  margin-bottom: 24rpx;
  padding: 20rpx 24rpx;
  border: 1px solid #eadfc8;
  border-radius: 14rpx;
  background: #fbf7ef;
}
.after-banner-text {
  flex: 1;
  font-size: 22rpx;
  line-height: 1.6;
  color: #8a6d2f;
}
.acard {
  margin-bottom: 24rpx;
  padding: 28rpx;
  border: 1px solid $line;
  border-radius: 18px;
  background: $card;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}
.acard.pending { border-color: #edc6cd; }
.ahead {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 22rpx;
}
.atype {
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  background: #fbeff0;
}
.atype-text { font-size: 21rpx; font-weight: 600; color: $red; }
.astatus {
  padding: 4rpx 14rpx;
  border-radius: 999px;
  font-size: 21rpx;
}
.astatus.tone-wait { color: #b91c1c; background: #fee2e2; }
.astatus.tone-process { color: #b45309; background: #fef3c7; }
.astatus.tone-done { color: #15803d; background: #dcfce7; }
.astatus.tone-muted { color: #6b7280; background: #f3f4f6; }
.ahead .ntime { margin-left: auto; }
.aproduct {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 18rpx;
  border-radius: 14rpx;
  background: #faf8f5;
}
.aproduct-img,
.aproduct-ph {
  width: 84rpx;
  height: 84rpx;
  flex-shrink: 0;
  border-radius: 12rpx;
}
.aproduct-img { background: #f1ece4; }
.aproduct-ph {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5efe3;
}
.aproduct-main { flex: 1; min-width: 0; }
.aproduct-title {
  display: block;
  overflow: hidden;
  color: $t1;
  font-size: 25rpx;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.aproduct-order { display: block; margin-top: 8rpx; color: $t3; font-size: 20rpx; }
.aamount { color: $red; font-size: 28rpx; font-weight: 700; }
.areason { padding: 22rpx 2rpx 8rpx; }
.areason-label { display: block; margin-bottom: 8rpx; color: $t3; font-size: 21rpx; }
.areason-text { display: block; color: $t1; font-size: 25rpx; line-height: 1.65; }
.aremark {
  margin-top: 12rpx;
  padding: 16rpx 20rpx;
  border-radius: 10rpx;
  background: #f5f1ea;
}
.aremark-text { color: $t2; font-size: 22rpx; line-height: 1.55; }
.aprocessing {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-top: 20rpx;
  padding-top: 18rpx;
  border-top: 1px solid $line;
}
.aprocessing-text { color: #b45309; font-size: 22rpx; }
.aactions {
  display: flex;
  justify-content: flex-end;
  gap: 18rpx;
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1px solid $line;
}
.aactions.single { justify-content: flex-end; }
.abtn {
  min-width: 176rpx;
  min-height: 88rpx;
  padding: 0 24rpx;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.abtn.disabled { opacity: 0.45; pointer-events: none; }
.abtn-ghost { border: 1px solid #d6d1c9; background: #fff; }
.abtn-primary { border: 1px solid $red; background: $red; }
.abtn-ghost-text { color: $t2; font-size: 23rpx; }
.abtn-primary-text { color: #fff; font-size: 23rpx; font-weight: 600; }
/* ── 态C 违规卡 ── */
.banner-warn {
  background: #fbeff0;
  border-radius: 12px;
  padding: 20rpx 28rpx;
  margin-bottom: 28rpx;
}
.banner-warn-text {
  font-size: 22rpx;
  color: $red;
  line-height: 1.6;
}
.vcard {
  background: $card;
  border: 1px solid #f0d0d5;
  border-radius: 18px;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}
.vhead {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}
.vlevel {
  font-size: 22rpx;
  font-weight: 600;
  color: #ffffff;
  background: $red;
  border-radius: 8rpx;
  padding: 4rpx 20rpx;
}
.vtitle {
  font-size: 28rpx;
  font-weight: 600;
  color: $t1;
  display: block;
  margin-bottom: 12rpx;
}
.vtext {
  font-size: 24rpx;
  color: $t2;
  line-height: 1.6;
  display: block;
  margin-bottom: 16rpx;
}
.vinfo {
  border-top: 1px dashed $line;
  padding-top: 16rpx;
}
.vinfo-row {
  display: flex;
  align-items: center;
  line-height: 1.8;
}
.vinfo-label {
  font-size: 22rpx;
  color: $t3;
}
.vinfo-val {
  font-size: 22rpx;
}
.vinfo-hl {
  font-size: 22rpx;
  color: $red;
  font-weight: 600;
}
.appeal-box {
  margin-top: 16rpx;
  background: #f5f1ea;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
}
.appeal-head {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
}
.appeal-tag {
  font-size: 22rpx;
  color: $red;
  font-weight: 500;
  margin-left: 8rpx;
}
.appeal-time {
  font-size: 20rpx;
  color: $t3;
  margin-left: auto;
}
.appeal-text {
  font-size: 24rpx;
  color: $t1;
  line-height: 1.6;
}
.vappeal {
  margin-top: 20rpx;
  display: inline-flex;
  align-self: flex-start;
  border: 1px solid $t2;
  border-radius: 999px;
  padding: 12rpx 36rpx;
  background: #ffffff;
}
.vappeal-disabled {
  opacity: 0.5;
}
.vappeal-text {
  font-size: 24rpx;
  color: $t2;
}
.empty {
  text-align: center;
  padding: 48rpx;
}
.empty-text {
  font-size: 24rpx;
  color: $gold;
}

/* ── 状态态 ── */
.state {
  padding: 160rpx 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}
.ph-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}
.state-text {
  font-size: 28rpx;
  color: $t2;
  text-align: center;
}
.state-sub {
  font-size: 24rpx;
  color: $t3;
  line-height: 1.6;
  text-align: center;
}
.state-btn {
  margin-top: 8rpx;
  padding: 16rpx 48rpx;
  border: 1px solid #d1d5db;
  border-radius: 12rpx;
}
.state-btn-text {
  font-size: 26rpx;
  color: #4b5563;
}
</style>
