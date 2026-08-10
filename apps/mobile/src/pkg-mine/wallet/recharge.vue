<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppIcon from '@/components/common/app-icon.vue'
import AppLoading from '@/components/common/app-loading.vue'
import { goBack, navigateTo } from '@/utils/router'
import { mineApi, type RechargeOption } from '@/lib/mine-data'
import { formatPrice } from '@/utils/format'
import { track } from '@/composables/useTrack'
import {
  loadAppleIapProducts,
  purchaseAppleIap,
  recoverPendingAppleIapTransactions,
  type AppleIapProduct,
} from '@/lib/apple-iap'

const loading = ref(false)
const error = ref('')
const options = ref<RechargeOption[]>([])
const configuredCoinRate = ref(10)
const appleProducts = ref<AppleIapProduct[]>([])
const isAppleIap = ref(false)
let recoveryAttempted = false
// #ifdef APP-IOS
isAppleIap.value = true
// #endif

const retry = () => { error.value = ''; loadData() }
async function loadData() {
  loading.value = true; error.value = ''
  try {
    if (isAppleIap.value) {
      appleProducts.value = await loadAppleIapProducts()
      options.value = appleProducts.value.map((item) => ({
        coins: item.amountCoin,
        price: item.price,
        bonus: 0,
        popular: item.popular,
      }))
      if (!recoveryAttempted) {
        recoveryAttempted = true
        recoverPendingAppleIapTransactions()
          .then((count) => {
            if (count > 0) uni.showToast({ title: `已恢复 ${count} 笔充值`, icon: 'none' })
          })
          .catch(() => { /* 保留未关闭订单，下次进入继续恢复 */ })
      }
    } else {
      const config = await mineApi.getRechargeConfig()
      options.value = config.options
      configuredCoinRate.value = config.coinRate
    }
    if (!selectedCoins.value) {
      selectedCoins.value = options.value.find((o) => o.popular)?.coins ?? options.value[0]?.coins ?? null
    }
  }
  catch (e) { error.value = (e as Error)?.message || '加载失败' }
  finally { loading.value = false }
}
onMounted(() => { track.custom('recharge_view'); loadData() })

// UI 状态
const selectedCoins = ref<number | null>(null)
// 初始值在 loadData 后设置
const customAmount = ref('')
const navigating = ref(false)
const maxRechargeCoin = 500_000

function selectOption(coins: number) {
  selectedCoins.value = coins
  customAmount.value = ''
}

function onCustomInput(e: { detail: { value: string } }) {
  const v = e.detail.value
  if (/^\d*$/.test(v)) {
    customAmount.value = v
    if (v) selectedCoins.value = null
  }
}

const selectedAmount = computed(() => {
  if (customAmount.value) return parseInt(customAmount.value) || 0
  const o = options.value.find((x) => x.coins === selectedCoins.value)
  return o?.price || 0
})

// 自定义充值必须使用服务端权威汇率，不能从可能带特价的营销档位反推。
const coinRate = computed(() => configuredCoinRate.value)
const coinRateText = computed(() => Number.isInteger(coinRate.value) ? String(coinRate.value) : coinRate.value.toFixed(2))
const customAmountValue = computed(() => parseInt(customAmount.value) || 0)
const customBaseCoin = computed(() => Math.round(customAmountValue.value * coinRate.value))
const maxCustomAmount = computed(() => Math.max(1, Math.floor(maxRechargeCoin / coinRate.value)))
const customAmountError = computed(() => customAmountValue.value > maxCustomAmount.value
  ? `单次最多充值 ¥${maxCustomAmount.value}`
  : '')
const canSubmit = computed(() => selectedAmount.value > 0 && !customAmountError.value && !navigating.value)

const totalCoins = computed(() => {
  if (customAmount.value) return customBaseCoin.value
  const o = options.value.find((x) => x.coins === selectedCoins.value)
  return o ? o.coins + o.bonus : 0
})

const selectedAppleProduct = computed(() => appleProducts.value.find((item) => item.amountCoin === selectedCoins.value))
const selectedApplePriceText = computed(() => selectedAppleProduct.value?.priceText || '')
function applePriceText(coins: number) {
  return appleProducts.value.find((item) => item.amountCoin === coins)?.priceText || ''
}

function goService() {
  navigateTo('/customer-service')
}
async function handleSubmit() {
  if (!canSubmit.value) {
    if (customAmountError.value) uni.showToast({ title: customAmountError.value, icon: 'none' })
    return
  }
  const selectedOpt = options.value.find(o => o.coins === selectedCoins.value)
  // 传基础币，不含赠币；赠币由回调到账时按服务端档位权威发放。
  const amountCoin = selectedOpt ? selectedOpt.coins : customBaseCoin.value
  if (amountCoin <= 0) return
  navigating.value = true
  if (isAppleIap.value) {
    const product = selectedAppleProduct.value
    if (!product) {
      navigating.value = false
      uni.showToast({ title: '请选择 App Store 商品', icon: 'none' })
      return
    }
    uni.showLoading({ title: 'Apple 支付处理中', mask: true })
    try {
      const result = await purchaseAppleIap(product.productId)
      track.custom('recharge_success', { method: 'apple_iap', amountCoin: result.amountCoin })
      uni.hideLoading()
      uni.showModal({
        title: '充值成功',
        content: `${result.amountCoin} 国学币已到账`,
        showCancel: false,
        success: () => goBack(),
      })
    } catch (e) {
      uni.hideLoading()
      const message = (e as Error)?.message || 'Apple 支付未完成'
      const cancelled = /取消|cancel/i.test(message)
      uni.showToast({ title: cancelled ? '已取消支付' : message, icon: 'none', duration: 3500 })
    } finally {
      navigating.value = false
    }
    return
  }
  navigateTo(`/shop/paying?scene=recharge&amountCoin=${amountCoin}&amount=${selectedAmount.value}&method=wechat`)
  setTimeout(() => { navigating.value = false }, 800)
}
</script>

<template>
  <view class="page">
    <app-nav-bar title="充值国学币" back-icon="arrow-left" @back="goBack" />

    <view v-if="loading" class="loading"><AppLoading /></view>
    <view v-else-if="error" class="error-state"><text>{{ error }}</text><view class="retry-btn" @tap="retry">重试</view></view>
    <template v-else>
    <view class="body">
      <!-- 支付环境提示（W2：删除生产误导的「演示模式」横幅，改诚实说明） -->
      <view class="cs-banner">
        <app-icon name="alert-circle" :size="28" color="#C9A96E" />
        <text v-if="isAppleIap" class="cs-banner-txt">由 Apple App Store 安全完成购买，服务端验签成功后自动到账</text>
        <text v-else class="cs-banner-txt">微信安全支付 · 小程序、微信内和手机浏览器均可完成，到账以支付回调为准</text>
      </view>

      <!-- 说明文字 -->
      <view class="intro">
        <text v-if="isAppleIap" class="intro-main">价格由 App Store 按当前地区显示</text>
        <text v-else class="intro-main"
          >国学币与人民币比例为 <text class="ratio">{{ coinRateText }}:1</text></text
        >
        <text class="intro-sub">充值后可用于购买课程、加入圈子、打赏、付费问答等</text>
      </view>

      <!-- 预设档位 -->
      <view class="section">
        <text class="sec-title">选择充值金额</text>
        <view class="opt-grid">
          <view
            v-for="o in options"
            :key="o.coins"
            class="opt-card"
            :class="{ active: selectedCoins === o.coins }"
            @tap="selectOption(o.coins)"
          >
            <view v-if="o.popular" class="badge-pop">推荐</view>
            <view v-if="o.bonus > 0" class="badge-bonus">
              <app-icon name="sparkles" :size="20" color="#FFFFFF" />
              <text class="bonus-txt">+{{ o.bonus }}</text>
            </view>
            <view class="opt-coins" :class="{ active: selectedCoins === o.coins }">
              {{ o.coins + o.bonus }}<text class="opt-unit">币</text>
            </view>
            <text class="opt-price">{{ isAppleIap ? applePriceText(o.coins) : `¥${formatPrice(o.price)}` }}</text>
            <view v-if="selectedCoins === o.coins" class="opt-check">
              <app-icon name="check" :size="20" color="#FFFFFF" />
            </view>
          </view>
        </view>
      </view>

      <!-- 自定义金额 -->
      <view v-if="!isAppleIap" class="section">
        <text class="sec-title">自定义金额</text>
        <view class="custom-card" :class="{ active: !!customAmount }">
          <view class="custom-row">
            <text class="custom-yen">¥</text>
            <input
              class="custom-input"
              type="number"
              :value="customAmount"
              placeholder="输入其他金额（整数）"
              placeholder-class="custom-ph"
              @input="(e: any) => onCustomInput(e)"
            />
            <text v-if="customAmount" class="custom-coins"
              >= {{ customBaseCoin }} 币</text
            >
          </view>
          <text class="custom-tip" :class="{ error: !!customAmountError }">
            {{ customAmountError || `最低充值金额 ¥1，最高单次充值 ¥${maxCustomAmount}` }}
          </text>
        </view>
      </view>

      <!-- 支付方式 -->
      <view class="section">
        <text class="sec-title">支付方式</text>
        <view class="pay-list">
          <view class="pay-card active">
            <view class="pay-left">
              <view v-if="isAppleIap" class="pay-badge badge-apple"></view>
              <view v-else class="pay-badge badge-wechat">微</view>
              <view class="pay-copy">
                <text class="pay-name">{{ isAppleIap ? 'Apple App Store' : '微信支付' }}</text>
                <text class="pay-desc">{{ isAppleIap ? 'Apple 应用内购买' : '微信官方安全收银台' }}</text>
              </view>
            </view>
            <view class="pay-radio active">
              <app-icon name="check" :size="22" color="#FFFFFF" />
            </view>
          </view>
        </view>
      </view>

      <!-- 充值说明 -->
      <view class="notice">
        <text class="notice-title">充值说明</text>
        <view class="notice-item">
          <text class="dot">•</text>
          <text class="notice-txt">国学币为平台虚拟货币，仅限在本平台内使用</text>
        </view>
        <view class="notice-item">
          <text class="dot">•</text>
          <text class="notice-txt">{{ isAppleIap ? '退款申请与处理遵循 Apple 的退款政策' : '充值后不支持退款，请确认后再进行充值' }}</text>
        </view>
        <view v-if="!isAppleIap" class="notice-item">
          <text class="dot">•</text>
          <text class="notice-txt">赠送的国学币有效期为充值后365天</text>
        </view>
        <view class="notice-item">
          <text class="dot">•</text>
          <text class="notice-txt">如有疑问，请<text class="notice-link" @tap="goService">联系客服</text>处理</text>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <view v-if="selectedAmount > 0" class="preview-row">
        <text class="preview-label">本次充值</text>
        <view>
          <text class="preview-coins">{{ totalCoins }}</text>
          <text class="preview-unit">国学币</text>
        </view>
      </view>
      <view
        class="submit-btn"
        :class="{ disabled: !canSubmit }"
        @tap="handleSubmit"
      >
        <text v-if="navigating">正在处理支付...</text>
        <text v-else-if="isAppleIap && selectedApplePriceText">通过 Apple 购买 {{ selectedApplePriceText }}</text>
        <text v-else-if="selectedAmount > 0 && !customAmountError">安全充值 ¥{{ formatPrice(selectedAmount) }}</text>
        <text v-else>请选择充值金额</text>
      </view>
    </view>
  </template>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
  padding-bottom: 200rpx;
}
.body {
  padding: 32rpx;
}
.cs-banner {
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: rgba(201, 169, 110, 0.1);
  border: 2rpx solid rgba(201, 169, 110, 0.3);
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 32rpx;
}
.cs-banner-txt {
  font-size: 24rpx;
  color: #8a7a6d;
}

/* 说明 */
.intro {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-bottom: 48rpx;
}
.intro-main {
  font-size: 28rpx;
  color: #8a7a6d;
}
.ratio {
  color: #c9a96e;
  font-weight: 500;
}
.intro-sub {
  font-size: 22rpx;
  color: #a89888;
}

/* 区块 */
.section {
  margin-bottom: 48rpx;
}
.sec-title {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2f1810;
  margin-bottom: 24rpx;
}

/* 档位 */
.opt-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24rpx;
}
.opt-card {
  position: relative;
  background: #fff;
  border: 2rpx solid #ece6dd;
  border-radius: 20rpx;
  padding: 24rpx 12rpx;
  text-align: center;
}
.opt-card.active {
  border-color: #c9a96e;
  background: rgba(201, 169, 110, 0.06);
  box-shadow: 0 0 0 2rpx #c9a96e;
}
.badge-pop {
  position: absolute;
  top: -16rpx;
  left: 50%;
  transform: translateX(-50%);
  padding: 2rpx 16rpx;
  background: var(--brand);
  color: #fff;
  font-size: 20rpx;
  font-weight: 500;
  border-radius: 999rpx;
  white-space: nowrap;
}
.badge-bonus {
  position: absolute;
  top: -12rpx;
  right: -12rpx;
  display: flex;
  align-items: center;
  gap: 2rpx;
  padding: 2rpx 10rpx;
  background: #c9a96e;
  color: #fff;
  font-size: 18rpx;
  font-weight: 500;
  border-radius: 999rpx;
}
.bonus-txt {
  color: #fff;
  font-size: 18rpx;
}
.opt-coins {
  font-size: 40rpx;
  font-weight: 700;
  color: #2f1810;
}
.opt-coins.active {
  color: #c9a96e;
}
.opt-unit {
  font-size: 24rpx;
  font-weight: 400;
  margin-left: 2rpx;
}
.opt-price {
  display: block;
  font-size: 28rpx;
  color: #8a7a6d;
  margin-top: 8rpx;
}
.opt-check {
  position: absolute;
  bottom: 8rpx;
  right: 8rpx;
  width: 32rpx;
  height: 32rpx;
  background: #c9a96e;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 自定义 */
.custom-card {
  background: #fff;
  border: 2rpx solid #ece6dd;
  border-radius: 20rpx;
  padding: 32rpx;
}
.custom-card.active {
  border-color: #c9a96e;
  box-shadow: 0 0 0 2rpx #c9a96e;
}
.custom-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.custom-yen {
  font-size: 36rpx;
  font-weight: 500;
  color: #2f1810;
}
.custom-input {
  flex: 1;
  font-size: 36rpx;
  font-weight: 500;
  color: #2f1810;
}
.custom-ph {
  color: #b8a99b;
  font-weight: 400;
}
.custom-coins {
  font-size: 28rpx;
  color: #c9a96e;
}
.custom-tip {
  display: block;
  font-size: 22rpx;
  color: #8a7a6d;
  margin-top: 16rpx;
}
.custom-tip.error { color: #c24138; }

/* 支付方式 */
.pay-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.pay-card {
  background: #fff;
  border: 2rpx solid #ece6dd;
  border-radius: 20rpx;
  padding: 28rpx 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.pay-card.active {
  border-color: #c9a96e;
  background: rgba(201, 169, 110, 0.06);
}
.pay-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.pay-badge {
  width: 64rpx;
  height: 64rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 24rpx;
  font-weight: 700;
}
.badge-wechat {
  background: #22c55e;
}
.badge-apple {
  background: #111;
  font-size: 38rpx;
  font-weight: 500;
}
.pay-copy {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.pay-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #2f1810;
}
.pay-desc {
  font-size: 22rpx;
  color: #8a7a6d;
}
.pay-radio {
  width: 40rpx;
  height: 40rpx;
  border: 4rpx solid rgba(138, 122, 109, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pay-radio.active {
  border-color: #c9a96e;
  background: #c9a96e;
}

/* 充值说明 */
.notice {
  background: rgba(232, 227, 219, 0.4);
  border: 2rpx solid #ece6dd;
  border-radius: 20rpx;
  padding: 32rpx;
}
.notice-title {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2f1810;
  margin-bottom: 16rpx;
}
.notice-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 12rpx;
}
.dot {
  color: #c9a96e;
  font-size: 24rpx;
}
.notice-txt {
  flex: 1;
  font-size: 22rpx;
  color: #8a7a6d;
  line-height: 1.5;
}
.notice-link {
  font-size: 22rpx;
  color: #C9A961;
  font-weight: 600;
  text-decoration: underline;
}

/* 底部栏 */
.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.96);
  border-top: 2rpx solid #ece6dd;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
}
.preview-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.preview-label {
  font-size: 28rpx;
  color: #8a7a6d;
}
.preview-coins {
  font-size: 40rpx;
  font-weight: 700;
  color: #c9a96e;
}
.preview-unit {
  font-size: 28rpx;
  color: #8a7a6d;
  margin-left: 8rpx;
}
.submit-btn {
  width: 100%;
  height: 96rpx;
  border-radius: 24rpx;
  background: var(--brand);
  color: #fff;
  font-size: 32rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
}
.submit-btn.disabled {
  background: #ece6dd;
  color: #a89888;
}

.loading { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #8a7a6d; }
.error-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; }
.error-state text { font-size: 28rpx; color: #8a7a6d; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); color: #fff; border-radius: 12rpx; font-size: 26rpx; }
</style>
