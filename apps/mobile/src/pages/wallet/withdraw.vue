<template>
  <view class="page">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @click="goBack">
        <text class="nav-back-icon">‹</text>
      </view>
      <text class="nav-title">{{ withdrawSuccess ? '提现结果' : '提现' }}</text>
      <view class="nav-placeholder" />
    </view>

    <!-- ====== 成功状态 ====== -->
    <template v-if="withdrawSuccess && withdrawResult">
      <view class="success-page">
        <view class="success-icon-wrap">
          <text class="success-icon">✓</text>
        </view>
        <text class="success-title">提现申请已提交</text>
        <text class="success-hint">{{ withdrawResult.estimatedArrival }}</text>

        <view class="result-card">
          <view class="rc-row">
            <text class="rc-label">提现金额</text>
            <text class="rc-value">¥{{ withdrawResult.amount.toFixed(2) }}</text>
          </view>
          <view class="rc-row">
            <text class="rc-label">手续费</text>
            <text class="rc-value">-¥{{ withdrawResult.fee.toFixed(2) }}</text>
          </view>
          <view class="rc-divider" />
          <view class="rc-row">
            <text class="rc-label">实际到账</text>
            <text class="rc-value rc-actual">¥{{ withdrawResult.actualAmount.toFixed(2) }}</text>
          </view>
        </view>

        <view class="success-buttons">
          <view class="btn-outline" @click="goBackToWallet">返回钱包</view>
          <view class="btn-primary" @click="resetAndContinue">继续提现</view>
        </view>
      </view>
    </template>

    <!-- ====== 正常提现表单 ====== -->
    <template v-else>
      <DataState
        :is-loading="loading"
        :error="error"
        :is-empty="false"
        skeleton-type="card"
        @retry="loadBalance"
      >
        <!-- 可提现余额卡片 -->
        <view class="balance-card">
          <text class="b-label">可提现余额</text>
          <text class="b-amount">¥{{ availableBalance }}</text>
          <view class="b-extra">
            <text>冻结中: ¥{{ frozenBalance }}</text>
            <text>待结算: ¥{{ pendingBalance }}</text>
          </view>
        </view>

        <!-- 表单 -->
        <view class="form-section">
          <!-- 提现金额 -->
          <view class="form-group">
            <view class="fg-header">
              <text class="f-label">提现金额</text>
              <text class="f-all" @click="withdrawAll">全部提现</text>
            </view>
            <view class="amount-input-wrap">
              <text class="amount-prefix">¥</text>
              <input
                v-model="amount"
                type="digit"
                placeholder="0.00"
                class="amount-input"
                @input="onAmountInput"
              >
            </view>
            <view class="amount-info">
              <text class="fee-text">单笔最低{{ minWithdraw }}元，最高{{ maxWithdraw }}元</text>
              <text
                v-if="amountNum > 0"
                class="fee-text"
              >
                手续费 -¥{{ fee }}（{{ (feeRate * 100).toFixed(1) }}%）
              </text>
              <text
                v-if="actualAmountNum > 0"
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
            <text class="f-label">收款方式</text>
            <view class="method-tabs">
              <view
                class="method-tab"
                :class="{ active: method === 'alipay' }"
                @click="switchMethod('alipay')"
              >
                <text>💙</text>
                <text>支付宝</text>
              </view>
              <view
                class="method-tab"
                :class="{ active: method === 'bank' }"
                @click="switchMethod('bank')"
              >
                <text>🏦</text>
                <text>银行卡</text>
              </view>
            </view>
          </view>

          <!-- 支付宝信息 -->
          <template v-if="method === 'alipay'">
            <view class="form-group">
              <text class="f-label">支付宝账号</text>
              <input
                v-model="alipayAccount"
                placeholder="请输入支付宝账号"
                class="f-input"
              >
            </view>
            <view class="form-group">
              <text class="f-label">姓名</text>
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
              <text class="f-label">开户银行</text>
              <input
                v-model="bankName"
                placeholder="请输入开户银行名称"
                class="f-input"
              >
            </view>
            <view class="form-group">
              <text class="f-label">银行卡号</text>
              <input
                v-model="bankAccount"
                placeholder="请输入银行卡号"
                class="f-input"
                type="number"
              >
            </view>
            <view class="form-group">
              <text class="f-label">持卡人姓名</text>
              <input
                v-model="bankHolder"
                placeholder="请输入持卡人姓名"
                class="f-input"
              >
            </view>
          </template>
        </view>

        <!-- 费用预览 -->
        <view
          v-if="amountNum > 0"
          class="fee-preview"
        >
          <view class="fp-row">
            <text class="fp-label">提现金额</text>
            <text class="fp-value">¥{{ amountNum.toFixed(2) }}</text>
          </view>
          <view class="fp-row">
            <text class="fp-label">手续费 ({{ (feeRate * 100).toFixed(1) }}%)</text>
            <text class="fp-value">-¥{{ fee }}</text>
          </view>
          <view class="fp-divider" />
          <view class="fp-row">
            <text class="fp-label">预计到账</text>
            <text class="fp-value fp-actual">¥{{ actualAmount }}</text>
          </view>
        </view>
      </DataState>

      <!-- 确认提现 -->
      <view class="bottom-bar">
        <button
          class="submit-btn"
          :class="{ disabled: !canSubmit }"
          :disabled="!canSubmit || submitting"
          @click="handleSubmit"
        >
          <text v-if="submitting">提交中...</text>
          <text v-else>确认提现</text>
        </button>
      </view>

      <!-- 提示信息 -->
      <view class="tips">
        <text>• 支付宝提现预计2小时内到账</text>
        <text>• 银行卡提现预计1-3个工作日到账</text>
        <text>• 请确保收款账户信息准确无误</text>
      </view>

      <!-- ====== 支付密码弹窗 ====== -->
      <view
        v-if="showPasswordModal"
        class="modal-overlay"
        @click="closePasswordModal"
      >
        <view
          class="modal-content"
          @click.stop
        >
          <text class="modal-title">请输入支付密码</text>
          <view class="password-dots">
            <view
              v-for="(_, idx) in 6"
              :key="idx"
              class="dot"
              :class="{ filled: password[idx] }"
            >
              <text v-if="password[idx]">●</text>
            </view>
          </view>
          <view class="hidden-input-wrap">
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
          <text
            v-if="verifying"
            class="verifying-text"
          >
            验证中...
          </text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DataState from '../../components/DataState.vue'
import { coinApi, userApi, commissionApi } from '../../api'

// ====== 提现余额 ======
const loading = ref(true)
const error = ref<string | null>(null)
const availableBalance = ref('0.00')
const frozenBalance = ref('0.00')
const pendingBalance = ref('0.00')
const minWithdraw = ref(1)
const maxWithdraw = ref(50000)
const feeRate = ref(0.01)
const minFee = ref(1)

// ====== 表单 ======
const amount = ref('')
const method = ref<'alipay' | 'bank'>('alipay')
const alipayAccount = ref('')
const alipayName = ref('')
const bankName = ref('')
const bankAccount = ref('')
const bankHolder = ref('')

// ====== 支付密码 ======
const showPasswordModal = ref(false)
const password = ref<string[]>([])
const passwordStr = ref('')
const passwordError = ref('')
const verifying = ref(false)
const submitting = ref(false)

// ====== 提现结果 ======
const withdrawSuccess = ref(false)
const withdrawResult = ref<{
  amount: number
  fee: number
  actualAmount: number
  estimatedArrival: string
} | null>(null)

// ====== 计算属性 ======
const amountNum = computed(() => parseFloat(amount.value) || 0)
const fee = computed(() => {
  const raw = amountNum.value * feeRate.value
  return Math.max(raw, minFee.value).toFixed(2)
})
const actualAmountNum = computed(() => Math.max(amountNum.value - parseFloat(fee.value), 0))
const actualAmount = computed(() => actualAmountNum.value.toFixed(2))

const isValidAmount = computed(() => {
  const amt = amountNum.value
  return amt >= minWithdraw.value && amt <= parseFloat(availableBalance.value) && amt <= maxWithdraw.value
})

const isValidAccount = computed(() => {
  if (method.value === 'alipay') {
    return alipayAccount.value.trim().length > 0 && alipayName.value.trim().length > 0
  }
  return bankName.value.trim().length > 0 && bankAccount.value.trim().length > 0 && bankHolder.value.trim().length > 0
})

const canSubmit = computed(() => isValidAmount.value && isValidAccount.value)

const amountErrorMsg = computed(() => {
  const amt = amountNum.value
  if (amt <= 0) return '请输入提现金额'
  if (amt < minWithdraw.value) return `最低提现 ¥${minWithdraw.value}`
  if (amt > maxWithdraw.value) return `单笔最高提现 ¥${maxWithdraw.value}`
  if (amt > parseFloat(availableBalance.value)) return '余额不足'
  return ''
})

onMounted(() => {
  loadBalance()
})

async function loadBalance() {
  loading.value = true
  error.value = null
  try {
    const res: any = await coinApi.getBalance()
    availableBalance.value = ((res?.balance ?? res?.coin ?? 0) / 100).toFixed(2)
    frozenBalance.value = ((res?.frozen ?? 0) / 100).toFixed(2)
    pendingBalance.value = ((res?.pending ?? 0) / 100).toFixed(2)
  } catch {
    availableBalance.value = '0.00'
  } finally {
    loading.value = false
  }
}

/** 金额输入限制两位小数 */
function onAmountInput(e: any) {
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
  amount.value = Math.min(parseFloat(availableBalance.value), maxWithdraw.value).toFixed(2)
}

/** 切换提现方式 */
function switchMethod(m: 'alipay' | 'bank') {
  method.value = m
}

/** 提交提现（弹出密码框） */
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
  verifying.value = true
  passwordError.value = ''
  try {
    // 验证支付密码
    const verifyRes: any = await userApi.verifyPaymentPassword(pwd)
    const valid = verifyRes?.valid ?? verifyRes?.data?.valid ?? true

    if (!valid) {
      passwordError.value = '支付密码错误'
      password.value = []
      passwordStr.value = ''
      verifying.value = false
      submitting.value = false
      return
    }

    const payload = {
      amount: amountNum.value,
      paymentPassword: pwd,
      account: method.value === 'alipay'
        ? { method: 'alipay', alipayAccount: alipayAccount.value, alipayName: alipayName.value }
        : { method: 'bank', bankName: bankName.value, bankAccount: bankAccount.value, bankHolder: bankHolder.value },
    }

    const res: any = await commissionApi.applyWithdrawal(payload)

    withdrawResult.value = {
      amount: res?.amount ?? amountNum.value,
      fee: res?.fee ?? parseFloat(fee.value),
      actualAmount: res?.actualAmount ?? actualAmountNum.value,
      estimatedArrival: res?.estimatedArrival ?? '预计2小时内到账',
    }
    withdrawSuccess.value = true
    closePasswordModal()

    uni.showToast({ title: '提现申请已提交', icon: 'success' })
  } catch (e: any) {
    passwordError.value = e.message || '提现失败，请重试'
    password.value = []
    passwordStr.value = ''
  } finally {
    verifying.value = false
    submitting.value = false
  }
}

function closePasswordModal() {
  showPasswordModal.value = false
  password.value = []
  passwordStr.value = ''
  passwordError.value = ''
}

function resetAndContinue() {
  withdrawSuccess.value = false
  withdrawResult.value = null
  amount.value = ''
  loadBalance()
}

function goBackToWallet() {
  uni.navigateBack()
}

function goBack() {
  if (withdrawSuccess.value) {
    uni.navigateBack()
  } else {
    uni.navigateBack()
  }
}
</script>

<style scoped>
.page {
  background: $bg;
  min-height: 100vh;
  padding-bottom: 180rpx;
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
.nav-back { width: 80rpx; height: 80rpx; display: flex; align-items: center; }
.nav-back-icon { font-size: 48rpx; color: $text; font-weight: 300; }
.nav-title { font-size: 32rpx; font-weight: bold; color: $text; }
.nav-placeholder { width: 80rpx; }

/* ── 余额卡片 ── */
.balance-card {
  background: linear-gradient(135deg, $gold-light, $gold);
  padding: 40rpx 24rpx;
  color: #fff;
  text-align: center;
}
.b-label { font-size: 24rpx; opacity: 0.8; display: block; }
.b-amount { font-size: 64rpx; font-weight: bold; display: block; margin-top: 8rpx; }
.b-extra {
  display: flex;
  justify-content: center;
  gap: 24rpx;
  margin-top: 12rpx;
  font-size: 20rpx;
  opacity: 0.6;
}

/* ── 表单 ── */
.form-section {
  margin: 24rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.form-group { display: flex; flex-direction: column; }
.fg-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.f-label { font-size: 24rpx; color: $text-secondary; font-weight: 500; }
.f-all { font-size: 22rpx; color: $gold; font-weight: 500; }
.f-all:active { opacity: 0.7; }

/* 金额输入 */
.amount-input-wrap {
  display: flex;
  align-items: center;
  border: 2rpx solid $border;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  background: $bg;
}
.amount-prefix { font-size: 32rpx; color: $text; font-weight: bold; margin-right: 8rpx; }
.amount-input {
  flex: 1;
  font-size: 32rpx;
  color: $text;
  font-weight: bold;
  background: transparent;
  border: none;
  outline: none;
}
.amount-info { margin-top: 8rpx; display: flex; flex-direction: column; gap: 4rpx; }
.fee-text { font-size: 20rpx; color: $text-tertiary; }
.actual-text { font-size: 22rpx; color: $primary; font-weight: 500; }
.error-text { font-size: 20rpx; color: $primary; }

/* 方式切换 */
.method-tabs { display: flex; gap: 16rpx; }
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
}
.method-tab.active {
  border-color: $gold;
  background: #fdf8ee;
  color: $gold;
  font-weight: 500;
}

/* 输入框 */
.f-input {
  border: 2rpx solid $border;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 26rpx;
  background: $bg;
  color: $text;
}

/* 费用预览 */
.fee-preview {
  margin: 0 24rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}
.fp-row { display: flex; justify-content: space-between; margin-bottom: 12rpx; }
.fp-row:last-child { margin-bottom: 0; }
.fp-label { font-size: 24rpx; color: $text-tertiary; }
.fp-value { font-size: 24rpx; color: $text; font-weight: 500; }
.fp-divider { height: 1rpx; background: $border; margin: 12rpx 0; }
.fp-actual { font-size: 32rpx; color: $primary; font-weight: bold; }

/* 底部栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid $border;
  z-index: 10;
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
.submit-btn.disabled { opacity: 0.4; }

.tips {
  margin: 0 24rpx;
  font-size: 22rpx;
  color: $text-tertiary;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  line-height: 1.5;
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
.hidden-input-wrap {
  position: absolute;
  opacity: 0;
  height: 0;
  overflow: hidden;
}
.hidden-input { height: 1rpx; }
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
.verifying-text {
  display: block;
  color: $gold;
  font-size: 22rpx;
  margin-top: 16rpx;
}

/* ── 成功状态 ── */
.success-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 32rpx 0;
}
.success-icon-wrap {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: #e8f5e9;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}
.success-icon { font-size: 64rpx; color: #4CAF50; font-weight: bold; }
.success-title { font-size: 36rpx; font-weight: bold; color: $text; margin-bottom: 8rpx; }
.success-hint { font-size: 24rpx; color: $text-tertiary; margin-bottom: 48rpx; }

.result-card {
  width: 100%;
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
}
.rc-row { display: flex; justify-content: space-between; margin-bottom: 16rpx; }
.rc-row:last-child { margin-bottom: 0; }
.rc-label { font-size: 26rpx; color: $text-tertiary; }
.rc-value { font-size: 26rpx; color: $text; font-weight: 500; }
.rc-divider { height: 1rpx; background: $border; margin: 16rpx 0; }
.rc-actual { font-size: 36rpx; color: $primary; font-weight: bold; }

.success-buttons {
  display: flex;
  gap: 20rpx;
  width: 100%;
  margin-top: 48rpx;
}
.btn-outline {
  flex: 1;
  height: 88rpx;
  border: 2rpx solid $gold;
  border-radius: 44rpx;
  color: $gold;
  font-size: 28rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-primary {
  flex: 1;
  height: 88rpx;
  background: linear-gradient(135deg, $gold, $gold-light);
  border-radius: 44rpx;
  color: #fff;
  font-size: 28rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-outline:active { opacity: 0.7; }
.btn-primary:active { opacity: 0.9; }
</style>
