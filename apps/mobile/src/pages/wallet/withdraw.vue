<template>
  <view class="page">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <view
        class="nav-back"
        @click="goBack"
      >
        <text class="nav-back-icon">
          ‹
        </text>
      </view>
      <text class="nav-title">
        提现
      </text>
      <view class="nav-placeholder" />
    </view>

    <DataState
      :is-loading="loading"
      :error="error"
      :is-empty="false"
      skeleton-type="card"
      @retry="loadBalance"
    >
      <!-- 可提现余额卡片 -->
      <view class="balance-card">
        <text class="b-label">
          可提现余额
        </text>
        <text class="b-amount">
          ¥{{ balance }}
        </text>
        <text class="b-note">
          最低提现 ¥{{ minWithdraw }}，单笔最高 ¥{{ maxWithdraw }}
        </text>
      </view>

      <!-- 表单 -->
      <view class="form-section">
        <!-- 提现金额 -->
        <view class="form-group">
          <text class="f-label">
            提现金额
          </text>
          <view class="amount-input-wrap">
            <text class="amount-prefix">
              ¥
            </text>
            <input
              v-model="amount"
              type="digit"
              placeholder="请输入提现金额"
              class="amount-input"
              @input="onAmountInput"
            >
            <text
              v-if="parseFloat(amount) > 0"
              class="amount-all"
              @click="withdrawAll"
            >
              全部提现
            </text>
          </view>
          <view class="amount-info">
            <text
              v-if="parseFloat(amount) > 0"
              class="fee-text"
            >
              手续费 ¥{{ fee }}（{{ (feeRate * 100).toFixed(1) }}%）
            </text>
            <text
              v-if="actualAmount > 0"
              class="actual-text"
            >
              实际到账 ¥{{ actualAmount }}
            </text>
            <text
              v-if="amount && !isValidAmount"
              class="error-text"
            >
              {{ amountErrorMsg }}
            </text>
          </view>
        </view>

        <!-- 提现方式 -->
        <view class="form-group">
          <text class="f-label">
            提现方式
          </text>
          <view class="method-tabs">
            <view
              class="method-tab"
              :class="{ active: method === 'alipay' }"
              @click="method = 'alipay'"
            >
              <text>💙</text>
              <text>支付宝</text>
            </view>
            <view
              class="method-tab"
              :class="{ active: method === 'bank' }"
              @click="method = 'bank'"
            >
              <text>🏦</text>
              <text>银行卡</text>
            </view>
          </view>
        </view>

        <!-- 支付宝信息 -->
        <template v-if="method === 'alipay'">
          <view class="form-group">
            <text class="f-label">
              支付宝账号
            </text>
            <input
              v-model="alipayAccount"
              placeholder="请输入支付宝账号"
              class="f-input"
            >
          </view>
          <view class="form-group">
            <text class="f-label">
              姓名
            </text>
            <input
              v-model="alipayName"
              placeholder="请输入姓名"
              class="f-input"
            >
          </view>
        </template>

        <!-- 银行卡信息 -->
        <template v-if="method === 'bank'">
          <view class="form-group">
            <text class="f-label">
              银行名称
            </text>
            <input
              v-model="bankName"
              placeholder="请输入银行名称"
              class="f-input"
            >
          </view>
          <view class="form-group">
            <text class="f-label">
              银行卡号
            </text>
            <input
              v-model="bankAccount"
              placeholder="请输入银行卡号"
              class="f-input"
              type="number"
            >
          </view>
          <view class="form-group">
            <text class="f-label">
              持卡人姓名
            </text>
            <input
              v-model="bankHolder"
              placeholder="请输入持卡人姓名"
              class="f-input"
            >
          </view>
        </template>
      </view>
    </DataState>

    <!-- 确认提现 -->
    <view class="bottom-bar">
      <button
        class="submit-btn"
        :class="{ disabled: !canSubmit }"
        :disabled="!canSubmit || submitting"
        :loading="submitting"
        @click="handleSubmit"
      >
        确认提现
      </button>
    </view>

    <!-- 支付密码弹窗 -->
    <view
      v-if="showPasswordModal"
      class="modal-overlay"
      @click="closePasswordModal"
    >
      <view
        class="modal-content"
        @click.stop
      >
        <text class="modal-title">
          输入支付密码
        </text>
        <view class="password-dots">
          <view
            v-for="(p, idx) in 6"
            :key="idx"
            class="dot"
            :class="{ filled: password[idx] }"
          >
            <text v-if="password[idx]">
              ●
            </text>
          </view>
        </view>
        <view class="password-input-hidden">
          <input
            v-model="passwordStr"
            type="number"
            password
            maxlength="6"
            focus
            class="hidden-input"
            @input="onPasswordInput"
          >
        </view>
        <text
          class="modal-cancel"
          @click="closePasswordModal"
        >
          取消
        </text>
        <text
          v-if="passwordError"
          class="password-error"
        >
          {{ passwordError }}
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DataState from '../../components/DataState.vue'
import { coinApi, commissionApi } from '../../api'
import type { WithdrawMethod } from '../../types/wallet'

const balance = ref('0.00')
const loading = ref(true)
const error = ref<string | null>(null)
const submitting = ref(false)

// 提现设置
const minWithdraw = ref(1)
const maxWithdraw = ref(50000)
const feeRate = ref(0.01)

// 表单
const amount = ref('')
const method = ref<WithdrawMethod>('alipay')
const alipayAccount = ref('')
const alipayName = ref('')
const bankName = ref('')
const bankAccount = ref('')
const bankHolder = ref('')

// 支付密码
const showPasswordModal = ref(false)
const password = ref<string[]>([])
const passwordStr = ref('')
const passwordError = ref('')

onMounted(() => {
  loadBalance()
})

async function loadBalance() {
  loading.value = true
  error.value = null
  try {
    const res = await coinApi.getBalance()
    const data = (res as any).data?.data || (res as any).data
    balance.value = (data?.balance ? (data.balance / 100).toFixed(2) : '0.00')
  } catch {
    balance.value = '0.00'
  } finally {
    loading.value = false
  }
}

/** 金额输入 */
function onAmountInput(e: any) {
  // 限制两位小数
  let val = e.detail.value
  if (val.includes('.')) {
    const parts = val.split('.')
    if (parts[1].length > 2) {
      val = parts[0] + '.' + parts[1].slice(0, 2)
    }
  }
  amount.value = val
}

/** 全部提现 */
function withdrawAll() {
  amount.value = Math.min(parseFloat(balance.value), maxWithdraw.value).toFixed(2)
}

/** 计算手续费 */
const fee = computed(() => {
  const amt = parseFloat(amount.value) || 0
  const rawFee = amt * feeRate.value
  return Math.max(rawFee, 1).toFixed(2)
})

/** 实际到账 */
const actualAmount = computed(() => {
  const amt = parseFloat(amount.value) || 0
  const f = parseFloat(fee.value)
  return Math.max(amt - f, 0).toFixed(2)
})

/** 金额是否有效 */
const isValidAmount = computed(() => {
  const amt = parseFloat(amount.value) || 0
  return amt >= minWithdraw.value && amt <= parseFloat(balance.value) && amt <= maxWithdraw.value
})

const amountErrorMsg = computed(() => {
  const amt = parseFloat(amount.value) || 0
  if (amt <= 0) return '请输入提现金额'
  if (amt < minWithdraw.value) return `最低提现 ¥${minWithdraw.value}`
  if (amt > maxWithdraw.value) return `单笔最高提现 ¥${maxWithdraw.value}`
  if (amt > parseFloat(balance.value)) return '余额不足'
  return ''
})

/** 账户信息是否有效 */
const isValidAccount = computed(() => {
  if (method.value === 'alipay') {
    return alipayAccount.value.trim().length > 0 && alipayName.value.trim().length > 0
  }
  return bankName.value.trim().length > 0 && bankAccount.value.trim().length > 0 && bankHolder.value.trim().length > 0
})

const canSubmit = computed(() => isValidAmount.value && isValidAccount.value)

/** 提交提现 */
function handleSubmit() {
  if (!canSubmit.value) return
  showPasswordModal.value = true
  password.value = []
  passwordStr.value = ''
  passwordError.value = ''
}

/** 密码输入 */
function onPasswordInput(e: any) {
  const val = e.detail.value
  password.value = val.split('')

  if (val.length === 6) {
    doWithdraw(val)
  }
}

/** 执行提现 */
async function doWithdraw(pwd: string) {
  submitting.value = true
  passwordError.value = ''
  try {
    const payload: any = {
      amount: parseFloat(amount.value),
      paymentPassword: pwd,
      account: method.value === 'alipay'
        ? { method: 'alipay', alipayAccount: alipayAccount.value, alipayName: alipayName.value }
        : { method: 'bank', bankName: bankName.value, bankAccount: bankAccount.value, bankHolder: bankHolder.value },
    }

    // 调API提现
    await commissionApi.applyWithdrawal({ ...payload, stationId: '' }) // TODO: 获取当前分站ID

    uni.showToast({ title: '提现申请已提交', icon: 'success' })
    closePasswordModal()
    setTimeout(() => uni.navigateBack(), 1500)
  } catch (e: any) {
    passwordError.value = e.message || '提现失败，请重试'
  } finally {
    submitting.value = false
  }
}

function closePasswordModal() {
  showPasswordModal.value = false
  password.value = []
  passwordStr.value = ''
  passwordError.value = ''
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page {
  background: $bg;
  min-height: 100vh;
  padding-bottom: 120rpx;
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

/* ── 余额卡片 ── */
.balance-card {
  background: linear-gradient(135deg, $gold-light, $gold);
  border-radius: 0 0 24rpx 24rpx;
  padding: 40rpx 24rpx;
  color: #fff;
  text-align: center;
}
.b-label {
  font-size: 24rpx;
  opacity: 0.8;
  display: block;
}
.b-amount {
  font-size: 64rpx;
  font-weight: bold;
  display: block;
  margin-top: 8rpx;
}
.b-note {
  font-size: 20rpx;
  opacity: 0.6;
  display: block;
  margin-top: 8rpx;
}

/* ── 表单分区 ── */
.form-section {
  margin: 24rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.form-group {
  display: flex;
  flex-direction: column;
}
.f-label {
  font-size: 24rpx;
  color: $text-secondary;
  margin-bottom: 12rpx;
  font-weight: 500;
}

/* ── 金额输入 ── */
.amount-input-wrap {
  display: flex;
  align-items: center;
  border: 2rpx solid $border;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  background: $bg;
}
.amount-prefix {
  font-size: 32rpx;
  color: $text;
  font-weight: bold;
  margin-right: 8rpx;
}
.amount-input {
  flex: 1;
  font-size: 32rpx;
  color: $text;
  font-weight: bold;
  background: transparent;
  border: none;
  outline: none;
}
.amount-all {
  font-size: 22rpx;
  color: $gold;
  font-weight: 500;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  background: #fdf8ee;
}
.amount-all:active {
  opacity: 0.7;
}
.amount-info {
  margin-top: 8rpx;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.fee-text {
  font-size: 20rpx;
  color: $text-tertiary;
}
.actual-text {
  font-size: 22rpx;
  color: $primary;
  font-weight: 500;
}
.error-text {
  font-size: 20rpx;
  color: $primary;
}

/* ── 方式切换 ── */
.method-tabs {
  display: flex;
  gap: 16rpx;
}
.method-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 20rpx;
  border-radius: 12rpx;
  border: 2rpx solid $border;
  font-size: 24rpx;
  color: $text-secondary;
  background: #fff;
  transition: all 0.2s;
}
.method-tab.active {
  border-color: $gold;
  background: #fdf8ee;
  color: $gold;
  font-weight: 500;
}

/* ── 输入框 ── */
.f-input {
  border: 2rpx solid $border;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 26rpx;
  background: $bg;
  color: $text;
}

/* ── 底部栏 ── */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid $border;
}
.submit-btn {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, $gold, $gold-light);
  color: #fff;
  border: none;
  border-radius: 44rpx;
  font-size: 28rpx;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}
.submit-btn.disabled {
  opacity: 0.4;
}

/* ── 支付密码弹窗 ── */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-content {
  background: #fff;
  border-radius: 24rpx;
  padding: 48rpx 40rpx;
  width: 580rpx;
  text-align: center;
}
.modal-title {
  font-size: 30rpx;
  font-weight: bold;
  color: $text;
  display: block;
  margin-bottom: 40rpx;
}
.password-dots {
  display: flex;
  justify-content: center;
  gap: 20rpx;
  margin-bottom: 24rpx;
}
.dot {
  width: 72rpx;
  height: 72rpx;
  border-radius: 12rpx;
  border: 2rpx solid $border;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  color: $text;
  background: $bg;
}
.dot.filled {
  border-color: $gold;
  background: #fdf8ee;
}
.password-input-hidden {
  position: absolute;
  opacity: 0;
  height: 0;
  overflow: hidden;
}
.hidden-input {
  height: 1rpx;
}
.modal-cancel {
  display: block;
  color: $text-tertiary;
  font-size: 26rpx;
  margin-top: 24rpx;
}
.password-error {
  display: block;
  color: $primary;
  font-size: 22rpx;
  margin-top: 16rpx;
}
</style>
