<template>
  <view class="cp-page">
    <!-- 导航 -->
    <view class="navbar">
      <view class="nav-back" hover-class="nav-hover" @tap="goBack">
        <app-icon name="chevron-left" :size="44" color="#fff" />
      </view>
      <text class="nav-title">我的优惠券</text>
    </view>

    <!-- Tab -->
    <view class="tabs">
      <view
        v-for="t in couponTabs"
        :key="t.key"
        class="tab"
        @tap="activeTab = t.key"
      >
        <text class="tab-text" :class="{ 'tab-text--on': activeTab === t.key }">{{ t.label }}</text>
        <text v-if="t.key === 'unused' && unusedCount" class="tab-badge">{{ unusedCount }}</text>
        <view v-if="activeTab === t.key" class="tab-line" />
      </view>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="body">
      <view class="empty">
        <text class="empty-text">加载中...</text>
      </view>
    </view>

    <!-- 错误 -->
    <view v-else-if="error" class="body">
      <view class="empty">
        <app-icon name="alert-circle" :size="72" color="#E74C3C" />
        <text class="empty-text">{{ error }}</text>
        <view class="retry-btn" hover-class="btn-hover" @tap="retry">
          <text class="retry-btn-text">重试</text>
        </view>
      </view>
    </view>

    <!-- 领券中心 -->
    <view v-else-if="activeTab === 'center'" class="body">
      <view class="center-banner">
        <view class="cb-head">
          <app-icon name="gift" :size="36" color="#fff" />
          <text class="cb-title">限时领券</text>
        </view>
        <text class="cb-sub">精选优惠券，领取后可在结算时使用</text>
      </view>
      <view
        v-for="c in centerList"
        :key="c.id"
        class="coupon"
        :class="{ 'coupon--claimed': c.isClaimed }"
      >
        <view class="coupon-value coupon-value--active">
          <view class="cv-top" />
          <text class="cv-amount">{{ formatCouponValue(c) }}</text>
          <text class="cv-min">满{{ c.minAmount }}可用</text>
        </view>
        <view class="coupon-info">
          <view class="ci-main">
            <text class="ci-name">{{ c.name }}</text>
            <view class="ci-scopes">
              <text v-for="s in c.scope" :key="s" class="ci-scope">{{ s }}</text>
            </view>
            <view class="ci-meta">
              <app-icon name="clock" :size="22" color="#999" />
              <text class="ci-meta-text">有效期至 {{ c.expireAt }}</text>
            </view>
            <text class="ci-claimed">已领 {{ c.claimed }}/{{ c.stock }}</text>
          </view>
          <view
            class="claim-btn"
            :class="{ 'claim-btn--done': c.isClaimed }"
            @tap="claim(c)"
          >
            <text class="claim-text">{{ claimingId === c.id ? '领取中...' : c.isClaimed ? '已领取' : '立即领取' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 我的券列表 -->
    <view v-else class="body">
      <view v-if="!filtered.length" class="empty">
        <app-icon name="ticket" :size="72" color="#e8e3db" />
        <text class="empty-text">{{ emptyText }}</text>
        <view v-if="activeTab === 'unused'" class="empty-btn" @tap="activeTab = 'center'">
          <text class="empty-btn-text">去领券</text>
        </view>
      </view>
      <view
        v-for="c in filtered"
        :key="c.id"
        class="coupon"
        :class="{ 'coupon--disabled': c.status !== 'unused' }"
      >
        <view class="coupon-value" :class="c.status === 'unused' ? 'coupon-value--active' : 'coupon-value--gray'">
          <view v-if="c.status === 'unused'" class="cv-top" />
          <text class="cv-amount" :class="{ 'cv-amount--gray': c.status !== 'unused' }">{{ formatCouponValue(c) }}</text>
          <text class="cv-min">满{{ c.minAmount }}可用</text>
        </view>
        <view class="coupon-info">
          <view class="ci-main">
            <text class="ci-name">{{ c.name }}</text>
            <view class="ci-scopes">
              <text
                v-for="s in c.scope"
                :key="s"
                class="ci-scope"
                :class="{ 'ci-scope--gray': c.status !== 'unused' }"
              >{{ s }}</text>
            </view>
            <view class="ci-meta">
              <app-icon name="clock" :size="22" color="#999" />
              <text class="ci-meta-text">有效期至 {{ c.expireAt }}</text>
            </view>
          </view>
          <view v-if="c.status === 'unused'" class="use-link" @tap="goUse">
            <text class="use-text">去使用</text>
            <app-icon name="chevron-right" :size="26" color="#c41e3a" />
          </view>
          <view v-else class="status-link">
            <app-icon v-if="c.status === 'used'" name="check" :size="26" color="#999" />
            <text class="status-text">{{ c.status === 'used' ? '已使用' : '已过期' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>

  </view>
  </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { goBack, navigateTo } from '@/utils/router'
import { shopApi, formatCouponValue, type CenterCoupon } from '@/lib/shop-data'

const activeTab = ref('unused')
const myList = ref<any[]>([])
const centerList = ref<CenterCoupon[]>([])
const couponTabs = ref<any[]>([])
const claimingId = ref<string | null>(null)
const loading = ref(true)
const error = ref('')
const submitting = ref(false)

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    const [myRes, centerRes] = await Promise.all([
      shopApi.getMyCoupons(),
      shopApi.getCenterCoupons(),
    ])
    myList.value = myRes.coupons
    couponTabs.value = myRes.tabs
    centerList.value = centerRes
  } catch (_e) {
    error.value = '加载失败，请重试'
  } finally {
    loading.value = false
  }
})

function retry() {
  loading.value = true
  error.value = ''
  Promise.all([
    shopApi.getMyCoupons(),
    shopApi.getCenterCoupons(),
  ]).then(([myRes, centerRes]) => {
    myList.value = myRes.coupons
    couponTabs.value = myRes.tabs
    centerList.value = centerRes
  }).catch(() => {
    error.value = '加载失败，请重试'
  }).finally(() => {
    loading.value = false
  })
}

const unusedCount = computed(() => myList.value.filter((c) => c.status === 'unused').length)
const filtered = computed(() => myList.value.filter((c) => c.status === activeTab.value))
const emptyText = computed(() =>
  activeTab.value === 'unused' ? '暂无可用优惠券' : activeTab.value === 'used' ? '暂无已使用优惠券' : '暂无过期优惠券',
)

function claim(c: CenterCoupon) {
  if (c.isClaimed || claimingId.value === c.id || submitting.value) return
  submitting.value = true
  claimingId.value = c.id
  setTimeout(() => {
    c.isClaimed = true
    c.claimed += 1
    claimingId.value = null
    submitting.value = false
    uni.showToast({ title: '领取成功', icon: 'success' })
  }, 600)
}
function goUse() {
  navigateTo('/shop')
}
</script>

<style lang="scss" scoped>
.cp-page {
  min-height: 100vh;
  background: #faf8f5;
}
.navbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 16rpx;
  height: 88rpx;
  padding: 0 24rpx;
  padding-top: var(--status-bar-height, 0px);
  background: linear-gradient(90deg, #c41e3a, #e85a71);
}
.nav-back {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-hover {
  opacity: 0.6;
}
.nav-title {
  font-size: 34rpx;
  font-weight: 500;
  color: #fff;
}
.tabs {
  display: flex;
  background: #fff;
  border-bottom: 1rpx solid #e8e3db;
}
.tab {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  padding: 24rpx 0;
}
.tab-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #666;
}
.tab-text--on {
  color: #c41e3a;
}
.tab-badge {
  padding: 0 10rpx;
  background: #c41e3a;
  color: #fff;
  font-size: 20rpx;
  border-radius: 999rpx;
}
.tab-line {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 64rpx;
  height: 4rpx;
  background: #c41e3a;
  border-radius: 999rpx;
}
.body {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.center-banner {
  background: linear-gradient(90deg, #c41e3a, #e85a71);
  border-radius: 24rpx;
  padding: 24rpx;
}
.cb-head {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 8rpx;
}
.cb-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #fff;
}
.cb-sub {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}
.coupon {
  display: flex;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.coupon--claimed,
.coupon--disabled {
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
  background: linear-gradient(90deg, #c41e3a, #e85a71);
}
.cv-amount {
  font-size: 48rpx;
  font-weight: 700;
  color: #c41e3a;
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
  color: #c41e3a;
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
  background: #c41e3a;
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
  color: #c41e3a;
}
.status-text {
  font-size: 26rpx;
  color: #999;
}
.empty {
  padding: 120rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}
.empty-text {
  font-size: 26rpx;
  color: #999;
}
.empty-btn {
  padding: 12rpx 48rpx;
  background: #c41e3a;
  border-radius: 999rpx;
}
.empty-btn-text {
  font-size: 26rpx;
  color: #fff;
}
.retry-btn {
  padding: 12rpx 48rpx;
  background: #c41e3a;
  border-radius: 999rpx;
}
.retry-btn-text {
  font-size: 26rpx;
  color: #fff;
}
.btn-hover {
  opacity: 0.85;
}
</style>
