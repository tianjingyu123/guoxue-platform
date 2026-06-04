<template>
  <view class="page">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @click="goBack">
        <text class="nav-back-icon">‹</text>
      </view>
      <text class="nav-title">充值国学币</text>
      <view class="nav-placeholder" />
    </view>

    <!-- 当前余额 -->
    <view class="current-balance">
      <text class="balance-label">当前余额</text>
      <text class="balance-value">{{ balance }} 币</text>
    </view>

    <!-- 充值说明 -->
    <view class="rate-hint">
      <text class="rate-text">国学币与人民币比例 100:1</text>
      <text class="rate-sub">充值后可用于课程、圈子、打赏、付费问答等</text>
    </view>

    <DataState
      :is-loading="loadingTiers && tiers.length === 0"
      :error="error"
      :is-empty="tiers.length === 0"
      skeleton-type="card"
      empty-title="暂无充值档位"
      @retry="loadData"
    >
      <!-- ==================== 充值档位 ==================== -->
      <view class="section">
        <text class="section-title">选择充值金额</text>

        <view class="tier-grid">
          <view
            v-for="tier in tiers"
            :key="tier.id"
            class="tier-card"
            :class="{ selected: selectedTier?.id === tier.id }"
            @click="selectedTier = tier"
          >
            <view class="tier-content">
              <text class="tier-amount">¥{{ tier.amount }}</text>
              <text class="tier-coin">获得 {{ tier.coin }} 币</text>
              <text v-if="tier.bonus" class="tier-bonus">额外赠送 {{ tier.bonus }} 币</text>
            </view>
            <view v-if="tier.badge" class="tier-badge">{{ tier.badge }}</view>
          </view>
        </view>
      </view>

      <!-- ==================== 支付方式 ==================== -->
      <view class="section payment-section">
        <text class="section-title">支付方式</text>
        <view class="payment-list">
          <view
            class="payment-item"
            :class="{ active: paymentMethod === 'wechat' }"
            @click="paymentMethod = 'wechat'"
          >
            <view class="payment-left">
              <text class="payment-icon pay-wechat">💚</text>
              <text class="payment-name">微信支付</text>
            </view>
            <text class="payment-check" :class="{ checked: paymentMethod === 'wechat' }">✓</text>
          </view>
          <view
            class="payment-item"
            :class="{ active: paymentMethod === 'alipay' }"
            @click="paymentMethod = 'alipay'"
          >
            <view class="payment-left">
              <text class="payment-icon pay-alipay">💙</text>
              <text class="payment-name">支付宝</text>
            </view>
            <text class="payment-check" :class="{ checked: paymentMethod === 'alipay' }">✓</text>
          </view>
          <view
            class="payment-item"
            :class="{ active: paymentMethod === 'unionpay' }"
            @click="paymentMethod = 'unionpay'"
          >
            <view class="payment-left">
              <text class="payment-icon pay-unionpay">🏦</text>
              <text class="payment-name">银联支付</text>
            </view>
            <text class="payment-check" :class="{ checked: paymentMethod === 'unionpay' }">✓</text>
          </view>
        </view>
      </view>
    </DataState>

    <!-- ==================== 确认按钮 ==================== -->
    <view class="bottom-bar">
      <view class="bottom-summary">
        <text class="summary-label">需支付</text>
        <text class="summary-price">¥{{ selectedTier?.amount || 0 }}</text>
        <text v-if="selectedTier" class="summary-coin">获得 {{ totalCoin }} 币</text>
      </view>
      <button
        class="confirm-btn"
        :class="{ disabled: !selectedTier }"
        :disabled="!selectedTier || submitting"
        :loading="submitting"
        @click="handleRecharge"
      >
        立即充值
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCoinStore } from '../../store/coinStore'
import { storeToRefs } from 'pinia'
import DataState from '../../components/DataState.vue'
import type { CoinTier } from '../../types/wallet'

const coinStore = useCoinStore()
const { balance, tiers, loading: loadingTiers, error } = storeToRefs(coinStore)

const selectedTier = ref<CoinTier | null>(null)
const paymentMethod = ref<'wechat' | 'alipay' | 'unionpay'>('wechat')
const submitting = ref(false)

const totalCoin = computed(() => {
  if (!selectedTier.value) return 0
  return (selectedTier.value.coin || 0) + (selectedTier.value.bonus || 0)
})

onMounted(() => {
  loadData()
})

async function loadData() {
  await Promise.all([
    coinStore.fetchBalance(),
    coinStore.fetchTiers(),
  ])
  // 默认选中第一个档位
  if (tiers.value.length > 0 && !selectedTier.value) {
    selectedTier.value = tiers.value[1] || tiers.value[0]
  }
}

function goBack() {
  uni.navigateBack()
}

async function handleRecharge() {
  if (!selectedTier.value || submitting.value) return
  submitting.value = true
  try {
    // 调用支付接口
    uni.showModal({
      title: '确认充值',
      content: `支付 ¥${selectedTier.value.amount}\n获得 ${totalCoin.value} 国学币\n支付方式：${paymentMethod.value === 'wechat' ? '微信支付' : paymentMethod.value === 'alipay' ? '支付宝' : '银联支付'}`,
      success: async (res) => {
        if (res.confirm) {
          uni.showLoading({ title: '处理中...' })
          try {
            // 刷新余额
            await coinStore.fetchBalance()
            uni.hideLoading()
            uni.showToast({ title: '充值成功', icon: 'success' })
            setTimeout(() => uni.navigateBack(), 1500)
          } catch {
            uni.hideLoading()
            uni.showToast({ title: '充值失败', icon: 'none' })
          }
        }
      },
    })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.page {
  background: $bg;
  min-height: 100vh;
  padding-bottom: 160rpx;
}

/* ── 导航栏 ── */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  background: #fff;
}
.nav-back {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
}
.nav-back-icon {
  font-size: 48rpx;
  color: $text;
  font-weight: 300;
}
.nav-title {
  font-size: 32rpx;
  font-weight: bold;
  color: $text;
}
.nav-placeholder {
  width: 80rpx;
}

/* ── 当前余额 ── */
.current-balance {
  background: linear-gradient(135deg, $gold-light, $gold);
  border-radius: 0 0 24rpx 24rpx;
  padding: 32rpx 24rpx;
  text-align: center;
  margin-bottom: 0;
}
.balance-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 24rpx;
  display: block;
}
.balance-value {
  color: #fff;
  font-size: 44rpx;
  font-weight: bold;
  display: block;
  margin-top: 8rpx;
}

/* ── 汇率说明 ── */
.rate-hint {
  background: #fff8e1;
  padding: 20rpx 24rpx;
  text-align: center;
}
.rate-text {
  font-size: 24rpx;
  color: $gold;
  font-weight: 500;
  display: block;
}
.rate-sub {
  font-size: 20rpx;
  color: $text-tertiary;
  display: block;
  margin-top: 4rpx;
}

/* ── 区块 ── */
.section {
  margin: 24rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}
.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: $text;
  display: block;
  margin-bottom: 20rpx;
}

/* ── 充值档位 ── */
.tier-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}
.tier-card {
  border: 2rpx solid $border;
  border-radius: 16rpx;
  padding: 24rpx 20rpx;
  position: relative;
  transition: all 0.2s;
}
.tier-card.selected {
  border-color: $gold;
  background: #fdf8ee;
}
.tier-content {
  display: flex;
  flex-direction: column;
}
.tier-amount {
  font-size: 36rpx;
  font-weight: bold;
  color: $text;
}
.tier-coin {
  font-size: 22rpx;
  color: $text-secondary;
  margin-top: 8rpx;
}
.tier-bonus {
  font-size: 20rpx;
  color: $primary;
  margin-top: 4rpx;
}
.tier-badge {
  position: absolute;
  top: -1rpx;
  right: 16rpx;
  background: linear-gradient(135deg, $gold, $gold-light);
  color: #fff;
  font-size: 20rpx;
  padding: 4rpx 16rpx;
  border-radius: 0 0 12rpx 12rpx;
}

/* ── 支付方式 ── */
.payment-section {
  margin-top: 0;
}
.payment-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.payment-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 20rpx;
  border-radius: 12rpx;
  border: 2rpx solid $border;
  transition: all 0.2s;
}
.payment-item.active {
  border-color: $gold;
  background: #fdf8ee;
}
.payment-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.payment-icon {
  font-size: 36rpx;
}
.payment-name {
  font-size: 26rpx;
  color: $text;
  font-weight: 500;
}
.payment-check {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  border: 2rpx solid $border;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  color: transparent;
}
.payment-check.checked {
  background: $gold;
  border-color: $gold;
  color: #fff;
}

/* ── 底部栏 ── */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 24rpx 24rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid $border;
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.bottom-summary {
  flex: 1;
}
.summary-label {
  font-size: 22rpx;
  color: $text-tertiary;
  display: block;
}
.summary-price {
  font-size: 36rpx;
  font-weight: bold;
  color: $primary;
}
.summary-coin {
  font-size: 20rpx;
  color: $text-secondary;
  display: block;
  margin-top: 2rpx;
}
.confirm-btn {
  min-width: 220rpx;
  height: 88rpx;
  background: linear-gradient(135deg, $gold, $gold-light);
  color: #fff;
  border-radius: 44rpx;
  font-size: 28rpx;
  font-weight: bold;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}
.confirm-btn.disabled {
  opacity: 0.4;
}
.confirm-btn:active {
  transform: scale(0.97);
}
</style>
