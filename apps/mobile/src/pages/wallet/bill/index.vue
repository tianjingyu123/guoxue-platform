<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">钱包</text>
      <text class="v0-route">V0: wallet/bill</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5] pb-24">
          <!--   -->
          <view class="sticky top-0 z-10 bg-gradient-to-r from-[#C41E3A] to-[#A01830] text-white px-4 py-3 flex items-center justify-between">
            <view class="v0-btn" @click={() => router.back()} class="p-1">
              <ChevronLeft class="w-6 h-6" />
            </view>
            <text class="font-semibold">账单详情</text>
            <view class="v0-btn" 
              @click={{ handleExport }} 
              :disabled={{ exporting }}
              class="p-1 disabled:opacity-50"
            >
              <Download class="w-5 h-5" />
            </view>
          </view>
    
          <!--   -->
          <view class="bg-white px-4 py-3 border-b border-[#E8E3DB]">
            <view class="flex items-center justify-between">
              <view class="flex gap-2">
                <view class="v0-btn"
                  @click={() => setViewType('month')}
                  class={`px-3 py-1 rounded-full text-sm ${
                    viewType === 'month' 
                      ? 'bg-[#C41E3A] text-white' 
                      : 'bg-[#FAF8F5] text-[#666666]'
                  }`}
                >
                  月账单
                </view>
                <view class="v0-btn"
                  @click={() => setViewType('year')}
                  class={`px-3 py-1 rounded-full text-sm ${
                    viewType === 'year' 
                      ? 'bg-[#C41E3A] text-white' 
                      : 'bg-[#FAF8F5] text-[#666666]'
                  }`}
                >
                  年账单
                </view>
              </view>
              <view class="flex items-center gap-2">
                <view class="v0-btn" @click={{ handlePrevPeriod }} class="p-1">
                  <ChevronLeft class="w-5 h-5 text-[#666666]" />
                </view>
                <text class="text-[#2C2C2C] font-medium min-w-[100px] text-center">
                  {{ formatPeriod() }}
                </text>
                <view class="v0-btn" 
                  @click={{ handleNextPeriod }} 
                  class="p-1"
                  :disabled={
                    viewType === 'month' 
                      ? currentDate.getMonth() >= new Date().getMonth() && currentDate.getFullYear() >= new Date().getFullYear()
                      : currentDate.getFullYear() >= new Date().getFullYear()
                  }
                >
                  <ChevronRight class="w-5 h-5 text-[#666666]" />
                </view>
              </view>
            </view>
          </view>
    
          {loading ? (
            <view class="p-4 space-y-4">
              <view class="bg-white rounded-2xl p-6 h-64 animate-pulse" />
              <view class="bg-white rounded-2xl p-4 h-40 animate-pulse" />
            </view>
          ) : bill && (
            
              <!--   -->
              <view class="p-4">
                <view class="bg-white rounded-2xl p-6 shadow-sm">
                  <view class="flex items-center justify-between">
                    <!--   -->
                    <view class="relative w-32 h-32">
                      <svg class="w-full h-full transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="45"
                          fill="none"
                          stroke="#E8E3DB"
                          strokeWidth="12"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="45"
                          fill="none"
                          stroke="#4CAF50"
                          strokeWidth="12"
                          strokeDasharray={{ circumference }}
                          strokeDashoffset={{ circumference * (1 - incomePercent / 100) }}
                          strokeLinecap="round"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="45"
                          fill="none"
                          stroke="#C41E3A"
                          strokeWidth="12"
                          strokeDasharray={{ circumference }}
                          strokeDashoffset={{ circumference * incomePercent / 100 }}
                          strokeLinecap="round"
                          :style=" transform: `rotate(${{ incomePercent * 3.6 }}deg)`, transformOrigin: '64px 64px' }}
                        />
                      </svg>
                      <view class="absolute inset-0 flex flex-col items-center justify-center">
                        <text class="text-xs text-[#999999]">结余</text>
                        <text class={`text-lg font-bold ${bill.balance >= 0 ? 'text-[#4CAF50]' : 'text-[#C41E3A]'}`}>
                          {bill.balance >= 0 ? '+' : ''}{{ bill.balance }}
                        </text>
                      </view>
                    </view>
    
                    <!--   -->
                    <view class="flex-1 ml-6 space-y-4">
                      <view class="flex items-center justify-between">
                        <view class="flex items-center gap-2">
                          <view class="w-3 h-3 rounded-full bg-[#4CAF50]" />
                          <text class="text-[#666666] text-sm">收入</text>
                        </view>
                        <text class="text-[#4CAF50] font-semibold">+{{ bill.totalIncome.toFixed(2) }}</text>
                      </view>
                      <view class="flex items-center justify-between">
                        <view class="flex items-center gap-2">
                          <view class="w-3 h-3 rounded-full bg-[#C41E3A]" />
                          <text class="text-[#666666] text-sm">支出</text>
                        </view>
                        <text class="text-[#C41E3A] font-semibold">-{{ bill.totalExpense.toFixed(2) }}</text>
                      </view>
                    </view>
                  </view>
                </view>
              </view>
    
              <!--   -->
              {expenseCategories.length > 0 && (
                <view class="px-4 mb-4">
                  <view class="bg-white rounded-2xl overflow-hidden shadow-sm">
                    <view class="px-4 py-3 border-b border-[#E8E3DB]">
                      <text class="font-semibold text-[#2C2C2C]">支出分类</text>
                    </view>
                    
    <view v-for="(cat, index) in expenseCategories" :key="index"> (
                      <CategoryItem 
                        key={cat.category}
                        category={{ cat }}
                        isExpanded={{ expandedCategories.includes(cat.category) }}
                        onToggle={() => toggleCategory(cat.category)}
                        isLast={{ index === expenseCategories.length - 1 }}
                      />
                    ))}
                  </view>
                </view>
              )}
    
              <!--   -->
              {incomeCategories.length > 0 && (
                <view class="px-4 mb-4">
                  <view class="bg-white rounded-2xl overflow-hidden shadow-sm">
                    <view class="px-4 py-3 border-b border-[#E8E3DB]">
                      <text class="font-semibold text-[#2C2C2C]">收入分类</text>
                    </view>
                    
    <view v-for="(cat, index) in incomeCategories" :key="index"> (
                      <CategoryItem 
                        key={cat.category}
                        category={{ cat }}
                        isExpanded={{ expandedCategories.includes(cat.category) }}
                        onToggle={() => toggleCategory(cat.category)}
                        isLast={{ index === incomeCategories.length - 1 }}
                      />
                    ))}
                  </view>
                </view>
              )}
            
          )}
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] p-4 safe-area-pb">
            <view class="v0-btn"
              @click={{ handleExport }}
              :disabled={{ exporting }}
              class="w-full py-3 bg-[#C41E3A] text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Download class="w-5 h-5" />
              {exporting ? '导出中...' : '导出账单PDF'}
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
const mockBill: BillSummary = {
const iconMap: Record<string, React.ReactNode> = {

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