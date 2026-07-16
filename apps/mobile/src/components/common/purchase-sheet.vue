<template>
  <!-- 通用购买半屏弹窗：圈子付费/课程/商品共用。选规格→选数量→选支付→确认下单 -->
  <view v-if="open && product" class="ps-mask" @tap="onClose">
    <view class="ps-sheet" @tap.stop>
      <!-- 下单成功态 -->
      <view v-if="paid" class="ps-paid">
        <view class="ps-paid__icon">
          <AppIcon name="check" :size="32" color="#fff" />
        </view>
        <text class="ps-paid__title">订单已提交</text>
        <text class="ps-paid__sub">{{ paidSub }}</text>
      </view>

      <template v-else>
        <!-- 头部：商品信息 -->
        <view class="ps-head">
          <smart-cover class="ps-head__img" :src="product.cover" :title="product.name" type="product" deco :deco-size="40" />
          <view class="ps-head__info">
            <text class="ps-head__name">{{ product.name }}</text>
            <view class="ps-head__price-row">
              <text class="ps-head__price">¥{{ product.price }}</text>
              <text v-if="product.originalPrice && product.originalPrice > product.price" class="ps-head__origin">¥{{ product.originalPrice }}</text>
            </view>
            <text v-if="product.stock !== undefined" class="ps-head__stock">库存 {{ product.stock }} 件</text>
          </view>
          <view class="ps-head__close" @tap="onClose">
            <AppIcon name="x" :size="20" color="#999" />
          </view>
        </view>

        <scroll-view scroll-y class="ps-body">
          <!-- 规格选择 -->
          <view v-if="hasSku" class="ps-section">
            <text class="ps-section__label">选择规格</text>
            <view class="ps-sku-list">
              <view
                v-for="sku in product.skus"
                :key="sku"
                class="ps-sku"
                :class="{ 'ps-sku--on': selectedSku === sku }"
                @tap="onSelectSku(sku)"
              >
                <text class="ps-sku__txt">{{ sku }}</text>
              </view>
            </view>
          </view>

          <!-- 数量选择 -->
          <view v-if="allowQty" class="ps-qty">
            <text class="ps-section__label">购买数量</text>
            <view class="ps-qty__ctrl">
              <view class="ps-qty__btn" :class="{ 'ps-qty__btn--off': quantity <= 1 }" @tap="onMinus">
                <AppIcon name="minus" :size="16" color="#333" />
              </view>
              <text class="ps-qty__num">{{ quantity }}</text>
              <view class="ps-qty__btn" @tap="onPlus">
                <AppIcon name="plus" :size="16" color="#333" />
              </view>
            </view>
          </view>

          <!-- 支付方式 -->
          <view class="ps-section">
            <text class="ps-section__label">支付方式</text>
            <view class="ps-pay-list">
              <view
                v-for="m in payMethods"
                :key="m.id"
                class="ps-pay"
                :class="{ 'ps-pay--on': payMethod === m.id }"
                @tap="onSelectPay(m.id)"
              >
                <view class="ps-pay__left">
                  <view class="ps-pay__badge" :style="{ backgroundColor: m.color }">
                    <text class="ps-pay__badge-txt">{{ m.badge }}</text>
                  </view>
                  <text class="ps-pay__name">{{ m.name }}</text>
                </view>
                <view class="ps-pay__radio" :class="{ 'ps-pay__radio--on': payMethod === m.id }">
                  <AppIcon v-if="payMethod === m.id" name="check" :size="12" color="#fff" />
                </view>
              </view>
            </view>
          </view>
        </scroll-view>

        <!-- 底部：合计 + 确认下单 -->
        <view class="ps-foot">
          <view class="ps-foot__tip">
            <AppIcon name="shield-check" :size="14" color="#22c55e" />
            <text class="ps-foot__tip-txt">{{ tipText }}</text>
          </view>
          <view class="ps-foot__row">
            <view class="ps-foot__total">
              <text class="ps-foot__total-label">合计</text>
              <view class="ps-foot__total-val">
                <text class="ps-foot__total-sym">¥</text>
                <text class="ps-foot__total-num">{{ total }}</text>
              </view>
            </view>
            <view
              class="ps-foot__pay"
              :class="{ 'ps-foot__pay--off': paying || (hasSku && !selectedSku) }"
              @tap="onPay"
            >
              <text class="ps-foot__pay-txt">{{ payButtonText }}</text>
            </view>
          </view>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import { navigateTo } from '@/utils/router'
import { purchaseApi, type PurchaseProduct, type PurchaseBizType, type PayChannel } from '@/lib/purchase-data'

const props = withDefaults(defineProps<{
  open: boolean
  product: PurchaseProduct | null
  /** 业务类型：商品/课程/圈子... */
  bizType: PurchaseBizType
  /** 是否允许选数量（商品 true；课程/圈子通常 false，固定 1 份） */
  allowQty?: boolean
}>(), { allowQty: true })

const emit = defineEmits<{ (e: 'close'): void; (e: 'paid', orderId: string): void }>()

const ALL_PAY_METHODS = [
  { id: 'wechat', name: '微信支付', badge: '微', color: '#07C160' },
  { id: 'alipay', name: '支付宝', badge: '支', color: '#1677FF' },
  { id: 'unionpay', name: '云闪付', badge: '云', color: '#C41E3A' },
] as const
// 圈子/会员入圈只支持微信、支付宝现金（不含虚拟币/云闪付）；商品、课程支持全渠道
const payMethods = computed(() =>
  props.bizType === 'CIRCLE' || props.bizType === 'MEMBER'
    ? ALL_PAY_METHODS.filter((m) => m.id !== 'unionpay')
    : ALL_PAY_METHODS,
)

// ===== UI 状态 =====
const selectedSku = ref<string | null>(null)
const quantity = ref(1)
const payMethod = ref<string>('wechat')
const paying = ref(false)
const paid = ref(false)
const paidSub = ref('请在订单中心完成支付')

const hasSku = computed(() => !!props.product?.skus && props.product.skus.length > 0)
// 金额乘法用 Math.round(×100)/100 消除浮点误差(如 19.9×3=59.699999...)，避免小数点多位
const total = computed(() => (props.product ? Math.round(props.product.price * quantity.value * 100) / 100 : 0))
const tipText = computed(() => (props.bizType === 'PRODUCT' ? '正品保障 · 7天无理由退换' : '官方正版 · 购买后立即可用'))
const payButtonText = computed(() => {
  if (paying.value) return '提交中…'
  if (hasSku.value && !selectedSku.value) return '请选择规格'
  return '确认下单'
})

// ===== 交互 =====
function onSelectSku(sku: string) { selectedSku.value = sku }
function onSelectPay(id: string) { payMethod.value = id }
function onMinus() { if (quantity.value > 1) quantity.value-- }
function onPlus() {
  const max = props.product?.stock ?? 99
  if (quantity.value < max) quantity.value++
}
function reset() {
  selectedSku.value = null
  quantity.value = 1
  payMethod.value = 'wechat'
  paying.value = false
  paid.value = false
}
function onClose() {
  reset()
  emit('close')
}

/**
 * 确认下单（2026-07-16 真支付接线）：
 * - 微信渠道 → 创建订单后跳统一收银页 /pkg-shop/paying（微信内公众号JSAPI/外部浏览器mweb/小程序requestPayment
 *   全端真支付+轮询到账，圈子/课程订单与商品同在 Order 表，pay/jsapi 可直接支付）。
 * - 支付宝/云闪付 → 仍走汇付聚合；未接通时**诚实降级**引导订单中心，
 *   不再吞异常后显示"成功"绿勾（原实现会误导用户以为已付款，实际订单还是 PENDING）。
 */
async function onPay() {
  if (paying.value || !props.product) return
  if (hasSku.value && !selectedSku.value) return
  paying.value = true
  try {
    const channel = payMethod.value as PayChannel
    const order = await purchaseApi.createOrder({
      type: props.bizType,
      targetId: String(props.product.id),
      amount: props.allowQty ? quantity.value : 1,
      skuId: selectedSku.value || undefined,
      channel,
    })
    if (channel === 'wechat') {
      // 真支付：跳统一收银页（到账由支付回调驱动，入圈/开课等后处理自动完成）
      const payAmount = Number(order.amount ?? total.value) || total.value
      onClose()
      navigateTo(`/pkg-shop/paying?orderId=${order.id}&method=wechat&amount=${payAmount}`)
      return
    }
    // 支付宝/云闪付：汇付聚合通道
    try {
      const pay = await purchaseApi.payByChannel(order.id, channel)
      const jumpUrl = pay?.h5Url || pay?.payUrl
      // #ifdef H5
      if (jumpUrl) { window.location.href = jumpUrl; return }
      // #endif
      if (pay?.qrCode || pay?.codeUrl) {
        paidSub.value = '请使用所选方式扫码完成支付'
        paid.value = true
        setTimeout(() => { emit('paid', order.id); onClose() }, 1800)
        return
      }
    } catch { /* 聚合支付未接通 → 走下方诚实降级 */ }
    // 诚实降级：订单已创建但支付未发起，引导订单中心继续支付（不显示成功态）
    uni.showToast({ title: '订单已创建，请到「我的-我的订单」完成支付', icon: 'none', duration: 3000 })
    onClose()
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '下单失败，请重试', icon: 'none' })
    paying.value = false
  }
}
</script>

<style scoped>
.ps-mask { position: fixed; inset: 0; z-index: 60; background: rgba(0, 0, 0, 0.6); display: flex; flex-direction: column; justify-content: flex-end; }
.ps-sheet { position: relative; background: #fff; border-radius: 32rpx 32rpx 0 0; max-height: 82vh; display: flex; flex-direction: column; }

/* 成功态 */
.ps-paid { padding: 96rpx 48rpx; display: flex; flex-direction: column; align-items: center; }
.ps-paid__icon { width: 128rpx; height: 128rpx; border-radius: 50%; background: #22c55e; display: flex; align-items: center; justify-content: center; margin-bottom: 32rpx; }
.ps-paid__title { font-size: 34rpx; font-weight: 600; color: #1a1a1a; }
.ps-paid__sub { font-size: 26rpx; color: #999; margin-top: 8rpx; }

/* 头部 */
.ps-head { position: relative; padding: 32rpx; border-bottom: 1px solid #f0f0f0; display: flex; gap: 24rpx; }
.ps-head__img { width: 160rpx; height: 160rpx; border-radius: 20rpx; flex-shrink: 0; background: #f5f5f5; }
.ps-head__info { flex: 1; min-width: 0; }
.ps-head__name { font-size: 28rpx; color: #1a1a1a; line-height: 1.4; display: block; padding-right: 48rpx; }
.ps-head__price-row { display: flex; align-items: baseline; gap: 16rpx; margin-top: 16rpx; }
.ps-head__price { color: var(--brand); font-size: 40rpx; font-weight: 700; }
.ps-head__origin { color: #999; font-size: 24rpx; text-decoration: line-through; }
.ps-head__stock { font-size: 22rpx; color: #999; margin-top: 8rpx; display: block; }
.ps-head__close { position: absolute; top: 32rpx; right: 32rpx; }

/* body */
.ps-body { flex: 1; max-height: 50vh; }
.ps-section { padding: 32rpx; border-bottom: 1px solid #f0f0f0; }
.ps-section__label { font-size: 28rpx; font-weight: 500; color: #1a1a1a; display: block; margin-bottom: 20rpx; }
.ps-sku-list { display: flex; flex-wrap: wrap; gap: 16rpx; }
.ps-sku { padding: 16rpx 32rpx; border-radius: 12rpx; border: 1px solid #e5e5e5; }
.ps-sku--on { border-color: var(--brand); background: rgba(196, 30, 58, 0.05); }
.ps-sku__txt { font-size: 26rpx; color: #333; }
.ps-sku--on .ps-sku__txt { color: var(--brand); font-weight: 500; }

/* 数量 */
.ps-qty { padding: 32rpx; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center; justify-content: space-between; }
.ps-qty__ctrl { display: flex; align-items: center; gap: 24rpx; }
.ps-qty__btn { width: 56rpx; height: 56rpx; border-radius: 50%; border: 1px solid #e5e5e5; display: flex; align-items: center; justify-content: center; }
.ps-qty__btn--off { opacity: 0.4; }
.ps-qty__num { font-size: 30rpx; font-weight: 600; color: #1a1a1a; min-width: 48rpx; text-align: center; }

/* 支付方式 */
.ps-pay-list { display: flex; flex-direction: column; gap: 16rpx; }
.ps-pay { display: flex; align-items: center; justify-content: space-between; padding: 20rpx; border-radius: 12rpx; border: 1px solid #e5e5e5; }
.ps-pay--on { border-color: var(--brand); background: rgba(196, 30, 58, 0.05); }
.ps-pay__left { display: flex; align-items: center; gap: 20rpx; }
.ps-pay__badge { width: 56rpx; height: 56rpx; border-radius: 10rpx; display: flex; align-items: center; justify-content: center; }
.ps-pay__badge-txt { color: #fff; font-size: 24rpx; font-weight: 700; }
.ps-pay__name { font-size: 28rpx; color: #1a1a1a; }
.ps-pay__radio { width: 40rpx; height: 40rpx; border-radius: 50%; border: 2rpx solid #ccc; display: flex; align-items: center; justify-content: center; }
.ps-pay__radio--on { border-color: var(--brand); background: var(--brand); }

/* 底部 */
.ps-foot { padding: 32rpx; border-top: 1px solid #f0f0f0; padding-bottom: calc(32rpx + env(safe-area-inset-bottom)); }
.ps-foot__tip { display: flex; align-items: center; gap: 8rpx; margin-bottom: 24rpx; }
.ps-foot__tip-txt { font-size: 22rpx; color: #999; }
.ps-foot__row { display: flex; align-items: center; gap: 24rpx; }
.ps-foot__total { flex-shrink: 0; }
.ps-foot__total-label { font-size: 22rpx; color: #999; display: block; }
.ps-foot__total-val { display: flex; align-items: baseline; gap: 2rpx; }
.ps-foot__total-sym { color: var(--brand); font-size: 26rpx; font-weight: 700; }
.ps-foot__total-num { color: var(--brand); font-size: 48rpx; font-weight: 700; }
.ps-foot__pay { flex: 1; padding: 28rpx 0; background: var(--brand); border-radius: 999rpx; display: flex; align-items: center; justify-content: center; }
.ps-foot__pay--off { opacity: 0.5; }
.ps-foot__pay-txt { color: #fff; font-size: 30rpx; font-weight: 600; }
</style>
