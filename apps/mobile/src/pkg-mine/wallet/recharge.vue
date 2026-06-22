<script setup lang="ts">
import { ref, computed } from 'vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import {
  rechargeOptions,
  rechargePayMethods,
  type RechargeOption,
} from '@/lib/mine-data'

const options: RechargeOption[] = rechargeOptions
const payMethods = rechargePayMethods

// UI 状态
const selectedCoins = ref<number | null>(
  options.find((o) => o.popular)?.coins ?? options[0]?.coins ?? null,
)
const customAmount = ref('')
const payMethod = ref<string>('wechat')
const isSubmitting = ref(false)

function selectOption(coins: number) {
  selectedCoins.value = coins
  customAmount.value = ''
}

// uni input @input 事件边界：H5 Event 无 detail，内部断言提取字符串值
function onCustomInput(e: Event) {
  const v = (e as unknown as { detail: { value: string } }).detail.value
  if (/^\d*$/.test(v)) {
    customAmount.value = v
    if (v) selectedCoins.value = null
  }
}

const selectedAmount = computed(() => {
  if (customAmount.value) return parseInt(customAmount.value) || 0
  const o = options.find((x) => x.coins === selectedCoins.value)
  return o?.price || 0
})

const totalCoins = computed(() => {
  if (customAmount.value) return (parseInt(customAmount.value) || 0) * 10
  const o = options.find((x) => x.coins === selectedCoins.value)
  return o ? o.coins + o.bonus : 0
})

// @data-needs: 创建充值订单，参数 {amount,paymentMethod}，返回 [{orderId}]，成功后跳支付结果页
function handleSubmit() {
  if (selectedAmount.value <= 0 || isSubmitting.value) return
  isSubmitting.value = true
  uni.showToast({ title: '功能开发中', icon: 'none' })
  setTimeout(() => {
    isSubmitting.value = false
  }, 600)
}
</script>

<template>
  <view class="page">
    <app-nav-bar
      title="充值国学币"
      back-icon="arrow-left"
      @back="goBack"
    />

    <view class="body">
      <!-- 说明文字 -->
      <view class="intro">
        <text class="intro-main">
          国学币与人民币比例为 <text class="ratio">
            10:1
          </text>
        </text>
        <text class="intro-sub">
          充值后可用于购买课程、加入圈子、打赏、付费问答等
        </text>
      </view>

      <!-- 预设档位 -->
      <view class="section">
        <text class="sec-title">
          选择充值金额
        </text>
        <view class="opt-grid">
          <view
            v-for="o in options"
            :key="o.coins"
            class="opt-card"
            :class="{ active: selectedCoins === o.coins }"
            @tap="selectOption(o.coins)"
          >
            <view
              v-if="o.popular"
              class="badge-pop"
            >
              推荐
            </view>
            <view
              v-if="o.bonus > 0"
              class="badge-bonus"
            >
              <app-icon
                name="sparkles"
                :size="20"
                color="#FFFFFF"
              />
              <text class="bonus-txt">
                +{{ o.bonus }}
              </text>
            </view>
            <view
              class="opt-coins"
              :class="{ active: selectedCoins === o.coins }"
            >
              {{ o.coins + o.bonus }}<text class="opt-unit">
                币
              </text>
            </view>
            <text class="opt-price">
              ¥{{ o.price }}
            </text>
            <view
              v-if="selectedCoins === o.coins"
              class="opt-check"
            >
              <app-icon
                name="check"
                :size="20"
                color="#FFFFFF"
              />
            </view>
          </view>
        </view>
      </view>

      <!-- 自定义金额 -->
      <view class="section">
        <text class="sec-title">
          自定义金额
        </text>
        <view
          class="custom-card"
          :class="{ active: !!customAmount }"
        >
          <view class="custom-row">
            <text class="custom-yen">
              ¥
            </text>
            <input
              class="custom-input"
              type="number"
              :value="customAmount"
              placeholder="输入其他金额（整数）"
              placeholder-class="custom-ph"
              @input="onCustomInput"
            >
            <text
              v-if="customAmount"
              class="custom-coins"
            >
              = {{ (parseInt(customAmount) || 0) * 10 }} 币
            </text>
          </view>
          <text class="custom-tip">
            最低充值金额 ¥1，最高单次充值 ¥50000
          </text>
        </view>
      </view>

      <!-- 支付方式 -->
      <view class="section">
        <text class="sec-title">
          支付方式
        </text>
        <view class="pay-list">
          <view
            v-for="m in payMethods"
            :key="m.id"
            class="pay-card"
            :class="{ active: payMethod === m.id }"
            @tap="payMethod = m.id"
          >
            <view class="pay-left">
              <view
                class="pay-badge"
                :class="m.badgeClass"
              >
                {{ m.badge }}
              </view>
              <text class="pay-name">
                {{ m.name }}
              </text>
            </view>
            <view
              class="pay-radio"
              :class="{ active: payMethod === m.id }"
            >
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
        <text class="notice-title">
          充值说明
        </text>
        <view class="notice-item">
          <text class="dot">
            •
          </text>
          <text class="notice-txt">
            国学币为平台虚拟货币，仅限在本平台内使用
          </text>
        </view>
        <view class="notice-item">
          <text class="dot">
            •
          </text>
          <text class="notice-txt">
            充值后不支持退款，请确认后再进行充值
          </text>
        </view>
        <view class="notice-item">
          <text class="dot">
            •
          </text>
          <text class="notice-txt">
            赠送的国学币有效期为充值后365天
          </text>
        </view>
        <view class="notice-item">
          <text class="dot">
            •
          </text>
          <text class="notice-txt">
            如有疑问，请联系客服处理
          </text>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <view
        v-if="selectedAmount > 0"
        class="preview-row"
      >
        <text class="preview-label">
          本次充值
        </text>
        <view>
          <text class="preview-coins">
            {{ totalCoins }}
          </text>
          <text class="preview-unit">
            国学币
          </text>
        </view>
      </view>
      <view
        class="submit-btn"
        :class="{ disabled: selectedAmount <= 0 }"
        @tap="handleSubmit"
      >
        <text v-if="isSubmitting">
          支付中...
        </text>
        <text v-else-if="selectedAmount > 0">
          确认充值 ¥{{ selectedAmount }}
        </text>
        <text v-else>
          请选择充值金额
        </text>
      </view>
    </view>
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
  background: #c41e3a;
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
  background: #c41e3a;
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
</style>
