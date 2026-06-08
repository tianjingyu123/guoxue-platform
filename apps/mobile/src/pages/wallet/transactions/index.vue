<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">钱包</text>
      <text class="v0-route">V0: wallet/transactions</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5]">
          <!--   -->
          <view class="sticky top-0 z-10 bg-gradient-to-r from-[#C41E3A] to-[#E85A6B] text-white px-4 py-3">
            <view class="flex items-center gap-3">
              <view class="v0-btn" @click={() => router.back()} class="p-1 -ml-1">
                <ChevronLeft class="w-6 h-6" />
              </view>
              <text class="text-lg font-medium">交易记录</text>
            </view>
          </view>
    
          <!--   -->
          {balance && (
            <view class="mx-4 mt-4 bg-gradient-to-br from-[#C41E3A] to-[#E85A6B] rounded-2xl p-4 text-white">
              <view class="flex items-center justify-between">
                <view>
                  <text class="text-white/70 text-sm">学习币余额</text>
                  <text class="text-3xl font-bold mt-1">{{ balance.coin.toLocaleString() }}</text>
                  {balance.frozen > 0 && (
                    <text class="text-xs text-white/60 mt-1">冻结: {{ balance.frozen }}</text>
                  )}
                </view>
                <view class="text-right">
                  <text class="text-white/70 text-sm">积分</text>
                  <text class="text-xl font-medium mt-1">{{ balance.points.toLocaleString() }}</text>
                </view>
              </view>
            </view>
          )}
    
          <!--   -->
          <view class="sticky top-12 z-10 bg-[#FAF8F5] px-4 py-3 flex items-center gap-3 border-b border-[#E8E3DB]">
            <!--   -->
            <view class="relative">
              <view class="v0-btn"
                @click={() => { setShowMonthPicker(!showMonthPicker); setShowTypePicker(false) }}
                class="flex items-center gap-1 px-3 py-1.5 bg-white rounded-full text-sm border border-[#E8E3DB]"
              >
                <text>{selectedMonth ? months.find(m => m.value === selectedMonth)?.label : "全部月份"}</text>
                <ChevronDown class="w-4 h-4 text-[#999999]" />
              </view>
              {showMonthPicker && (
                <view class="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-[#E8E3DB] py-1 z-20 max-h-64 overflow-y-auto">
                  <view class="v0-btn"
                    @click={() => { setSelectedMonth(""); setShowMonthPicker(false) }}
                    class={`w-full px-4 py-2 text-left text-sm ${!selectedMonth ? "text-[#C41E3A] bg-red-50" : "text-[#2C2C2C]"}`}
                  >
                    全部月份
                  </view>
                  
    <view v-for="(month, index) in months" :key="index"> (
                    <view class="v0-btn"
                      key={{ month.value }}
                      @click={() => { setSelectedMonth(month.value); setShowMonthPicker(false) }}
                      class={`w-full px-4 py-2 text-left text-sm whitespace-nowrap ${selectedMonth === month.value ? "text-[#C41E3A] bg-red-50" : "text-[#2C2C2C]"}`}
                    >
                      {{ month.label }}
                    </view>
                  ))}
                </view>
              )}
            </view>
    
            <!--   -->
            <view class="relative">
              <view class="v0-btn"
                @click={() => { setShowTypePicker(!showTypePicker); setShowMonthPicker(false) }}
                class="flex items-center gap-1 px-3 py-1.5 bg-white rounded-full text-sm border border-[#E8E3DB]"
              >
                <text>{filterType === "income" ? "收入" : filterType === "expense" ? "支出" : "全部类型"}</text>
                <ChevronDown class="w-4 h-4 text-[#999999]" />
              </view>
              {showTypePicker && (
                <view class="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-[#E8E3DB] py-1 z-20">
                  {[
                    { value: "", label: "全部类型" },
                    { value: "income", label: "收入" },
                    { value: "expense", label: "支出" },
                  ].map(opt => (
                    <view class="v0-btn"
                      key={{ opt.value }}
                      @click={() => { setFilterType(opt.value); setShowTypePicker(false) }}
                      class={`w-full px-4 py-2 text-left text-sm whitespace-nowrap ${filterType === opt.value ? "text-[#C41E3A] bg-red-50" : "text-[#2C2C2C]"}`}
                    >
                      {{ opt.label }}
                    </view>
                  ))}
                </view>
              )}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-4">
            {loading ? (
              <view class="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <view key={i} class="bg-white rounded-xl p-4 animate-pulse">
                    <view class="flex items-center gap-3">
                      <view class="w-10 h-10 bg-gray-200 rounded-full" />
                      <view class="flex-1">
                        <view class="h-4 bg-gray-200 rounded w-24 mb-2" />
                        <view class="h-3 bg-gray-200 rounded w-32" />
                      </view>
                      <view class="h-5 bg-gray-200 rounded w-16" />
                    </view>
                  </view>
                ))}
              </view>
            ) : groupedList.length === 0 ? (
              <view class="flex flex-col items-center justify-center py-20">
                <view class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Wallet class="w-10 h-10 text-gray-300" />
                </view>
                <text class="text-[#999999]">暂无交易记录</text>
              </view>
            ) : (
              <view class="space-y-6">
                
    <view v-for="(group, index) in groupedList" :key="index"> (
                  <view key={group.date}>
                    <text class="text-sm text-[#999999] mb-2">{{ formatGroupDate(group.date) }}</text>
                    <view class="bg-white rounded-2xl overflow-hidden">
                      {group.items.map((transaction, idx) => (
                        <view class="v0-btn"
                          key={{ transaction.id }}
                          @click={() => router.push(`/wallet/transactions/${transaction.id}`)}
                          class={`w-full flex items-center gap-3 p-4 text-left ${idx > 0 ? "border-t border-[#E8E3DB]" : ""}`}
                        >
                          <!--   -->
                          <view class={`w-10 h-10 rounded-full flex items-center justify-center ${categoryColors[transaction.category]}`}>
                            {{ categoryIcons[transaction.category] }}
                          </view>
    
                          <!--   -->
                          <view class="flex-1 min-w-0">
                            <view class="flex items-center gap-2">
                              <text class="font-medium text-[#2C2C2C]">{{ transaction.title }}</text>
                              {transaction.type === "income" ? (
                                <ArrowDownLeft class="w-3.5 h-3.5 text-green-500" />
                              ) : (
                                <ArrowUpRight class="w-3.5 h-3.5 text-red-500" />
                              )}
                            </view>
                            <text class="text-sm text-[#999999] truncate">{{ transaction.description }}</text>
                            <text class="text-xs text-[#999999] mt-0.5">{{ formatDate(transaction.createdAt) }}</text>
                          </view>
    
                          <!--   -->
                          <view class="text-right">
                            <text class={`font-semibold ${transaction.type === "income" ? "text-green-600" : "text-[#2C2C2C]"}`}>
                              {transaction.type === "income" ? "+" : ""}{{ transaction.amount.toLocaleString() }}
                            </text>
                            <text class="text-xs text-[#999999]">余额 {{ transaction.balance.toLocaleString() }}</text>
                          </view>
                        </view>
                      ))}
                    </view>
                  </view>
                ))}
              </view>
            )}
          </view>
    
          <!--   -->
          {(showMonthPicker || showTypePicker) && (
            <view 
              class="fixed inset-0 z-10" 
              @click={() => { setShowMonthPicker(false); setShowTypePicker(false) }}
            />
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
const mockBalance: WalletBalance = {
const mockTransactions: WalletTransaction[] = [
const categoryIcons: Record<string, React.ReactNode> = {
const categoryColors: Record<string, string> = {

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