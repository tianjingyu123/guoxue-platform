<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">提现</text>
      <text class="v0-route">V0: wallet/withdraw</text>
    </view>
          <view class="min-h-screen bg-[#FAF8F5]">
            <view class="sticky top-0 z-10 bg-[#FAF8F5] border-b border-[#C9A96E]/20">
              <view class="flex items-center h-14 px-4">
                <view class="v0-btn" @click={() => router.push("/wallet")} class="p-2 -ml-2">
                  <ArrowLeft class="w-5 h-5 text-[#2F1810]" />
                </view>
                <text class="flex-1 text-center text-lg font-medium text-[#2F1810]">提现结果</text>
                <view class="w-9" />
              </view>
            </view>
    
            <view class="flex flex-col items-center px-4 pt-12">
              <view class="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                <Check class="w-8 h-8 text-green-600" />
              </view>
              <text class="text-xl font-semibold text-[#2F1810] mb-2">提现申请已提交</text>
              <text class="text-[#5C4033]/70 mb-8">{{ withdrawResult.estimatedArrival }}</text>
    
              <view class="w-full bg-white rounded-xl p-4 space-y-3">
                <view class="flex justify-between">
                  <text class="text-[#5C4033]/70">提现金额</text>
                  <text class="text-[#2F1810]">¥{{ withdrawResult.amount.toFixed(2) }}</text>
                </view>
                <view class="flex justify-between">
                  <text class="text-[#5C4033]/70">手续费</text>
                  <text class="text-[#2F1810]">-¥{{ withdrawResult.fee.toFixed(2) }}</text>
                </view>
                <view class="h-px bg-[#C9A96E]/20" />
                <view class="flex justify-between">
                  <text class="text-[#5C4033]/70">实际到账</text>
                  <text class="text-lg font-semibold text-[#C41E3A]">¥{{ withdrawResult.actualAmount.toFixed(2) }}</text>
                </view>
              </view>
    
              <view class="flex gap-3 w-full mt-8">
                <Button
                  variant="outline"
                  class="flex-1 border-[#C9A96E] text-[#C9A96E]"
                  @click={() => router.push("/wallet")}
                >
                  返回钱包
                </Button>
                <Button
                  class="flex-1 bg-[#C41E3A] hover:bg-[#A31830] text-white"
                  @click={() => {
                    setSuccess(false)
                    setWithdrawResult(null)
                    setAmount("")
                    loadBalanceInfo()
                  }}
                >
                  继续提现
                </Button>
              </view>
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
  const isValidAccount = method === "alipay" 
    const newPassword = [...password]
      const account: WithdrawAccount = method === "alipay"

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