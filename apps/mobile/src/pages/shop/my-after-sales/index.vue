<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">my-after-sales</text>
      <text class="v0-route">V0: shop/my-after-sales</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5]">
          <!--   -->
          <view class="sticky top-0 z-10 bg-white border-b border-[#E8E3DB]">
            <view class="px-4 py-3 flex items-center gap-3">
              <view class="v0-btn" @click={() => router.back()} class="p-1 -ml-1">
                <ChevronLeft class="w-6 h-6 text-[#2C2C2C]" />
              </view>
              <text class="text-lg font-semibold text-[#2C2C2C] font-serif">我的售后</text>
            </view>
    
            <!--   -->
            <view class="flex px-4 gap-6 border-t border-[#E8E3DB]">
              
    <view v-for="(tab, index) in tabs" :key="index"> (
                <view class="v0-btn"
                  key={{ tab.key }}
                  @click={() => setActiveTab(tab.key)}
                  class={`py-3 relative text-sm font-medium transition-colors ${
                    activeTab === tab.key ? "text-[#C41E3A]" : "text-[#666666]"
                  }`}
                >
                  {{ tab.label }}
                  {activeTab === tab.key && (
                    <view class="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C41E3A] rounded-full" />
                  )}
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="p-4 space-y-3">
            {loading ? (
              // Skeleton
              Array.from({ length: 3 }).map((_, i) => (
                <view key={{ i }} class="bg-white rounded-2xl p-4 animate-pulse">
                  <view class="flex gap-3">
                    <view class="w-20 h-20 bg-gray-200 rounded-xl" />
                    <view class="flex-1 space-y-2">
                      <view class="h-4 bg-gray-200 rounded w-3/4" />
                      <view class="h-3 bg-gray-200 rounded w-1/2" />
                      <view class="h-3 bg-gray-200 rounded w-1/3" />
                    </view>
                  </view>
                </view>
              ))
            ) : items.length === 0 ? (
              // Empty state
              <view class="py-20 text-center">
                <view class="w-20 h-20 mx-auto mb-4 bg-[#FAF8F5] rounded-full flex items-center justify-center">
                  <Package class="w-10 h-10 text-[#999999]" />
                </view>
                <text class="text-[#666666] mb-4">暂无售后记录</text>
                <view class="v0-btn"
                  @click={() => router.push("/orders")}
                  class="px-6 py-2 bg-[#C41E3A] text-white rounded-full text-sm"
                >
                  查看订单
                </view>
              </view>
            ) : (
              items.map(item => {{ const status = statusConfig[item.status]
                const StatusIcon = status.icon
                return (
                  <view
                    key={item.id }}
                    class="bg-white rounded-2xl overflow-hidden shadow-sm"
                  >
                    <!--   -->
                    <view class="px-4 py-3 border-b border-[#E8E3DB] flex items-center justify-between">
                      <view class="flex items-center gap-2">
                        <text class={`px-2 py-0.5 rounded text-xs ${status.bgColor} ${{ status.color }} flex items-center gap-1`}>
                          <StatusIcon class="w-3 h-3" />
                          {{ status.label }}
                        </text>
                        <text class="text-xs text-[#999999]">
                          {item.type === "refund_only" ? "仅退款" : "退货退款"}
                        </text>
                      </view>
                      <text class="text-xs text-[#999999]">{{ formatDate(item.createdAt) }}</text>
                    </view>
    
                    <!--   -->
                    <view
                      class="p-4 flex gap-3 cursor-pointer"
                      @click={() => router.push(`/shop/after-sale/${item.id}`)}
                    >
                      <image
                        src={{ item.product.cover }}
                        alt={{ item.product.name }}
                        class="w-20 h-20 rounded-xl object-cover bg-[#FAF8F5]"
                      />
                      <view class="flex-1 min-w-0">
                        <text class="text-sm font-medium text-[#2C2C2C] line-clamp-2 mb-1">
                          {{ item.product.name }}
                        </text>
                        <text class="text-xs text-[#999999] mb-2">{{ item.product.skuName }}</text>
                        <view class="flex items-center justify-between">
                          <view>
                            <text class="text-xs text-[#666666]">退款金额：</text>
                            <text class="text-[#C41E3A] font-semibold">¥{{ item.amount }}</text>
                          </view>
                          <ChevronRight class="w-4 h-4 text-[#999999]" />
                        </view>
                      </view>
                    </view>
    
                    <!--   -->
                    {item.canCancel && (
                      <view class="px-4 py-3 border-t border-[#E8E3DB] flex justify-end gap-2">
                        <view class="v0-btn"
                          @click={(e) => {
                            e.stopPropagation()
                            setShowCancelConfirm(item.id)
                          }}
                          :disabled={{ cancellingId === item.id }}
                          class="px-4 py-1.5 border border-[#E8E3DB] rounded-full text-sm text-[#666666] disabled:opacity-50"
                        >
                          {cancellingId === item.id ? "取消中..." : "取消售后"}
                        </view>
                        <view class="v0-btn"
                          @click={() => router.push(`/shop/after-sale/${item.id}`)}
                          class="px-4 py-1.5 bg-[#C41E3A] text-white rounded-full text-sm"
                        >
                          查看进度
                        </view>
                      </view>
                    )}
    
                    {item.status === "rejected" && (
                      <view class="px-4 py-3 border-t border-[#E8E3DB] flex justify-end gap-2">
                        <view class="v0-btn"
                          @click={() => router.push(`/shop/after-sale-rejected?id=${item.id}`)}
                          class="px-4 py-1.5 border border-[#C41E3A] text-[#C41E3A] rounded-full text-sm"
                        >
                          查看原因
                        </view>
                        <view class="v0-btn"
                          @click={() => router.push(`/shop/after-sale?orderId=${item.orderId}`)}
                          class="px-4 py-1.5 bg-[#C41E3A] text-white rounded-full text-sm"
                        >
                          重新申请
                        </view>
                      </view>
                    )}
                  </view>
                )
              })
            )}
          </view>
    
          <!--   -->
          {showCancelConfirm && (
            <view class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <view class="bg-white rounded-2xl w-[80%] max-w-sm p-6 text-center">
                <view class="w-12 h-12 mx-auto mb-4 bg-orange-50 rounded-full flex items-center justify-center">
                  <AlertCircle class="w-6 h-6 text-orange-500" />
                </view>
                <text class="text-lg font-semibold text-[#2C2C2C] mb-2">确认取消售后？</text>
                <text class="text-sm text-[#666666] mb-6">取消后如需继续申请，请重新提交</text>
                <view class="flex gap-3">
                  <view class="v0-btn"
                    @click={() => setShowCancelConfirm(null)}
                    class="flex-1 py-2.5 border border-[#E8E3DB] rounded-full text-[#666666]"
                  >
                    再想想
                  </view>
                  <view class="v0-btn"
                    @click={() => handleCancel(showCancelConfirm)}
                    class="flex-1 py-2.5 bg-[#C41E3A] text-white rounded-full"
                  >
                    确认取消
                  </view>
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
const mockData: AfterSaleListItem[] = [
const tabs = [
const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {

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