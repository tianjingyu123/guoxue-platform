<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import {
  mineApi,
  rechargePayMethods,
  type RechargeOption,
} from '@/lib/mine-data'
import { formatPrice } from '@/utils/format'

const loading = ref(false)
const error = ref('')
const options = ref<RechargeOption[]>([])

const retry = () => { error.value = ''; loadData() }
async function loadData() {
  loading.value = true; error.value = ''
  try {
    options.value = await mineApi.getRechargeOptions()
    if (!selectedCoins.value) {
      selectedCoins.value = options.value.find((o) => o.popular)?.coins ?? options.value[0]?.coins ?? null
    }
  }
  catch (e) { error.value = (e as Error)?.message || '加载失败' }
  finally { loading.value = false }
}
onMounted(loadData)

const payMethods = rechargePayMethods

// UI 状态
const selectedCoins = ref<number | null>(null)
// 初始值在 loadData 后设置
const customAmount = ref('')
const payMethod = ref<string>('wechat')
const isSubmitting = ref(false)

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

const totalCoins = computed(() => {
  if (customAmount.value) return (parseInt(customAmount.value) || 0) * 10
  const o = options.value.find((x) => x.coins === selectedCoins.value)
  return o ? o.coins + o.bonus : 0
})

/** 微信小程序真实支付：拿支付参数 → uni.requestPayment（到账由回调异步完成） */
async function payByWechatMp(amountCoin: number) {
  const { payParams } = await mineApi.rechargeWechat(amountCoin)
  await new Promise<void>((resolve, reject) => {
    uni.requestPayment({
      provider: 'wxpay',
      timeStamp: payParams.timeStamp,
      nonceStr: payParams.nonceStr,
      package: payParams.package,
      signType: payParams.signType as 'MD5' | 'HMAC-SHA256' | 'RSA',
      paySign: payParams.paySign,
      success: () => resolve(),
      fail: (err: { errMsg?: string }) => reject(new Error(err?.errMsg?.includes('cancel') ? '支付已取消' : (err?.errMsg || '支付失败'))),
    })
  })
  uni.showToast({ title: '支付成功，到账处理中', icon: 'success' })
}

async function handleSubmit() {
  if (selectedAmount.value <= 0 || isSubmitting.value) return
  isSubmitting.value = true
  try {
    const selectedOpt = options.value.find(o => o.coins === selectedCoins.value)
    // 🔴 提交给后端的是「基础充值币数」，不含赠币 —— 赠币只加币不加价，由后端按档位权威发放。
    //    若把 (基础+赠) 传上去，后端会按总币数/汇率收款，等于让用户为赠币多付钱（反向收费）。
    const amountCoin = selectedOpt ? selectedOpt.coins : (parseInt(customAmount.value) || 0) * 10
    // #ifdef MP-WEIXIN
    // 微信小程序内且选微信支付：走真实微信支付
    if (payMethod.value === 'wechat') {
      await payByWechatMp(amountCoin)
      return
    }
    // #endif
    // 其他端/其他支付方式：演示模式（下单+模拟到账，真实渠道待各端接入）
    const res = await mineApi.recharge(amountCoin, payMethod.value)
    uni.showToast({ title: res.message, icon: res.success ? 'success' : 'none' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '充值失败', icon: 'none' })
  } finally { isSubmitting.value = false }
}
</script>

<template>
  <view class="page">
    <app-nav-bar title="充值国学币" back-icon="arrow-left" @back="goBack" />

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-else-if="error" class="error-state"><text>{{ error }}</text><view class="retry-btn" @tap="retry">重试</view></view>
    <template v-else>
    <view class="body">
      <!-- 支付环境提示：微信小程序内为真实微信支付，其他环境为演示模拟到账 -->
      <view class="cs-banner">
        <app-icon name="alert-circle" :size="28" color="#C9A96E" />
        <!-- #ifdef MP-WEIXIN -->
        <text class="cs-banner-txt">微信支付：将唤起微信完成真实支付，到账稍有延迟（以支付回调为准）</text>
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <text class="cs-banner-txt">演示模式：当前环境为模拟到账，真实微信支付请在微信小程序内进行</text>
        <!-- #endif -->
      </view>

      <!-- 说明文字 -->
      <view class="intro">
        <text class="intro-main"
          >国学币与人民币比例为 <text class="ratio">10:1</text></text
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
            <text class="opt-price">¥{{ formatPrice(o.price) }}</text>
            <view v-if="selectedCoins === o.coins" class="opt-check">
              <app-icon name="check" :size="20" color="#FFFFFF" />
            </view>
          </view>
        </view>
      </view>

      <!-- 自定义金额 -->
      <view class="section">
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
              >= {{ (parseInt(customAmount) || 0) * 10 }} 币</text
            >
          </view>
          <text class="custom-tip">最低充值金额 ¥1，最高单次充值 ¥50000</text>
        </view>
      </view>

      <!-- 支付方式 -->
      <view class="section">
        <text class="sec-title">支付方式</text>
        <view class="pay-list">
          <view
            v-for="m in payMethods"
            :key="m.id"
            class="pay-card"
            :class="{ active: payMethod === m.id }"
            @tap="payMethod = m.id"
          >
            <view class="pay-left">
              <view class="pay-badge" :class="m.badgeClass">{{ m.badge }}</view>
              <text class="pay-name">{{ m.name }}</text>
            </view>
            <view class="pay-radio" :class="{ active: payMethod === m.id }">
              <app-icon
                v-if="payMethod === m.id"
                name="check"
                :size="22"
                color="#FFFFFF"
              />
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
          <text class="notice-txt">充值后不支持退款，请确认后再进行充值</text>
        </view>
        <view class="notice-item">
          <text class="dot">•</text>
          <text class="notice-txt">赠送的国学币有效期为充值后365天</text>
        </view>
        <view class="notice-item">
          <text class="dot">•</text>
          <text class="notice-txt">如有疑问，请联系客服处理</text>
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
        :class="{ disabled: selectedAmount <= 0 }"
        @tap="handleSubmit"
      >
        <text v-if="isSubmitting">支付中...</text>
        <text v-else-if="selectedAmount > 0">确认充值 ¥{{ formatPrice(selectedAmount) }}</text>
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
.badge-alipay {
  background: #3b82f6;
}
.badge-unionpay {
  background: #ef4444;
}
.badge-huifu {
  background: #f97316;
}
.pay-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #2f1810;
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
