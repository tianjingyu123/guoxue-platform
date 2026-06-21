<template>
  <view class="page">
    <!-- Header -->
    <view class="hd">
      <view class="hd-bar">
        <view
          class="icon-btn"
          @tap="goBack"
        >
          <AppIcon
            name="arrow-left"
            :size="40"
            :color="C.text"
          />
        </view>
        <text class="hd-title">
          确认订单
        </text>
        <view class="hd-spacer" />
      </view>
    </view>

    <scroll-view
      scroll-y
      class="body"
    >
      <!-- 书籍信息 -->
      <view class="card book-card">
        <view
          class="book-cover"
          :style="{ background: book.coverColor }"
        >
          <view class="cover-spine" />
          <view class="cover-text-wrap">
            <text class="cover-text">
              {{ book.title }}
            </text>
          </view>
        </view>
        <view class="book-info">
          <text class="book-title">
            {{ book.title }}
          </text>
          <text class="book-author">
            {{ book.author }}
          </text>
          <text class="book-tip">
            数字商品 · 购买后永久可读
          </text>
          <view
            v-if="book.isMemberFree"
            class="member-row"
          >
            <AppIcon
              name="crown"
              :size="28"
              :color="C.member"
            />
            <text class="member-tx">
              会员可免费领取
            </text>
            <text class="member-link">
              开通会员
            </text>
          </view>
        </view>
      </view>

      <!-- 价格明细 -->
      <view class="card">
        <view class="card-hd">
          <text class="card-hd-tx">
            价格明细
          </text>
        </view>
        <view class="price-body">
          <view class="price-row">
            <text class="price-label">
              商品原价
            </text>
            <text class="price-del">
              ¥{{ book.originalPrice }}
            </text>
          </view>
          <view class="price-row">
            <text class="price-label">
              限时优惠
            </text>
            <text class="price-free">
              -¥{{ book.originalPrice - book.price }}
            </text>
          </view>
          <view
            v-if="couponApplied"
            class="price-row"
          >
            <text class="price-label">
              优惠券
            </text>
            <text class="price-free">
              -¥10
            </text>
          </view>
          <view class="price-total">
            <text class="price-total-label">
              实付金额
            </text>
            <text class="price-total-val">
              ¥{{ finalPrice }}
            </text>
          </view>
        </view>
      </view>

      <!-- 优惠券 -->
      <view class="card">
        <view
          class="coupon-hd"
          @tap="showCoupon = !showCoupon"
        >
          <view class="coupon-left">
            <AppIcon
              name="tag"
              :size="32"
              :color="C.price"
            />
            <text class="coupon-tx">
              优惠券
            </text>
          </view>
          <view class="coupon-right">
            <text class="coupon-state">
              {{ couponApplied ? '已使用 1 张' : '可用 1 张' }}
            </text>
            <AppIcon
              name="chevron-down"
              :size="32"
              :color="C.textSoft"
              :class="{ rotated: showCoupon }"
            />
          </view>
        </view>
        <view
          v-if="showCoupon"
          class="coupon-body"
        >
          <input
            v-model="couponCode"
            class="coupon-input"
            placeholder="输入优惠码"
            placeholder-class="ph"
          >
          <view
            class="coupon-use-btn"
            @tap="applyCoupon"
          >
            <text class="coupon-use-tx">
              使用
            </text>
          </view>
        </view>
      </view>

      <!-- 支付方式 -->
      <view class="card">
        <view class="card-hd">
          <text class="card-hd-tx">
            支付方式
          </text>
        </view>
        <view
          v-for="(method, idx) in payMethods"
          :key="method.id"
          class="pay-item"
          :class="{ active: payMethod === method.id, 'no-border': idx === 0 }"
          @tap="payMethod = method.id"
        >
          <view class="pay-left">
            <AppIcon
              :name="method.icon"
              :size="40"
              :color="method.iconColor"
            />
            <text class="pay-label">
              {{ method.label }}
            </text>
          </view>
          <view
            class="radio"
            :class="{ 'radio-on': payMethod === method.id }"
          >
            <view
              v-if="payMethod === method.id"
              class="radio-dot"
            />
          </view>
        </view>
      </view>

      <!-- 安全提示 -->
      <view class="secure">
        <AppIcon
          name="shield"
          :size="28"
          :color="C.free"
        />
        <text class="secure-tx">
          安全支付由平台保障 · 购买即同意服务协议
        </text>
      </view>
    </scroll-view>

    <!-- 底部支付栏 -->
    <view class="pay-bar">
      <view class="pay-amount">
        <text class="pay-amount-label">
          应付
        </text>
        <text class="pay-amount-val">
          ¥{{ finalPrice }}
        </text>
      </view>
      <view
        class="pay-btn"
        :class="{ disabled: isProcessing }"
        @tap="handlePay"
      >
        <view
          v-if="isProcessing"
          class="pay-btn-inner"
        >
          <view class="spinner" />
          <text class="pay-btn-tx">
            支付中...
          </text>
        </view>
        <view
          v-else
          class="pay-btn-inner"
        >
          <AppIcon
            name="lock"
            :size="32"
            color="#ffffff"
          />
          <text class="pay-btn-tx">
            立即支付
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { ebookCheckoutBook, ebookPayMethods } from '@/lib/ebook-data'

const C = {
  text: '#1e293b', textSoft: '#64748b', member: '#7c3aed', price: '#dc2626', free: '#16a34a',
}

const book = ebookCheckoutBook
const payMethods = ebookPayMethods
const payMethod = ref('wechat')
const couponCode = ref('')
const couponApplied = ref(false)
const showCoupon = ref(false)
const isProcessing = ref(false)

const finalPrice = computed(() => (couponApplied.value ? book.price - 10 : book.price))

function applyCoupon() {
  if (couponCode.value) couponApplied.value = true
}
function goBack() {
  uni.navigateBack()
}
function handlePay() {
  if (isProcessing.value) return
  isProcessing.value = true
  setTimeout(() => {
    isProcessing.value = false
    uni.redirectTo({ url: `/pkg-ebook/checkout/success?id=${book.id}` })
  }, 1200)
}
</script>

<style scoped lang="scss">
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--ebook-bg);
}
.hd {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255, 255, 255, 0.95);
  border-bottom: 2rpx solid var(--ebook-border);
}
.hd-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  height: 112rpx;
}
.icon-btn {
  padding: 12rpx;
  margin-left: -12rpx;
  border-radius: 16rpx;
}
.hd-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--ebook-text);
}
.hd-spacer {
  width: 72rpx;
}
.body {
  flex: 1;
  padding: 32rpx;
  box-sizing: border-box;
}
.card {
  background: #fff;
  border: 2rpx solid var(--ebook-border);
  border-radius: 24rpx;
  overflow: hidden;
  margin-bottom: 32rpx;
}
.book-card {
  display: flex;
  gap: 24rpx;
  padding: 32rpx;
}
.book-cover {
  width: 128rpx;
  height: 192rpx;
  border-radius: 16rpx;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.15);
}
.cover-spine {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 8rpx;
  background: rgba(255, 255, 255, 0.1);
}
.cover-text-wrap {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8rpx;
}
.cover-text {
  color: rgba(255, 255, 255, 0.8);
  font-size: 20rpx;
  font-weight: 500;
  text-align: center;
  line-height: 1.4;
}
.book-info {
  flex: 1;
  min-width: 0;
}
.book-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: var(--ebook-text);
}
.book-author {
  display: block;
  font-size: 28rpx;
  color: var(--ebook-text-soft);
  margin-top: 8rpx;
}
.book-tip {
  display: block;
  font-size: 24rpx;
  color: var(--ebook-text-soft);
  margin-top: 8rpx;
}
.member-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 16rpx;
}
.member-tx {
  font-size: 24rpx;
  color: var(--ebook-member);
}
.member-link {
  font-size: 24rpx;
  color: var(--ebook-member);
  text-decoration: underline;
}
.card-hd {
  padding: 24rpx 32rpx;
  border-bottom: 2rpx solid var(--ebook-border);
}
.card-hd-tx {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--ebook-text);
}
.price-body {
  padding: 24rpx 32rpx;
}
.price-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.price-label {
  font-size: 28rpx;
  color: var(--ebook-text-soft);
}
.price-del {
  font-size: 28rpx;
  color: #94a3b8;
  text-decoration: line-through;
}
.price-free {
  font-size: 28rpx;
  color: var(--ebook-free);
}
.price-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 2rpx solid var(--ebook-border);
  padding-top: 24rpx;
}
.price-total-label {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--ebook-text);
}
.price-total-val {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--ebook-price);
}
.coupon-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
}
.coupon-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.coupon-tx {
  font-size: 28rpx;
  color: var(--ebook-text);
}
.coupon-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.coupon-state {
  font-size: 24rpx;
  color: var(--ebook-text-soft);
}
.rotated {
  transform: rotate(180deg);
}
.coupon-body {
  display: flex;
  gap: 16rpx;
  padding: 0 32rpx 32rpx;
}
.coupon-input {
  flex: 1;
  height: 72rpx;
  padding: 0 24rpx;
  border-radius: 12rpx;
  border: 2rpx solid var(--ebook-border);
  background: #f8fafc;
  font-size: 28rpx;
  color: var(--ebook-text);
  box-sizing: border-box;
}
.ph {
  color: #94a3b8;
}
.coupon-use-btn {
  height: 72rpx;
  padding: 0 32rpx;
  border: 2rpx solid var(--ebook-primary);
  border-radius: 12rpx;
  display: flex;
  align-items: center;
}
.coupon-use-tx {
  font-size: 26rpx;
  color: var(--ebook-primary);
}
.pay-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-top: 2rpx solid var(--ebook-border);
}
.pay-item.no-border {
  border-top: none;
}
.pay-item.active {
  background: var(--ebook-primary-soft);
}
.pay-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.pay-label {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--ebook-text);
}
.radio {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 4rpx solid #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.radio-on {
  border-color: var(--ebook-primary);
  background: var(--ebook-primary);
}
.radio-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #fff;
}
.secure {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 8rpx 0 24rpx;
}
.secure-tx {
  font-size: 24rpx;
  color: var(--ebook-text-soft);
}
.pay-bar {
  display: flex;
  align-items: center;
  gap: 32rpx;
  background: #fff;
  border-top: 2rpx solid var(--ebook-border);
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
}
.pay-amount {
  display: flex;
  flex-direction: column;
}
.pay-amount-label {
  font-size: 24rpx;
  color: var(--ebook-text-soft);
}
.pay-amount-val {
  font-size: 48rpx;
  font-weight: 700;
  color: var(--ebook-price);
}
.pay-btn {
  flex: 1;
  height: 96rpx;
  background: var(--ebook-primary);
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pay-btn.disabled {
  opacity: 0.7;
}
.pay-btn-inner {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.pay-btn-tx {
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;
}
.spinner {
  width: 32rpx;
  height: 32rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
