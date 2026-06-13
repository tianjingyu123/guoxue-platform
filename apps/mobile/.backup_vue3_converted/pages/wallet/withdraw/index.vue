<template>
  <view class="min-h-screen bg-background">
    <!-- Header -->
    <header class="sticky top-0 z-10 bg-background border-b border-accent/20">
      <view class="flex items-center h-14 px-4">
        <view @click="goBack" class="p-2 -ml-2 text-[#2F1810]">
          <text class="text-lg">←</text>
        </view>
        <text class="flex-1 text-center text-lg font-medium text-[#2F1810]">提现</text>
        <view class="w-9" />
      </view>
    </header>

    <!-- 加载骨架 -->
    <view v-if="loading" class="p-4 space-y-4">
      <view class="bg-white rounded-xl p-4 space-y-3">
        <view class="h-4 w-24 bg-accent/10 rounded animate-pulse" />
        <view class="h-8 w-32 bg-accent/10 rounded animate-pulse" />
      </view>
      <view class="bg-white rounded-xl p-4 space-y-3">
        <view class="h-4 w-20 bg-accent/10 rounded animate-pulse" />
        <view class="h-12 bg-accent/10 rounded animate-pulse" />
      </view>
      <view class="bg-white rounded-xl p-4 space-y-3">
        <view class="h-4 w-16 bg-accent/10 rounded animate-pulse" />
        <view class="h-10 bg-accent/10 rounded animate-pulse" />
        <view class="h-10 bg-accent/10 rounded animate-pulse" />
      </view>
    </view>

    <!-- 错误状态 -->
    <view v-else-if="error" class="flex flex-col items-center justify-center px-4 pt-20">
      <text class="text-4xl mb-4"></text>
      <text class="text-muted-foreground text-sm mb-4">{{ error }}</text>
      <view @click="loadBalanceInfo" class="px-6 py-2.5 bg-primary text-white text-sm font-medium rounded-full">
        <text>重新加载</text>
      </view>
    </view>

    <!-- 提现成功 -->
    <view v-else-if="success && withdrawResult" class="flex flex-col items-center px-4 pt-12">
      <view class="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
        <text class="text-3xl text-green-600">✓</text>
      </view>
      <text class="text-xl font-semibold text-[#2F1810] block mb-2">提现申请已提交</text>
      <text class="text-[#5C4033]/70 block mb-8">{{ withdrawResult.estimatedArrival }}</text>

      <view class="w-full bg-white rounded-xl p-4 space-y-3">
        <view class="flex justify-between">
          <text class="text-[#5C4033]/70">提现金额</text>
          <text class="text-[#2F1810]">¥{{ withdrawResult.amount.toFixed(2) }}</text>
        </view>
        <view class="flex justify-between">
          <text class="text-[#5C4033]/70">手续费</text>
          <text class="text-[#2F1810]">-¥{{ withdrawResult.fee.toFixed(2) }}</text>
        </view>
        <view class="h-px bg-accent/20" />
        <view class="flex justify-between">
          <text class="text-[#5C4033]/70">实际到账</text>
          <text class="text-lg font-semibold text-primary">¥{{ withdrawResult.actualAmount.toFixed(2) }}</text>
        </view>
      </view>

      <view class="flex gap-3 w-full mt-8">
        <view @click="goBack" class="flex-1 py-3 rounded-xl border border-accent text-accent text-center text-sm font-medium">
          <text>返回钱包</text>
        </view>
        <view @click="resetWithdraw" class="flex-1 py-3 rounded-xl bg-primary text-white text-center text-sm font-medium">
          <text>继续提现</text>
        </view>
      </view>
    </view>

    <!-- 正常提现表单 -->
    <view v-else class="p-4 space-y-4">
      <!-- 可提现余额 -->
      <view class="bg-gradient-to-br from-primary to-[#8B1528] rounded-xl p-4 text-white">
        <view class="flex items-center gap-2 mb-2">
          <text class="text-lg opacity-80">👛</text>
          <text class="text-sm opacity-80">可提现余额</text>
        </view>
        <text class="text-3xl font-bold block mb-3">¥{{ balanceInfo.availableBalance.toFixed(2) }}</text>
        <view class="flex gap-4 text-xs opacity-70">
          <text>冻结中: ¥{{ balanceInfo.frozenBalance.toFixed(2) }}</text>
          <text>待结算: ¥{{ balanceInfo.pendingBalance.toFixed(2) }}</text>
        </view>
      </view>

      <!-- 提现金额 -->
      <view class="bg-white rounded-xl p-4">
        <view class="flex items-center justify-between mb-3">
          <text class="text-[#2F1810] font-medium">提现金额</text>
          <view @click="handleWithdrawAll" class="text-sm text-primary">
            <text>全部提现</text>
          </view>
        </view>
        <view class="relative">
          <text class="absolute left-3 top-1/2 -translate-y-1/2 text-2xl text-[#2F1810]">¥</text>
          <input
            v-model="amount"
            type="digit"
            placeholder="0.00"
            class="w-full pl-10 h-14 text-2xl font-semibold border border-accent/30 rounded-xl outline-none focus:border-primary"
          />
        </view>
        <view class="flex items-center gap-1 mt-2 text-xs text-[#5C4033]/60">
          <text class="text-sm">ℹ️</text>
          <text>单笔最低{{ balanceInfo.minWithdraw }}元，最高{{ balanceInfo.maxWithdraw }}元</text>
        </view>
      </view>

      <!-- 收款方式 -->
      <view class="bg-white rounded-xl p-4">
        <text class="text-[#2F1810] font-medium block mb-3">收款方式</text>
        <view class="grid grid-cols-2 gap-3 mb-4">
          <view @click="handleMethodChange('alipay')"
            :class="method === 'alipay' ? 'flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-primary bg-primary/5' : 'flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-accent/30'"
          >
            <text :class="method === 'alipay' ? 'text-primary' : 'text-[#5C4033]/60'" class="text-lg"></text>
            <text :class="method === 'alipay' ? 'text-primary' : 'text-[#5C4033]'">支付宝</text>
          </view>
          <view @click="handleMethodChange('bank')"
            :class="method === 'bank' ? 'flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-primary bg-primary/5' : 'flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-accent/30'"
          >
            <text :class="method === 'bank' ? 'text-primary' : 'text-[#5C4033]/60'" class="text-lg">🏦</text>
            <text :class="method === 'bank' ? 'text-primary' : 'text-[#5C4033]'">银行卡</text>
          </view>
        </view>

        <!-- 支付宝表单 -->
        <view v-if="method === 'alipay'" class="space-y-3">
          <view>
            <text class="text-sm text-[#5C4033]/70 block mb-1.5">支付宝账号</text>
            <input v-model="alipayAccount" placeholder="请输入支付宝账号" class="w-full py-3 px-4 border border-accent/30 rounded-xl text-sm outline-none" />
          </view>
          <view>
            <text class="text-sm text-[#5C4033]/70 block mb-1.5">真实姓名</text>
            <input v-model="alipayName" placeholder="请输入支付宝实名姓名" class="w-full py-3 px-4 border border-accent/30 rounded-xl text-sm outline-none" />
          </view>
        </view>

        <!-- 银行卡表单 -->
        <view v-if="method === 'bank'" class="space-y-3">
          <view>
            <text class="text-sm text-[#5C4033]/70 block mb-1.5">开户银行</text>
            <input v-model="bankName" placeholder="请输入开户银行名称" class="w-full py-3 px-4 border border-accent/30 rounded-xl text-sm outline-none" />
          </view>
          <view>
            <text class="text-sm text-[#5C4033]/70 block mb-1.5">银行卡号</text>
            <input v-model="bankAccount" placeholder="请输入银行卡号" class="w-full py-3 px-4 border border-accent/30 rounded-xl text-sm outline-none" />
          </view>
          <view>
            <text class="text-sm text-[#5C4033]/70 block mb-1.5">持卡人姓名</text>
            <input v-model="bankHolder" placeholder="请输入持卡人姓名" class="w-full py-3 px-4 border border-accent/30 rounded-xl text-sm outline-none" />
          </view>
        </view>
      </view>

      <!-- 费用预览 -->
      <view v-if="amountNum > 0" class="bg-white rounded-xl p-4">
        <view class="flex justify-between text-sm mb-2">
          <text class="text-[#5C4033]/70">提现金额</text>
          <text class="text-[#2F1810]">¥{{ amountNum.toFixed(2) }}</text>
        </view>
        <view class="flex justify-between text-sm mb-2">
          <text class="text-[#5C4033]/70">手续费 ({{ (balanceInfo.feeRate * 100).toFixed(1) }}%，最低{{ balanceInfo.minFee }}元)</text>
          <text class="text-[#2F1810]">-¥{{ fee.toFixed(2) }}</text>
        </view>
        <view class="h-px bg-accent/20 my-2" />
        <view class="flex justify-between">
          <text class="text-[#5C4033]/70">预计到账</text>
          <text class="text-lg font-semibold text-primary">¥{{ actualAmount.toFixed(2) }}</text>
        </view>
      </view>

      <!-- 提交按钮 -->
      <view @click="handleSubmit"
        :class="['w-full h-12 rounded-xl flex items-center justify-center text-sm font-medium', canSubmit ? 'bg-primary text-white' : 'bg-[#E8E0D5] text-muted-foreground']"
      >
        <text>确认提现</text>
      </view>

      <!-- 提示信息 -->
      <view class="text-xs text-[#5C4033]/60 space-y-1">
        <text class="block">• 支付宝提现预计2小时内到账</text>
        <text class="block">• 银行卡提现预计1-3个工作日到账</text>
        <text class="block">• 请确保收款账户信息准确无误</text>
      </view>
    </view>

    <!-- 支付密码弹窗 -->
    <view v-if="showPasswordModal" class="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <view class="w-full bg-white rounded-t-2xl p-4" @click.stop>
        <view class="flex items-center justify-between mb-6">
          <view class="w-8" />
          <text class="text-lg font-medium text-[#2F1810]">请输入支付密码</text>
          <view @click="showPasswordModal = false" class="p-1">
            <text class="text-lg text-[#5C4033]/60">✕</text>
          </view>
        </view>

        <view class="flex justify-center gap-3 mb-6">
          <view v-for="(d, i) in password" :key="i" class="relative">
            <input
              ref="pwdInputs"
              type="number"
              :value="d"
              :maxlength="1"
              :focus="pwdFocusIndex === i"
              @input="onPwdInput(i, $event)"
              @keydown="onPwdKeydown(i, $event)"
              :disabled="verifying"
              class="w-12 h-14 text-center text-2xl font-bold border-2 border-accent/30 rounded-lg outline-none focus:border-primary disabled:opacity-50"
            />
            <view v-if="d" class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <view class="w-3 h-3 bg-[#2F1810] rounded-full" />
            </view>
          </view>
        </view>

        <view v-if="verifying" class="flex items-center justify-center gap-2 text-[#5C4033]/70">
          <text class="animate-spin"></text>
          <text>验证中...</text>
        </view>

        <text class="w-full text-center text-sm text-primary block mt-4 py-2">忘记支付密码？</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'

interface BalanceInfo {
  availableBalance: number
  frozenBalance: number
  pendingBalance: number
  minWithdraw: number
  maxWithdraw: number
  feeRate: number
  minFee: number
}

const loading = ref(true)
const error = ref<string | null>(null)
const success = ref(false)
const showPasswordModal = ref(false)
const verifying = ref(false)

// 余额信息
const balanceInfo = ref<BalanceInfo>({
  availableBalance: 5888.88,
  frozenBalance: 500,
  pendingBalance: 1200,
  minWithdraw: 10,
  maxWithdraw: 50000,
  feeRate: 0.005,
  minFee: 1,
})

// 表单
const amount = ref('')
const method = ref<'alipay' | 'bank'>('alipay')
const alipayAccount = ref('')
const alipayName = ref('')
const bankName = ref('')
const bankAccount = ref('')
const bankHolder = ref('')

// 密码弹窗
const password = ref(['', '', '', '', '', ''])
const pwdFocusIndex = ref(0)

// 成功结果
const withdrawResult = ref<{
  amount: number; fee: number; actualAmount: number; estimatedArrival: string
} | null>(null)

// 加载余额信息
function loadBalanceInfo() {
  loading.value = true
  error.value = null
  setTimeout(() => {
    balanceInfo.value = {
      availableBalance: 5888.88,
      frozenBalance: 500,
      pendingBalance: 1200,
      minWithdraw: 10,
      maxWithdraw: 50000,
      feeRate: 0.005,
      minFee: 1,
    }
    loading.value = false
  }, 500)
}

// 初始化
loadBalanceInfo()

// 计算
const amountNum = computed(() => parseFloat(amount.value) || 0)
const fee = computed(() => Math.max(amountNum.value * balanceInfo.value.feeRate, balanceInfo.value.minFee))
const actualAmount = computed(() => Math.max(amountNum.value - fee.value, 0))

const isValidAmount = computed(() =>
  balanceInfo.value &&
  amountNum.value >= balanceInfo.value.minWithdraw &&
  amountNum.value <= balanceInfo.value.availableBalance &&
  amountNum.value <= balanceInfo.value.maxWithdraw
)

const isValidAccount = computed(() => {
  if (method.value === 'alipay') return alipayAccount.value.trim() && alipayName.value.trim()
  return bankName.value.trim() && bankAccount.value.trim() && bankHolder.value.trim()
})

const canSubmit = computed(() => isValidAmount.value && isValidAccount.value)

// 全部提现
function handleWithdrawAll() {
  if (balanceInfo.value) {
    amount.value = String(Math.min(balanceInfo.value.availableBalance, balanceInfo.value.maxWithdraw))
  }
}

// 切换提现方式
function handleMethodChange(newMethod: 'alipay' | 'bank') {
  method.value = newMethod
  if (newMethod === 'alipay') {
    bankName.value = ''
    bankAccount.value = ''
    bankHolder.value = ''
  } else {
    alipayAccount.value = ''
    alipayName.value = ''
  }
}

// 提交提现
function handleSubmit() {
  if (!canSubmit.value) return
  showPasswordModal.value = true
  password.value = ['', '', '', '', '', '']
  pwdFocusIndex.value = 0
}

// 密码输入处理 - 自动跳到下一格
function onPwdInput(index: number, e: any) {
  const val = e.detail?.value || e.target?.value || ''
  if (!/^\d*$/.test(val)) return

  const newPassword = [...password.value]
  newPassword[index] = val.slice(-1)
  password.value = newPassword

  if (val && index < 5) {
    pwdFocusIndex.value = index + 1
  }

  // 六位输入完成自动验证
  if (index === 5 && newPassword.every(p => p)) {
    verifyAndSubmit(newPassword.join(''))
  }
}

// 退格处理
function onPwdKeydown(index: number, e: any) {
  const key = e.key || e.detail?.key
  if (key === 'Backspace' && !password.value[index] && index > 0) {
    pwdFocusIndex.value = index - 1
  }
}

// 验证并提交
async function verifyAndSubmit(pwd: string) {
  if (verifying.value) return
  verifying.value = true
  await new Promise(r => setTimeout(r, 1500))
  verifying.value = false
  showPasswordModal.value = false

  withdrawResult.value = {
    amount: amountNum.value,
    fee: fee.value,
    actualAmount: actualAmount.value,
    estimatedArrival: '预计2小时内到账',
  }
  success.value = true
}

// 重置表单
function resetWithdraw() {
  success.value = false
  withdrawResult.value = null
  amount.value = ''
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
.animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
</style>
