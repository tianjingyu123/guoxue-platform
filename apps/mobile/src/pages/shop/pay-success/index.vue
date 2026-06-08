<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">pay-success</text>
      <text class="v0-route">V0: shop/pay-success</text>
    </view>
        <view class="min-h-screen bg-gradient-to-b from-[#4CAF50] to-[#45a049]">
          <!--   -->
          <view class="pt-16 pb-8 flex flex-col items-center">
            <!--   -->
            <view class={`relative w-24 h-24 mb-6 transition-all duration-500 ${showAnimation ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}>
              <view class="absolute inset-0 bg-white rounded-full shadow-lg" />
              <view class={`absolute inset-0 flex items-center justify-center transition-all duration-700 delay-300 ${showAnimation ? "scale-100" : "scale-0"}`}>
                <CheckCircle class="w-16 h-16 text-[#4CAF50]" strokeWidth={{ 2.5 }} />
              </view>
              <!--   -->
              <view class={`absolute inset-0 rounded-full border-4 border-white/30 transition-all duration-1000 ${showAnimation ? "scale-150 opacity-0" : "scale-100 opacity-100"}`} />
            </view>
            
            <text class={`text-2xl font-bold text-white mb-2 transition-all duration-500 delay-200 ${showAnimation ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
              支付成功
            </text>
            
            {orderInfo && (
              <view class={`text-center transition-all duration-500 delay-300 ${showAnimation ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
                <view class="text-4xl font-bold text-white mb-1">
                  ¥{{ orderInfo.amount.toFixed(2) }}
                </view>
                <view class="text-white/80 text-sm">
                  {{ orderInfo.payMethod }} · {{ orderInfo.itemCount }}件商品
                </view>
              </view>
            )}
          </view>
          
          <!--   -->
          <view class="bg-[#FAF8F5] rounded-t-3xl min-h-[60vh] p-4">
            <!--   -->
            <view class={`bg-white rounded-2xl p-4 shadow-sm mb-4 transition-all duration-500 delay-400 ${showAnimation ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
              <view class="flex items-center justify-between py-3 border-b border-[#E8E3DB]">
                <text class="text-[#666666]">订单编号</text>
                <view class="flex items-center gap-2">
                  <text class="text-[#2C2C2C] font-medium">{{ orderInfo?.orderId }}</text>
                  <view class="v0-btn" 
                    @click={{ handleCopy }}
                    class="text-[#C41E3A] text-sm flex items-center gap-1"
                  >
                    <Copy class="w-4 h-4" />
                    {copied ? "已复制" : "复制"}
                  </view>
                </view>
              </view>
              <view class="flex items-center justify-between py-3 border-b border-[#E8E3DB]">
                <text class="text-[#666666]">支付方式</text>
                <text class="text-[#2C2C2C]">{{ orderInfo?.payMethod }}</text>
              </view>
              <view class="flex items-center justify-between py-3">
                <text class="text-[#666666]">支付时间</text>
                <text class="text-[#2C2C2C]">{{ orderInfo?.paidAt }}</text>
              </view>
            </view>
            
            <!--   -->
            <view class={`space-y-3 mb-6 transition-all duration-500 delay-500 ${showAnimation ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
              <view class="v0-btn"
                @click={() => router.push(`/shop/orders/${orderInfo?.orderId}`)}
                class="w-full py-4 bg-[#C41E3A] text-white rounded-xl font-medium flex items-center justify-center gap-2 active:bg-[#a01830]"
              >
                <ShoppingBag class="w-5 h-5" />
                查看订单
              </view>
              <view class="v0-btn"
                @click={() => router.push("/")}
                class="w-full py-4 bg-white border border-[#E8E3DB] text-[#2C2C2C] rounded-xl font-medium flex items-center justify-center gap-2 active:bg-gray-50"
              >
                <Home class="w-5 h-5" />
                返回首页
              </view>
            </view>
            
            <!--   -->
            <view class={`transition-all duration-500 delay-600 ${showAnimation ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
              <text class="text-[#666666] text-sm mb-3">猜你喜欢</text>
              <view class="bg-white rounded-2xl overflow-hidden">
                <view class="v0-btn" 
                  @click={() => router.push("/shop")}
                  class="w-full p-4 flex items-center gap-3 active:bg-gray-50"
                >
                  <view class="w-10 h-10 bg-gradient-to-br from-[#C41E3A] to-[#e85a6b] rounded-xl flex items-center justify-center">
                    <Gift class="w-5 h-5 text-white" />
                  </view>
                  <view class="flex-1 text-left">
                    <view class="text-[#2C2C2C] font-medium">更多好物</view>
                    <view class="text-[#999999] text-sm">发现更多国学精品</view>
                  </view>
                  <ChevronRight class="w-5 h-5 text-[#999999]" />
                </view>
              </view>
            </view>
            
            <!--   -->
            <view class="mt-8 text-center text-[#999999] text-xs">
              <text>如有问题请联系客服</text>
              <text class="mt-1">感谢您的支持，祝您学习愉快！</text>
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