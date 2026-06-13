<template>
  <view class="checkout-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">确认订单</text>
        <view class="header-right" />
      </view>
    </view>

    <!-- 收货地址 -->
    <view class="section-card" @click="goPage('/pages/address/index')">
      <template v-if="hasAddress">
        <view class="addr-row">
          <view class="addr-icon">📍</view>
          <view class="addr-info">
            <view class="addr-line1">
              <text class="addr-name">{{ address.name }}</text>
              <text class="addr-phone">{{ address.phone }}</text>
              <text class="addr-default">默认</text>
            </view>
            <text class="addr-detail">{{ address.province }} {{ address.city }} {{ address.detail }}</text>
          </view>
          <text class="addr-arrow">›</text>
        </view>
      </template>
      <template v-else>
        <view class="addr-row">
          <view class="addr-icon add-icon">＋</view>
          <view class="addr-info">
            <text class="addr-add-title">请添加收货地址</text>
            <text class="addr-add-desc">添加地址后才能下单</text>
          </view>
          <text class="addr-arrow">›</text>
        </view>
      </template>
    </view>

    <!-- 商品清单 -->
    <view class="section-card">
      <text class="section-title">商品清单</text>
      <view v-for="item in orderItems" :key="item.id" class="goods-item">
        <view class="goods-img-wrap">
          <image v-if="item.image" :src="item.image" class="goods-img" mode="aspectFill" />
          <text v-else class="goods-img-fb">📦</text>
        </view>
        <view class="goods-info">
          <text class="goods-name">{{ item.name }}</text>
          <text class="goods-spec">{{ item.spec }}</text>
          <view class="goods-bottom">
            <text class="goods-price">¥{{ item.price }}</text>
            <text class="goods-qty">x{{ item.quantity }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 优惠券 -->
    <view class="section-card row-card" @click="showCoupon = true">
      <view class="row-left">
        <text class="row-icon">🏷</text>
        <text class="row-label">优惠券</text>
      </view>
      <view class="row-right">
        <text v-if="selectedCoupon" class="row-val red">-¥{{ selectedCoupon.discount }}</text>
        <text v-else class="row-val gray">{{ availableCoupons.length }}张可用</text>
        <text class="row-arrow">›</text>
      </view>
    </view>

    <!-- 备注 -->
    <view class="section-card">
      <view class="note-row">
        <text class="row-icon">💬</text>
        <input v-model="orderNote" class="note-input" placeholder="添加订单备注..." maxlength="100" />
        <text v-if="orderNote" class="note-count">{{ orderNote.length }}/100</text>
      </view>
    </view>

    <!-- 发票 -->
    <view class="section-card row-card" @click="showInvoice = true">
      <view class="row-left">
        <text class="row-icon">🧾</text>
        <text class="row-label">发票</text>
      </view>
      <view class="row-right">
        <text class="row-val gray">{{ invoiceLabel }}</text>
        <text class="row-arrow">›</text>
      </view>
    </view>

    <!-- 价格明细 -->
    <view class="section-card">
      <text class="section-title">价格明细</text>
      <view class="price-line">
        <text class="pl-label">商品总额</text>
        <text class="pl-val">¥{{ subtotal }}</text>
      </view>
      <view class="price-line">
        <text class="pl-label">运费</text>
        <text class="pl-val">{{ shipping === 0 ? '包邮' : '¥' + shipping }}</text>
      </view>
      <view v-if="couponDiscount > 0" class="price-line">
        <text class="pl-label">优惠券抵扣</text>
        <text class="pl-val red">-¥{{ couponDiscount }}</text>
      </view>
      <view class="price-line total-line">
        <text class="pl-label bold">实付金额</text>
        <text class="pl-total">¥{{ finalTotal }}</text>
      </view>
    </view>

    <!-- 支付方式 -->
    <view class="section-card">
      <text class="section-title">支付方式</text>
      <view class="pay-option" :class="{ on: payment === 'wechat' }" @click="payment = 'wechat'">
        <view class="pay-left">
          <view class="pay-icon wx">💳</view>
          <text class="pay-name">微信支付</text>
        </view>
        <view class="pay-radio" :class="{ on: payment === 'wechat' }">
          <text v-if="payment === 'wechat'" class="radio-mark">✓</text>
        </view>
      </view>
      <view class="pay-option" :class="{ on: payment === 'alipay' }" @click="payment = 'alipay'">
        <view class="pay-left">
          <view class="pay-icon ali">💳</view>
          <text class="pay-name">支付宝</text>
        </view>
        <view class="pay-radio" :class="{ on: payment === 'alipay' }">
          <text v-if="payment === 'alipay'" class="radio-mark">✓</text>
        </view>
      </view>
      <view class="pay-option" :class="{ on: payment === 'balance', off: balance < finalTotalNum }" @click="balance >= finalTotalNum && (payment = 'balance')">
        <view class="pay-left">
          <view class="pay-icon bal">💰</view>
          <view class="pay-text">
            <text class="pay-name">国学币余额</text>
            <text class="pay-sub">可用 ¥{{ balance.toFixed(2) }}<text v-if="balance < finalTotalNum" class="insufficient"> (余额不足)</text></text>
          </view>
        </view>
        <view class="pay-radio" :class="{ on: payment === 'balance' }">
          <text v-if="payment === 'balance'" class="radio-mark">✓</text>
        </view>
      </view>
    </view>

    <!-- 底部支付 -->
    <view class="bottom-bar">
      <view class="bottom-price">
        <text class="bp-label">实付：</text>
        <text class="bp-num">¥{{ finalTotal }}</text>
      </view>
      <view class="pay-btn" :class="{ off: !hasAddress }" @click="handlePay">
        <text>立即支付</text>
      </view>
    </view>

    <!-- 优惠券选择面板 -->
    <view v-if="showCoupon" class="panel-mask" @click="showCoupon = false">
      <view class="panel-sheet" @click.stop>
        <view class="panel-head">
          <text class="panel-title">选择优惠券</text>
          <text class="panel-done" @click="showCoupon = false">完成</text>
        </view>
        <view class="panel-body">
          <view class="coupon-option" :class="{ on: !selectedCoupon }" @click="selectedCoupon = null; showCoupon = false">
            <text class="co-name">不使用优惠券</text>
            <view class="pay-radio" :class="{ on: !selectedCoupon }">
              <text v-if="!selectedCoupon" class="radio-mark">✓</text>
            </view>
          </view>
          <view v-for="c in availableCoupons" :key="c.id" class="coupon-option" :class="{ on: selectedCoupon?.id === c.id, off: subtotalNum < c.minAmount }" @click="subtotalNum >= c.minAmount && (selectedCoupon = c, showCoupon = false)">
            <view class="co-info">
              <view class="co-top">
                <text class="co-amount">¥{{ c.discount }}</text>
                <text class="co-name">{{ c.name }}</text>
              </view>
              <text class="co-cond">{{ c.minAmount > 0 ? '满¥' + c.minAmount + '可用' : '无门槛' }}<text v-if="subtotalNum < c.minAmount"> · 未满足条件</text></text>
            </view>
            <view class="pay-radio" :class="{ on: selectedCoupon?.id === c.id }">
              <text v-if="selectedCoupon?.id === c.id" class="radio-mark">✓</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 发票选择面板 -->
    <view v-if="showInvoice" class="panel-mask" @click="showInvoice = false">
      <view class="panel-sheet" @click.stop>
        <view class="panel-head">
          <text class="panel-title">选择发票类型</text>
          <text class="panel-done" @click="showInvoice = false">完成</text>
        </view>
        <view class="panel-body">
          <view v-for="opt in invoiceOptions" :key="opt.value" class="coupon-option" :class="{ on: invoiceType === opt.value }" @click="invoiceType = opt.value; showInvoice = false">
            <view class="co-info">
              <text class="co-name">{{ opt.label }}</text>
              <text class="co-cond">{{ opt.desc }}</text>
            </view>
            <view class="pay-radio" :class="{ on: invoiceType === opt.value }">
              <text v-if="invoiceType === opt.value" class="radio-mark">✓</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const hasAddress = ref(true)
const address = { name: '张三', phone: '138****8888', province: '北京市', city: '朝阳区', detail: '建国路88号SOHO现代城A座1208室' }

const orderItems = [
  { id: 1, name: '《渊海子平》精装典藏版', spec: '精装版 / 全四册', price: 168, quantity: 1, image: '' },
  { id: 2, name: '天然黑曜石本命佛吊坠', spec: '属猴 / 大日如来', price: 299, quantity: 2, image: '' },
]

const availableCoupons = [
  { id: 1, name: '满300减50', discount: 50, minAmount: 300 },
  { id: 2, name: '满500减100', discount: 100, minAmount: 500 },
  { id: 3, name: '新人专享9折券', discount: 76.6, minAmount: 0 },
]

const payment = ref<'wechat' | 'alipay' | 'balance'>('wechat')
const selectedCoupon = ref(availableCoupons[0])
const orderNote = ref('')
const balance = ref(888.88)
const showCoupon = ref(false)
const showInvoice = ref(false)
const invoiceType = ref<'none' | 'personal' | 'company'>('none')

const invoiceOptions = [
  { value: 'none', label: '不开发票', desc: '无需发票' },
  { value: 'personal', label: '个人发票', desc: '电子发票，购买后发送至邮箱' },
  { value: 'company', label: '企业发票', desc: '需要填写企业税号' },
]
const invoiceLabel = computed(() => {
  const m: Record<string, string> = { none: '不开发票', personal: '个人发票', company: '企业发票' }
  return m[invoiceType.value] || '不开发票'
})

const subtotalNum = orderItems.reduce((s, i) => s + i.price * i.quantity, 0)
const subtotal = computed(() => subtotalNum.toFixed(2))
const shipping = 0
const couponDiscount = computed(() => selectedCoupon.value?.discount || 0)
const finalTotalNum = computed(() => subtotalNum + shipping - couponDiscount.value)
const finalTotal = computed(() => finalTotalNum.value.toFixed(2))

function goPage(url: string) { uni.navigateTo({ url }) }
function handlePay() {
  if (!hasAddress.value) return
  uni.showToast({ title: '支付成功', icon: 'success' })
}
</script>

<style scoped>
.checkout-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 140rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 0 24rpx; height: 88rpx; }
.header-back { font-size: 48rpx; color: #333; width: 64rpx; }
.header-title { flex: 1; font-size: 34rpx; font-weight: 700; color: #2C2C2C; }
.header-right { width: 64rpx; }

.section-card { margin: 16rpx 24rpx; padding: 24rpx; background: #fff; border-radius: 20rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); }
.section-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; margin-bottom: 20rpx; display: block; }

.addr-row { display: flex; align-items: flex-start; gap: 16rpx; }
.addr-icon { font-size: 36rpx; flex-shrink: 0; margin-top: 4rpx; }
.addr-icon.add-icon { width: 40rpx; height: 40rpx; border-radius: 50%; background: rgba(196,30,58,0.1); color: #C41E3A; display: flex; align-items: center; justify-content: center; font-size: 28rpx; }
.addr-info { flex: 1; min-width: 0; }
.addr-line1 { display: flex; align-items: center; gap: 12rpx; margin-bottom: 6rpx; }
.addr-name { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.addr-phone { font-size: 26rpx; color: #999; }
.addr-default { font-size: 20rpx; color: #C41E3A; background: rgba(196,30,58,0.08); padding: 2rpx 12rpx; border-radius: 8rpx; }
.addr-detail { font-size: 26rpx; color: #999; line-height: 1.5; }
.addr-add-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: block; }
.addr-add-desc { font-size: 24rpx; color: #999; margin-top: 4rpx; display: block; }
.addr-arrow { font-size: 36rpx; color: #CCC; flex-shrink: 0; }

.goods-item { display: flex; gap: 16rpx; padding: 16rpx 0; }
.goods-item + .goods-item { border-top: 1px solid #F5F1EB; }
.goods-img-wrap { width: 160rpx; height: 160rpx; border-radius: 16rpx; overflow: hidden; flex-shrink: 0; background: #F5F1EB; }
.goods-img { width: 100%; height: 100%; }
.goods-img-fb { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48rpx; }
.goods-info { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; }
.goods-name { font-size: 26rpx; font-weight: 500; color: #333; }
.goods-spec { font-size: 22rpx; color: #999; }
.goods-bottom { display: flex; justify-content: space-between; align-items: center; }
.goods-price { font-size: 30rpx; font-weight: 700; color: #C41E3A; }
.goods-qty { font-size: 26rpx; color: #999; }

.row-card { display: flex; justify-content: space-between; align-items: center; }
.row-left { display: flex; align-items: center; gap: 16rpx; }
.row-icon { font-size: 32rpx; }
.row-label { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.row-right { display: flex; align-items: center; gap: 8rpx; }
.row-val { font-size: 26rpx; }
.row-val.red { color: #C41E3A; }
.row-val.gray { color: #999; }
.row-arrow { font-size: 32rpx; color: #CCC; }

.note-row { display: flex; align-items: center; gap: 16rpx; }
.note-input { flex: 1; font-size: 26rpx; color: #2C2C2C; }
.note-count { font-size: 22rpx; color: #999; }

.price-line { display: flex; justify-content: space-between; align-items: center; padding: 10rpx 0; }
.pl-label { font-size: 26rpx; color: #999; }
.pl-label.bold { color: #2C2C2C; font-weight: 500; }
.pl-val { font-size: 26rpx; color: #2C2C2C; }
.pl-val.red { color: #C41E3A; }
.pl-total { font-size: 36rpx; font-weight: 700; color: #C41E3A; }
.total-line { margin-top: 8rpx; padding-top: 16rpx; border-top: 1px solid #F0EDE5; }

.pay-option { display: flex; justify-content: space-between; align-items: center; padding: 20rpx; border-radius: 16rpx; border: 2rpx solid #F0EDE5; margin-bottom: 12rpx; }
.pay-option.on { border-color: #C41E3A; background: rgba(196,30,58,0.04); }
.pay-option.off { opacity: 0.5; }
.pay-left { display: flex; align-items: center; gap: 16rpx; }
.pay-icon { width: 56rpx; height: 56rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 30rpx; }
.pay-icon.wx { background: rgba(7,193,96,0.15); }
.pay-icon.ali { background: rgba(22,119,255,0.15); }
.pay-icon.bal { background: rgba(201,169,110,0.15); }
.pay-text { display: flex; flex-direction: column; }
.pay-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.pay-sub { font-size: 22rpx; color: #999; }
.insufficient { color: #C41E3A; }
.pay-radio { width: 40rpx; height: 40rpx; border-radius: 50%; border: 3rpx solid #CCC; display: flex; align-items: center; justify-content: center; }
.pay-radio.on { background: #C41E3A; border-color: #C41E3A; }
.radio-mark { font-size: 24rpx; color: #fff; font-weight: 700; }

.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; z-index: 50; background: rgba(255,255,255,0.95); backdrop-filter: blur(12rpx); border-top: 1px solid #E8E0D5; display: flex; align-items: center; justify-content: space-between; padding: 16rpx 24rpx; padding-bottom: calc(16rpx + env(safe-area-inset-bottom)); }
.bottom-price { display: flex; align-items: baseline; gap: 4rpx; }
.bp-label { font-size: 26rpx; color: #999; }
.bp-num { font-size: 36rpx; font-weight: 700; color: #C41E3A; }
.pay-btn { padding: 16rpx 48rpx; border-radius: 40rpx; background: #C41E3A; color: #fff; font-size: 28rpx; font-weight: 500; }
.pay-btn.off { opacity: 0.5; background: #CCC; }

.panel-mask { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; }
.panel-sheet { width: 100%; background: #fff; border-radius: 32rpx 32rpx 0 0; max-height: 70vh; overflow: hidden; display: flex; flex-direction: column; }
.panel-head { display: flex; justify-content: space-between; align-items: center; padding: 28rpx 32rpx; border-bottom: 1px solid #F0EDE5; }
.panel-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.panel-done { font-size: 26rpx; color: #999; }
.panel-body { padding: 16rpx 32rpx 40rpx; overflow-y: auto; }
.coupon-option { display: flex; justify-content: space-between; align-items: center; padding: 24rpx; border-radius: 20rpx; border: 2rpx solid #F0EDE5; margin-bottom: 12rpx; }
.coupon-option.on { border-color: #C41E3A; background: rgba(196,30,58,0.04); }
.coupon-option.off { opacity: 0.5; }
.co-info { flex: 1; }
.co-top { display: flex; align-items: baseline; gap: 12rpx; margin-bottom: 6rpx; }
.co-amount { font-size: 36rpx; font-weight: 700; color: #C41E3A; }
.co-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.co-cond { font-size: 22rpx; color: #999; }
</style>
