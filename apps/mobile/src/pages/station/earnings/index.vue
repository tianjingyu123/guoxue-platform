<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">分站管理</text>
      <text class="v0-route">V0: station/earnings</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5]">
          <!--   -->
          <view class="sticky top-0 z-10 bg-[#FAF8F5] border-b border-gray-100">
            <view class="flex items-center justify-between px-4 py-3">
              <view class="v0-btn" @click={() => router.back()} class="p-1">
                <ArrowLeft class="w-6 h-6 text-gray-800" />
              </view>
              <text class="text-lg font-semibold text-gray-900">推广收益</text>
              <view class="v0-btn" 
                @click={() => loadData(true)} 
                class={`p-1 ${refreshing ? 'animate-spin' : ''}`}
                :disabled={{ refreshing }}
              >
                <RefreshCw class="w-5 h-5 text-gray-600" />
              </view>
            </view>
          </view>
    
          <view class="p-4">
            <DataState
              loading={{ loading }}
              error={{ error }}
              empty={{ !overview }}
              skeleton={{ renderSkeleton() }}
              onRetry={() => loadData()}
            >
              <!--   -->
              <view class="bg-gradient-to-br from-[#C41E3A] to-[#A01830] rounded-2xl p-5 text-white mb-4">
                <view class="flex items-center justify-between mb-4">
                  <view>
                    <text class="text-white/80 text-sm mb-1">可提现余额</text>
                    <text class="text-3xl font-bold">
                      ¥{{ overview?.availableBalance.toFixed(2) }}
                    </text>
                  </view>
                  <Button
                    @click={() => router.push('/wallet/withdraw')}
                    class="bg-white text-[#C41E3A] hover:bg-white/90"
                  >
                    <Wallet class="w-4 h-4 mr-1" />
                    提现
                  </Button>
                </view>
                
                <view class="grid grid-cols-3 gap-4 pt-4 border-t border-white/20">
                  <view>
                    <view class="flex items-center gap-1 text-white/70 text-xs mb-1">
                      <Snowflake class="w-3 h-3" />
                      <text>冻结中</text>
                    </view>
                    <text class="font-semibold">¥{{ overview?.frozenBalance.toFixed(2) }}</text>
                  </view>
                  <view>
                    <view class="flex items-center gap-1 text-white/70 text-xs mb-1">
                      <TrendingUp class="w-3 h-3" />
                      <text>累计收益</text>
                    </view>
                    <text class="font-semibold">¥{{ overview?.totalEarnings.toFixed(2) }}</text>
                  </view>
                  <view>
                    <view class="flex items-center gap-1 text-white/70 text-xs mb-1">
                      <Clock class="w-3 h-3" />
                      <text>本月收益</text>
                    </view>
                    <text class="font-semibold">¥{{ overview?.monthEarnings.toFixed(2) }}</text>
                  </view>
                </view>
              </view>
    
              <!--   -->
              <view class="grid grid-cols-2 gap-3 mb-4">
                <view class="bg-white rounded-xl p-4">
                  <text class="text-gray-500 text-sm mb-1">今日收益</text>
                  <text class="text-xl font-bold text-[#C41E3A]">
                    +¥{{ overview?.todayEarnings.toFixed(2) }}
                  </text>
                </view>
                <view class="bg-white rounded-xl p-4">
                  <text class="text-gray-500 text-sm mb-1">上月收益</text>
                  <text class="text-xl font-bold text-gray-900">
                    ¥{{ overview?.lastMonthEarnings.toFixed(2) }}
                  </text>
                </view>
              </view>
    
              <!--   -->
              <Tabs value={{ activeTab }} onValueChange={(v) => setActiveTab(v as 'earnings' | 'withdraw')}>
                <TabsList class="w-full bg-white mb-4">
                  <TabsTrigger value="earnings" class="flex-1">收益明细</TabsTrigger>
                  <TabsTrigger value="withdraw" class="flex-1">提现记录</TabsTrigger>
                </TabsList>
              </Tabs>
    
              {activeTab === 'earnings' ? (
                
                  <!--   -->
                  <view class="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-hide">
                    {(['all', 'course_commission', 'product_commission', 'member_commission', 'team_bonus', 'invite_reward'] as const).map((type) => (
                      <view class="v0-btn"
                        key={{ type }}
                        @click={() => setFilterType(type)}
                        class={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                          filterType === type
                            ? 'bg-[#C41E3A] text-white'
                            : 'bg-white text-gray-600'
                        }`}
                      >
                        {type === 'all' ? '全部' : getEarningsTypeName(type)}
                      </view>
                    ))}
                  </view>
    
                  <!--   -->
                  <view class="space-y-3">
                    {filteredEarnings.length === 0 ? (
                      <view class="bg-white rounded-xl p-8 text-center">
                        <FileText class="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <text class="text-gray-500">暂无收益记录</text>
                      </view>
                    ) : (
                      filteredEarnings.map((item) => (
                        <view key={{ item.id }} class="bg-white rounded-xl p-4">
                          <view class="flex items-start gap-3">
                            <view class={`w-10 h-10 rounded-full flex items-center justify-center ${
                              item.status === 'settled' ? 'bg-green-50 text-green-600' :
                              item.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                              'bg-blue-50 text-blue-600'
                            }`}>
                              {{ getEarningsTypeIcon(item.type) }}
                            </view>
                            <view class="flex-1 min-w-0">
                              <view class="flex items-center justify-between mb-1">
                                <text class="font-medium text-gray-900">{{ item.title }}</text>
                                <text class="text-[#C41E3A] font-semibold">
                                  +¥{{ item.amount.toFixed(2) }}
                                </text>
                              </view>
                              <text class="text-sm text-gray-500 truncate mb-2">
                                {{ item.description }}
                              </text>
                              <view class="flex items-center justify-between">
                                <text class="text-xs text-gray-400">{{ item.createdAt }}</text>
                                <text class={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(item.status)}`}>
                                  {{ getEarningsStatusName(item.status) }}
                                </text>
                              </view>
                            </view>
                          </view>
                          
                          <!--   -->
                          {item.relatedUser && (
                            <view class="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                              <image 
                                src={{ item.relatedUser.avatar }} 
                                alt="" 
                                class="w-6 h-6 rounded-full"
                              />
                              <text class="text-sm text-gray-600">
                                来自 {{ item.relatedUser.nickname }}
                              </text>
                              {item.relatedOrder && (
                                <text class="text-xs text-gray-400 ml-auto">
                                  订单金额 ¥{{ item.relatedOrder.orderAmount }}
                                </text>
                              )}
                            </view>
                          )}
                        </view>
                      ))
                    )}
                  </view>
                
              ) : (
                /* 提现记录列表 */
                <view class="space-y-3">
                  {withdrawRecords.length === 0 ? (
                    <view class="bg-white rounded-xl p-8 text-center">
                      <Wallet class="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <text class="text-gray-500">暂无提现记录</text>
                    </view>
                  ) : (
                    withdrawRecords.map((record) => (
                      <view key={{ record.id }} class="bg-white rounded-xl p-4">
                        <view class="flex items-center justify-between mb-2">
                          <view>
                            <text class="font-medium text-gray-900">
                              提现到{record.method === 'alipay' ? '支付宝' : '银行卡'}
                            </text>
                            <text class="text-sm text-gray-500 ml-2">{{ record.account }}</text>
                          </view>
                          <text class={`text-xs px-2 py-0.5 rounded-full ${getWithdrawStatusColor(record.status)}`}>
                            {{ getWithdrawStatusName(record.status) }}
                          </text>
                        </view>
                        <view class="flex items-center justify-between">
                          <view>
                            <text class="text-xl font-bold text-gray-900">
                              ¥{{ record.actualAmount.toFixed(2) }}
                            </text>
                            <text class="text-xs text-gray-400 ml-2">
                              (手续费 ¥{{ record.fee.toFixed(2) }})
                            </text>
                          </view>
                          <text class="text-sm text-gray-400">{{ record.createdAt }}</text>
                        </view>
                        {record.status === 'failed' && record.failReason && (
                          <text class="mt-2 text-sm text-red-500">
                            失败原因：{{ record.failReason }}
                          </text>
                        )}
                        {record.completedAt && (
                          <text class="mt-1 text-xs text-gray-400">
                            到账时间：{{ record.completedAt }}
                          </text>
                        )}
                      </view>
                    ))
                  )}
                </view>
              )}
    
              <!--   -->
              <view class="mt-6 p-4 bg-amber-50 rounded-xl">
                <text class="text-sm text-amber-800">
                  <text class="font-medium">收益说明：</text>
                  推广收益将在订单完成后7天内结算，结算后可申请提现。如有疑问请联系客服。
                </text>
              </view>
            </DataState>
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
  const icons: Record<EarningsSourceType, React.ReactNode> = {
  const colors = {
  const colors = {

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