<template>
  <view class="od-page">
    <!-- 顶部导航 -->
    <view class="od-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="od-header-inner">
        <view class="od-back" @tap="go('/merchant/orders')">
          <AppIcon name="arrow-left" :size="20" color="#1a1a1a" />
        </view>
        <text class="od-title">订单详情</text>
      </view>
    </view>

    <scroll-view scroll-y class="od-scroll" :style="{ paddingTop: statusBarHeight + 44 + 'px' }">
      <!-- Loading -->
      <view v-if="loading" class="od-state">
        <text class="od-state-txt">加载中…</text>
      </view>
      <!-- Error -->
      <view v-else-if="error" class="od-state">
        <AppIcon name="alert-circle" :size="44" color="#dc2626" />
        <text class="od-state-title">加载失败</text>
        <text class="od-state-txt">{{ error }}</text>
        <view class="od-state-btn" @tap="load">
          <text>重试</text>
        </view>
      </view>

      <template v-else-if="order">
        <!-- 订单状态 -->
        <view class="od-status-banner" :style="{ background: statusCfg[order.status].bg }">
          <AppIcon :name="statusCfg[order.status].icon" :size="40" :color="statusCfg[order.status].color" />
          <view>
            <text class="od-status-label" :style="{ color: statusCfg[order.status].color }">{{ statusCfg[order.status].label }}</text>
            <text class="od-status-desc">{{ statusDesc }}</text>
          </view>
        </view>

        <!-- 收货信息（无则降级隐藏） -->
        <view v-if="shipping" class="od-card od-addr-card">
          <AppIcon name="map-pin" :size="20" color="#6b7280" />
          <view class="od-addr-info">
            <view class="od-addr-top">
              <text v-if="shipping.name" class="od-buyer-name">{{ shipping.name }}</text>
              <text v-if="shipping.phone" class="od-buyer-phone">{{ shipping.phone }}</text>
              <view v-if="shipping.phone" class="od-copy-btn" @tap="copy(shipping.phone)">
                <AppIcon name="copy" :size="12" color="#6b7280" />
              </view>
            </view>
            <text v-if="addressText" class="od-addr-detail">{{ addressText }}</text>
          </view>
          <view v-if="shipping.phone" class="od-phone-btn" @tap="callPhone(shipping.phone)">
            <AppIcon name="phone" :size="16" color="#1a1a1a" />
          </view>
        </view>

        <!-- 买家信息 -->
        <view class="od-card">
          <text class="od-card-title">买家信息</text>
          <view class="od-info-row">
            <text class="od-info-label">买家昵称</text>
            <text class="od-info-val">{{ order.buyerNickname || '匿名买家' }}</text>
          </view>
          <view v-if="order.buyerPhone" class="od-info-row">
            <text class="od-info-label">联系电话</text>
            <view class="od-info-copy">
              <text class="od-info-val">{{ order.buyerPhone }}</text>
              <view class="od-copy-btn" @tap="copy(order.buyerPhone)">
                <AppIcon name="copy" :size="12" color="#6b7280" />
              </view>
            </view>
          </view>
        </view>

        <!-- 商品信息 -->
        <view class="od-card">
          <text class="od-card-title">商品信息</text>
          <view class="od-product">
            <image lazy-load v-if="order.productImage" class="od-thumb-img" :src="order.productImage" mode="aspectFill" />
            <view v-else class="od-thumb">
              <AppIcon name="package" :size="24" color="#c4b59a" />
            </view>
            <view class="od-product-info">
              <text class="od-product-name">{{ order.productTitle || '商品' }}</text>
              <view class="od-product-meta">
                <text class="od-product-price">¥{{ amountText }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 白标贺卡任务（供-P2·归因订单才有，无则降级隐藏） -->
        <view v-if="giftCard" class="od-card od-gift-card">
          <view class="od-gift-head">
            <AppIcon name="gift" :size="18" color="#C41E3A" />
            <text class="od-card-title od-gift-title">贺卡任务</text>
            <text class="od-gift-badge">发货请随包裹放入</text>
          </view>
          <view v-if="giftCard.fromName" class="od-info-row">
            <text class="od-info-label">从业者署名</text>
            <text class="od-info-val">{{ giftCard.fromName }}</text>
          </view>
          <view v-if="giftCard.blessing" class="od-gift-blessing">
            <text class="od-gift-blessing-txt">「{{ giftCard.blessing }}」</text>
          </view>
          <view v-if="giftCard.qrRef" class="od-info-row">
            <text class="od-info-label">名片码内容</text>
            <view class="od-info-copy">
              <text class="od-info-val od-gift-qr">{{ giftCard.qrRef }}</text>
              <view class="od-copy-btn" @tap="copy(giftCard.qrRef)">
                <AppIcon name="copy" :size="12" color="#6b7280" />
              </view>
            </view>
          </view>
          <text class="od-gift-hint">可在后台「订单管理 → 打印贺卡」打印 A6 贺卡（含名片二维码）</text>
        </view>

        <!-- 金额明细（后端仅有订单总额，不伪造运费/数量） -->
        <view class="od-card">
          <text class="od-card-title">金额明细</text>
          <view class="od-divider" />
          <view class="od-amount-row">
            <text class="od-total-label">实付金额</text>
            <text class="od-total-val">¥{{ amountText }}</text>
          </view>
        </view>

        <!-- 订单信息 -->
        <view class="od-card">
          <text class="od-card-title">订单信息</text>
          <view class="od-info-row">
            <text class="od-info-label">订单编号</text>
            <view class="od-info-copy">
              <text class="od-info-val">{{ order.id }}</text>
              <view class="od-copy-btn" @tap="copy(order.id)">
                <AppIcon name="copy" :size="12" color="#6b7280" />
              </view>
            </view>
          </view>
          <view class="od-info-row">
            <text class="od-info-label">下单时间</text>
            <text class="od-info-val">{{ formatTime(order.createdAt) }}</text>
          </view>
          <view v-if="order.paidAt" class="od-info-row">
            <text class="od-info-label">付款时间</text>
            <text class="od-info-val">{{ formatTime(order.paidAt) }}</text>
          </view>
          <view v-if="order.shippedAt" class="od-info-row">
            <text class="od-info-label">发货时间</text>
            <text class="od-info-val">{{ formatTime(order.shippedAt) }}</text>
          </view>
          <view class="od-info-row">
            <text class="od-info-label">支付方式</text>
            <text class="od-info-val">{{ payMethodText }}</text>
          </view>
        </view>

        <!-- 订单进度 -->
        <view class="od-card">
          <text class="od-card-title">订单进度</text>
          <view class="od-timeline">
            <view v-for="(item, i) in timeline" :key="i" class="od-tl-item">
              <view class="od-tl-line">
                <view class="od-tl-dot" :class="{ active: i === 0 }" />
                <view v-if="i < timeline.length - 1" class="od-tl-bar" />
              </view>
              <view class="od-tl-body">
                <text class="od-tl-title" :class="{ active: i === 0 }">{{ item.title }}</text>
                <text class="od-tl-desc">{{ item.desc }}</text>
                <text class="od-tl-time">{{ formatTime(item.time) }}</text>
              </view>
            </view>
          </view>
        </view>
        <view style="height: 90px" />
      </template>
    </scroll-view>

    <!-- 底部操作栏：待发货 -->
    <view v-if="order && order.status === 'PAID'" class="od-footer">
      <view class="od-foot-btn primary" @tap="showShip = true">
        <AppIcon name="truck" :size="16" color="#fff" />
        <text>发货</text>
      </view>
    </view>
    <!-- 底部操作栏：退款处理 -->
    <view v-else-if="order && order.status === 'REFUNDED'" class="od-footer">
      <view class="od-foot-btn outline" :class="{ disabled: submitting }" @tap="handleReject">拒绝退款</view>
      <view class="od-foot-btn primary" :class="{ disabled: submitting }" @tap="handleApprove">
        <text>{{ submitting ? '处理中...' : '同意退款' }}</text>
      </view>
    </view>

    <!-- 发货弹窗 -->
    <view v-if="showShip" class="od-mask" @tap="showShip = false">
      <view class="od-ship" @tap.stop>
        <text class="od-ship-title">填写物流信息</text>
        <view class="od-ship-field">
          <text class="od-ship-label">快递公司 <text class="od-req">*</text></text>
          <view class="od-ship-select" @tap="showExpress = true">
            <text :class="expressCompany ? 'od-select-val' : 'od-select-ph'">
              {{ expressCompany || '请选择快递公司' }}
            </text>
            <AppIcon name="chevron-right" :size="16" color="#9ca3af" />
          </view>
        </view>
        <view class="od-ship-field">
          <text class="od-ship-label">物流单号 <text class="od-req">*</text></text>
          <input class="od-ship-input" v-model="trackingNo" placeholder="请输入物流单号" placeholder-class="od-ph" />
          <text class="od-ship-hint">请仔细核对单号，填写错误将影响买家查询物流</text>
        </view>
        <view v-if="giftCard" class="od-ship-gift-tip">
          <AppIcon name="gift" :size="14" color="#C41E3A" />
          <text class="od-ship-gift-txt">本单含贺卡任务（{{ giftCard.fromName || '从业者' }}），请打印后随包裹放入</text>
        </view>
        <view v-if="order" class="od-ship-preview">
          <text class="od-ship-preview-label">发货商品</text>
          <view class="od-ship-preview-row">
            <image lazy-load v-if="order.productImage" class="od-ship-preview-img" :src="order.productImage" mode="aspectFill" />
            <view v-else class="od-ship-preview-thumb">
              <AppIcon name="package" :size="18" color="#c4b59a" />
            </view>
            <text class="od-ship-preview-name">{{ order.productTitle || '商品' }}</text>
          </view>
        </view>
        <view
          class="od-ship-submit"
          :class="{ disabled: !trackingNo || !expressCompany || submitting }"
          @tap="handleShip"
        >
          <AppIcon name="check-circle" :size="16" color="#fff" />
          <text>{{ submitting ? '提交中...' : '确认发货' }}</text>
        </view>
      </view>
    </view>

    <!-- 快递选择浮层 -->
    <view v-if="showExpress" class="od-mask" @tap="showExpress = false">
      <view class="od-sheet" @tap.stop>
        <text class="od-sheet-title">选择快递公司</text>
        <scroll-view scroll-y class="od-sheet-list">
          <view
            v-for="c in expressCompanies"
            :key="c"
            class="od-sheet-item"
            :class="{ active: expressCompany === c }"
            @tap="pickExpress(c)"
          >
            {{ c }}
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import {
  merchantBackendApi,
  orderStatusConfig,
  expressCompanies,
  type MerchantOrder,
} from '@/lib/merchant-data'

const statusBarHeight = ref(0)
uni.getSystemInfo({ success: (e) => { statusBarHeight.value = e.statusBarHeight || 0 } })

const statusCfg = orderStatusConfig

const orderId = ref('')
const order = ref<MerchantOrder | null>(null)
const loading = ref(true)
const error = ref('')

const showShip = ref(false)
const showExpress = ref(false)
const expressCompany = ref('')
const trackingNo = ref('')
const submitting = ref(false)

onLoad((opts) => {
  orderId.value = opts?.id ? String(opts.id) : ''
  load()
})

async function load() {
  if (!orderId.value) {
    error.value = '缺少订单参数'
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  try {
    order.value = await merchantBackendApi.getOrder(orderId.value)
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

const shipping = computed(() => order.value?.shippingInfo || null)
/** 白标贺卡任务（供-P2）：归因订单才有，无则整卡降级隐藏 */
const giftCard = computed(() => order.value?.giftCardMeta || null)
const addressText = computed(() => {
  const s = shipping.value
  if (!s) return ''
  return [s.province, s.city, s.district, s.detail].filter(Boolean).join('')
})
const amountText = computed(() => Number(order.value?.amount ?? 0).toFixed(2))

const statusDescMap: Record<string, string> = {
  PENDING: '等待买家付款',
  PAID: '买家已付款，请尽快发货',
  SHIPPED: '商品已发出，等待买家确认收货',
  COMPLETED: '交易已完成',
  REFUNDED: '买家申请退款，请及时处理',
  CANCELLED: '订单已取消',
}
const statusDesc = computed(() => statusDescMap[order.value?.status || ''] || '')

const payMethodMap: Record<string, string> = {
  WECHAT: '微信支付',
  ALIPAY: '支付宝',
  BALANCE: '余额支付',
  COIN: '虚拟币',
}
const payMethodText = computed(() => {
  const m = order.value?.payMethod
  if (!m) return '—'
  return payMethodMap[m] || m
})

const timeline = computed(() => {
  const o = order.value
  if (!o) return [] as { title: string; desc: string; time: string }[]
  const items: { title: string; desc: string; time: string }[] = [
    { title: '提交订单', desc: '买家提交订单', time: o.createdAt },
  ]
  if (o.paidAt) items.push({ title: '买家付款', desc: '订单已完成支付', time: o.paidAt })
  if (o.shippedAt) items.push({ title: '商家发货', desc: '商品已发出', time: o.shippedAt })
  return items.reverse()
})

function pickExpress(name: string) {
  expressCompany.value = name
  showExpress.value = false
}

async function handleShip() {
  if (!trackingNo.value || !expressCompany.value || submitting.value) return
  submitting.value = true
  try {
    await merchantBackendApi.shipOrder(orderId.value, expressCompany.value, trackingNo.value)
    showShip.value = false
    expressCompany.value = ''
    trackingNo.value = ''
    uni.showToast({ title: '发货成功', icon: 'success' })
    await load()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '发货失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

async function handleApprove() {
  if (submitting.value) return
  uni.showModal({
    title: '同意退款',
    content: '确认同意此订单的退款申请？退款将原路退回买家。',
    confirmColor: '#C41E3A',
    success: async (res) => {
      if (!res.confirm) return
      submitting.value = true
      try {
        await merchantBackendApi.approveRefund(orderId.value)
        uni.showToast({ title: '已同意退款', icon: 'success' })
        await load()
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
      } finally {
        submitting.value = false
      }
    },
  })
}

function handleReject() {
  if (submitting.value) return
  uni.showModal({
    title: '拒绝退款',
    editable: true,
    placeholderText: '请填写拒绝原因',
    confirmColor: '#C41E3A',
    success: async (res) => {
      if (!res.confirm) return
      const reason = (res.content || '').trim()
      if (!reason) {
        uni.showToast({ title: '请填写拒绝原因', icon: 'none' })
        return
      }
      submitting.value = true
      try {
        await merchantBackendApi.rejectRefund(orderId.value, reason)
        uni.showToast({ title: '已拒绝退款', icon: 'success' })
        await load()
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '操作失败', icon: 'none' })
      } finally {
        submitting.value = false
      }
    },
  })
}

function formatTime(s?: string | null) {
  return s ? String(s).replace('T', ' ').slice(0, 16) : ''
}
function copy(text?: string | null) {
  if (!text) return
  uni.setClipboardData({ data: text, success: () => uni.showToast({ title: '已复制', icon: 'none' }) })
}
function callPhone(phone?: string | null) {
  if (!phone) return
  uni.makePhoneCall({ phoneNumber: phone, fail: () => {} })
}
function go(path: string) {
  navigateTo(path)
}
</script>

<style scoped>
.od-page { min-height: 100vh; background: #f5f5f7; }
.od-header { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: #fff; border-bottom: 1px solid #ededed; }
.od-header-inner { height: 44px; display: flex; align-items: center; padding: 0 16px; }
.od-back { width: 32px; display: flex; align-items: center; }
.od-title { font-size: 18px; font-weight: 600; color: #1a1a1a; }
.od-scroll { height: 100vh; box-sizing: border-box; }

.od-status-banner { padding: 20px 16px; display: flex; align-items: center; gap: 12px; }
.od-status-label { font-size: 18px; font-weight: 600; display: block; }
.od-status-desc { font-size: 13px; color: #6b7280; margin-top: 2px; display: block; }

.od-card { background: #fff; border-radius: 12px; margin: 12px 16px 0; padding: 16px; }
.od-addr-card { display: flex; align-items: flex-start; gap: 12px; }
.od-addr-info { flex: 1; min-width: 0; }
.od-addr-top { display: flex; align-items: center; gap: 8px; }
.od-buyer-name { font-size: 14px; font-weight: 500; color: #1a1a1a; }
.od-buyer-phone { font-size: 14px; color: #6b7280; }
.od-copy-btn { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; }
.od-addr-detail { font-size: 13px; color: #6b7280; margin-top: 4px; display: block; line-height: 1.5; }
.od-phone-btn { width: 40px; height: 40px; border: 1px solid #e5e5e5; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

.od-card-title { font-size: 15px; font-weight: 500; color: #1a1a1a; display: block; margin-bottom: 12px; }
.od-product { display: flex; gap: 12px; }
.od-thumb { width: 64px; height: 64px; border-radius: 8px; background: #f3f0ea; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.od-thumb-img { width: 64px; height: 64px; border-radius: 8px; background: #f3f0ea; flex-shrink: 0; }
.od-product-info { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
.od-product-name { font-size: 14px; font-weight: 500; color: #1a1a1a; line-height: 1.4; }
.od-product-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
.od-product-price { font-size: 14px; font-weight: 500; color: #1a1a1a; }

/* 白标贺卡任务卡（供-P2） */
.od-gift-card { border: 1px solid rgba(196, 30, 58, 0.18); }
.od-gift-head { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; }
.od-gift-title { margin-bottom: 0; }
.od-gift-badge { margin-left: auto; font-size: 11px; color: #C41E3A; background: rgba(196, 30, 58, 0.08); border-radius: 4px; padding: 2px 8px; }
.od-gift-blessing { background: #faf7f2; border-radius: 8px; padding: 10px 12px; margin: 4px 0 8px; }
.od-gift-blessing-txt { font-size: 13px; color: #6b5d48; line-height: 1.6; }
.od-gift-qr { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.od-gift-hint { font-size: 12px; color: #9ca3af; margin-top: 8px; display: block; line-height: 1.5; }
.od-ship-gift-tip { display: flex; align-items: center; gap: 6px; background: rgba(196, 30, 58, 0.06); border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; }
.od-ship-gift-txt { font-size: 12px; color: #C41E3A; line-height: 1.5; }

.od-amount-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.od-divider { height: 1px; background: #f3f4f6; margin: 8px 0; }
.od-total-label { font-size: 14px; font-weight: 500; color: #1a1a1a; }
.od-total-val { font-size: 18px; font-weight: 700; color: var(--brand); }

.od-info-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.od-info-row:last-child { margin-bottom: 0; }
.od-info-label { font-size: 14px; color: #6b7280; }
.od-info-val { font-size: 14px; color: #1a1a1a; }
.od-info-copy { display: flex; align-items: center; gap: 2px; }

.od-timeline { display: flex; flex-direction: column; }
.od-tl-item { display: flex; gap: 12px; }
.od-tl-line { display: flex; flex-direction: column; align-items: center; }
.od-tl-dot { width: 12px; height: 12px; border-radius: 50%; background: #d1d5db; margin-top: 2px; }
.od-tl-dot.active { background: var(--brand); }
.od-tl-bar { width: 1px; flex: 1; background: #e5e5e5; margin: 4px 0; }
.od-tl-body { flex: 1; padding-bottom: 16px; }
.od-tl-title { font-size: 14px; font-weight: 500; color: #9ca3af; display: block; }
.od-tl-title.active { color: #1a1a1a; }
.od-tl-desc { font-size: 12px; color: #9ca3af; margin-top: 2px; display: block; }
.od-tl-time { font-size: 12px; color: #9ca3af; margin-top: 4px; display: block; }

.od-footer { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #ededed; padding: 12px 16px; padding-bottom: calc(12px + env(safe-area-inset-bottom)); display: flex; gap: 12px; z-index: 60; }
.od-foot-btn { flex: 1; height: 44px; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 15px; }
.od-foot-btn.outline { border: 1px solid #d1d5db; color: #1a1a1a; }
.od-foot-btn.primary { background: var(--brand); color: #fff; }
.od-foot-btn.disabled { opacity: 0.5; }

.od-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100; display: flex; align-items: flex-end; }
.od-ship { width: 100%; background: #fff; border-radius: 16px 16px 0 0; padding: 20px 16px; padding-bottom: calc(20px + env(safe-area-inset-bottom)); }
.od-ship-title { font-size: 16px; font-weight: 600; color: #1a1a1a; display: block; margin-bottom: 16px; }
.od-ship-field { margin-bottom: 16px; }
.od-ship-label { font-size: 14px; color: #1a1a1a; display: block; margin-bottom: 8px; }
.od-req { color: #ef4444; }
.od-ship-select { height: 42px; border: 1px solid #e5e5e5; border-radius: 8px; padding: 0 12px; display: flex; align-items: center; justify-content: space-between; }
.od-select-val { font-size: 14px; color: #1a1a1a; }
.od-select-ph { font-size: 14px; color: #9ca3af; }
.od-ship-input { width: 100%; box-sizing: border-box; height: 42px; border: 1px solid #e5e5e5; border-radius: 8px; padding: 0 12px; font-size: 14px; color: #1a1a1a; }
.od-ph { color: #9ca3af; }
.od-ship-hint { font-size: 12px; color: #9ca3af; margin-top: 4px; display: block; }
.od-ship-preview { background: #f5f5f7; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
.od-ship-preview-label { font-size: 12px; color: #9ca3af; display: block; margin-bottom: 8px; }
.od-ship-preview-row { display: flex; align-items: center; gap: 8px; }
.od-ship-preview-thumb { width: 40px; height: 40px; border-radius: 6px; background: #f3f0ea; display: flex; align-items: center; justify-content: center; }
.od-ship-preview-img { width: 40px; height: 40px; border-radius: 6px; background: #f3f0ea; }
.od-ship-preview-name { font-size: 14px; color: #1a1a1a; }
.od-ship-submit { height: 44px; background: var(--brand); border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 15px; color: #fff; }
.od-ship-submit.disabled { opacity: 0.5; }

.od-sheet { width: 100%; background: #fff; border-radius: 16px 16px 0 0; padding: 16px; padding-bottom: calc(16px + env(safe-area-inset-bottom)); }
.od-sheet-title { font-size: 16px; font-weight: 600; color: #1a1a1a; display: block; text-align: center; margin-bottom: 12px; }
.od-sheet-list { max-height: 50vh; }
.od-sheet-item { padding: 14px 4px; border-bottom: 1px solid #f3f4f6; font-size: 15px; color: #1a1a1a; }
.od-sheet-item.active { color: var(--brand); }

/* 三态 */
.od-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 24px; gap: 12px; }
.od-state-title { font-size: 16px; font-weight: 600; color: #1a1a1a; margin-top: 4px; }
.od-state-txt { font-size: 14px; color: #9ca3af; text-align: center; line-height: 1.5; }
.od-state-btn { margin-top: 8px; padding: 8px 24px; border: 1px solid #ddd; border-radius: 8px; background: #fff; }
.od-state-btn text { font-size: 14px; color: #1a1a1a; }
</style>
