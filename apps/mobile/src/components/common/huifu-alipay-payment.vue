<template>
  <view class="alipay-payment">
    <app-nav-bar title="支付宝付款" custom-back @back="leave" />
    <view class="alipay-payment__body">
      <text class="alipay-payment__title">{{ view.phase === 'success' ? '支付成功' : '等待支付' }}</text>
      <text v-if="displayAmount" class="alipay-payment__amount">¥{{ displayAmount }}</text>
      <text class="alipay-payment__message">{{ view.message }}</text>
      <button v-if="view.canOpen" :disabled="view.busy" @tap="reopen">重新打开支付宝</button>
      <button v-if="view.phase !== 'unsupported' && view.phase !== 'closed' && view.phase !== 'success'" :disabled="view.busy" @tap="check">
        {{ view.busy ? '查询中…' : '我已完成付款，查询结果' }}
      </button>
      <button class="alipay-payment__back" @tap="leave">返回订单</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { apiGet } from '@/utils/request'
import { purchaseApi } from '@/lib/purchase-data'
import { getUserInfo } from '@/utils/storage'
import { createAlipayNativePayment, openHuifuAlipayWithSdk, type AlipayAttempt, type AlipayOrderState, type AlipayView } from '@/utils/huifu-alipay-native'

declare const plus: {
  os: { name: string }
  android?: { importClass(name: string): any; runtimeMainActivity(): unknown; implements(name: string, methods: Record<string, (...args: any[]) => void>): unknown }
  runtime: { openURL(url: string, failed: () => void): void }
}
const props = defineProps<{ orderId: string; amount: string }>()
const emit = defineEmits<{ (event: 'back'): void; (event: 'paid', order: AlipayOrderState): void }>()
const view = ref<AlipayView>({ phase: 'ready', busy: false, canOpen: false, message: '正在准备付款…' })
const displayAmount = ref('')
const owner = String(getUserInfo<{ id?: string }>()?.id || '')
// rebu: 前缀随账号退出清理；不同用户和订单分别保存，重新进入仍复用原支付。
const storageKey = `rebu:huifu-alipay:${owner}:${props.orderId}`
let timer: ReturnType<typeof setTimeout> | null = null
let stopped = false
let visible = true
let polls = 0
function sameOwner() { return Boolean(owner) && owner === String(getUserInfo<{ id?: string }>()?.id || '') }
function assertOwner() { if (!sameOwner()) throw new Error('登录状态已变化，请重新进入订单') }
const flow = createAlipayNativePayment({
  orderId: props.orderId,
  platform: typeof plus === 'undefined' ? '' : plus.os.name,
  async readOrder(fresh = false) {
    assertOwner()
    const order = await apiGet<AlipayOrderState>(`/shop/orders/${encodeURIComponent(props.orderId)}${fresh ? '/current' : ''}`)
    assertOwner()
    if (order.id !== props.orderId || !Number.isFinite(Number(order.amount)) || Number(order.amount) < 0) throw new Error('订单信息无效')
    displayAmount.value = Number(order.amount).toFixed(2)
    return order
  },
  createPayment: async () => { assertOwner(); const result = await purchaseApi.payByChannel(props.orderId, 'alipay'); assertOwner(); return result },
  queryPayment: async (outTradeNo) => { assertOwner(); const result = await purchaseApi.queryHuifuPayment(outTradeNo); assertOwner(); return result },
  load: () => { assertOwner(); return (uni.getStorageSync(storageKey) || null) as AlipayAttempt | null },
  save: (attempt) => {
    assertOwner()
    uni.setStorageSync(storageKey, attempt)
    if (JSON.stringify(uni.getStorageSync(storageKey)) !== JSON.stringify(attempt)) throw new Error('支付记录保存失败')
  },
  openUrl: (_url, failed) => {
    assertOwner()
    if (visible && !stopped) openHuifuAlipayWithSdk(attemptQrCode(), plus, failed, () => { if (visible && !stopped) void check() })
  },
  update: (next) => { if (sameOwner() && !stopped) view.value = next },
  paid: (order) => { assertOwner(); pause(); emit('paid', order) },
  now: () => Date.now(),
  active: () => visible && !stopped && sameOwner(),
})
function attemptQrCode(): string {
  const saved = uni.getStorageSync(storageKey) as AlipayAttempt | null
  return String(saved?.qrCode || '')
}
function pause() {
  visible = false
  if (timer) clearTimeout(timer)
  timer = null
}
function schedule() {
  if (stopped || !visible || !sameOwner() || timer || polls >= 70 || ['success', 'closed', 'unsupported'].includes(view.value.phase)) return
  timer = setTimeout(async () => {
    timer = null
    polls++
    await flow.check()
    schedule()
  }, 3000)
}
async function check() { await flow.check(); schedule() }
async function reopen() { await flow.reopen(); polls = 0; schedule() }
async function resume() {
  if (stopped) return
  if (!sameOwner()) { pause(); view.value = { phase: 'closed', busy: false, canOpen: false, message: '登录状态已变化，请返回订单重新进入' }; return }
  visible = true
  polls = 0
  await check()
}
function leave() { stopped = true; pause(); flow.dispose(); emit('back') }
onMounted(async () => { await flow.start(); schedule() })
onUnmounted(() => { stopped = true; pause(); flow.dispose() })
defineExpose({ resume, pause })
</script>

<style scoped>
.alipay-payment { min-height: 100vh; background: #FAF8F5; }
.alipay-payment__body { padding: 120rpx 48rpx; display: flex; flex-direction: column; align-items: center; gap: 32rpx; }
.alipay-payment__title { font-size: 40rpx; font-weight: 600; color: #2C2C2C; }
.alipay-payment__amount { font-size: 48rpx; color: var(--brand); }
.alipay-payment__message { font-size: 28rpx; color: #666; text-align: center; line-height: 1.7; }
.alipay-payment__body button { width: 100%; font-size: 28rpx; background: #1677FF; color: #fff; border-radius: 18rpx; }
.alipay-payment__body button[disabled] { opacity: .5; }
.alipay-payment__body .alipay-payment__back { background: #fff; color: #666; }
</style>
