<template>
  <view class="alipay-payment">
    <app-nav-bar title="支付宝付款" custom-back @back="leave" />
    <view class="alipay-payment__body">
      <text class="alipay-payment__title">{{ view.phase === 'success' ? '支付成功' : '等待支付' }}</text>
      <text class="alipay-payment__amount">¥{{ displayAmount }}</text>
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
import { createAlipayNativePayment, type AlipayAttempt, type AlipayOrderState, type AlipayView } from '@/utils/huifu-alipay-native'

declare const plus: { os: { name: string }; runtime: { openURL(url: string, failed: () => void): void } }
const props = defineProps<{ orderId: string; amount: string }>()
const emit = defineEmits<{ (event: 'back'): void; (event: 'paid', order: AlipayOrderState): void }>()
const view = ref<AlipayView>({ phase: 'ready', busy: false, canOpen: false, message: '正在准备付款…' })
const displayAmount = ref(props.amount)
const owner = String(getUserInfo<{ id?: string }>()?.id || '')
// rebu: 前缀随账号退出清理；不同用户和订单分别保存，重新进入仍复用原支付。
const storageKey = `rebu:huifu-alipay:${owner}:${props.orderId}`
let timer: ReturnType<typeof setTimeout> | null = null
let stopped = false
let visible = true
let polls = 0
const flow = createAlipayNativePayment({
  orderId: props.orderId,
  platform: typeof plus === 'undefined' ? '' : plus.os.name,
  async readOrder() {
    const currentOwner = String(getUserInfo<{ id?: string }>()?.id || '')
    if (!owner || owner !== currentOwner) throw new Error('登录状态已变化')
    const order = await apiGet<AlipayOrderState & { amount?: number | string }>(`/shop/orders/${encodeURIComponent(props.orderId)}`)
    if (order.amount !== undefined) displayAmount.value = String(order.amount)
    return order
  },
  createPayment: () => purchaseApi.payByChannel(props.orderId, 'alipay'),
  queryPayment: (outTradeNo) => purchaseApi.queryHuifuPayment(outTradeNo),
  load: () => (uni.getStorageSync(storageKey) || null) as AlipayAttempt | null,
  save: (attempt) => uni.setStorageSync(storageKey, attempt),
  openUrl: (url, failed) => plus.runtime.openURL(url, failed),
  update: (next) => { view.value = next },
  paid: (order) => { pause(); emit('paid', order) },
  now: () => Date.now(),
  active: () => visible && !stopped,
})
function pause() {
  visible = false
  if (timer) clearTimeout(timer)
  timer = null
}
function schedule() {
  if (stopped || !visible || timer || polls >= 70 || ['success', 'closed', 'unsupported'].includes(view.value.phase)) return
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
  visible = true
  polls = 0
  await check()
}
function leave() { pause(); emit('back') }
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
