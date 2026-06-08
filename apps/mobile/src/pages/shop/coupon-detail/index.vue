<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">coupon-detail</text>
      <text class="v0-route">V0: shop/coupon-detail</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5]">
          <!--   -->
          <view class="sticky top-0 z-20 bg-white border-b border-[#E8E3DB] px-4 py-3 flex items-center gap-3">
            <view class="v0-btn" @click={() => router.back()} class="p-2 -ml-2">
              <ChevronLeft size={{ 24 }} class="text-[#2C2C2C]" />
            </view>
            <text class="text-lg font-semibold text-[#2C2C2C]">优惠券详情</text>
          </view>
    
          <view class="p-4">
            <!--   -->
            <view class="bg-gradient-to-r from-[#C41E3A] to-[#E74C57] rounded-2xl p-6 text-white mb-6 shadow-lg">
              <view class="flex items-start justify-between mb-4">
                <view>
                  <view class="text-4xl font-bold">{{ coupon.value }}</view>
                  <view class="text-sm mt-1 opacity-90">元</view>
                </view>
                <view class="text-right text-sm">
                  <view>满{{ coupon.minAmount }}元可用</view>
                  <view class="opacity-90 text-xs mt-1">至 {{ coupon.expireAt }}</view>
                </view>
              </view>
              <view class="border-t border-white border-opacity-30 pt-3 text-sm">{{ coupon.description }}</view>
            </view>
    
            <!--   -->
            <view class="bg-white rounded-2xl p-4 mb-6">
              <view class="flex items-center justify-between">
                <view>
                  <view class="text-xs text-[#999999] mb-2">优惠券代码</view>
                  <view class="font-mono text-lg text-[#2C2C2C] font-semibold">{{ coupon.id }}</view>
                </view>
                <view class="v0-btn"
                  @click={{ handleCopy }}
                  class="flex items-center gap-2 px-4 py-2 bg-[#C41E3A] text-white rounded-lg active:opacity-80"
                >
                  {{ copied ? (
                    
                      <CheckCircle2 size={16 }} />
                      <text class="text-sm">已复制</text>
                    
                  ) : (
                    
                      <Copy size={{ 16 }} />
                      <text class="text-sm">复制</text>
                    
                  )}
                </view>
              </view>
            </view>
    
            <!--   -->
            <view class="bg-white rounded-2xl p-4 mb-6">
              <view class="font-semibold text-[#2C2C2C] mb-4">使用说明</view>
              <view class="space-y-3">
                {coupon.rules.map((rule, idx) => (
                  <view key={idx} class="flex gap-3 text-sm">
                    <view class="text-[#C41E3A] font-semibold flex-shrink-0">•</view>
                    <view class="text-[#666666]">{{ rule }}</view>
                  </view>
                ))}
              </view>
            </view>
    
            <!--   -->
            <view class="mb-6">
              <view class="bg-white rounded-t-2xl p-4 border-b border-[#E8E3DB]">
                <view class="font-semibold text-[#2C2C2C]">适用商品/课程</view>
              </view>
              <view class="bg-white rounded-b-2xl divide-y divide-[#E8E3DB]">
                
    <view v-for="(item, index) in applicableItems" :key="index"> (
                  <view class="v0-btn"
                    key={{ item.id }}
                    @click={() => router.push(item.type === 'product' ? `/shop/${{ item.id }}` : `/courses/${{ item.id }}`)}
                    class="w-full p-4 flex gap-3 hover:bg-[#F5F5F5] transition-colors text-left active:opacity-70"
                  >
                    <view class="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0" />
                    <view class="flex-1 min-w-0">
                      <view class="flex items-center gap-2 mb-1">
                        {item.type === 'product' ? (
                          <ShoppingBag size={{ 14 }} class="text-[#999999] flex-shrink-0" />
                        ) : (
                          <BookOpen size={{ 14 }} class="text-[#C9A96E] flex-shrink-0" />
                        )}
                        <text class="text-xs text-[#999999]">
                          {item.type === 'product' ? '商品' : '课程'}
                        </text>
                      </view>
                      <view class="font-medium text-[#2C2C2C] line-clamp-2 text-sm mb-1">{{ item.name }}</view>
                      <view class="text-[#C41E3A] font-semibold">￥{{ item.price }}</view>
                    </view>
                  </view>
                ))}
              </view>
            </view>
    
            <!--   -->
            <view class="v0-btn"
              @click={{ handleUse }}
              class="w-full bg-gradient-to-r from-[#C41E3A] to-[#E74C57] text-white font-semibold py-4 rounded-2xl active:opacity-90 mb-8"
            >
              立即使用
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
  const coupon = {
  const applicableItems: ApplicableItem[] = [

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