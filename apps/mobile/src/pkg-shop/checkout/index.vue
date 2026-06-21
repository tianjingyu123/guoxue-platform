<template>
  <view class="checkout">
    <app-nav-bar title="确认订单" :back-size="40" :title-size="36" :bar-height="106" />

    <!-- 超时倒计时条 -->
    <view class="timer-bar" :class="{ urgent: isUrgent }">
      <view class="timer-left">
        <app-icon name="clock" :size="28" :color="isUrgent ? '#EF4444' : '#FF6B35'" />
        <text class="timer-text" :class="{ urgent: isUrgent }">请在 {{ countdown.m }}:{{ countdown.s }} 内完成支付</text>
      </view>
      <text v-if="isUrgent" class="timer-warn">即将超时</text>
    </view>

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
        <text class="goods-title">商品清单</text>
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
        <view class="cell-left">
          <app-icon name="tag" :size="36" color="#C41E3A" />
          <text class="cell-label">优惠券</text>
        </view>
        <text class="cell-value active">{{ selectedCoupon ? '-¥' + selectedCoupon.value : (coupons.length > 0 ? coupons.length + '张可用' : '暂无可用') }}</text>
        <app-icon name="chevron-right" :size="32" color="#999999" />
      </view>

      <!-- 支付方式 -->
      <view class="pay-card">
        <text class="pay-title">支付方式</text>
        <view v-for="m in payMethods" :key="m.id" class="pay-item" @tap="payMethod = m.id">
          <view class="pay-badge" :style="{ background: m.badgeColor }"><text>{{ m.badge }}</text></view>
          <text class="pay-name">{{ m.name }}</text>
          <view class="radio" :class="{ checked: payMethod === m.id }">
            <view v-if="payMethod === m.id" class="radio-dot" />
          </view>
        </view>
      </view>

      <!-- 价格明细 -->
      <view class="amount-card">
        <text class="amount-title">价格明细</text>
        <view class="amount-row"><text>商品金额</text><text class="amount-val">¥{{ goodsTotal.toFixed(2) }}</text></view>
        <view class="amount-row"><text>运费</text><text class="amount-val">免运费</text></view>
        <view class="amount-row" v-if="selectedCoupon"><text>优惠券抵扣</text><text class="discount">-¥{{ selectedCoupon.value.toFixed(2) }}</text></view>
        <view class="amount-row total"><text>实付金额</text><text class="pay-amount">¥{{ payTotal.toFixed(2) }}</text></view>
      </view>
      <view style="height: 140rpx;" />
    </scroll-view>

    <!-- 底部支付栏 -->
    <view class="footer">
      <view class="footer-total">
        <view class="ft-line">
          <text class="ft-label">合计:</text>
          <text class="ft-amount">¥{{ payTotal.toFixed(2) }}</text>
        </view>
        <text v-if="selectedCoupon" class="ft-saved">已优惠 ¥{{ selectedCoupon.value }}</text>
      </view>
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

    <!-- 超时警告 -->
    <view v-if="showTimeout" class="mask center">
      <view class="dialog" @tap.stop>
        <app-icon name="clock" :size="80" color="#FF8800" />
        <text class="dialog-title">支付超时</text>
        <text class="dialog-desc">订单支付时间已超时，请重新下单</text>
        <view class="dialog-btn" @tap="onTimeout"><text>重新下单</text></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { redirectTo } from '@/utils/router'
import { shopApi, payMethods, formatCountdown, type ShippingAddress, type CheckoutCoupon } from '@/lib/shop-data'

const items = ref<any[]>([])
const addresses = ref<any[]>([])
const coupons = ref<any[]>([])
const loading = ref(true)
const currentAddress = ref<ShippingAddress | null>(null)
const selectedCoupon = ref<CheckoutCoupon | null>(null)
const payMethod = ref('wechat')
const showAddress = ref(false)
const showCoupon = ref(false)
const showTimeout = ref(false)

const goodsTotal = computed(() => items.value.reduce((s, i) => s + i.price * i.quantity, 0))
const payTotal = computed(() => Math.max(0, goodsTotal.value - (selectedCoupon.value?.value || 0)))

// 15分钟倒计时
const remain = ref(15 * 60 * 1000)
const countdown = computed(() => formatCountdown(remain.value))
const isUrgent = computed(() => remain.value <= 180 * 1000)
let timer: ReturnType<typeof setInterval> | null = null
onMounted(async () => {
  try {
    const data = await shopApi.getCheckoutData()
    items.value = data.items
    addresses.value = data.addresses
    coupons.value = data.coupons
    currentAddress.value = data.addresses.find((a: any) => a.isDefault) || data.addresses[0] || null
  } catch { /* useMock handles fallback */ }
  finally { loading.value = false }
  timer = setInterval(() => {
    remain.value -= 1000
    if (remain.value <= 0) {
      remain.value = 0
      showTimeout.value = true
      if (timer) clearInterval(timer)
    }
  }, 1000)
})
onUnmounted(() => { if (timer) clearInterval(timer) })

function selectAddress(a: ShippingAddress) { currentAddress.value = a; showAddress.value = false }
function selectCoupon(c: CheckoutCoupon | null) { selectedCoupon.value = c; showCoupon.value = false }
function submitOrder() { redirectTo('/shop/paying') }
function onTimeout() { redirectTo('/shop/pay-timeout') }
</script>

<style lang="scss" scoped>
.checkout { min-height: 100vh; background: #F5F5F5; display: flex; flex-direction: column; }

.timer-bar { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 30rpx; background: #FFF5E6; &.urgent { background: #FEF2F2; } }
.timer-left { display: flex; align-items: center; gap: 12rpx; }
.timer-text { font-size: 26rpx; color: #FF6B35; &.urgent { color: #EF4444; } }
.timer-warn { font-size: 22rpx; color: #EF4444; }
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
.goods-title { font-size: 28rpx; font-weight: 600; color: #1A1A1A; display: block; margin-bottom: 20rpx; }
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
.cell-left { display: flex; align-items: center; gap: 16rpx; }
.cell-label { font-size: 28rpx; color: #1A1A1A; }
.cell-value { margin-left: auto; font-size: 26rpx; color: #999999; margin-right: 10rpx; &.active { color: #C41E3A; } }
.pay-card { background: #FFFFFF; margin: 0 20rpx 20rpx; padding: 24rpx; border-radius: 20rpx; }
.pay-title { font-size: 28rpx; font-weight: 600; color: #1A1A1A; display: block; margin-bottom: 16rpx; }
.pay-item { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 0; }
.pay-badge { width: 56rpx; height: 56rpx; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; }
.pay-badge text { color: #FFFFFF; font-size: 28rpx; }
.pay-name { font-size: 28rpx; color: #1A1A1A; }
.radio { width: 40rpx; height: 40rpx; border-radius: 50%; border: 2rpx solid #CCCCCC; margin-left: auto; display: flex; align-items: center; justify-content: center; &.checked { border-color: #C41E3A; } }
.radio-dot { width: 22rpx; height: 22rpx; border-radius: 50%; background: #C41E3A; }
.amount-card { background: #FFFFFF; margin: 0 20rpx; padding: 24rpx; border-radius: 20rpx; }
.amount-title { font-size: 28rpx; font-weight: 600; color: #1A1A1A; display: block; margin-bottom: 20rpx; }
.amount-val { color: #1A1A1A; }
.amount-row { display: flex; justify-content: space-between; font-size: 26rpx; color: #666666; margin-bottom: 16rpx; }
.amount-row .discount { color: #C41E3A; }
.amount-row.total { margin-bottom: 0; padding-top: 16rpx; border-top: 2rpx solid #F0F0F0; }
.amount-row.total text { font-size: 28rpx; color: #1A1A1A; font-weight: 600; }
.pay-amount { color: #C41E3A !important; font-size: 34rpx !important; }
.footer { position: fixed; left: 0; right: 0; bottom: 0; display: flex; align-items: center; padding: 20rpx 30rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); background: #FFFFFF; box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.05); }
.footer-total { display: flex; flex-direction: column; }
.ft-line { display: flex; align-items: baseline; gap: 8rpx; }
.ft-label { font-size: 26rpx; color: #666666; }
.ft-amount { font-size: 38rpx; color: #C41E3A; font-weight: 700; }
.ft-saved { font-size: 22rpx; color: #16A34A; }
.pay-btn { margin-left: auto; padding: 20rpx 60rpx; border-radius: 40rpx; background: linear-gradient(90deg, #C41E3A, #C8453E); }
.pay-btn text { color: #FFFFFF; font-size: 30rpx; font-weight: 600; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: flex-end; &.center { align-items: center; justify-content: center; } }
.sheet { width: 100%; background: #FFFFFF; border-radius: 24rpx 24rpx 0 0; padding: 32rpx; max-height: 70vh; }
.sheet-title { font-size: 32rpx; font-weight: 600; color: #1A1A1A; display: block; margin-bottom: 24rpx; }
.addr-option, .coupon-option { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 0; border-bottom: 2rpx solid #F5F5F5; }
.addr-option-info { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.co-name { font-size: 28rpx; color: #1A1A1A; display: block; }
.co-min { font-size: 24rpx; color: #999999; }
.dialog { width: 560rpx; background: #FFFFFF; border-radius: 24rpx; padding: 48rpx 40rpx; display: flex; flex-direction: column; align-items: center; gap: 20rpx; }
.dialog-title { font-size: 34rpx; font-weight: 600; color: #1A1A1A; }
.dialog-desc { font-size: 28rpx; color: #666666; text-align: center; }
.dialog-btn { margin-top: 12rpx; width: 100%; height: 88rpx; border-radius: 44rpx; background: #C41E3A; display: flex; align-items: center; justify-content: center; }
.dialog-btn text { color: #FFFFFF; font-size: 30rpx; }
</style>
