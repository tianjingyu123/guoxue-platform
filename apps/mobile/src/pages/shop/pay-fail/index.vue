<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">pay-fail</text>
      <text class="v0-route">V0: shop/pay-fail</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5]">
          <!--   -->
          <view class="bg-gradient-to-b from-[#C41E3A] to-[#E8534A] pt-16 pb-24 px-4 relative overflow-hidden">
            <!--   -->
            <view class="absolute top-10 right-10 w-32 h-32 border border-white/10 rounded-full" />
            <view class="absolute top-20 right-20 w-20 h-20 border border-white/10 rounded-full" />
            
            <!--   -->
            <view class="flex flex-col items-center">
              <view class="relative">
                <!--   -->
                <view class="absolute inset-0 w-24 h-24 rounded-full bg-white/20 animate-ping" :style=" animationDuration: "2s" }} />
                <!--   -->
                <view 
                  class="relative w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg"
                  :style=" animation: "shake 0.5s ease-in-out" }}
                >
                  <X class="w-12 h-12 text-[#C41E3A]" strokeWidth={{ 3 }} />
                </view>
              </view>
              
              <!--   -->
              <text class="mt-6 text-2xl font-bold text-white">{{ failInfo.title }}</text>
              
              <!--   -->
              <view class="mt-2 text-white/90">
                <text class="text-sm">¥</text>
                <text class="text-3xl font-bold ml-1">{{ parseFloat(amount).toFixed(2) }}</text>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 -mt-12 relative z-10">
            <view class="bg-white rounded-2xl shadow-sm p-6">
              <!--   -->
              <view class="flex items-center gap-3 pb-4 border-b border-[#E8E3DB]">
                <view class="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-[#C41E3A]">
                  {{ failInfo.icon }}
                </view>
                <view>
                  <view class="font-medium text-[#2C2C2C]">{{ failInfo.title }}</view>
                  <view class="text-sm text-[#999999] mt-0.5">{{ failInfo.desc }}</view>
                </view>
              </view>
    
              <!--   -->
              <view class="mt-4 space-y-3">
                <view class="flex justify-between text-sm">
                  <text class="text-[#999999]">订单编号</text>
                  <text class="text-[#2C2C2C] font-mono">{orderId || "—"}</text>
                </view>
                <view class="flex justify-between text-sm">
                  <text class="text-[#999999]">失败时间</text>
                  <text class="text-[#2C2C2C]">{new Date().toLocaleString("zh-CN")}</text>
                </view>
              </view>
    
              <!--   -->
              <view class="mt-6 space-y-3">
                <view class="v0-btn"
                  @click={() => router.push(`/shop/paying?orderId=${orderId}`)}
                  class="w-full py-3.5 bg-gradient-to-r from-[#C41E3A] to-[#E8534A] text-white rounded-xl font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  <RefreshCw class="w-5 h-5" />
                  重新支付
                </view>
                
                <view class="v0-btn"
                  @click={() => router.push(`/shop/checkout?orderId=${orderId}`)}
                  class="w-full py-3.5 bg-[#FAF8F5] text-[#2C2C2C] rounded-xl font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  <CreditCard class="w-5 h-5" />
                  换个方式支付
                </view>
                
                <view class="v0-btn"
                  @click={() => router.push(`/orders/${orderId}`)}
                  class="w-full py-3.5 text-[#666666] rounded-xl font-medium flex items-center justify-center gap-2"
                >
                  <FileText class="w-5 h-5" />
                  查看订单详情
                </view>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 mt-6">
            <view class="bg-orange-50 rounded-xl p-4">
              <view class="flex items-start gap-3">
                <AlertCircle class="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <view class="text-sm text-orange-700">
                  <view class="font-medium mb-1">温馨提示</view>
                  <view class="space-y-1 text-orange-600">
                    <view>• 请检查支付账户余额是否充足</view>
                    <view>• 确保网络连接稳定后重试</view>
                    <view>• 如多次失败，请尝试其他支付方式</view>
                    <view>• 订单将保留30分钟，请尽快完成支付</view>
                  </view>
                </view>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-8 text-center">
            <view class="v0-btn"
              @click={() => router.push("/shop")}
              class="text-[#999999] text-sm"
            >
              返回商城首页
            </view>
          </view>
    
          <!--   -->
          <style jsx>{`
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
              20%, 40%, 60%, 80% { transform: translateX(5px); }
            }
          `}</style>
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const failReasons: Record<string, { title: string; desc: string; icon: React.ReactNode }> = {

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