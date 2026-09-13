<template>
  <view class="cashier">
    <app-nav-bar title="订单付款" custom-back @back="backToOrder" />
    <view class="card">
      <text class="title">{{ methodName }}</text>
      <text v-if="view.amount" class="amount">¥{{ view.amount }}</text>
      <text class="message">{{ view.message }}</text>
      <view v-if="view.qrCode" class="qr-wrap">
        <canvas canvas-id="existingOrderPayQr" id="existingOrderPayQr" class="qr" />
        <text v-if="qrError" class="message">二维码绘制失败，请重新显示</text>
        <text class="hint">请使用{{ methodName }}扫描二维码。手机上可在对应应用中识别图片，或使用另一台设备扫码。</text>
        <button v-if="qrError" class="secondary" @tap="renderQr">重新显示二维码</button>
      </view>
      <button v-if="view.canStart" class="primary" :disabled="view.busy" :loading="view.busy" @tap="startPayment">生成{{ methodName }}付款码</button>
      <button v-if="!['loading', 'success', 'closed'].includes(view.phase)" class="secondary" :disabled="view.busy" @tap="checkPayment">{{ view.busy ? '正在核对…' : '查询支付结果' }}</button>
      <button class="secondary" @tap="backToOrder">返回原订单</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, nextTick, getCurrentInstance } from 'vue'
import { onLoad, onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { redirectTo } from '@/utils/router'
import { apiGet } from '@/utils/request'
import { getUserInfo } from '@/utils/storage'
import { purchaseApi } from '@/lib/purchase-data'
import { drawQrToCanvas } from '@/utils/qrcode'
import { createExistingOrderHuifu, isHuifuChannel, type ExistingPayOrder, type HuifuAttempt, type HuifuCashierView } from '@/utils/existing-order-huifu'

const instance = getCurrentInstance()
const view = ref<HuifuCashierView>({ phase: 'loading', amount: '', channel: 'alipay', qrCode: '', busy: false, message: '正在读取订单', canStart: false })
const methodName = ref('支付宝')
const qrError = ref(false)
let orderId = ''
let flow: ReturnType<typeof createExistingOrderHuifu> | null = null
let timer: ReturnType<typeof setTimeout> | null = null
let visible = true
let checks = 0
let loaded = false
let lastQr = ''
function stopPolling() { if (timer) clearTimeout(timer); timer = null }
function schedule() {
  stopPolling()
  if (!visible || !flow || checks >= 70 || !['pending', 'unknown'].includes(view.value.phase)) return
  timer = setTimeout(async () => { checks++; await flow?.check(); schedule() }, 3000)
}
async function renderQr() {
  await nextTick()
  if (!visible || !view.value.qrCode) return
  try {
    const ctx = uni.createCanvasContext('existingOrderPayQr', instance)
    const ok = drawQrToCanvas(ctx, view.value.qrCode, 8, 8, 208, {})
    ctx.draw(false, () => { qrError.value = !ok })
  } catch { qrError.value = true }
}
async function startPayment() { checks = 0; await flow?.start(); schedule() }
async function checkPayment() { checks = 0; await flow?.check(); schedule() }
function backToOrder() {
  visible = false
  stopPolling()
  flow?.dispose()
  redirectTo(orderId ? `/orders/${encodeURIComponent(orderId)}` : '/orders')
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
  const key = `huifu:h5:existing:${accountId}:${orderId}`
  const assertAccount = () => { if (String(getUserInfo<{ id?: string }>()?.id || '') !== accountId) throw new Error('登录账号已变化，请返回原订单') }
  flow = createExistingOrderHuifu({
    orderId, channel, now: Date.now,
    readOrder: () => { assertAccount(); return apiGet<ExistingPayOrder>(`/shop/orders/${encodeURIComponent(orderId)}`) },
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
    },
  })
  await flow.load()
  loaded = true
  schedule()
})
onShow(() => {
  visible = true
  if (loaded) { void checkPayment(); if (view.value.qrCode) void renderQr() }
})
onHide(() => { visible = false; stopPolling() })
onUnload(() => { visible = false; stopPolling(); flow?.dispose() })
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
