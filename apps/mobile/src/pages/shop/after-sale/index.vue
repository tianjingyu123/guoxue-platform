<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">after-sale</text>
      <text class="v0-route">V0: shop/after-sale</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5]">
          <!--   -->
          <view class="sticky top-0 z-20 bg-white border-b border-[#E8E3DB] px-4 py-3 flex items-center gap-3">
            <view class="v0-btn" @click={() => router.back()} class="p-1 -ml-1">
              <ChevronLeft class="w-6 h-6 text-[#2C2C2C]" />
            </view>
            <text class="text-lg font-semibold text-[#2C2C2C] font-serif">申请售后</text>
          </view>
    
          <view class="p-4 space-y-4 pb-28">
            <!--   -->
            <view class="bg-white rounded-2xl p-4">
              <text class="text-sm font-medium text-[#2C2C2C] mb-3">售后类型</text>
              <view class="flex gap-3">
                <view class="v0-btn"
                  @click={() => setType('refund_only')}
                  class={`flex-1 py-3 rounded-xl border-2 transition-all ${
                    type === 'refund_only'
                      ? 'border-[#C41E3A] bg-red-50'
                      : 'border-[#E8E3DB] bg-white'
                  }`}
                >
                  <view class={`text-sm font-medium ${type === 'refund_only' ? 'text-[#C41E3A]' : 'text-[#2C2C2C]'}`}>
                    仅退款
                  </view>
                  <view class="text-xs text-[#999999] mt-1">无需退货</view>
                </view>
                <view class="v0-btn"
                  @click={() => setType('refund_with_return')}
                  class={`flex-1 py-3 rounded-xl border-2 transition-all ${
                    type === 'refund_with_return'
                      ? 'border-[#C41E3A] bg-red-50'
                      : 'border-[#E8E3DB] bg-white'
                  }`}
                >
                  <view class={`text-sm font-medium ${type === 'refund_with_return' ? 'text-[#C41E3A]' : 'text-[#2C2C2C]'}`}>
                    退货退款
                  </view>
                  <view class="text-xs text-[#999999] mt-1">需寄回商品</view>
                </view>
              </view>
            </view>
    
            <!--   -->
            <view class="bg-white rounded-2xl p-4">
              <text class="text-sm font-medium text-[#2C2C2C] mb-3">退款原因 <text class="text-[#C41E3A]">*</text></text>
              <view class="v0-btn"
                @click={() => setShowReasonPicker(true)}
                class={`w-full flex items-center justify-between py-3 px-4 rounded-xl border ${
                  errors.reason ? 'border-red-400 bg-red-50' : 'border-[#E8E3DB]'
                }`}
              >
                <text class={reason ? 'text-[#2C2C2C]' : 'text-[#999999]'}>
                  {reason || '请选择退款原因'}
                </text>
                <ChevronDown class="w-5 h-5 text-[#999999]" />
              </view>
              {errors.reason && (
                <text class="text-xs text-red-500 mt-2 flex items-center gap-1">
                  <AlertCircle class="w-3 h-3" />{{ errors.reason }}
                </text>
              )}
            </view>
    
            <!--   -->
            <view class="bg-white rounded-2xl p-4">
              <text class="text-sm font-medium text-[#2C2C2C] mb-3">
                退款金额 <text class="text-[#C41E3A]">*</text>
                <text class="text-xs text-[#999999] font-normal ml-2">最多可退 ¥{{ maxAmount.toFixed(2) }}</text>
              </text>
              <view class={`flex items-center gap-2 py-3 px-4 rounded-xl border ${
                errors.amount ? 'border-red-400 bg-red-50' : 'border-[#E8E3DB]'
              }`}>
                <text class="text-xl font-bold text-[#C41E3A]">¥</text>
                <input
                  type="number"
                  value={{ amount }}
                  @change={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  class="flex-1 text-xl font-bold text-[#2C2C2C] bg-transparent outline-none"
                />
                <view class="v0-btn"
                  @click={() => setAmount(maxAmount.toString())}
                  class="text-xs text-[#C41E3A] bg-red-50 px-2 py-1 rounded"
                >
                  全额退款
                </view>
              </view>
              {errors.amount && (
                <text class="text-xs text-red-500 mt-2 flex items-center gap-1">
                  <AlertCircle class="w-3 h-3" />{{ errors.amount }}
                </text>
              )}
            </view>
    
            <!--   -->
            <view class="bg-white rounded-2xl p-4">
              <text class="text-sm font-medium text-[#2C2C2C] mb-3">问题描述</text>
              <textarea
                value={{ description }}
                @change={(e) => setDescription(e.target.value)}
                placeholder="请详细描述您遇到的问题，以便我们更好地处理..."
                rows={{ 4 }}
                maxLength={{ 500 }}
                class="w-full p-3 rounded-xl border border-[#E8E3DB] text-sm text-[#2C2C2C] placeholder:text-[#999999] resize-none outline-none focus:border-[#C41E3A]"
              />
              <view class="text-right text-xs text-[#999999] mt-1">{{ description.length }}/500</view>
            </view>
    
            <!--   -->
            <view class="bg-white rounded-2xl p-4">
              <text class="text-sm font-medium text-[#2C2C2C] mb-3">上传凭证 <text class="text-xs text-[#999999] font-normal">（最多5张）</text></text>
              <view class="flex flex-wrap gap-3">
                
    <view v-for="(img, index) in images" :key="index"> (
                  <view key={index} class="relative w-20 h-20">
                    <image src={{ img }} alt="" class="w-full h-full object-cover rounded-lg" />
                    <view class="v0-btn"
                      @click={() => removeImage(index)}
                      class="absolute -top-2 -right-2 w-5 h-5 bg-[#2C2C2C] rounded-full flex items-center justify-center"
                    >
                      <X class="w-3 h-3 text-white" />
                    </view>
                  </view>
                ))}
                {images.length < 5 && (
                  <text class="w-20 h-20 border-2 border-dashed border-[#E8E3DB] rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#C41E3A] transition-colors">
                    <Camera class="w-6 h-6 text-[#999999]" />
                    <text class="text-xs text-[#999999] mt-1">{uploading ? '上传中' : '上传'}</text>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      @change={{ handleImageUpload }}
                      class="hidden"
                      :disabled={{ uploading }}
                    />
                  </text>
                )}
              </view>
            </view>
    
            <!--   -->
            {type === 'refund_with_return' && (
              <view class="bg-amber-50 rounded-2xl p-4">
                <text class="text-sm font-medium text-amber-800 mb-2">退货说明</text>
                <view class="text-xs text-amber-700 space-y-1">
                  <view>1. 请在收到退货地址后7天内寄回商品</view>
                  <view>2. 请保持商品原状，附带所有包装和配件</view>
                  <view>3. 建议使用有物流追踪的快递方式</view>
                  <view>4. 退款将在收到商品后1-3个工作日内处理</view>
                </view>
              </view>
            )}
          </view>
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] p-4 safe-area-pb">
            <view class="v0-btn"
              @click={{ handleSubmit }}
              :disabled={{ submitting }}
              class="w-full py-3 bg-gradient-to-r from-[#C41E3A] to-[#E85A6B] text-white font-medium rounded-xl disabled:opacity-50"
            >
              {submitting ? '提交中...' : '提交申请'}
            </view>
          </view>
    
          <!--   -->
          {showReasonPicker && (
            <view class="fixed inset-0 z-50 bg-black/50" @click={() => setShowReasonPicker(false)}>
              <view 
                class="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[60vh] overflow-hidden"
                @click={(e) => e.stopPropagation()}
              >
                <view class="p-4 border-b border-[#E8E3DB] flex items-center justify-between">
                  <text class="font-medium text-[#2C2C2C]">选择退款原因</text>
                  <view class="v0-btn" @click={() => setShowReasonPicker(false)} class="text-[#999999]">
                    <X class="w-5 h-5" />
                  </view>
                </view>
                <view class="p-4 space-y-2 max-h-[50vh] overflow-y-auto">
                  
    <view v-for="(r, index) in reasons" :key="index"> (
                    <view class="v0-btn"
                      key={{ r }}
                      @click={() => {
                        setReason(r)
                        setShowReasonPicker(false)
                        setErrors({ ...errors, reason: '' })
                      }}
                      class={`w-full text-left py-3 px-4 rounded-xl transition-colors ${
                        reason === r
                          ? 'bg-red-50 text-[#C41E3A] border border-[#C41E3A]'
                          : 'bg-[#FAF8F5] text-[#2C2C2C]'
                      }`}
                    >
                      {{ r }}
                    </view>
                  ))}
                </view>
              </view>
            </view>
          )}
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const reasons = [
    const newErrors: Record<string, string> = {}
      const data: AfterSaleApplication = {

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