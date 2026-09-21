<template>
  <view class="cashier">
    <app-nav-bar title="订单付款" custom-back @back="backToOrder" />
    <view class="card">
      <text class="title">{{ methodName }}</text>
      <text v-if="view.amount" class="amount">¥{{ view.amount }}</text>
      <text class="message">{{ unavailableReason() || view.message }}</text>
      <button v-if="canOpenAlipay()" class="primary" :disabled="view.busy" @tap="openAlipay">打开支付宝付款</button>
      <text v-if="openMessage" class="hint">{{ openMessage }}</text>
      <text v-if="!unavailableReason() && mobilePayment && view.channel === 'alipay' && !canOpenAlipay() && view.qrCode" class="hint">暂时无法打开支付宝，请返回原订单核对付款结果。</text>
      <view v-if="!unavailableReason() && view.qrCode && !mobilePayment" class="qr-wrap">
        <canvas canvas-id="existingOrderPayQr" id="existingOrderPayQr" class="qr" />
        <text v-if="qrError" class="message">二维码绘制失败，请重新显示</text>
        <text class="hint">请使用{{ methodName }}扫描二维码。</text>
        <button v-if="qrError" class="secondary" @tap="renderQr">重新显示二维码</button>
      </view>
      <button v-if="view.canStart && !unavailableReason()" class="primary" :disabled="view.busy" :loading="view.busy" @tap="startPayment">确认付款</button>
      <button v-if="['unknown', 'error'].includes(view.phase) || checks >= 70" class="secondary" :disabled="view.busy" @tap="checkPayment">{{ view.busy ? '正在核对…' : '查询支付结果' }}</button>
      <button class="secondary" @tap="backToOrder">返回原订单</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, nextTick, getCurrentInstance } from 'vue'
import { onLoad, onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { reLaunch } from '@/utils/router'
import { apiGet } from '@/utils/request'
import { getUserInfo } from '@/utils/storage'
import { purchaseApi } from '@/lib/purchase-data'
import { drawQrToCanvas } from '@/utils/qrcode'
import { createExistingOrderHuifu, isHuifuChannel, type ExistingPayOrder, type HuifuAttempt, type HuifuCashierView } from '@/utils/existing-order-huifu'
import { isAlipayMobileBrowser, alipaySchemeForQr, existingAlipayLaunchUrl } from '@/utils/huifu-alipay-h5'
import { isPaymentMobile } from '@/utils/payment-device'
import { h5PaymentOptions } from '@/utils/h5-payment-options'
import { getRemoteConfig, hydrateRemoteConfig } from '@/lib/remote-config'

const instance = getCurrentInstance()
const view = ref<HuifuCashierView>({ phase: 'loading', amount: '', channel: 'alipay', qrCode: '', busy: false, message: '正在读取订单', canStart: false })
const methodName = ref('支付宝')
const qrError = ref(false)
const openMessage = ref('')
const browserUserAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent
const mobilePayment = isPaymentMobile(browserUserAgent)
let paymentAccountId = ''
let paymentKey = ''
let lastOpenedAt = -Infinity
let pageActive = true
let unloaded = false
let orderId = ''
let flow: ReturnType<typeof createExistingOrderHuifu> | null = null
let timer: ReturnType<typeof setTimeout> | null = null
let visible = true
let checks = 0
let loaded = false
let lastQr = ''
let returnedAfterPayment = false
function unavailableReason() {
  if (view.value.phase === 'success') return ''
  const option = h5PaymentOptions(browserUserAgent, getRemoteConfig().features, typeof window !== 'undefined' && window.self === window.top).find(item => item.id === view.value.channel)
  return option?.enabled ? '' : option?.reason || '当前支付方式暂不可用'
}
function returnAfterConfirmedPayment() {
  if (returnedAfterPayment || !pageActive || !visible || view.value.phase !== 'success') return
  if (String(getUserInfo<{ id?: string }>()?.id || '') !== paymentAccountId) return
  returnedAfterPayment = true
  backToOrder()
}
function stopPolling() { if (timer) clearTimeout(timer); timer = null }
function schedule() {
  stopPolling()
  if (!visible || !flow || checks >= 70 || !['pending', 'unknown'].includes(view.value.phase)) return
  timer = setTimeout(async () => { checks++; await flow?.check(); schedule() }, 3000)
}
async function renderQr() {
  await nextTick()
  if (!visible || unavailableReason() || !view.value.qrCode || mobilePayment) return
  try {
    const ctx = uni.createCanvasContext('existingOrderPayQr', instance)
    const ok = drawQrToCanvas(ctx, view.value.qrCode, 8, 8, 208, {})
    ctx.draw(false, () => { qrError.value = !ok })
  } catch { qrError.value = true }
}
async function startPayment() { checks = 0; await flow?.start(); schedule() }
async function checkPayment() { checks = 0; await flow?.check(true); schedule() }
function canOpenAlipay() {
  if (unavailableReason()) return false
  if (typeof window === 'undefined' || window.self !== window.top) return false
  if (!isAlipayMobileBrowser(browserUserAgent) || view.value.channel !== 'alipay' || view.value.phase !== 'pending') return false
  try { alipaySchemeForQr(view.value.qrCode); return true } catch { return false }
}
function openAlipay() {
  if (!visible || !pageActive || !flow || Date.now() - lastOpenedAt < 1000) return
  try {
    if (!paymentAccountId || String(getUserInfo<{ id?: string }>()?.id || '') !== paymentAccountId) throw new Error('登录账号已变化，请返回原订单')
    const url = existingAlipayLaunchUrl({ orderId, view: flow.state, attempt: uni.getStorageSync(paymentKey) || null,
      userAgent: browserUserAgent, topLevel: window.self === window.top, now: Date.now() })
    // 必须在显式点击的同步调用栈中打开；只复用原付款码，不初始化新交易。
    lastOpenedAt = Date.now()
    openMessage.value = '请在支付宝确认付款，完成后返回本页，将自动核对结果。'
    window.location.assign(url)
  } catch (e) { openMessage.value = (e as Error)?.message || '未能打开支付宝，请查询原订单付款结果' }
}
function browserVisible() { return typeof document === 'undefined' || document.visibilityState !== 'hidden' }
function resumeFromBrowser() {
  if (!pageActive || returnedAfterPayment) return
  visible = browserVisible()
  if (!visible) { stopPolling(); return }
  returnAfterConfirmedPayment()
  if (returnedAfterPayment) return
  if (loaded) { void checkPayment(); if (view.value.qrCode) void renderQr() }
}
function removeBrowserListeners() {
  if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', resumeFromBrowser)
  if (typeof window !== 'undefined') window.removeEventListener('pageshow', resumeFromBrowser)
}
function backToOrder() {
  pageActive = false
  removeBrowserListeners()
  visible = false
  stopPolling()
  flow?.dispose()
  reLaunch(orderId ? `/orders/${encodeURIComponent(orderId)}?paymentReturn=1` : '/orders')
}
onLoad(async (q) => {
  orderId = String(q?.orderId || '')
  const channel = q?.method
  const accountId = String(getUserInfo<{ id?: string }>()?.id || '')
  if (!orderId || !isHuifuChannel(channel) || !accountId) {
    view.value = { ...view.value, phase: 'error', message: '支付入口或登录信息无效，请返回原订单重新进入' }
    return
  }
  methodName.value = channel === 'alipay' ? '支付宝' : '云闪付'
  visible = browserVisible()
  const key = `huifu:h5:existing:${accountId}:${orderId}`
  paymentAccountId = accountId
  paymentKey = key
  await hydrateRemoteConfig(true)
  if (unloaded) return
  const assertAccount = () => { if (String(getUserInfo<{ id?: string }>()?.id || '') !== accountId) throw new Error('登录账号已变化，请返回原订单') }
  flow = createExistingOrderHuifu({
    orderId, channel, now: Date.now, mobile: mobilePayment,
    initializationBlockedReason: unavailableReason,
    readOrder: async (fresh = false) => { assertAccount(); const order = await apiGet<ExistingPayOrder>(`/shop/orders/${encodeURIComponent(orderId)}${fresh ? '/current' : ''}`); assertAccount(); return order },
    createPayment: (id, method) => { assertAccount(); return purchaseApi.payByChannel(id, method) },
    queryPayment: (reference) => { assertAccount(); return purchaseApi.queryHuifuPayment(reference) },
    loadAttempt: () => { assertAccount(); return (uni.getStorageSync(key) || null) as HuifuAttempt | null },
    saveAttempt: (record) => {
      assertAccount()
      uni.setStorageSync(key, record)
      if (JSON.stringify(uni.getStorageSync(key)) !== JSON.stringify(record)) throw new Error('无法保存本次付款记录，请保留原单并查询')
    },
    update: (value) => {
      view.value = value
      if (value.qrCode !== lastQr) { lastQr = value.qrCode; void renderQr() }
      if (['success', 'closed'].includes(value.phase)) stopPolling()
      returnAfterConfirmedPayment()
    },
  })
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', resumeFromBrowser)
  if (typeof window !== 'undefined') window.addEventListener('pageshow', resumeFromBrowser)
  await flow.load()
  loaded = true
  // confirmed只表达导航意图：本人待付订单、金额及持久提交记录仍由流程逐一校验。
  if (q?.confirmed === '1' && visible && pageActive && flow.state.canStart) await startPayment()
  schedule()
})
onShow(() => {
  if (returnedAfterPayment) return
  pageActive = true
  resumeFromBrowser()
})
onHide(() => { pageActive = false; visible = false; stopPolling() })
onUnload(() => { unloaded = true; pageActive = false; visible = false; stopPolling(); removeBrowserListeners(); flow?.dispose() })
</script>

<style scoped>
.cashier { min-height: 100vh; background: #f7f6f3; }
.card { margin: 32rpx; padding: 40rpx 28rpx; border-radius: 24rpx; background: #fff; display: flex; flex-direction: column; align-items: center; gap: 26rpx; }
.title { font-size: 34rpx; font-weight: 600; color: #222; }
.amount { font-size: 48rpx; font-weight: 600; color: #222; }
.message, .hint { font-size: 27rpx; color: #666; line-height: 1.7; text-align: center; }
.hint { font-size: 24rpx; }
.qr-wrap { display: flex; flex-direction: column; align-items: center; gap: 20rpx; }
.qr { width: 224px; height: 224px; }
.primary, .secondary { width: 100%; border-radius: 44rpx; font-size: 28rpx; margin: 0; }
.primary { background: var(--brand, #a83532); color: #fff; }
.secondary { background: #f5f4f1; color: #444; }
</style>
