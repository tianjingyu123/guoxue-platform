<script setup lang="ts">
/** 优惠券领取卡 - 从原型 components/static/marketing/marketing-slot.tsx CouponClaimCard 迁移 */
import { ref } from 'vue'

const props = defineProps<{
  amount: number
  threshold: number
  title?: string
  subtitle?: string
  claimed?: boolean
}>()

const emit = defineEmits<{ (e: 'claim'): void }>()
const isClaimed = ref(props.claimed ?? false)

function claim() {
  if (isClaimed.value) return
  isClaimed.value = true
  emit('claim')
}
</script>

<template>
  <view class="cc-card">
    <view class="cc-notch cc-notch-l" />
    <view class="cc-notch cc-notch-r" />
    <view class="cc-left">
      <view class="cc-amount">
        <text class="cc-cny">¥</text>
        <text class="cc-num">{{ amount }}</text>
        <text class="cc-th">满{{ threshold }}可用</text>
      </view>
      <view class="cc-divider" />
      <view>
        <text class="cc-title">{{ title || '课程优惠券' }}</text>
        <text class="cc-sub">{{ subtitle || '全场课程通用' }}</text>
      </view>
    </view>
    <view class="cc-btn" :class="{ 'cc-btn-done': isClaimed }" hover-class="cc-btn-press" @tap="claim">
      <text class="cc-btn-text" :class="{ 'cc-btn-text-done': isClaimed }">{{ isClaimed ? '已领取' : '立即领取' }}</text>
    </view>
</template>

<style scoped lang="scss">
.cc-card { position: relative; overflow: hidden; border-radius: 16rpx; border: 1rpx solid #fbcfe8; background: linear-gradient(90deg, #fef2f2, #fff7ed); display: flex; align-items: center; justify-content: space-between; padding: 18rpx 36rpx; }
.cc-notch { position: absolute; top: 50%; transform: translateY(-50%); width: 18rpx; height: 36rpx; background: var(--surface-sunken, #f5f5f5); }
.cc-notch-l { left: 0; border-radius: 0 999rpx 999rpx 0; }
.cc-notch-r { right: 0; border-radius: 999rpx 0 0 999rpx; }
.cc-left { display: flex; align-items: center; gap: 20rpx; }
.cc-amount { text-align: center; }
.cc-cny { font-size: 20rpx; color: #ef4444; }
.cc-num { font-size: 44rpx; font-weight: 700; color: #ef4444; }
.cc-th { display: block; font-size: 18rpx; color: var(--text-soft); }
.cc-divider { width: 1rpx; height: 56rpx; background: #fbcfe8; }
.cc-title { font-size: 26rpx; font-weight: 500; color: var(--text-strong); }
.cc-sub { display: block; font-size: 18rpx; color: var(--text-soft); margin-top: 4rpx; }
.cc-btn { height: 52rpx; padding: 0 26rpx; border-radius: 999rpx; background: #ef4444; display: flex; align-items: center; justify-content: center; }
.cc-btn-press { opacity: 0.85; }
.cc-btn-done { background: var(--surface-sunken); }
.cc-btn-text { font-size: 22rpx; color: #fff; }
.cc-btn-text-done { color: var(--text-soft); }
</style>
