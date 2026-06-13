<template>
  <view class="coupons-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">优惠券</text>
        <view class="header-spacer" />
      </view>
      <view class="tab-row">
        <view v-for="tab in tabs" :key="tab.id" class="tab" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">
          {{ tab.label }}({{ tab.count }})
        </view>
      </view>
    </view>

    <view class="coupons-list">
      <view v-for="coupon in currentCoupons" :key="coupon.id" class="coupon-card" :class="{ dimmed: activeTab !== 'available' }">
        <view class="cc-left" :class="{ muted: activeTab !== 'available' }">
          <text v-if="coupon.isPercent" class="cc-amount">{{ coupon.amount }}<text class="cc-unit">折</text></text>
          <text v-else class="cc-amount"><text class="cc-unit">¥</text>{{ coupon.amount }}</text>
          <text class="cc-condition">{{ coupon.condition }}</text>
        </view>
        <view class="cc-dashes" />
        <view class="cc-right">
          <text class="cc-type-tag">{{ coupon.type }}</text>
          <text class="cc-scope">{{ coupon.scope }}</text>
          <text class="cc-expire">有效期至 {{ coupon.expireDate }}</text>
          <view v-if="activeTab === 'available'" class="cc-use-btn" @click="goPage('/pages/mall/index')">立即使用</view>
          <text v-if="activeTab === 'used' && coupon.usedDate" class="cc-used-time">使用时间：{{ coupon.usedDate }}</text>
        </view>
        <view v-if="activeTab !== 'available'" class="cc-watermark">{{ activeTab === 'used' ? '已使用' : '已过期' }}</view>
      </view>

      <view v-if="currentCoupons.length === 0" class="empty-wrap">
        <text class="empty-icon">🎫</text>
        <text class="empty-text">暂无优惠券</text>
        <view class="empty-btn" @click="goPage('/pages/coupons/center/index')">去领券中心看看</view>
      </view>
    </view>

    <view class="bottom-bar">
      <view class="bb-btn" @click="goPage('/pages/coupons/center/index')">
        <text>🎁 领券中心</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const activeTab = ref('available')

const couponsData = {
  available: [
    { id: 1, amount: 10, type: '满减券', condition: '满99元可用', scope: '全部商品', expireDate: '2026.12.31', isPercent: false },
    { id: 2, amount: 50, type: '满减券', condition: '满299元可用', scope: '全部课程', expireDate: '2026.06.30', isPercent: false },
    { id: 3, amount: 8, type: '折扣券', condition: '无门槛', scope: '指定商品', expireDate: '2026.03.15', isPercent: true },
    { id: 4, amount: 5, type: '无门槛券', condition: '无门槛', scope: '全部商品', expireDate: '2026.02.28', isPercent: false },
  ],
  used: [
    { id: 5, amount: 20, type: '满减券', condition: '满199元可用', scope: '全部商品', expireDate: '2026.01.15', isPercent: false, usedDate: '2026.01.10' },
    { id: 6, amount: 100, type: '满减券', condition: '满599元可用', scope: '全部课程', expireDate: '2025.12.31', isPercent: false, usedDate: '2025.12.25' },
  ],
  expired: [
    { id: 7, amount: 15, type: '满减券', condition: '满149元可用', scope: '全部商品', expireDate: '2025.11.30', isPercent: false },
    { id: 8, amount: 30, type: '满减券', condition: '满249元可用', scope: '指定圈子', expireDate: '2025.10.15', isPercent: false },
  ],
}

const tabs = [
  { id: 'available', label: '可用', count: couponsData.available.length },
  { id: 'used', label: '已使用', count: couponsData.used.length },
  { id: 'expired', label: '已过期', count: couponsData.expired.length },
]

const currentCoupons = computed(() => {
  switch (activeTab.value) {
    case 'available': return couponsData.available
    case 'used': return couponsData.used
    case 'expired': return couponsData.expired
    default: return []
  }
})

function goPage(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.coupons-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 140rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: rgba(250,248,245,0.95); backdrop-filter: blur(12rpx); border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 0 24rpx; height: 88rpx; }
.header-back { font-size: 48rpx; color: #333; width: 64rpx; }
.header-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; flex: 1; }
.header-spacer { width: 64rpx; }

.tab-row { display: flex; }
.tab { flex: 1; text-align: center; padding: 18rpx 0; font-size: 26rpx; color: #999; position: relative; }
.tab.active { color: #C41E3A; font-weight: 500; }
.tab.active::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 48rpx; height: 4rpx; background: #C41E3A; border-radius: 2rpx; }

.coupons-list { padding: 20rpx 24rpx; }

.coupon-card { display: flex; background: #fff; border-radius: 16rpx; margin-bottom: 16rpx; overflow: hidden; position: relative; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
.coupon-card.dimmed { opacity: 0.6; }

.cc-left { width: 180rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 28rpx 16rpx; background: linear-gradient(180deg, #C41E3A, #C9A96E); color: #fff; position: relative; }
.cc-left.muted { background: #DDD; color: #999; }
.cc-amount { font-size: 48rpx; font-weight: 700; }
.cc-unit { font-size: 28rpx; }
.cc-condition { font-size: 20rpx; margin-top: 6rpx; opacity: 0.8; }

.cc-dashes { width: 4rpx; flex-shrink: 0; background: repeating-linear-gradient(to bottom, transparent, transparent 8rpx, #F0EDE5 8rpx, #F0EDE5 10rpx); }

.cc-right { flex: 1; padding: 20rpx 24rpx; position: relative; }
.cc-type-tag { font-size: 20rpx; color: #C41E3A; border: 1px solid rgba(196,30,58,0.3); padding: 2rpx 12rpx; border-radius: 8rpx; position: absolute; top: 16rpx; right: 16rpx; }
.cc-scope { font-size: 26rpx; font-weight: 500; color: #333; display: block; margin-top: 8rpx; padding-right: 100rpx; }
.cc-expire { font-size: 20rpx; color: #BBB; margin-top: 8rpx; display: block; }
.cc-use-btn { display: inline-block; padding: 8rpx 24rpx; border-radius: 24rpx; background: #C41E3A; color: #fff; font-size: 22rpx; margin-top: 14rpx; }
.cc-used-time { font-size: 20rpx; color: #BBB; margin-top: 8rpx; }

.cc-watermark { position: absolute; top: 50%; right: 32rpx; transform: translateY(-50%) rotate(-15deg); font-size: 36rpx; font-weight: 700; color: rgba(0,0,0,0.08); }

.empty-wrap { display: flex; flex-direction: column; align-items: center; padding: 120rpx 48rpx; }
.empty-icon { font-size: 88rpx; opacity: 0.3; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; margin-bottom: 20rpx; }
.empty-btn { padding: 14rpx 36rpx; border-radius: 40rpx; background: #C41E3A; color: #fff; font-size: 26rpx; }

.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 16rpx 24rpx 24rpx; background: rgba(255,255,255,0.95); backdrop-filter: blur(12rpx); border-top: 1px solid #E8E0D5; }
.bb-btn { width: 100%; height: 88rpx; border-radius: 20rpx; background: linear-gradient(135deg, #C41E3A, #C9A96E); color: #fff; font-size: 28rpx; font-weight: 500; display: flex; align-items: center; justify-content: center; }
</style>
