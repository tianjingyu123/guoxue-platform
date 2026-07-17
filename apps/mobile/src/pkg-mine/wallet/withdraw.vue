<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import {
  mineApi,
  type WithdrawMethod,
  type WithdrawAccount,
  type WithdrawBalanceInfo,
} from '@/lib/mine-data'
import { track } from '@/composables/useTrack'

const loading = ref(false)
const error = ref('')
const info = ref<WithdrawBalanceInfo>({
  availableBalance: 0, frozenBalance: 0, pendingBalance: 0,
  minWithdraw: 10, maxWithdraw: 50000, feeRate: 0.006, minFee: 1,
  savedAccounts: [],
})

const retry = () => { error.value = ''; loadData() }

/** 收益转金币（1元=10币·单向不可逆·拍板 2026-07-10）：弹窗输入整数元 → 真转换 → 刷新余额 */
const converting = ref(false)
function openConvert() {
  if (converting.value) return
  uni.showModal({
    title: '收益转国学币',
    editable: true,
    placeholderText: `输入转换金额（整数元·当前可提现 ¥${info.value.availableBalance.toFixed(2)}）`,
    content: '',
    success: async (res) => {
      if (!res.confirm) return
      const n = parseInt(String(res.content || '').trim(), 10)
      if (!Number.isInteger(n) || n <= 0) { uni.showToast({ title: '请输入正整数金额（元）', icon: 'none' }); return }
      converting.value = true
      try {
        const r = await mineApi.convertToCoin(n)
        uni.showToast({ title: `已转入 ${r.amountCoin} 国学币（不可逆）`, icon: 'none' })
        loadData()
      } catch (e) {
        uni.showToast({ title: (e as Error)?.message || '转换失败', icon: 'none' })
      } finally { converting.value = false }
    },
  })
}
async function loadData() {
  loading.value = true; error.value = ''
  try {
    info.value = await mineApi.getWithdrawInfo()
    // 预填当前收款方式的已存账户（method 默认微信；下方 const 在 onMounted 触发时已初始化）
    const saved = info.value.savedAccounts.find((a) => a.method === method.value)
    if (saved) fillAccount(saved)
  } catch (e) { error.value = (e as Error)?.message || '加载失败' }
  finally { loading.value = false }
}
onMounted(() => { track.custom('withdraw_view'); loadData() })

// 表单状态
const amount = ref('')
const method = ref<WithdrawMethod>('wechat')
const form = reactive({
  wechatName: '',
  alipayAccount: '',
  alipayName: '',
  bankName: '',
  bankAccount: '',
  bankHolder: '',
})

/**
 * 微信零钱能否在当前端「确认收款」。
 * 🔴 wx.requestMerchantTransfer 只在小程序里有 —— H5/App 用户即使提了微信零钱，
 *    也只能回小程序点确认，钱才会到账。这里不藏起微信选项（藏了等于砍掉唯一自动到账通道），
 *    而是把这件事在选中时说清楚。
 */
const canConfirmInApp = ref(false)
// #ifdef MP-WEIXIN
canConfirmInApp.value = true
// #endif

// 预填已存账户
function fillAccount(acc: WithdrawAccount) {
  if (acc.method === 'wechat') {
    form.wechatName = acc.realName || ''
  } else if (acc.method === 'alipay') {
    form.alipayAccount = acc.alipayAccount || ''
    form.alipayName = acc.alipayName || ''
  } else {
    form.bankName = acc.bankName || ''
    form.bankAccount = acc.bankAccount || ''
    form.bankHolder = acc.bankHolder || ''
  }
}

function switchMethod(m: WithdrawMethod) {
  method.value = m
  const saved = info.value.savedAccounts.find((a: WithdrawAccount) => a.method === m)
  if (saved) {
    fillAccount(saved)
  } else if (m === 'wechat') {
    form.wechatName = ''
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
const fee = computed(() => Math.max(amountNum.value * info.value.feeRate, info.value.minFee))
const actualAmount = computed(() => Math.max(amountNum.value - fee.value, 0))

const isValidAmount = computed(
  () =>
    amountNum.value >= info.value.minWithdraw &&
    amountNum.value <= info.value.availableBalance &&
    amountNum.value <= info.value.maxWithdraw,
)
/** 微信零钱：≥2000 元时微信强制要求提交收款人真实姓名，小额可不填 */
const wechatNameRequired = computed(() => amountNum.value >= 2000)
const isValidAccount = computed(() => {
  if (method.value === 'wechat') return !wechatNameRequired.value || !!form.wechatName.trim()
  if (method.value === 'alipay') return !!form.alipayAccount.trim() && !!form.alipayName.trim()
  return !!form.bankName.trim() && !!form.bankAccount.trim() && !!form.bankHolder.trim()
})
const canSubmit = computed(() => isValidAmount.value && isValidAccount.value)

function withdrawAll() {
  amount.value = String(Math.min(info.value.availableBalance, info.value.maxWithdraw))
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
function onPwdInput(e: { detail: { value: string } }) {
  const v = e.detail.value.replace(/\D/g, '')
  const arr = ['', '', '', '', '', '']
  for (let i = 0; i < v.length && i < 6; i++) arr[i] = v[i]
  pwd.value = arr
  if (v.length === 6) verifyAndSubmit()
}

// 成功态
const success = ref(false)
const result = reactive({ amount: 0, fee: 0, actualAmount: 0, estimatedArrival: '' })

async function verifyAndSubmit() {
  // 重入守卫：出款路径求稳，密码框满 6 位可能连触发，双提会重复发起提现
  if (verifying.value) return
  verifying.value = true
  try {
    // 先验证支付密码（后端 bcrypt 校验 + 连续错误锁定30分钟）
    const pwdRes = await mineApi.verifyPaymentPassword(pwd.value.join(''))
    if (!pwdRes.success) {
      uni.showToast({ title: pwdRes.message || '支付密码错误', icon: 'none' })
      pwd.value = ['', '', '', '', '', '']
      return
    }
    // 组装完整收款账户信息（后端 accountInfo 存 Record，保留姓名/银行等）
    // realName 这个 key 是后端 extractHolderName 认的字段，改名会导致大额转账拿不到实名
    const account: Record<string, string> =
      method.value === 'wechat'
        ? { realName: form.wechatName.trim() }
        : method.value === 'alipay'
          ? { alipayAccount: form.alipayAccount, alipayName: form.alipayName }
          : { bankName: form.bankName, bankAccount: form.bankAccount, bankHolder: form.bankHolder }
    const res = await mineApi.withdraw(amountNum.value, method.value, account)
    if (res.success) {
      // 提现申请后端受理成功那一刻发转化事件（金额用真实提现金额·元）
      track.custom('withdraw_submit', { amount: amountNum.value, method: method.value })
      showPwd.value = false
      result.amount = amountNum.value
      result.fee = fee.value
      result.actualAmount = actualAmount.value
      result.estimatedArrival =
        method.value === 'wechat'
          ? '审核通过后发起转账，需你在微信中确认收款'
          : method.value === 'alipay'
            ? '预计2小时内到账'
            : '预计1-3个工作日到账'
      success.value = true
    } else {
      uni.showToast({ title: res.message, icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '提现失败', icon: 'none' })
  } finally { verifying.value = false }
}

function backToWallet() {
  navigateTo('/mine/wallet')
}
/** 微信提现必须能回到记录页确认收款，否则钱发出去了用户也拿不到 */
function goRecords() {
  navigateTo('/wallet/withdraw-records')
}
function continueWithdraw() {
  success.value = false
  amount.value = ''
}
function goService() {
  navigateTo('/customer-service')
}
</script>

<template>
  <!-- 加载/错误态 -->
  <view v-if="loading" class="page">
    <app-nav-bar title="提现" back-icon="arrow-left" @back="goBack" />
    <view class="loading"><text>加载中...</text></view>
  </view>
  <view v-else-if="error" class="page">
    <app-nav-bar title="提现" back-icon="arrow-left" @back="goBack" />
    <view class="error-state"><text>{{ error }}</text><view class="retry-btn" @tap="retry">重试</view></view>
  </view>
  <!-- 成功态 -->
  <view v-else-if="success" class="page">
    <app-nav-bar title="提现结果" back-icon="arrow-left" @back="backToWallet" />
    <view class="success-wrap">
      <view class="success-icon">
        <app-icon name="check" :size="40" color="#16a34a" />
      </view>
      <text class="success-title">提现申请已提交</text>
      <text class="success-sub">{{ result.estimatedArrival }}</text>

      <view class="result-card">
        <view class="result-row">
          <text class="result-label">提现金额</text>
          <text class="result-val">¥{{ result.amount.toFixed(2) }}</text>
        </view>
        <view class="result-row">
          <text class="result-label">手续费</text>
          <text class="result-val">-¥{{ result.fee.toFixed(2) }}</text>
        </view>
        <view class="result-divider" />
        <view class="result-row">
          <text class="result-label">实际到账</text>
          <text class="result-amount">¥{{ result.actualAmount.toFixed(2) }}</text>
        </view>
      </view>

      <view class="success-btns">
        <view class="btn-outline" @tap="backToWallet">返回钱包</view>
        <view class="btn-primary" @tap="goRecords">查看提现记录</view>
      </view>
      <text class="success-link" @tap="continueWithdraw">继续提现</text>
    </view>
  </view>

  <!-- 表单态 -->
  <view v-else class="page">
    <app-nav-bar title="提现" back-icon="arrow-left" @back="goBack">
      <template #right>
        <text class="nav-link" @tap="goRecords">记录</text>
      </template>
    </app-nav-bar>

    <view class="body">
      <!-- 可提现余额 -->
      <view class="balance-card">
        <view class="bal-head">
          <app-icon name="wallet" :size="36" color="rgba(255,255,255,0.8)" />
          <text class="bal-label">可提现余额</text>
        </view>
        <text class="bal-amount">¥{{ info.availableBalance.toFixed(2) }}</text>
        <view v-if="info.frozenBalance > 0 || info.pendingBalance > 0" class="bal-extra">
          <text v-if="info.frozenBalance > 0">冻结中: ¥{{ info.frozenBalance.toFixed(2) }}</text>
          <text v-if="info.pendingBalance > 0">待结算: ¥{{ info.pendingBalance.toFixed(2) }}</text>
        </view>
        <!-- 收益转金币（拍板 2026-07-10：收益既可提现也可转金币消费·1元=10币·单向） -->
        <view class="bal-convert" @tap="openConvert">
          <app-icon name="refresh-cw" :size="24" color="rgba(255,255,255,0.85)" />
          <text class="bal-convert-t">转为国学币消费（1元=10国学币）</text>
        </view>
      </view>

      <!-- 提现金额 -->
      <view class="card">
        <view class="card-head">
          <text class="card-label">提现金额</text>
          <text class="all-btn" @tap="withdrawAll">全部提现</text>
        </view>
        <view class="amount-input-wrap">
          <text class="amount-yen">¥</text>
          <input
            class="amount-input"
            type="digit"
            :value="amount"
            placeholder="0.00"
            placeholder-class="amount-ph"
            @input="(e: any) => (amount = e.detail.value)"
          />
        </view>
        <view class="amount-tip">
          <app-icon name="alert-circle" :size="26" color="rgba(92,64,51,0.6)" />
          <text>单笔最低{{ info.minWithdraw }}元，最高{{ info.maxWithdraw }}元</text>
        </view>
      </view>

      <!-- 收款方式 -->
      <view class="card">
        <text class="card-label block">收款方式</text>
        <view class="method-grid">
          <view
            class="method-btn"
            :class="{ active: method === 'wechat' }"
            @tap="switchMethod('wechat')"
          >
            <app-icon
              name="wallet"
              :size="36"
              :color="method === 'wechat' ? '#c41e3a' : 'rgba(92,64,51,0.6)'"
            />
            <text :class="method === 'wechat' ? 'm-active' : 'm-normal'">微信零钱</text>
          </view>
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
            <text :class="method === 'alipay' ? 'm-active' : 'm-normal'">支付宝</text>
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
            <text :class="method === 'bank' ? 'm-active' : 'm-normal'">银行卡</text>
          </view>
        </view>

        <!-- 微信零钱表单：不需填账号（按你的微信登录身份打款），仅大额需实名 -->
        <view v-if="method === 'wechat'" class="form-fields">
          <view class="wx-note">
            <app-icon name="alert-circle" :size="26" color="#b45309" />
            <text class="wx-note-t">
              转账将打到你微信登录所用的账号。发起后需你在微信中点「确认收款」，钱才到账。
              <text v-if="!canConfirmInApp">当前不在微信小程序内，届时请打开小程序完成确认。</text>
            </text>
          </view>
          <view class="field">
            <text class="field-label">
              真实姓名{{ wechatNameRequired ? '（2000元以上必填）' : '（选填）' }}
            </text>
            <input
              class="field-input"
              :value="form.wechatName"
              placeholder="请输入微信实名认证的姓名"
              placeholder-class="field-ph"
              @input="(e: any) => (form.wechatName = e.detail.value)"
            />
          </view>
        </view>

        <!-- 支付宝表单 -->
        <view v-else-if="method === 'alipay'" class="form-fields">
          <view class="field">
            <text class="field-label">支付宝账号</text>
            <input
              class="field-input"
              :value="form.alipayAccount"
              placeholder="请输入支付宝账号"
              placeholder-class="field-ph"
              @input="(e: any) => (form.alipayAccount = e.detail.value)"
            />
          </view>
          <view class="field">
            <text class="field-label">真实姓名</text>
            <input
              class="field-input"
              :value="form.alipayName"
              placeholder="请输入支付宝实名姓名"
              placeholder-class="field-ph"
              @input="(e: any) => (form.alipayName = e.detail.value)"
            />
          </view>
        </view>

        <!-- 银行卡表单 -->
        <view v-else class="form-fields">
          <view class="field">
            <text class="field-label">开户银行</text>
            <input
              class="field-input"
              :value="form.bankName"
              placeholder="请输入开户银行名称"
              placeholder-class="field-ph"
              @input="(e: any) => (form.bankName = e.detail.value)"
            />
          </view>
          <view class="field">
            <text class="field-label">银行卡号</text>
            <input
              class="field-input"
              type="number"
              :value="form.bankAccount"
              placeholder="请输入银行卡号"
              placeholder-class="field-ph"
              @input="(e: any) => (form.bankAccount = e.detail.value)"
            />
          </view>
          <view class="field">
            <text class="field-label">持卡人姓名</text>
            <input
              class="field-input"
              :value="form.bankHolder"
              placeholder="请输入持卡人姓名"
              placeholder-class="field-ph"
              @input="(e: any) => (form.bankHolder = e.detail.value)"
            />
          </view>
        </view>
      </view>

      <!-- 费用预览 -->
      <view v-if="amountNum > 0" class="card">
        <view class="fee-row">
          <text class="fee-label">提现金额</text>
          <text class="fee-val">¥{{ amountNum.toFixed(2) }}</text>
        </view>
        <view class="fee-row">
          <text class="fee-label"
            >手续费 ({{ (info.feeRate * 100).toFixed(1) }}%，最低{{ info.minFee }}元)</text
          >
          <text class="fee-val">-¥{{ fee.toFixed(2) }}</text>
        </view>
        <view class="result-divider" />
        <view class="fee-row">
          <text class="fee-label">预计到账</text>
          <text class="result-amount">¥{{ actualAmount.toFixed(2) }}</text>
        </view>
      </view>

      <!-- 提交 -->
      <view
        class="submit-btn"
        :class="{ disabled: !canSubmit }"
        @tap="openPwd"
        >确认提现</view
      >

      <view class="hints">
        <text>• 微信零钱：审核通过后自动发起转账，需你在微信中「确认收款」，超时未确认将自动退回</text>
        <text>• 支付宝提现预计2小时内到账</text>
        <text>• 银行卡提现预计1-3个工作日到账</text>
        <text>• 请确保收款账户信息准确无误</text>
      </view>

      <view class="service-entry" @tap="goService">
        <app-icon name="message-circle" :size="28" color="var(--brand)" />
        <text class="service-entry-t">提现遇到问题？联系客服</text>
      </view>
    </view>

    <!-- 支付密码弹窗 -->
    <view v-if="showPwd" class="pwd-mask">
      <view class="pwd-sheet">
        <view class="pwd-head">
          <view class="pwd-spacer" />
          <text class="pwd-title">请输入支付密码</text>
          <view class="pwd-close" @tap="showPwd = false">
            <app-icon name="x" :size="36" color="rgba(92,64,51,0.6)" />
          </view>
        </view>
        <view class="pwd-boxes">
          <view v-for="(p, i) in pwd" :key="i" class="pwd-box">
            <view v-if="p" class="pwd-dot" />
          </view>
        </view>
        <input
          class="pwd-hidden-input"
          type="number"
          :maxlength="6"
          :value="pwd.join('')"
          :focus="showPwd"
          :disabled="verifying"
          @input="(e: any) => onPwdInput(e)"
        />
        <view v-if="verifying" class="pwd-verifying">
          <text>验证中...</text>
        </view>
        <text class="pwd-forget">忘记支付密码？</text>
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
  background: linear-gradient(135deg, var(--brand), #8b1528);
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
.bal-convert {
  margin-top: 20rpx;
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  padding: 10rpx 22rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.16);
}
.bal-convert:active { opacity: 0.8; }
.bal-convert-t { font-size: 24rpx; color: rgba(255, 255, 255, 0.9); }

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
  color: var(--brand);
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
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  margin-bottom: 32rpx;
}
.method-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  height: 120rpx;
  border: 4rpx solid rgba(201, 169, 110, 0.3);
  border-radius: 16rpx;
}
.method-btn.active {
  border-color: var(--brand);
  background: rgba(196, 30, 58, 0.05);
}
.m-active {
  color: var(--brand);
  font-size: 26rpx;
}
.m-normal {
  color: #5c4033;
  font-size: 26rpx;
}

.nav-link {
  font-size: 28rpx;
  color: var(--brand);
}
.success-link {
  display: block;
  text-align: center;
  font-size: 28rpx;
  color: var(--brand);
  margin-top: 32rpx;
}

/* 微信零钱说明条 */
.wx-note {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  padding: 20rpx;
  border-radius: 12rpx;
  background: rgba(180, 83, 9, 0.08);
}
.wx-note-t {
  flex: 1;
  font-size: 24rpx;
  line-height: 1.5;
  color: #b45309;
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
  color: var(--brand);
}

/* 提交 */
.submit-btn {
  height: 96rpx;
  border-radius: 16rpx;
  background: var(--brand);
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
.service-entry {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  padding: 8rpx 0;
}
.service-entry-t {
  font-size: 26rpx;
  color: var(--brand);
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
  background: var(--brand);
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
  color: var(--brand);
  margin-top: 32rpx;
}

.loading { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: rgba(92,64,51,0.6); }
.error-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; }
.error-state text { font-size: 28rpx; color: rgba(92,64,51,0.6); }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); color: #fff; border-radius: 12rpx; font-size: 26rpx; }
</style>
