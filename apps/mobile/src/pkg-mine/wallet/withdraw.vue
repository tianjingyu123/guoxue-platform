<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import {
  withdrawBalanceInfo,
  type WithdrawMethod,
  type WithdrawAccount,
} from '@/lib/mine-data'

const info = withdrawBalanceInfo

// 表单状态
const amount = ref('')
const method = ref<WithdrawMethod>('alipay')
const form = reactive({
  alipayAccount: '',
  alipayName: '',
  bankName: '',
  bankAccount: '',
  bankHolder: '',
})

// 预填已存账户
function fillAccount(acc: WithdrawAccount) {
  if (acc.method === 'alipay') {
    form.alipayAccount = acc.alipayAccount || ''
    form.alipayName = acc.alipayName || ''
  } else {
    form.bankName = acc.bankName || ''
    form.bankAccount = acc.bankAccount || ''
    form.bankHolder = acc.bankHolder || ''
  }
}
const savedAlipay = info.savedAccounts.find((a) => a.method === 'alipay')
if (savedAlipay) fillAccount(savedAlipay)

function switchMethod(m: WithdrawMethod) {
  method.value = m
  const saved = info.savedAccounts.find((a) => a.method === m)
  if (saved) {
    fillAccount(saved)
  } else if (m === 'alipay') {
    form.alipayAccount = ''
    form.alipayName = ''
  } else {
    form.bankName = ''
    form.bankAccount = ''
    form.bankHolder = ''
  }
}

const amountNum = computed(() => parseFloat(amount.value) || 0)
const fee = computed(() => Math.max(amountNum.value * info.feeRate, info.minFee))
const actualAmount = computed(() => Math.max(amountNum.value - fee.value, 0))

const isValidAmount = computed(
  () =>
    amountNum.value >= info.minWithdraw &&
    amountNum.value <= info.availableBalance &&
    amountNum.value <= info.maxWithdraw,
)
const isValidAccount = computed(() =>
  method.value === 'alipay'
    ? !!form.alipayAccount.trim() && !!form.alipayName.trim()
    : !!form.bankName.trim() && !!form.bankAccount.trim() && !!form.bankHolder.trim(),
)
const canSubmit = computed(() => isValidAmount.value && isValidAccount.value)

function withdrawAll() {
  amount.value = String(Math.min(info.availableBalance, info.maxWithdraw))
}

// 支付密码弹窗
const showPwd = ref(false)
const pwd = ref<string[]>(['', '', '', '', '', ''])
const verifying = ref(false)

function openPwd() {
  if (!canSubmit.value) return
  pwd.value = ['', '', '', '', '', '']
  showPwd.value = true
}
// uni input @input 事件边界：H5 Event 无 detail，内部断言提取字符串值
function onPwdInput(e: Event) {
  const v = (e as unknown as { detail: { value: string } }).detail.value.replace(/\D/g, '')
  const arr = ['', '', '', '', '', '']
  for (let i = 0; i < v.length && i < 6; i++) arr[i] = v[i]
  pwd.value = arr
  if (v.length === 6) verifyAndSubmit()
}

// 成功态
const success = ref(false)
const result = reactive({ amount: 0, fee: 0, actualAmount: 0, estimatedArrival: '' })

// @data-needs: 验证支付密码并提交提现申请，参数 {amount,account,paymentPassword}，返回 [{amount,fee,actualAmount,estimatedArrival}]
function verifyAndSubmit() {
  verifying.value = true
  setTimeout(() => {
    verifying.value = false
    showPwd.value = false
    result.amount = amountNum.value
    result.fee = fee.value
    result.actualAmount = actualAmount.value
    result.estimatedArrival =
      method.value === 'alipay' ? '预计2小时内到账' : '预计1-3个工作日到账'
    success.value = true
  }, 800)
}

function backToWallet() {
  navigateTo('/mine/wallet')
}
function continueWithdraw() {
  success.value = false
  amount.value = ''
}
</script>

<template>
  <!-- 成功态 -->
  <view
    v-if="success"
    class="page"
  >
    <app-nav-bar
      title="提现结果"
      back-icon="arrow-left"
      @back="backToWallet"
    />
    <view class="success-wrap">
      <view class="success-icon">
        <app-icon
          name="check"
          :size="40"
          color="#16a34a"
        />
      </view>
      <text class="success-title">
        提现申请已提交
      </text>
      <text class="success-sub">
        {{ result.estimatedArrival }}
      </text>

      <view class="result-card">
        <view class="result-row">
          <text class="result-label">
            提现金额
          </text>
          <text class="result-val">
            ¥{{ result.amount.toFixed(2) }}
          </text>
        </view>
        <view class="result-row">
          <text class="result-label">
            手续费
          </text>
          <text class="result-val">
            -¥{{ result.fee.toFixed(2) }}
          </text>
        </view>
        <view class="result-divider" />
        <view class="result-row">
          <text class="result-label">
            实际到账
          </text>
          <text class="result-amount">
            ¥{{ result.actualAmount.toFixed(2) }}
          </text>
        </view>
      </view>

      <view class="success-btns">
        <view
          class="btn-outline"
          @tap="backToWallet"
        >
          返回钱包
        </view>
        <view
          class="btn-primary"
          @tap="continueWithdraw"
        >
          继续提现
        </view>
      </view>
    </view>
  </view>

  <!-- 表单态 -->
  <view
    v-else
    class="page"
  >
    <app-nav-bar
      title="提现"
      back-icon="arrow-left"
      @back="goBack"
    />

    <view class="body">
      <!-- 可提现余额 -->
      <view class="balance-card">
        <view class="bal-head">
          <app-icon
            name="wallet"
            :size="36"
            color="rgba(255,255,255,0.8)"
          />
          <text class="bal-label">
            可提现余额
          </text>
        </view>
        <text class="bal-amount">
          ¥{{ info.availableBalance.toFixed(2) }}
        </text>
        <view class="bal-extra">
          <text>冻结中: ¥{{ info.frozenBalance.toFixed(2) }}</text>
          <text>待结算: ¥{{ info.pendingBalance.toFixed(2) }}</text>
        </view>
      </view>

      <!-- 提现金额 -->
      <view class="card">
        <view class="card-head">
          <text class="card-label">
            提现金额
          </text>
          <text
            class="all-btn"
            @tap="withdrawAll"
          >
            全部提现
          </text>
        </view>
        <view class="amount-input-wrap">
          <text class="amount-yen">
            ¥
          </text>
          <input
            class="amount-input"
            type="digit"
            :value="amount"
            placeholder="0.00"
            placeholder-class="amount-ph"
            @input="(e: any) => (amount = e.detail.value)"
          >
        </view>
        <view class="amount-tip">
          <app-icon
            name="alert-circle"
            :size="26"
            color="rgba(92,64,51,0.6)"
          />
          <text>单笔最低{{ info.minWithdraw }}元，最高{{ info.maxWithdraw }}元</text>
        </view>
      </view>

      <!-- 收款方式 -->
      <view class="card">
        <text class="card-label block">
          收款方式
        </text>
        <view class="method-grid">
          <view
            class="method-btn"
            :class="{ active: method === 'alipay' }"
            @tap="switchMethod('alipay')"
          >
            <app-icon
              name="credit-card"
              :size="36"
              :color="method === 'alipay' ? '#c41e3a' : 'rgba(92,64,51,0.6)'"
            />
            <text :class="method === 'alipay' ? 'm-active' : 'm-normal'">
              支付宝
            </text>
          </view>
          <view
            class="method-btn"
            :class="{ active: method === 'bank' }"
            @tap="switchMethod('bank')"
          >
            <app-icon
              name="building-2"
              :size="36"
              :color="method === 'bank' ? '#c41e3a' : 'rgba(92,64,51,0.6)'"
            />
            <text :class="method === 'bank' ? 'm-active' : 'm-normal'">
              银行卡
            </text>
          </view>
        </view>

        <!-- 支付宝表单 -->
        <view
          v-if="method === 'alipay'"
          class="form-fields"
        >
          <view class="field">
            <text class="field-label">
              支付宝账号
            </text>
            <input
              class="field-input"
              :value="form.alipayAccount"
              placeholder="请输入支付宝账号"
              placeholder-class="field-ph"
              @input="(e: any) => (form.alipayAccount = e.detail.value)"
            >
          </view>
          <view class="field">
            <text class="field-label">
              真实姓名
            </text>
            <input
              class="field-input"
              :value="form.alipayName"
              placeholder="请输入支付宝实名姓名"
              placeholder-class="field-ph"
              @input="(e: any) => (form.alipayName = e.detail.value)"
            >
          </view>
        </view>

        <!-- 银行卡表单 -->
        <view
          v-else
          class="form-fields"
        >
          <view class="field">
            <text class="field-label">
              开户银行
            </text>
            <input
              class="field-input"
              :value="form.bankName"
              placeholder="请输入开户银行名称"
              placeholder-class="field-ph"
              @input="(e: any) => (form.bankName = e.detail.value)"
            >
          </view>
          <view class="field">
            <text class="field-label">
              银行卡号
            </text>
            <input
              class="field-input"
              type="number"
              :value="form.bankAccount"
              placeholder="请输入银行卡号"
              placeholder-class="field-ph"
              @input="(e: any) => (form.bankAccount = e.detail.value)"
            >
          </view>
          <view class="field">
            <text class="field-label">
              持卡人姓名
            </text>
            <input
              class="field-input"
              :value="form.bankHolder"
              placeholder="请输入持卡人姓名"
              placeholder-class="field-ph"
              @input="(e: any) => (form.bankHolder = e.detail.value)"
            >
          </view>
        </view>
      </view>

      <!-- 费用预览 -->
      <view
        v-if="amountNum > 0"
        class="card"
      >
        <view class="fee-row">
          <text class="fee-label">
            提现金额
          </text>
          <text class="fee-val">
            ¥{{ amountNum.toFixed(2) }}
          </text>
        </view>
        <view class="fee-row">
          <text class="fee-label">
            手续费 ({{ (info.feeRate * 100).toFixed(1) }}%，最低{{ info.minFee }}元)
          </text>
          <text class="fee-val">
            -¥{{ fee.toFixed(2) }}
          </text>
        </view>
        <view class="result-divider" />
        <view class="fee-row">
          <text class="fee-label">
            预计到账
          </text>
          <text class="result-amount">
            ¥{{ actualAmount.toFixed(2) }}
          </text>
        </view>
      </view>

      <!-- 提交 -->
      <view
        class="submit-btn"
        :class="{ disabled: !canSubmit }"
        @tap="openPwd"
      >
        确认提现
      </view>

      <view class="hints">
        <text>• 支付宝提现预计2小时内到账</text>
        <text>• 银行卡提现预计1-3个工作日到账</text>
        <text>• 请确保收款账户信息准确无误</text>
      </view>
    </view>

    <!-- 支付密码弹窗 -->
    <view
      v-if="showPwd"
      class="pwd-mask"
    >
      <view class="pwd-sheet">
        <view class="pwd-head">
          <view class="pwd-spacer" />
          <text class="pwd-title">
            请输入支付密码
          </text>
          <view
            class="pwd-close"
            @tap="showPwd = false"
          >
            <app-icon
              name="x"
              :size="36"
              color="rgba(92,64,51,0.6)"
            />
          </view>
        </view>
        <view class="pwd-boxes">
          <view
            v-for="(p, i) in pwd"
            :key="i"
            class="pwd-box"
          >
            <view
              v-if="p"
              class="pwd-dot"
            />
          </view>
        </view>
        <input
          class="pwd-hidden-input"
          type="number"
          :maxlength="6"
          :value="pwd.join('')"
          :focus="showPwd"
          :disabled="verifying"
          @input="onPwdInput"
        >
        <view
          v-if="verifying"
          class="pwd-verifying"
        >
          <text>验证中...</text>
        </view>
        <text class="pwd-forget">
          忘记支付密码？
        </text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
}
.body {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

/* 余额卡 */
.balance-card {
  background: linear-gradient(135deg, #c41e3a, #8b1528);
  border-radius: 24rpx;
  padding: 32rpx;
  color: #fff;
}
.bal-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.bal-label {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}
.bal-amount {
  display: block;
  font-size: 60rpx;
  font-weight: 700;
  margin-bottom: 24rpx;
}
.bal-extra {
  display: flex;
  gap: 32rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
}

/* 通用卡片 */
.card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.card-label {
  font-size: 30rpx;
  font-weight: 500;
  color: #2f1810;
}
.card-label.block {
  display: block;
  margin-bottom: 24rpx;
}
.all-btn {
  font-size: 28rpx;
  color: #c41e3a;
}

/* 金额输入 */
.amount-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  height: 112rpx;
  border: 2rpx solid rgba(201, 169, 110, 0.3);
  border-radius: 16rpx;
  padding: 0 24rpx;
  gap: 16rpx;
}
.amount-yen {
  font-size: 48rpx;
  color: #2f1810;
}
.amount-input {
  flex: 1;
  font-size: 48rpx;
  font-weight: 600;
  color: #2f1810;
}
.amount-ph {
  color: #b8a99b;
  font-weight: 400;
}
.amount-tip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 16rpx;
  font-size: 22rpx;
  color: rgba(92, 64, 51, 0.6);
}

/* 收款方式 */
.method-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
  margin-bottom: 32rpx;
}
.method-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  height: 96rpx;
  border: 4rpx solid rgba(201, 169, 110, 0.3);
  border-radius: 16rpx;
}
.method-btn.active {
  border-color: #c41e3a;
  background: rgba(196, 30, 58, 0.05);
}
.m-active {
  color: #c41e3a;
  font-size: 30rpx;
}
.m-normal {
  color: #5c4033;
  font-size: 30rpx;
}

/* 表单 */
.form-fields {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.field-label {
  display: block;
  font-size: 26rpx;
  color: rgba(92, 64, 51, 0.7);
  margin-bottom: 12rpx;
}
.field-input {
  width: 100%;
  height: 80rpx;
  border: 2rpx solid rgba(201, 169, 110, 0.3);
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #2f1810;
  box-sizing: border-box;
}
.field-ph {
  color: #b8a99b;
}

/* 费用预览 */
.fee-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.fee-label {
  font-size: 28rpx;
  color: rgba(92, 64, 51, 0.7);
}
.fee-val {
  font-size: 28rpx;
  color: #2f1810;
}
.result-divider {
  height: 2rpx;
  background: rgba(201, 169, 110, 0.2);
  margin: 16rpx 0;
}
.result-amount {
  font-size: 36rpx;
  font-weight: 600;
  color: #c41e3a;
}

/* 提交 */
.submit-btn {
  height: 96rpx;
  border-radius: 16rpx;
  background: #c41e3a;
  color: #fff;
  font-size: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.submit-btn.disabled {
  opacity: 0.5;
}
.hints {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  font-size: 22rpx;
  color: rgba(92, 64, 51, 0.6);
}

/* 成功态 */
.success-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 96rpx 32rpx 0;
}
.success-icon {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: rgba(22, 163, 74, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.success-title {
  font-size: 40rpx;
  font-weight: 600;
  color: #2f1810;
  margin-bottom: 16rpx;
}
.success-sub {
  font-size: 28rpx;
  color: rgba(92, 64, 51, 0.7);
  margin-bottom: 64rpx;
}
.result-card {
  width: 100%;
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.result-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.result-label {
  font-size: 28rpx;
  color: rgba(92, 64, 51, 0.7);
}
.result-val {
  font-size: 28rpx;
  color: #2f1810;
}
.success-btns {
  display: flex;
  gap: 24rpx;
  width: 100%;
  margin-top: 64rpx;
}
.btn-outline {
  flex: 1;
  height: 88rpx;
  border: 2rpx solid #c9a96e;
  border-radius: 16rpx;
  color: #c9a96e;
  font-size: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-primary {
  flex: 1;
  height: 88rpx;
  background: #c41e3a;
  border-radius: 16rpx;
  color: #fff;
  font-size: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 支付密码弹窗 */
.pwd-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.pwd-sheet {
  position: relative;
  width: 100%;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 32rpx 32rpx calc(48rpx + env(safe-area-inset-bottom));
}
.pwd-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 48rpx;
}
.pwd-spacer {
  width: 48rpx;
}
.pwd-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #2f1810;
}
.pwd-close {
  width: 48rpx;
  display: flex;
  justify-content: flex-end;
}
.pwd-boxes {
  display: flex;
  justify-content: center;
  gap: 24rpx;
  margin-bottom: 48rpx;
}
.pwd-box {
  width: 80rpx;
  height: 96rpx;
  border: 4rpx solid rgba(201, 169, 110, 0.3);
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pwd-dot {
  width: 24rpx;
  height: 24rpx;
  background: #2f1810;
  border-radius: 50%;
}
.pwd-hidden-input {
  position: absolute;
  opacity: 0;
  width: 1rpx;
  height: 1rpx;
}
.pwd-verifying {
  text-align: center;
  font-size: 28rpx;
  color: rgba(92, 64, 51, 0.7);
}
.pwd-forget {
  display: block;
  text-align: center;
  font-size: 28rpx;
  color: #c41e3a;
  margin-top: 32rpx;
}
</style>
