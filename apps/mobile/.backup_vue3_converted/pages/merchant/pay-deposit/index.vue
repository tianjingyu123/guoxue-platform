<template>
  <view class="min-h-screen bg-background pb-32">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-white border-b border-border">
      <view class="flex items-center h-14 px-4">
        <view @click="goBack" class="mr-3 p-1">
          <text class="text-xl text-foreground">←</text>
        </view>
        <text class="text-lg font-semibold">缴纳保证金</text>
      </view>
    </view>

    <!-- 支付成功状态 -->
    <template v-if="isPaid">
      <view class="p-4">
        <view class="bg-green-50 rounded-2xl p-8">
          <view class="flex flex-col items-center text-center">
            <view class="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <text class="text-5xl"></text>
            </view>
            <text class="text-xl font-bold text-green-600 mb-2">支付成功</text>
            <text class="text-sm text-muted-foreground mb-4">保证金已缴纳，即将跳转...</text>
            <view class="w-full space-y-2 text-sm bg-white rounded-xl p-4">
              <view class="flex justify-between">
                <text class="text-muted-foreground">缴纳金额</text>
                <text class="font-medium text-primary">¥{{ depositInfo.totalDeposit }}.00</text>
              </view>
              <view class="flex justify-between">
                <text class="text-muted-foreground">缴纳时间</text>
                <text class="font-medium">{{ depositInfo.paidAt }}</text>
              </view>
              <view class="flex justify-between">
                <text class="text-muted-foreground">交易流水号</text>
                <text class="font-mono text-xs">{{ depositInfo.transactionId }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </template>

    <!-- 缴费表单 -->
    <template v-else>
      <view class="p-4 space-y-4">
        <!-- 应缴金额 -->
        <view class="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-6">
          <view class="text-center">
            <text class="text-sm text-muted-foreground mb-2 block">应缴保证金</text>
            <view class="flex items-baseline justify-center gap-1">
              <text class="text-sm text-primary">¥</text>
              <text class="text-4xl font-bold text-primary">{{ depositInfo.totalDeposit }}</text>
              <text class="text-sm text-primary">.00</text>
            </view>
          </view>
          <view class="mt-4 pt-4 border-t border-primary/10 space-y-2">
            <view class="flex justify-between text-sm">
              <text class="text-muted-foreground">基础保证金</text>
              <text>¥{{ depositInfo.baseDeposit }}.00</text>
            </view>
            <view class="flex justify-between text-sm">
              <text class="text-muted-foreground">类目保证金</text>
              <text>¥{{ depositInfo.categoryDeposit }}.00</text>
            </view>
          </view>
        </view>

        <!-- 保证金说明 -->
        <view class="bg-white rounded-2xl p-4">
          <view class="flex items-start gap-3">
            <text class="text-green-500 mt-0.5">🛡️</text>
            <view>
              <text class="font-medium mb-1 block">保证金说明</text>
              <text class="text-sm text-muted-foreground">保证金用于保障消费者权益和平台交易安全。在您退出经营且无违规记录的情况下，保证金将全额退还。</text>
            </view>
          </view>
        </view>

        <!-- 支付方式 -->
        <view class="bg-white rounded-2xl p-4">
          <text class="font-medium mb-4 block">选择支付方式</text>
          <view class="space-y-3">
            <view v-for="method in paymentMethods" :key="method.id" @click="selectedMethod = method.id" :class="['flex items-center justify-between p-4 rounded-xl border-2 transition-all', selectedMethod === method.id ? 'border-primary bg-primary/5' : 'border-border']">
              <view class="flex items-center gap-3">
                <text :class="['text-2xl', method.color]">{{ method.icon }}</text>
                <text class="font-medium">{{ method.name }}</text>
              </view>
              <view :class="['w-5 h-5 rounded-full border-2 flex items-center justify-center', selectedMethod === method.id ? 'border-primary bg-primary' : 'border-[#ccc]']">
                <text v-if="selectedMethod === method.id" class="text-xs text-white">✓</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 银行卡转账信息 -->
        <view v-if="selectedMethod === 'bank'" class="bg-white rounded-2xl p-4">
          <text class="font-medium mb-4 block">收款账户信息</text>
          <view class="space-y-4">
            <view>
              <text class="text-xs text-muted-foreground mb-1 block">开户银行</text>
              <text class="font-medium">{{ bankInfo.bankName }}</text>
            </view>
            <view>
              <text class="text-xs text-muted-foreground mb-1 block">账户名称</text>
              <text class="font-medium">{{ bankInfo.accountName }}</text>
            </view>
            <view class="flex items-center justify-between">
              <view>
                <text class="text-xs text-muted-foreground mb-1 block">银行账号</text>
                <text class="font-mono font-medium">{{ bankInfo.accountNo }}</text>
              </view>
              <view @click="handleCopy(bankInfo.accountNo)" class="w-9 h-9 rounded-lg border border-border flex items-center justify-center">
                <text>{{ copied ? '' : '' }}</text>
              </view>
            </view>
            <view class="p-3 bg-amber-50 rounded-xl">
              <text class="text-sm text-amber-600">转账时请备注：{{ bankInfo.remark }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部确认支付按钮 -->
      <view class="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-border">
        <view @click="handlePay" :class="['w-full h-12 rounded-xl flex items-center justify-center text-base font-medium', isPaying ? 'opacity-50 bg-primary text-white' : 'bg-primary text-white']">
          <text v-if="isPaying" class="flex items-center gap-2">
            <text class="animate-spin inline-block"></text>
            支付中...
          </text>
          <text v-else>
             确认支付 ¥{{ depositInfo.totalDeposit }}.00
          </text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const paymentMethods = [
  { id: 'wechat', name: '微信支付', icon: '', color: 'text-green-500' },
  { id: 'alipay', name: '支付宝', icon: '', color: 'text-blue-500' },
  { id: 'bank', name: '银行卡转账', icon: '🏦', color: 'text-orange-500' },
]

const depositInfo = {
  baseDeposit: 1000,
  categoryDeposit: 1000,
  totalDeposit: 2000,
  paidAt: '2024-01-17 15:30:25',
  transactionId: 'PAY202401171530250001',
}

const bankInfo = {
  bankName: '中国工商银行',
  accountName: '热卜（北京）科技有限公司',
  accountNo: '6222 0202 0001 1234 5678',
  remark: '商家入驻保证金',
}

const selectedMethod = ref('wechat')
const isPaying = ref(false)
const isPaid = ref(false)
const copied = ref(false)

function handleCopy(text: string) {
  uni.setClipboardData({
    data: text.replace(/\s/g, ''),
    success: () => {
      copied.value = true
      uni.showToast({ title: '已复制', icon: 'none' })
      setTimeout(() => { copied.value = false }, 2000)
    },
  })
}

async function handlePay() {
  isPaying.value = true
  await new Promise(resolve => setTimeout(resolve, 2000))
  isPaying.value = false
  isPaid.value = true
  setTimeout(() => {
    uni.navigateTo({ url: '/pages/merchant/application-status/index' })
  }, 3000)
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
