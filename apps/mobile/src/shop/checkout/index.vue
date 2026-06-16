<template>
  <view class="checkout">
    <view class="nav-bar" :style="{ paddingTop: 'calc(20rpx + var(--status-bar-height, 0px))' }">
      <view class="nav-back" @tap="goBack"><app-icon name="arrow-left" :size="40" color="#1A1A1A" /></view>
      <text class="nav-title">确认订单</text>
      <view class="nav-placeholder" />
    </view>

    <!-- 超时倒计时条 -->
    <view class="timer-bar" :class="{ 'timer-bar--urgent': isUrgent }">
      <app-icon name="clock" :size="28" color="#FFFFFF" />
      <text class="timer-text">{{ isUrgent ? '即将超时，请尽快支付 ' : '请在 ' }}{{ countdown.m }}:{{ countdown.s }}{{ isUrgent ? '' : ' 内完成支付' }}</text>
    </view>

    <scroll-view scroll-y class="content">
      <!-- 加载骨架 -->
      <view v-if="loading" class="sk-wrap">
        <view class="sk-card"><view class="sk-line" /><view class="sk-line sk-short" /></view>
        <view class="sk-card"><view class="sk-row" /><view class="sk-row" /><view class="sk-row" /></view>
        <view class="sk-card"><view class="sk-line w4" /><view class="sk-line w6" /><view class="sk-line w5" /></view>
      </view>

      <error-state v-else-if="error" :message="error" @retry="loadCheckout" />

      <view v-else>
      <!-- 地址 -->
      <view class="address-card" @tap="showAddress = true">
        <app-icon name="map-pin" :size="40" color="#9A2D2D" />
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
        <text class="cell-value" :class="{ active: selectedCoupon }">{{ selectedCoupon ? '-¥' + selectedCoupon.value : coupons.length + '张可用' }}</text>
        <app-icon name="chevron-right" :size="32" color="#CCCCCC" />
      </view>
      <!-- 配送方式 -->
      <view class="cell">
        <text class="cell-label">配送方式</text>
        <text class="cell-value">普通快递 包邮</text>
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

      <!-- 金额明细 -->
      <view class="amount-card">
        <view class="amount-row"><text>商品金额</text><text>¥{{ goodsTotal }}</text></view>
        <view class="amount-row"><text>运费</text><text>¥0</text></view>
        <view class="amount-row" v-if="selectedCoupon"><text>优惠券</text><text class="discount">-¥{{ selectedCoupon.value }}</text></view>
        <view class="amount-row total"><text>实付款</text><text class="pay-amount">¥{{ payTotal }}</text></view>
      </view>
      <view style="height: 140rpx;" />
      </view>
    </scroll-view>

    <!-- 底部支付栏 -->
    <view class="footer">
      <view class="footer-total">
        <view class="ft-main">
          <text class="ft-label">实付</text>
          <text class="ft-amount">¥{{ payTotal }}</text>
        </view>
        <text v-if="savedAmount > 0" class="ft-saved">已优惠 ¥{{ savedAmount }}</text>
      </view>
      <view class="pay-btn" :class="{ 'pay-btn--disabled': submitting }" @tap="submitOrder"><text>{{ submitting ? '提交中...' : '提交订单' }}</text></view>
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
          <app-icon v-if="currentAddress && currentAddress.id === a.id" name="check" :size="36" color="#9A2D2D" />
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
import { navigateBack, redirectTo } from '@/utils/router'
import ErrorState from '@/components/common/error-state.vue'
import { checkoutItems, checkoutAddresses, payMethods, formatCountdown, shopApi, type ShippingAddress, type CheckoutCoupon } from '@/lib/shop-data'

const items = checkoutItems
const addresses = ref<ShippingAddress[]>(checkoutAddresses)
const coupons = ref<CheckoutCoupon[]>([])
const currentAddress = ref<ShippingAddress | null>(null)
const selectedCoupon = ref<CheckoutCoupon | null>(null)
const payMethod = ref('wechat')
const showAddress = ref(false)
const showCoupon = ref(false)
const showTimeout = ref(false)
const loading = ref(true)
const error = ref('')
const submitting = ref(false)

const goodsTotal = computed(() => items.reduce((s, i) => s + i.price * i.quantity, 0))
const payTotal = computed(() => Math.max(0, goodsTotal.value - (selectedCoupon.value?.value || 0)))
const savedAmount = computed(() => selectedCoupon.value?.value || 0)
const isUrgent = computed(() => remain.value > 0 && remain.value < 3 * 60 * 1000)

async function loadCheckout() {
  loading.value = true
  error.value = ''
  try {
    const [addrRes, couponRes] = await Promise.all([
      shopApi.getAddresses(),
      shopApi.getMyCoupons(),
    ])
    addresses.value = Array.isArray(addrRes) ? addrRes : (addrRes as any)?.items || checkoutAddresses
    coupons.value = (couponRes as any)?.items || couponRes || []
  } catch (e: any) { error.value = e?.message || '加载失败' } finally { loading.value = false }
}

// 15分钟倒计时
const remain = ref(15 * 60 * 1000)
const countdown = computed(() => formatCountdown(remain.value))
let timer: ReturnType<typeof setInterval> | null = null
onMounted(async () => {
  await loadCheckout()
  currentAddress.value = addresses.value.find((a) => a.isDefault) || addresses.value[0] || null
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
function goBack() { navigateBack() }
async function submitOrder() {
  if (submitting.value) return
  submitting.value = true
  try {
    await shopApi.createOrder({
      addressId: currentAddress.value?.id || '',
      couponId: selectedCoupon.value?.id,
      payMethod: payMethod.value,
    })
    redirectTo('/shop/paying')
  } catch (e: any) {
    uni.showToast({ title: e?.message || '提交失败', icon: 'none' })
  } finally { submitting.value = false }
}
function onTimeout() { redirectTo('/shop/pay-timeout') }
</script>

<style lang="scss" scoped>
.checkout { min-height: 100vh; background: #F5F5F5; display: flex; flex-direction: column; }
.nav-bar { display: flex; align-items: center; padding: 20rpx 30rpx; background: #FFFFFF; }
.nav-back { width: 60rpx; } .nav-placeholder { width: 60rpx; }
.nav-title { flex: 1; text-align: center; font-size: 34rpx; font-weight: 600; color: #1A1A1A; }
.timer-bar { display: flex; align-items: center; justify-content: center; gap: 12rpx; padding: 16rpx; background: linear-gradient(90deg, #9A2D2D, #C8453E); transition: background 0.3s; }
.timer-bar--urgent { background: linear-gradient(90deg, #CC0000, #FF2200); animation: urgent-pulse 1s ease-in-out infinite; }
.timer-text { font-size: 26rpx; color: #FFFFFF; }
@keyframes urgent-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
.content { flex: 1; }
.address-card { display: flex; align-items: center; gap: 16rpx; background: #FFFFFF; margin: 20rpx; padding: 28rpx 24rpx; border-radius: 20rpx; }
.address-info { flex: 1; display: flex; flex-direction: column; gap: 10rpx; }
.addr-top { display: flex; align-items: center; gap: 16rpx; }
.addr-name { font-size: 30rpx; font-weight: 600; color: #1A1A1A; }
.addr-phone { font-size: 26rpx; color: #666666; }
.default-tag { background: rgba(154,45,45,0.1); padding: 2rpx 10rpx; border-radius: 6rpx; }
.default-tag text { font-size: 20rpx; color: #9A2D2D; }
.addr-detail { font-size: 26rpx; color: #666666; line-height: 1.4; }
.goods-card { background: #FFFFFF; margin: 0 20rpx 20rpx; border-radius: 20rpx; padding: 24rpx; }
.goods-item { display: flex; gap: 16rpx; margin-bottom: 20rpx; &:last-child { margin-bottom: 0; } }
.goods-img { width: 140rpx; height: 140rpx; border-radius: 12rpx; }
.goods-info { flex: 1; display: flex; flex-direction: column; gap: 10rpx; }
.goods-name { font-size: 28rpx; color: #1A1A1A; line-height: 1.4; }
.sku-tag { align-self: flex-start; background: #F5F5F5; padding: 4rpx 14rpx; border-radius: 8rpx; }
.sku-tag text { font-size: 22rpx; color: #999999; }
.goods-bottom { display: flex; justify-content: space-between; align-items: center; }
.goods-price { font-size: 30rpx; color: #9A2D2D; font-weight: 700; }
.goods-qty { font-size: 26rpx; color: #999999; }
.cell { display: flex; align-items: center; background: #FFFFFF; margin: 0 20rpx 20rpx; padding: 28rpx 24rpx; border-radius: 20rpx; }
.cell-label { font-size: 28rpx; color: #1A1A1A; }
.cell-value { margin-left: auto; font-size: 26rpx; color: #999999; margin-right: 10rpx; &.active { color: #9A2D2D; } }
.pay-card { background: #FFFFFF; margin: 0 20rpx 20rpx; padding: 24rpx; border-radius: 20rpx; }
.pay-title { font-size: 28rpx; font-weight: 600; color: #1A1A1A; display: block; margin-bottom: 16rpx; }
.pay-item { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 0; }
.pay-badge { width: 56rpx; height: 56rpx; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; }
.pay-badge text { color: #FFFFFF; font-size: 28rpx; }
.pay-name { font-size: 28rpx; color: #1A1A1A; }
.radio { width: 40rpx; height: 40rpx; border-radius: 50%; border: 2rpx solid #CCCCCC; margin-left: auto; display: flex; align-items: center; justify-content: center; &.checked { border-color: #9A2D2D; } }
.radio-dot { width: 22rpx; height: 22rpx; border-radius: 50%; background: #9A2D2D; }
.amount-card { background: #FFFFFF; margin: 0 20rpx; padding: 24rpx; border-radius: 20rpx; }
.amount-row { display: flex; justify-content: space-between; font-size: 26rpx; color: #666666; margin-bottom: 16rpx; }
.amount-row .discount { color: #9A2D2D; }
.amount-row.total { margin-bottom: 0; padding-top: 16rpx; border-top: 2rpx solid #F0F0F0; }
.amount-row.total text { font-size: 28rpx; color: #1A1A1A; font-weight: 600; }
.pay-amount { color: #9A2D2D !important; font-size: 34rpx !important; }
.footer { position: fixed; left: 0; right: 0; bottom: 0; display: flex; align-items: center; padding: 20rpx 30rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); background: #FFFFFF; box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.05); }
.footer-total { display: flex; flex-direction: column; gap: 4rpx; }
.ft-main { display: flex; align-items: baseline; gap: 8rpx; }
.ft-label { font-size: 26rpx; color: #666666; }
.ft-amount { font-size: 38rpx; color: #9A2D2D; font-weight: 700; }
.ft-saved { font-size: 22rpx; color: #9A2D2D; }
.pay-btn { margin-left: auto; padding: 20rpx 60rpx; border-radius: 40rpx; background: linear-gradient(90deg, #9A2D2D, #C8453E); }
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
.dialog-btn { margin-top: 12rpx; width: 100%; height: 88rpx; border-radius: 44rpx; background: #9A2D2D; display: flex; align-items: center; justify-content: center; }
.dialog-btn text { color: #FFFFFF; font-size: 30rpx; }

.pay-btn--disabled { opacity: 0.5; pointer-events: none; }

.sk-wrap { margin: 20rpx; display: flex; flex-direction: column; gap: 20rpx; }
.sk-card { background: #fff; border-radius: 20rpx; padding: 28rpx; display: flex; flex-direction: column; gap: 16rpx; }
.sk-row { height: 80rpx; background: #f0ece4; border-radius: 12rpx; }
.sk-line { height: 24rpx; background: #f0ece4; border-radius: 8rpx; }
.sk-short { width: 60%; }
.sk-line.w4 { width: 40%; } .sk-line.w5 { width: 50%; } .sk-line.w6 { width: 60%; }
</style>
