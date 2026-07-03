<template>
  <!-- 详情大卡：面值 / 门槛 / 有效期 / 说明（coupon-detail 复用） -->
  <view v-if="mode === 'detail'" class="ci-hero">
    <view class="hero-head">
      <view class="hero-value">
        <text class="hero-num">{{ coupon.value }}</text>
        <text class="hero-unit">元</text>
      </view>
      <view class="hero-right">
        <text class="hero-min">满{{ coupon.minAmount }}元可用</text>
        <text class="hero-expire">至 {{ coupon.expireAt }}</text>
      </view>
    </view>
    <view class="hero-divider" />
    <text class="hero-desc">{{ coupon.description }}</text>
  </view>

  <!-- 列表卡：领券中心 / 我的券（coupons 页复用） -->
  <view v-else class="coupon" :class="{ 'coupon--dim': dimmed }">
    <view class="coupon-value" :class="valueActive ? 'coupon-value--active' : 'coupon-value--gray'">
      <view v-if="valueActive" class="cv-top" />
      <text class="cv-amount" :class="{ 'cv-amount--gray': !valueActive }">{{ valueText }}</text>
      <text class="cv-min">{{ minText }}</text>
    </view>
    <view class="coupon-info">
      <view class="ci-main">
        <text class="ci-name">{{ coupon.name }}</text>
        <view class="ci-scopes">
          <text
            v-for="s in coupon.scope"
            :key="s"
            class="ci-scope"
            :class="{ 'ci-scope--gray': !valueActive }"
          >{{ s }}</text>
        </view>
        <view v-if="coupon.expireAt" class="ci-meta">
          <app-icon name="clock" :size="22" color="#999" />
          <text class="ci-meta-text">有效期至 {{ coupon.expireAt }}</text>
        </view>
        <text v-if="mode === 'center' && stockText" class="ci-claimed">{{ stockText }}</text>
      </view>

      <!-- 领券中心：领取按钮 -->
      <view
        v-if="mode === 'center'"
        class="claim-btn"
        :class="{ 'claim-btn--done': isDone }"
        @tap="onClaim"
      >
        <text class="claim-text">{{ claimText }}</text>
      </view>
      <!-- 我的券：去使用 / 状态 -->
      <template v-else>
        <view v-if="coupon.status === 'unused'" class="use-link" @tap="onUse">
          <text class="use-text">去使用</text>
          <app-icon name="chevron-right" :size="26" color="#c41e3a" />
        </view>
        <view v-else class="status-link">
          <app-icon v-if="coupon.status === 'used'" name="check" :size="26" color="#999" />
          <text class="status-text">{{ coupon.status === 'used' ? '已使用' : '已过期' }}</text>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatCouponValue, type CouponType } from '@/lib/coupon-data'

/** 优惠券展示对象（宽松聚合三处数据形态：领券中心/我的券/详情） */
interface CouponLike {
  id?: string
  name?: string
  type?: CouponType
  value?: number
  minAmount?: number
  expireAt?: string
  description?: string
  scope?: string[]
  /** 我的券状态 */
  status?: 'unused' | 'used' | 'expired'
  /** 领券中心库存/限领 */
  remaining?: number
  perUserLimit?: number
  claimed?: number
}

const props = withDefaults(
  defineProps<{
    coupon: CouponLike
    /** center=领券中心卡 / mine=我的券卡 / detail=详情大卡 */
    mode: 'center' | 'mine' | 'detail'
    /** 领券中心：当前券领取中（防重复 + 文案） */
    claiming?: boolean
  }>(),
  { claiming: false },
)

const emit = defineEmits<{
  (e: 'claim', coupon: CouponLike): void
  (e: 'use', coupon: CouponLike): void
}>()

/* ── 面值 / 门槛展示 ── */
const valueText = computed(() =>
  formatCouponValue({ type: props.coupon.type ?? 'amount', value: props.coupon.value ?? 0 }),
)
const minText = computed(() =>
  (props.coupon.minAmount ?? 0) > 0 ? `满${props.coupon.minAmount}可用` : '无门槛',
)
/** 值区高亮：领券中心恒亮；我的券仅未使用亮 */
const valueActive = computed(() => props.mode === 'center' || props.coupon.status === 'unused')

/* ── 领券中心状态判定 ── */
const soldOut = computed(() => props.coupon.remaining === 0)
const reachedLimit = computed(() => {
  // perUserLimit=0 表后端未提供限领数（shop 体系）：持有未使用券即视为已领
  const limit = props.coupon.perUserLimit ?? 0
  const claimed = props.coupon.claimed ?? 0
  return limit > 0 ? claimed >= limit : claimed > 0
})
const isDone = computed(() => soldOut.value || reachedLimit.value)
const claimText = computed(() => {
  if (props.claiming) return '领取中...'
  if (reachedLimit.value) return '已领取'
  if (soldOut.value) return '已抢完'
  return '立即领取'
})
const stockText = computed(() => {
  // 限领数缺失（perUserLimit=0）时诚实隐藏，不编造「每人限领1张」
  const limit = (props.coupon.perUserLimit ?? 0) >= 1 ? `每人限领${props.coupon.perUserLimit}张` : ''
  const stock = (props.coupon.remaining ?? -1) >= 0 ? `剩余 ${props.coupon.remaining} 张` : ''
  return [stock, limit].filter(Boolean).join(' · ')
})

/** 置灰：领券中心已领/抢完；我的券非未使用 */
const dimmed = computed(() =>
  props.mode === 'center' ? isDone.value : props.coupon.status !== 'unused',
)

function onClaim() {
  if (isDone.value || props.claiming) return
  emit('claim', props.coupon)
}
function onUse() {
  emit('use', props.coupon)
}
</script>

<style lang="scss" scoped>
/* ── 详情大卡 ── */
.ci-hero {
  background: linear-gradient(90deg, var(--brand), #e74c57);
  border-radius: 24rpx;
  padding: 48rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 12rpx 32rpx rgba(196, 30, 58, 0.2);
}
.hero-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.hero-value {
  display: flex;
  flex-direction: column;
}
.hero-num {
  font-size: 72rpx;
  font-weight: 700;
  color: #fff;
  line-height: 1;
}
.hero-unit {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 8rpx;
}
.hero-right {
  text-align: right;
}
.hero-min {
  font-size: 26rpx;
  color: #fff;
  display: block;
}
.hero-expire {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 8rpx;
  display: block;
}
.hero-divider {
  height: 1rpx;
  background: rgba(255, 255, 255, 0.3);
  margin: 24rpx 0;
}
.hero-desc {
  font-size: 26rpx;
  color: #fff;
}

/* ── 列表卡 ── */
.coupon {
  display: flex;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.coupon--dim {
  opacity: 0.6;
}
.coupon-value {
  position: relative;
  width: 224rpx;
  flex-shrink: 0;
  padding: 32rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-right: 2rpx dashed #e8e3db;
}
.coupon-value--active {
  background: linear-gradient(135deg, #fff5f5, #ffe8e8);
}
.coupon-value--gray {
  background: #f5f5f5;
}
.cv-top {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 6rpx;
  background: linear-gradient(90deg, var(--brand), #e85a71);
}
.cv-amount {
  font-size: 48rpx;
  font-weight: 700;
  color: var(--brand);
}
.cv-amount--gray {
  color: #999;
}
.cv-min {
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
}
.coupon-info {
  flex: 1;
  min-width: 0;
  padding: 24rpx;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.ci-main {
  flex: 1;
  min-width: 0;
}
.ci-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  display: block;
}
.ci-scopes {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 12rpx;
}
.ci-scope {
  padding: 2rpx 12rpx;
  background: #fff5f5;
  color: var(--brand);
  font-size: 20rpx;
  border-radius: 6rpx;
}
.ci-scope--gray {
  background: #f0f0f0;
  color: #999;
}
.ci-meta {
  display: flex;
  align-items: center;
  gap: 4rpx;
  margin-top: 12rpx;
}
.ci-meta-text {
  font-size: 22rpx;
  color: #999;
}
.ci-claimed {
  font-size: 22rpx;
  color: #999;
  margin-top: 6rpx;
  display: block;
}
.claim-btn {
  flex-shrink: 0;
  padding: 12rpx 28rpx;
  background: var(--brand);
  border-radius: 999rpx;
}
.claim-btn--done {
  background: #f0f0f0;
}
.claim-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #fff;
}
.claim-btn--done .claim-text {
  color: #999;
}
.use-link,
.status-link {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 2rpx;
}
.use-text {
  font-size: 26rpx;
  color: var(--brand);
}
.status-text {
  font-size: 26rpx;
  color: #999;
}
</style>
