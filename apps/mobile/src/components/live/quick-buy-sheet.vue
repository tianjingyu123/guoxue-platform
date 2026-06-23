<template>
  <!-- 直播间「立即购买」半屏确认订单：选规格→选数量→选支付→确认支付→返回直播间 -->
  <view v-if="open && product" class="qbs-mask" @tap="onClose">
    <view class="qbs-sheet" @tap.stop>
      <!-- 支付成功态 -->
      <view v-if="paid" class="qbs-paid">
        <view class="qbs-paid__icon">
          <AppIcon name="check" :size="32" color="#fff" />
        </view>
        <text class="qbs-paid__title">支付成功</text>
        <text class="qbs-paid__sub">正在返回直播间继续观看…</text>
      </view>

      <template v-else>
        <!-- 头部：商品信息 -->
        <view class="qbs-head">
          <image class="qbs-head__img" :src="product.cover" mode="aspectFill" />
          <view class="qbs-head__info">
            <text class="qbs-head__name">{{ product.name }}</text>
            <view class="qbs-head__price-row">
              <text class="qbs-head__price">¥{{ product.price }}</text>
              <text class="qbs-head__origin">¥{{ product.originalPrice }}</text>
            </view>
            <text v-if="product.stock !== undefined" class="qbs-head__stock">库存 {{ product.stock }} 件</text>
          </view>
          <view class="qbs-head__close" @tap="onClose">
            <AppIcon name="x" :size="20" color="#999" />
          </view>
        </view>

        <scroll-view scroll-y class="qbs-body">
          <!-- 规格选择 -->
          <view v-if="hasSku" class="qbs-section">
            <text class="qbs-section__label">选择规格</text>
            <view class="qbs-sku-list">
              <view
                v-for="sku in product.skus"
                :key="sku"
                class="qbs-sku"
                :class="{ 'qbs-sku--on': selectedSku === sku }"
                @tap="onSelectSku(sku)"
              >
                <text class="qbs-sku__txt">{{ sku }}</text>
              </view>
            </view>
          </view>

          <!-- 数量选择 -->
          <view class="qbs-qty">
            <text class="qbs-section__label">购买数量</text>
            <view class="qbs-qty__ctrl">
              <view class="qbs-qty__btn" :class="{ 'qbs-qty__btn--off': quantity <= 1 }" @tap="onMinus">
                <AppIcon name="minus" :size="16" color="#333" />
              </view>
              <text class="qbs-qty__num">{{ quantity }}</text>
              <view class="qbs-qty__btn" @tap="onPlus">
                <AppIcon name="plus" :size="16" color="#333" />
              </view>
            </view>
          </view>

          <!-- 支付方式 -->
          <view class="qbs-section">
            <text class="qbs-section__label">支付方式</text>
            <view class="qbs-pay-list">
              <view
                v-for="m in payMethods"
                :key="m.id"
                class="qbs-pay"
                :class="{ 'qbs-pay--on': payMethod === m.id }"
                @tap="onSelectPay(m.id)"
              >
                <view class="qbs-pay__left">
                  <view class="qbs-pay__badge" :style="{ backgroundColor: m.color }">
                    <text class="qbs-pay__badge-txt">{{ m.badge }}</text>
                  </view>
                  <text class="qbs-pay__name">{{ m.name }}</text>
                </view>
                <view class="qbs-pay__radio" :class="{ 'qbs-pay__radio--on': payMethod === m.id }">
                  <AppIcon v-if="payMethod === m.id" name="check" :size="12" color="#fff" />
                </view>
              </view>
            </view>
          </view>
        </scroll-view>

        <!-- 底部：合计 + 确认支付 -->
        <view class="qbs-foot">
          <view class="qbs-foot__tip">
            <AppIcon name="shield-check" :size="14" color="#22c55e" />
            <text class="qbs-foot__tip-txt">正品保障 · 支付后自动返回直播间</text>
          </view>
          <view class="qbs-foot__row">
            <view class="qbs-foot__total">
              <text class="qbs-foot__total-label">合计</text>
              <view class="qbs-foot__total-val">
                <text class="qbs-foot__total-sym">¥</text>
                <text class="qbs-foot__total-num">{{ total }}</text>
              </view>
            </view>
            <view
              class="qbs-foot__pay"
              :class="{ 'qbs-foot__pay--off': paying || (hasSku && !selectedSku) }"
              @tap="onPay"
            >
              <text class="qbs-foot__pay-txt">{{ payButtonText }}</text>
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

export interface QuickBuyProduct {
  id: string
  name: string
  cover: string
  price: number
  originalPrice: number
  stock?: number
  sold?: number
  skus?: string[]
}

const props = defineProps<{ open: boolean; product: QuickBuyProduct | null }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'paid', product: QuickBuyProduct, sku: string | null, quantity: number): void }>()

const payMethods = [
  { id: 'wechat', name: '微信支付', badge: '微', color: '#07C160' },
  { id: 'alipay', name: '支付宝', badge: '支', color: '#1677FF' },
  { id: 'unionpay', name: '云闪付', badge: '云', color: '#C41E3A' },
  { id: 'huifu', name: '汇付天下', badge: '汇', color: '#f59e0b' },
] as const

// ===== UI 状态 =====
const selectedSku = ref<string | null>(null)
const quantity = ref(1)
const payMethod = ref<string>('wechat')
const paying = ref(false)
const paid = ref(false)

const hasSku = computed(() => !!props.product?.skus && props.product.skus.length > 0)
const total = computed(() => (props.product ? props.product.price * quantity.value : 0))
const payButtonText = computed(() => {
  if (paying.value) return '支付中…'
  if (hasSku.value && !selectedSku.value) return '请选择规格'
  return '确认支付'
})

// ===== 交互（UI 状态切换；真实支付逻辑由 Claude Code 对接）=====
function onSelectSku(sku: string) { selectedSku.value = sku }
function onSelectPay(id: string) { payMethod.value = id }
function onMinus() { if (quantity.value > 1) quantity.value-- }
function onPlus() {
  const max = props.product?.stock ?? 99
  if (quantity.value < max) quantity.value++
}
function onClose() {
  selectedSku.value = null
  quantity.value = 1
  payMethod.value = 'wechat'
  paying.value = false
  paid.value = false
  emit('close')
}
// @data-needs: 直播间下单+支付接口，入参 productId/sku/quantity/payMethod；
// 成功后置 paid=true，延时回调 onPaid 返回直播间
function onPay() {}
</script>

<style scoped>
.qbs-mask {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.qbs-sheet {
  position: relative;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  max-height: 82vh;
  display: flex;
  flex-direction: column;
}

/* 支付成功态 */
.qbs-paid {
  padding: 96rpx 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.qbs-paid__icon {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: #22c55e;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.qbs-paid__title {
  font-size: 34rpx;
  font-weight: 600;
  color: #1a1a1a;
}
.qbs-paid__sub {
  font-size: 26rpx;
  color: #999;
  margin-top: 8rpx;
}

/* 头部 */
.qbs-head {
  position: relative;
  padding: 32rpx;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  gap: 24rpx;
}
.qbs-head__img {
  width: 160rpx;
  height: 160rpx;
  border-radius: 20rpx;
  flex-shrink: 0;
  background: #f5f5f5;
}
.qbs-head__info {
  flex: 1;
  min-width: 0;
}
.qbs-head__name {
  font-size: 28rpx;
  color: #1a1a1a;
  line-height: 1.4;
  display: block;
  padding-right: 48rpx;
}
.qbs-head__price-row {
  display: flex;
  align-items: baseline;
  gap: 16rpx;
  margin-top: 16rpx;
}
.qbs-head__price {
  color: #C41E3A;
  font-size: 40rpx;
  font-weight: 700;
}
.qbs-head__origin {
  color: #999;
  font-size: 24rpx;
  text-decoration: line-through;
}
.qbs-head__stock {
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
  display: block;
}
.qbs-head__close {
  position: absolute;
  top: 32rpx;
  right: 32rpx;
}

/* body */
.qbs-body {
  flex: 1;
  max-height: 50vh;
}
.qbs-section {
  padding: 32rpx;
  border-bottom: 1px solid #f0f0f0;
}
.qbs-section__label {
  font-size: 28rpx;
  font-weight: 500;
  color: #1a1a1a;
  display: block;
  margin-bottom: 20rpx;
}
.qbs-sku-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.qbs-sku {
  padding: 16rpx 32rpx;
  border-radius: 12rpx;
  border: 1px solid #e5e5e5;
}
.qbs-sku--on {
  border-color: #C41E3A;
  background: rgba(196, 30, 58, 0.05);
}
.qbs-sku__txt {
  font-size: 26rpx;
  color: #333;
}
.qbs-sku--on .qbs-sku__txt {
  color: #C41E3A;
  font-weight: 500;
}

/* 数量 */
.qbs-qty {
  padding: 32rpx;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.qbs-qty__ctrl {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.qbs-qty__btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  border: 1px solid #e5e5e5;
  display: flex;
  align-items: center;
  justify-content: center;
}
.qbs-qty__btn--off {
  opacity: 0.4;
}
.qbs-qty__num {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
  min-width: 48rpx;
  text-align: center;
}

/* 支付方式 */
.qbs-pay-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.qbs-pay {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx;
  border-radius: 12rpx;
  border: 1px solid #e5e5e5;
}
.qbs-pay--on {
  border-color: #C41E3A;
  background: rgba(196, 30, 58, 0.05);
}
.qbs-pay__left {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.qbs-pay__badge {
  width: 56rpx;
  height: 56rpx;
  border-radius: 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.qbs-pay__badge-txt {
  color: #fff;
  font-size: 24rpx;
  font-weight: 700;
}
.qbs-pay__name {
  font-size: 28rpx;
  color: #1a1a1a;
}
.qbs-pay__radio {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
}
.qbs-pay__radio--on {
  border-color: #C41E3A;
  background: #C41E3A;
}

/* 底部 */
.qbs-foot {
  padding: 32rpx;
  border-top: 1px solid #f0f0f0;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
}
.qbs-foot__tip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 24rpx;
}
.qbs-foot__tip-txt {
  font-size: 22rpx;
  color: #999;
}
.qbs-foot__row {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.qbs-foot__total {
  flex-shrink: 0;
}
.qbs-foot__total-label {
  font-size: 22rpx;
  color: #999;
  display: block;
}
.qbs-foot__total-val {
  display: flex;
  align-items: baseline;
  gap: 2rpx;
}
.qbs-foot__total-sym {
  color: #C41E3A;
  font-size: 26rpx;
  font-weight: 700;
}
.qbs-foot__total-num {
  color: #C41E3A;
  font-size: 48rpx;
  font-weight: 700;
}
.qbs-foot__pay {
  flex: 1;
  padding: 28rpx 0;
  background: #C41E3A;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.qbs-foot__pay--off {
  opacity: 0.5;
}
.qbs-foot__pay-txt {
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
}
</style>
