<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">商家中心</text>
      <text class="v0-route">V0: merchant/pay-deposit</text>
    </view>
          <view class="min-h-screen bg-background">
            <view class="sticky top-0 z-50 bg-background border-b border-border"><view class="flex items-center h-14 px-4"><Link href="/merchant/application-status" class="mr-3"><ArrowLeft class="w-5 h-5" /></Link><text class="text-lg font-semibold">缴纳保证金</text></view></view>
            <view class="p-4">
              <Card class="p-8 bg-green-50 dark:bg-green-950/30">
                <view class="flex flex-col items-center text-center">
                  <view class="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mb-4"><CheckCircle2 class="w-12 h-12 text-green-500" /></view>
                  <text class="text-xl font-bold text-green-600 mb-2">支付成功</text>
                  <text class="text-sm text-muted-foreground mb-4">保证金已缴纳，即将跳转...</text>
                  <view class="w-full space-y-2 text-sm bg-background rounded-lg p-4">
                    <view class="flex justify-between"><text class="text-muted-foreground">缴纳金额</text><text class="font-medium text-primary">¥{{ depositInfo.totalDeposit }}.00</text></view>
                    <view class="flex justify-between"><text class="text-muted-foreground">缴纳时间</text><text class="font-medium">{{ depositInfo.paidAt }}</text></view>
                    <view class="flex justify-between"><text class="text-muted-foreground">交易流水号</text><text class="font-mono text-xs">{{ depositInfo.transactionId }}</text></view>
                  </view>
                </view>
              </Card>
            </view>
          </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const paymentMethods = [
  const depositInfo = { baseDeposit: 1000, categoryDeposit: 1000, totalDeposit: 2000, paidAt: "2024-01-17 15:30:25", transactionId: "PAY202401171530250001" }
  const bankInfo = { bankName: "中国工商银行", accountName: "热卜（北京）科技有限公司", accountNo: "6222 0202 0001 1234 5678", remark: "商家入驻保证金" }

async function fetchData() {
  loading.value = true
  try { loading.value = false } catch (e: any) { error.value = e.message }
}

onMounted(() => fetchData())
onPullDownRefresh(() => fetchData().finally(() => uni.stopPullDownRefresh()))
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}
.v0-header {
  padding: 24rpx 32rpx;
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  margin-bottom: 24rpx;
}
.v0-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #FFFFFF;
  display: block;
}
.v0-route {
  font-size: 20rpx;
  color: rgba(255,255,255,0.6);
  margin-top: 4rpx;
  display: block;
}
.v0-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 32rpx;
  border-radius: 12rpx;
  background: #C41E3A;
  color: #FFFFFF;
  font-size: 28rpx;
}
.v0-hr {
  height: 1px;
  background: #E8E0D5;
  margin: 24rpx 0;
}
</style>