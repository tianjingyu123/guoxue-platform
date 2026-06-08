<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">pay-timeout</text>
      <text class="v0-route">V0: shop/pay-timeout</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5]">
          <!--   -->
          <view class="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-[#E8E3DB] px-4 py-3 flex items-center">
            <view class="v0-btn" @click={() => router.back()} class="p-1 -ml-1">
              <ChevronLeft class="w-6 h-6 text-[#2C2C2C]" />
            </view>
            <text class="ml-2 text-lg font-medium text-[#2C2C2C]">支付结果</text>
          </view>
    
          <!--   -->
          <view class="bg-gradient-to-b from-orange-400 to-orange-500 pt-12 pb-20 px-4">
            <view class="flex flex-col items-center">
              <!--   -->
              <view class="relative mb-6">
                <view class="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <Clock class="w-10 h-10 text-orange-500 animate-pulse" />
                </view>
                <!--   -->
                <view class="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-white/50 rounded-full animate-spin" :style=" animationDuration: '2s' }} />
              </view>
              
              <!--   -->
              <text class="text-2xl font-bold text-white mb-2">支付超时</text>
              <text class="text-white/90 text-sm mb-4">订单已超时，请重新发起支付</text>
              
              <!--   -->
              <view class="text-white/80 text-sm">
                订单金额
                <text class="text-3xl font-bold text-white ml-2">¥{{ amount }}</text>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 -mt-12 pb-32 space-y-4">
            <!--   -->
            <view class="bg-white rounded-2xl p-4 shadow-sm">
              <view class="flex items-center gap-2 mb-4">
                <AlertCircle class="w-5 h-5 text-orange-500" />
                <text class="font-medium text-[#2C2C2C]">可能的原因</text>
              </view>
              
              <view class="space-y-3">
                
    <view v-for="(reason, index) in timeoutReasons" :key="index"> (
                  <view key={index} class="flex items-start gap-3 p-3 bg-orange-50 rounded-xl">
                    <view class="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <reason.icon class="w-4 h-4 text-orange-600" />
                    </view>
                    <text class="text-sm text-[#666666] leading-relaxed pt-1">{{ reason.text }}</text>
                  </view>
                ))}
              </view>
            </view>
    
            <!--   -->
            <view class="bg-white rounded-2xl p-4 shadow-sm">
              <text class="font-medium text-[#2C2C2C] mb-3">订单信息</text>
              <view class="space-y-2">
                <view class="flex justify-between items-center py-2">
                  <text class="text-sm text-[#999999]">订单编号</text>
                  <text class="text-sm text-[#2C2C2C] font-mono">{{ orderId }}</text>
                </view>
                <view class="flex justify-between items-center py-2 border-t border-[#E8E3DB]">
                  <text class="text-sm text-[#999999]">超时时间</text>
                  <text class="text-sm text-[#666666]">{new Date().toLocaleString('zh-CN')}</text>
                </view>
                <view class="flex justify-between items-center py-2 border-t border-[#E8E3DB]">
                  <text class="text-sm text-[#999999]">订单状态</text>
                  <text class="text-sm text-orange-500 font-medium">待支付</text>
                </view>
              </view>
            </view>
    
            <!--   -->
            <view class="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <view class="flex items-start gap-2">
                <view class="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <text class="text-white text-xs font-bold">!</text>
                </view>
                <view class="text-sm text-blue-700 leading-relaxed">
                  <text class="font-medium mb-1">温馨提示</text>
                  <text>如您已完成支付但显示超时，资金会在1-3个工作日内原路退回。如有疑问请联系客服。</text>
                </view>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] p-4 space-y-3">
            <view class="v0-btn"
              @click={() => router.push(`/shop/paying?orderId=${orderId}`)}
              class="w-full py-3 bg-gradient-to-r from-[#C41E3A] to-[#E53935] text-white font-medium rounded-xl flex items-center justify-center gap-2"
            >
              <RefreshCw class="w-5 h-5" />
              重新支付
            </view>
            
            <view class="flex gap-3">
              <view class="v0-btn"
                @click={() => router.push(`/shop/checkout?orderId=${orderId}`)}
                class="flex-1 py-3 border border-[#E8E3DB] text-[#666666] font-medium rounded-xl flex items-center justify-center gap-2"
              >
                <ArrowLeftRight class="w-4 h-4" />
                换个支付方式
              </view>
              <view class="v0-btn"
                @click={() => router.push(`/shop/orders/${orderId}`)}
                class="flex-1 py-3 border border-[#E8E3DB] text-[#666666] font-medium rounded-xl flex items-center justify-center gap-2"
              >
                <FileText class="w-4 h-4" />
                查看订单
              </view>
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
const timeoutReasons = [

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