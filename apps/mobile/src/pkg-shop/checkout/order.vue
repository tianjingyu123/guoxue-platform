<template>
  <view class="checkout">
    <app-nav-bar title="确认订单" :back-size="40" :title-size="36" :bar-height="106" />

    <!-- 加载态 -->
    <view v-if="loading" class="loading-zone">
      <view class="sk-addr" />
      <view class="sk-goods" />
      <view class="sk-row" />
      <view class="sk-row" />
    </view>

    <!-- 错误态 -->
    <view v-else-if="error" class="error-zone">
      <text class="error-text">{{ error }}</text>
      <view class="error-retry" @tap="fetchCheckoutData()"><text>重试</text></view>
    </view>

    <template v-else>
    <scroll-view scroll-y class="content">
      <!-- 地址 -->
      <view class="address-card" @tap="showAddress = true">
        <app-icon name="map-pin" :size="40" color="#C41E3A" />
        <view class="address-info" v-if="currentAddress">
          <view class="addr-top">
            <text class="addr-name">{{ currentAddress.name }}</text>
            <text class="addr-phone">{{ currentAddress.phone }}</text>
            <view v-if="currentAddress.isDefault" class="default-tag"><text>默认</text></view>
          </view>
          <text class="addr-detail">{{ currentAddress.province }}{{ currentAddress.city }}{{ currentAddress.district }}{{ currentAddress.address }}</text>
        </view>
        <app-icon name="chevron-right" :size="32" color="#CCCCCC" />
      </view>

      <!-- 商品 -->
      <view class="goods-card">
        <view v-for="g in items" :key="g.id" class="goods-item">
          <image class="goods-img" :src="g.productCover" mode="aspectFill" />
          <view class="goods-info">
            <text class="goods-name">{{ g.productName }}</text>
            <view class="sku-tag"><text>{{ g.skuName }}</text></view>
            <view class="goods-bottom">
              <text class="goods-price">¥{{ g.price }}</text>
              <text class="goods-qty">x{{ g.quantity }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 优惠券 -->
      <view class="cell" @tap="showCoupon = true">
        <text class="cell-label">优惠券</text>
        <text class="cell-value" :class="{ active: selectedCoupon }">{{ selectedCoupon ? '-¥' + selectedCoupon.value : '请选择' }}</text>
        <app-icon name="chevron-right" :size="32" color="#CCCCCC" />
      </view>

      <!-- 发票 -->
      <view class="invoice-card">
        <view class="invoice-head" @tap="showInvoice = !showInvoice">
          <text class="cell-label">发票</text>
          <text class="cell-value active">{{ currentInvoice.label }}</text>
          <app-icon :name="showInvoice ? 'chevron-down' : 'chevron-right'" :size="32" color="#CCCCCC" />
        </view>
        <view v-if="showInvoice" class="invoice-options">
          <view v-for="opt in invoiceOptions" :key="opt.value" class="invoice-option" @tap="selectInvoice(opt)">
            <view class="invoice-info">
              <text class="io-label">{{ opt.label }}</text>
              <text class="io-desc">{{ opt.desc }}</text>
            </view>
            <view class="radio" :class="{ checked: invoice === opt.value }"><view v-if="invoice === opt.value" class="radio-dot" /></view>
          </view>
        </view>
      </view>

      <!-- 订单备注 -->
      <view class="cell column">
        <text class="cell-label">订单备注</text>
        <input class="note-input" v-model="note" placeholder="选填，给商家留言" placeholder-class="ph" />
      </view>

      <!-- 支付方式 -->
      <view class="pay-card">
        <text class="pay-title">支付方式</text>
        <view v-for="m in payMethods" :key="m.id" class="pay-item" @tap="payMethod = m.id">
          <view class="pay-badge" :style="{ background: m.badgeColor }"><text>{{ m.badge }}</text></view>
          <text class="pay-name">{{ m.name }}</text>
          <view class="radio" :class="{ checked: payMethod === m.id }"><view v-if="payMethod === m.id" class="radio-dot" /></view>
        </view>
      </view>

      <!-- 金额明细 -->
      <view class="amount-card">
        <view class="amount-row"><text>商品金额</text><text>¥{{ goodsTotal }}</text></view>
        <view class="amount-row"><text>运费</text><text>¥0</text></view>
        <view class="amount-row" v-if="selectedCoupon"><text>优惠券</text><text class="discount">-¥{{ selectedCoupon.value }}</text></view>
        <view class="amount-row total"><text>实付款</text><text class="pay-amount">¥{{ payTotal }}</text></view>
      </view>
      <view style="height: 140rpx;" />
    </scroll-view>

    <view class="footer">
      <view class="footer-total"><text class="ft-label">实付</text><text class="ft-amount">¥{{ payTotal }}</text></view>
      <view class="pay-btn" @tap="submitOrder"><text>提交订单</text></view>
    </view>

    <!-- 地址选择 -->
    <view v-if="showAddress" class="mask" @tap="showAddress = false">
      <view class="sheet" @tap.stop>
        <text class="sheet-title">选择收货地址</text>
        <view v-for="a in addresses" :key="a.id" class="addr-option" @tap="selectAddress(a)">
          <view class="addr-option-info">
            <view class="addr-top"><text class="addr-name">{{ a.name }}</text><text class="addr-phone">{{ a.phone }}</text></view>
            <text class="addr-detail">{{ a.province }}{{ a.city }}{{ a.district }}{{ a.address }}</text>
          </view>
          <app-icon v-if="currentAddress && currentAddress.id === a.id" name="check" :size="36" color="#C41E3A" />
        </view>
      </view>
    </view>

    <!-- 优惠券选择 -->
    <view v-if="showCoupon" class="mask" @tap="showCoupon = false">
      <view class="sheet" @tap.stop>
        <text class="sheet-title">选择优惠券</text>
        <view class="coupon-option" @tap="selectCoupon(null)">
          <text>不使用优惠券</text>
          <view class="radio" :class="{ checked: !selectedCoupon }"><view v-if="!selectedCoupon" class="radio-dot" /></view>
        </view>
        <view v-for="c in coupons" :key="c.id" class="coupon-option" @tap="selectCoupon(c)">
          <view><text class="co-name">{{ c.name }} -¥{{ c.value }}</text><text class="co-min">满{{ c.minAmount }}可用</text></view>
          <view class="radio" :class="{ checked: selectedCoupon && selectedCoupon.id === c.id }"><view v-if="selectedCoupon && selectedCoupon.id === c.id" class="radio-dot" /></view>
        </view>
      </view>
    </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { redirectTo } from '@/utils/router'
import { shopApi, type ShippingAddress, type CheckoutCoupon } from '@/lib/shop-data'

const loading = ref(true)
const error = ref('')
const items = ref<any[]>([])
const addresses = ref<any[]>([])
const coupons = ref<any[]>([])
const payMethods = ref<any[]>([])
const invoiceOptions = ref<any[]>([])
const currentAddress = ref<ShippingAddress | null>(null)
const selectedCoupon = ref<CheckoutCoupon | null>(null)
const payMethod = ref('wechat')
const invoice = ref('none')
const note = ref('')
const showAddress = ref(false)
const showCoupon = ref(false)
const showInvoice = ref(false)
const submitting = ref(false)

const currentInvoice = computed(() => invoiceOptions.value.find((o: any) => o.value === invoice.value) || invoiceOptions.value[0])
const goodsTotal = computed(() => items.value.reduce((s: number, i: any) => s + i.price * i.quantity, 0))
const payTotal = computed(() => Math.max(0, goodsTotal.value - (selectedCoupon.value?.value || 0)))

async function fetchCheckoutData() {
  error.value = ''
  loading.value = true
  try {
    const result = await shopApi.getCheckout()
    items.value = result.items || []
    addresses.value = result.addresses || []
    coupons.value = result.coupons || []
    payMethods.value = result.payMethods || []
    invoiceOptions.value = result.invoiceOptions || []
    currentAddress.value = addresses.value.find((a: ShippingAddress) => a.isDefault) || addresses.value[0] || null
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => { fetchCheckoutData() })

function selectAddress(a: ShippingAddress) { currentAddress.value = a; showAddress.value = false }
function selectCoupon(c: CheckoutCoupon | null) { selectedCoupon.value = c; showCoupon.value = false }
function selectInvoice(opt: { value: string }) { invoice.value = opt.value; showInvoice.value = false }
function submitOrder() {
  if (submitting.value) return
  submitting.value = true
  redirectTo('/payment/result')
  setTimeout(() => { submitting.value = false }, 2000)
}
</script>

<style lang="scss" scoped>
.checkout { min-height: 100vh; background: #F5F5F5; display: flex; flex-direction: column; }

.content { flex: 1; }
.address-card { display: flex; align-items: center; gap: 16rpx; background: #FFFFFF; margin: 20rpx; padding: 28rpx 24rpx; border-radius: 20rpx; }
.address-info { flex: 1; display: flex; flex-direction: column; gap: 10rpx; }
.addr-top { display: flex; align-items: center; gap: 16rpx; }
.addr-name { font-size: 30rpx; font-weight: 600; color: #1A1A1A; }
.addr-phone { font-size: 26rpx; color: #666666; }
.default-tag { background: rgba(196, 30, 58,0.1); padding: 2rpx 10rpx; border-radius: 6rpx; }
.default-tag text { font-size: 20rpx; color: #C41E3A; }
.addr-detail { font-size: 26rpx; color: #666666; line-height: 1.4; }
.goods-card { background: #FFFFFF; margin: 0 20rpx 20rpx; border-radius: 20rpx; padding: 24rpx; }
.goods-item { display: flex; gap: 16rpx; margin-bottom: 20rpx; &:last-child { margin-bottom: 0; } }
.goods-img { width: 140rpx; height: 140rpx; border-radius: 12rpx; }
.goods-info { flex: 1; display: flex; flex-direction: column; gap: 10rpx; }
.goods-name { font-size: 28rpx; color: #1A1A1A; line-height: 1.4; }
.sku-tag { align-self: flex-start; background: #F5F5F5; padding: 4rpx 14rpx; border-radius: 8rpx; }
.sku-tag text { font-size: 22rpx; color: #999999; }
.goods-bottom { display: flex; justify-content: space-between; align-items: center; }
.goods-price { font-size: 30rpx; color: #C41E3A; font-weight: 700; }
.goods-qty { font-size: 26rpx; color: #999999; }
.cell { display: flex; align-items: center; background: #FFFFFF; margin: 0 20rpx 20rpx; padding: 28rpx 24rpx; border-radius: 20rpx; }
.cell.column { flex-direction: column; align-items: stretch; gap: 16rpx; }
.cell-label { font-size: 28rpx; color: #1A1A1A; }
.cell-value { margin-left: auto; font-size: 26rpx; color: #999999; margin-right: 10rpx; &.active { color: #C41E3A; } }
.note-input { font-size: 26rpx; color: #1A1A1A; height: 60rpx; }
.ph { color: #BBBBBB; }
.invoice-card { background: #FFFFFF; margin: 0 20rpx 20rpx; border-radius: 20rpx; padding: 28rpx 24rpx; }
.invoice-head { display: flex; align-items: center; }
.invoice-options { margin-top: 20rpx; }
.invoice-option { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 0; border-top: 2rpx solid #F5F5F5; }
.invoice-info { display: flex; flex-direction: column; gap: 6rpx; }
.io-label { font-size: 28rpx; color: #1A1A1A; }
.io-desc { font-size: 24rpx; color: #999999; }
.pay-card { background: #FFFFFF; margin: 0 20rpx 20rpx; padding: 24rpx; border-radius: 20rpx; }
.pay-title { font-size: 28rpx; font-weight: 600; color: #1A1A1A; display: block; margin-bottom: 16rpx; }
.pay-item { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 0; }
.pay-badge { width: 56rpx; height: 56rpx; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; }
.pay-badge text { color: #FFFFFF; font-size: 28rpx; }
.pay-name { font-size: 28rpx; color: #1A1A1A; }
.radio { width: 40rpx; height: 40rpx; border-radius: 50%; border: 2rpx solid #CCCCCC; margin-left: auto; display: flex; align-items: center; justify-content: center; &.checked { border-color: #C41E3A; } }
.radio-dot { width: 22rpx; height: 22rpx; border-radius: 50%; background: #C41E3A; }
.amount-card { background: #FFFFFF; margin: 0 20rpx; padding: 24rpx; border-radius: 20rpx; }
.amount-row { display: flex; justify-content: space-between; font-size: 26rpx; color: #666666; margin-bottom: 16rpx; }
.amount-row .discount { color: #C41E3A; }
.amount-row.total { margin-bottom: 0; padding-top: 16rpx; border-top: 2rpx solid #F0F0F0; }
.amount-row.total text { font-size: 28rpx; color: #1A1A1A; font-weight: 600; }
.pay-amount { color: #C41E3A !important; font-size: 34rpx !important; }
.footer { position: fixed; left: 0; right: 0; bottom: 0; display: flex; align-items: center; padding: 20rpx 30rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); background: #FFFFFF; box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.05); }
.footer-total { display: flex; align-items: baseline; gap: 8rpx; }
.ft-label { font-size: 26rpx; color: #666666; }
.ft-amount { font-size: 38rpx; color: #C41E3A; font-weight: 700; }
.pay-btn { margin-left: auto; padding: 20rpx 60rpx; border-radius: 40rpx; background: linear-gradient(90deg, #C41E3A, #C8453E); }
.pay-btn text { color: #FFFFFF; font-size: 30rpx; font-weight: 600; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: flex-end; }
.sheet { width: 100%; background: #FFFFFF; border-radius: 24rpx 24rpx 0 0; padding: 32rpx; max-height: 70vh; }
.sheet-title { font-size: 32rpx; font-weight: 600; color: #1A1A1A; display: block; margin-bottom: 24rpx; }
.addr-option, .coupon-option { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 0; border-bottom: 2rpx solid #F5F5F5; }
.addr-option-info { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.co-name { font-size: 28rpx; color: #1A1A1A; display: block; }
.co-min { font-size: 24rpx; color: #999999; }

/* 加载态 */
.loading-zone { padding: 20rpx; display: flex; flex-direction: column; gap: 20rpx; }
.sk-addr { height: 120rpx; background: #ececec; border-radius: 20rpx; }
.sk-goods { height: 300rpx; background: #ececec; border-radius: 20rpx; }
.sk-row { height: 96rpx; background: #ececec; border-radius: 20rpx; }

/* 错误态 */
.error-zone { min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 32rpx; }
.error-text { font-size: 28rpx; color: #999999; }
.error-retry { padding: 16rpx 56rpx; background: #C41E3A; border-radius: 40rpx; }
.error-retry text { color: #FFFFFF; font-size: 28rpx; }
</style>
