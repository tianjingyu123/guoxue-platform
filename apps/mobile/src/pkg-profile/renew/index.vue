<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="back-btn" @tap="handleBack">
          <AppIcon name="arrow-left" :size="20" color="#2c2c2c" />
        </view>
        <text class="nav-title">续费会员</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ paddingBottom: '120rpx' }">
      <!-- 当前会员状态 -->
      <view class="status-card">
        <AppIcon name="crown" :size="40" color="#f0a020" />
        <view class="status-info">
          <text class="status-title">{{ currentPlan.name }}</text>
          <view class="status-expire">
            <AppIcon name="alert-circle" :size="12" color="#f97316" />
            <text class="status-expire-text">到期时间：{{ currentPlan.expireDate }}（还剩 {{ currentPlan.daysLeft }} 天）</text>
          </view>
        </view>
      </view>

      <!-- 续费时长选择 -->
      <view class="section">
        <text class="section-title">选择续费时长</text>
        <view class="plan-grid">
          <view
            v-for="p in plans"
            :key="p.id"
            class="plan-item"
            :class="{ 'plan-item-active': selected === p.id }"
            @tap="selected = p.id"
          >
            <text v-if="p.tag" class="plan-tag" :class="p.highlight ? 'tag-primary' : 'tag-amber'">{{ p.tag }}</text>
            <text class="plan-label">{{ p.label }}</text>
            <view class="plan-price">
              <text class="plan-price-unit">¥</text>
              <text class="plan-price-num">{{ p.price }}</text>
            </view>
            <text class="plan-origin">¥{{ p.originalPrice }}</text>
            <text class="plan-permonth">约 ¥{{ p.perMonth }}/月</text>
            <view v-if="selected === p.id" class="plan-check">
              <AppIcon name="check" :size="10" color="#ffffff" />
            </view>
          </view>
        </view>
      </view>

      <!-- 自动续费 -->
      <view class="auto-renew" @tap="autoRenew = !autoRenew">
        <view class="switch" :class="{ 'switch-on': autoRenew }">
          <view class="switch-dot" :class="{ 'switch-dot-on': autoRenew }" />
        </view>
        <view class="auto-renew-info">
          <view class="auto-renew-title">
            <AppIcon name="refresh-cw" :size="14" color="#2c2c2c" />
            <text class="auto-renew-title-text">自动续费</text>
          </view>
          <text class="auto-renew-sub">到期前 7 天自动扣款，随时可取消</text>
        </view>
      </view>

      <!-- 续费权益 -->
      <view class="benefits">
        <text class="benefits-title">续费后享有权益</text>
        <view class="benefits-grid">
          <view v-for="b in benefits" :key="b" class="benefit-item">
            <AppIcon name="check" :size="12" color="#c41e3a" />
            <text class="benefit-text">{{ b }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部支付栏 -->
    <view class="pay-bar" :style="{ paddingBottom: 'calc(16rpx + ' + safeBottom + 'px)' }">
      <view class="pay-price-wrap">
        <text class="pay-price">¥{{ currentSelected.price }}</text>
        <text class="pay-origin">原价 ¥{{ currentSelected.originalPrice }}</text>
      </view>
      <view class="pay-btn" :class="{ 'pay-btn-disabled': paying }" @tap="handlePay">
        <text class="pay-btn-text">{{ paying ? '处理中…' : '立即续费' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateBack, navigateTo, reLaunch } from '@/utils/router'

interface Plan {
  id: string
  label: string
  price: string
  originalPrice: string
  perMonth: string
  highlight?: boolean
  tag?: string
  months: number
}

const statusBarHeight = ref(0)
const safeBottom = ref(0)

const currentPlan = ref({
  name: '专业会员',
  expireDate: '2024-02-20',
  daysLeft: 30,
})

const plans = ref<Plan[]>([
  { id: '1', label: '1个月', price: '28', originalPrice: '38', perMonth: '28', months: 1 },
  { id: '2', label: '3个月', price: '68', originalPrice: '114', perMonth: '22.7', months: 3, tag: '热门' },
  { id: '3', label: '12个月', price: '198', originalPrice: '456', perMonth: '16.5', months: 12, highlight: true, tag: '最优惠' },
])

const benefits = ['不限次排盘解读', '命理分析报告', '专家一对一咨询', '海量古籍资料', 'AI 智能助手', 'VIP 专属课程']

const selected = ref('3')
const autoRenew = ref(false)
const paying = ref(false)

const currentSelected = computed(() => plans.value.find((p) => p.id === selected.value) || plans.value[0])

onLoad(() => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 0
    safeBottom.value = info.safeAreaInsets?.bottom || 0
  } catch (e) {
    statusBarHeight.value = 20
  }
})

function handleBack() {
  navigateBack()
}

function handlePay() {
  if (paying.value) return
  paying.value = true
  setTimeout(() => {
    paying.value = false
    uni.showToast({ title: '续费成功', icon: 'success' })
    setTimeout(() => navigateTo('/vip'), 800)
  }, 1500)
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f7f8;
  display: flex;
  flex-direction: column;
}

.navbar {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #ffffff;
  border-bottom: 1rpx solid #ededed;
}
.nav-inner {
  height: 88rpx;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  gap: 24rpx;
}
.back-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.nav-placeholder {
  width: 56rpx;
}

.scroll {
  flex: 1;
}

.status-card {
  margin: 24rpx;
  padding: 28rpx;
  background: #fef8ec;
  border: 1rpx solid #f6e2b3;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.status-info {
  flex: 1;
}
.status-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.status-expire {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-top: 6rpx;
}
.status-expire-text {
  font-size: 22rpx;
  color: #888888;
}

.section {
  padding: 0 24rpx;
  margin-top: 24rpx;
}
.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2c2c2c;
  display: block;
  margin-bottom: 24rpx;
}
.plan-grid {
  display: flex;
  gap: 20rpx;
}
.plan-item {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28rpx 12rpx;
  border-radius: 20rpx;
  border: 3rpx solid #ededed;
  background: #ffffff;
}
.plan-item-active {
  border-color: #c41e3a;
  background: #fdf3f4;
}
.plan-tag {
  position: absolute;
  top: -18rpx;
  left: 50%;
  transform: translateX(-50%);
  font-size: 18rpx;
  font-weight: 700;
  color: #ffffff;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  white-space: nowrap;
}
.tag-primary {
  background: #c41e3a;
}
.tag-amber {
  background: #f0a020;
}
.plan-label {
  font-size: 22rpx;
  color: #888888;
  margin-bottom: 6rpx;
}
.plan-price {
  display: flex;
  align-items: baseline;
}
.plan-price-unit {
  font-size: 22rpx;
  font-weight: 800;
  color: #2c2c2c;
}
.plan-price-num {
  font-size: 40rpx;
  font-weight: 800;
  color: #2c2c2c;
}
.plan-origin {
  font-size: 18rpx;
  color: #aaaaaa;
  text-decoration: line-through;
  margin-top: 4rpx;
}
.plan-permonth {
  font-size: 18rpx;
  color: #c41e3a;
  margin-top: 8rpx;
}
.plan-check {
  position: absolute;
  bottom: 12rpx;
  right: 12rpx;
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  background: #c41e3a;
  display: flex;
  align-items: center;
  justify-content: center;
}

.auto-renew {
  margin: 32rpx 24rpx 0;
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  background: #ffffff;
  border: 1rpx solid #ededed;
  border-radius: 20rpx;
}
.switch {
  width: 72rpx;
  height: 40rpx;
  border-radius: 999rpx;
  background: #e0e0e0;
  display: flex;
  align-items: center;
  padding: 0 4rpx;
  transition: background 0.2s;
}
.switch-on {
  background: #c41e3a;
}
.switch-dot {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.15);
  transition: transform 0.2s;
}
.switch-dot-on {
  transform: translateX(32rpx);
}
.auto-renew-info {
  flex: 1;
}
.auto-renew-title {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.auto-renew-title-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.auto-renew-sub {
  font-size: 22rpx;
  color: #888888;
  margin-top: 6rpx;
}

.benefits {
  margin: 32rpx 24rpx 0;
  padding: 28rpx;
  background: #f0f0f2;
  border-radius: 20rpx;
}
.benefits-title {
  font-size: 24rpx;
  font-weight: 600;
  color: #2c2c2c;
  display: block;
  margin-bottom: 18rpx;
}
.benefits-grid {
  display: flex;
  flex-wrap: wrap;
}
.benefit-item {
  width: 50%;
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 8rpx 0;
}
.benefit-text {
  font-size: 24rpx;
  color: #666666;
}

.pay-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ffffff;
  border-top: 1rpx solid #ededed;
  padding: 16rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.pay-price-wrap {
  display: flex;
  flex-direction: column;
}
.pay-price {
  font-size: 36rpx;
  font-weight: 800;
  color: #c41e3a;
}
.pay-origin {
  font-size: 22rpx;
  color: #888888;
}
.pay-btn {
  flex: 1;
  height: 88rpx;
  background: #c41e3a;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pay-btn-disabled {
  opacity: 0.6;
}
.pay-btn-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #ffffff;
}
</style>
