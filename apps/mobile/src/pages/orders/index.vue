<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">订单</text>
      <text class="v0-route">V0: orders</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5] pb-20">
          <!--   -->
          <view class="sticky top-0 z-20 bg-white border-b border-[#E8E3DB]">
            <view class="px-4 py-3 flex items-center gap-3">
              <view class="v0-btn" @click={() => router.back()} class="p-1 -ml-1">
                <ChevronLeft class="w-6 h-6 text-[#2C2C2C]" />
              </view>
              <text class="text-lg font-semibold text-[#2C2C2C]">我的订单</text>
            </view>
            
            <!--   -->
            <view class="flex overflow-x-auto scrollbar-hide">
              
    <view v-for="(tab, index) in statusTabs" :key="index"> (
                <view class="v0-btn"
                  key={{ tab.key }}
                  @click={() => setActiveTab(tab.key)}
                  class={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? "text-[#C41E3A] border-[#C41E3A]"
                      : "text-[#666666] border-transparent"
                  }`}
                >
                  {{ tab.label }}
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="p-4 space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <view key={{ i }} class="bg-white rounded-2xl p-4 animate-pulse">
                  <view class="flex justify-between mb-3">
                    <view class="h-4 w-32 bg-gray-200 rounded" />
                    <view class="h-4 w-16 bg-gray-200 rounded" />
                  </view>
                  <view class="flex gap-3">
                    <view class="w-20 h-20 bg-gray-200 rounded-lg" />
                    <view class="flex-1 space-y-2">
                      <view class="h-4 w-full bg-gray-200 rounded" />
                      <view class="h-3 w-20 bg-gray-200 rounded" />
                      <view class="h-4 w-16 bg-gray-200 rounded" />
                    </view>
                  </view>
                </view>
              ))
            ) : filteredOrders.length === 0 ? (
              <view class="flex flex-col items-center justify-center py-20">
                <Package class="w-16 h-16 text-[#E8E3DB] mb-4" />
                <text class="text-[#999999] mb-4">暂无订单</text>
                <view class="v0-btn"
                  @click={() => router.push("/shop")}
                  class="px-6 py-2 bg-[#C41E3A] text-white text-sm font-medium rounded-full"
                >
                  去逛逛
                </view>
              </view>
            ) : (
              filteredOrders.map(order => {{ const config = statusConfig[order.status] || statusConfig.completed
                return (
                  <view
                    key={order.id }}
                    class="bg-white rounded-2xl overflow-hidden"
                    @click={() => router.push(`/orders/${order.id}`)}
                  >
                    <!--   -->
                    <view class="px-4 py-3 border-b border-[#E8E3DB] flex items-center justify-between">
                      <view class="flex items-center gap-2 text-sm text-[#666666]">
                        <text>订单号: {{ order.orderNo }}</text>
                        <view class="v0-btn"
                          @click={(e) => { e.stopPropagation(); copyOrderNo(order.orderNo); }}
                          class="p-1"
                        >
                          <Copy class="w-3.5 h-3.5" />
                        </view>
                      </view>
                      <view class={`flex items-center gap-1 text-sm font-medium ${config.color}`}>
                        {{ config.icon }}
                        <text>{{ config.label }}</text>
                      </view>
                    </view>
    
                    <!--   -->
                    <view class="p-4">
                      {order.products.slice(0, 2).map((product, idx) => (
                        <view key={product.id} class={`flex gap-3 ${idx > 0 ? "mt-3 pt-3 border-t border-[#E8E3DB]" : ""}`}>
                          <image
                            src={{ product.cover }}
                            alt={{ product.name }}
                            class="w-20 h-20 object-cover rounded-lg bg-[#FAF8F5]"
                          />
                          <view class="flex-1 min-w-0">
                            <text class="text-sm font-medium text-[#2C2C2C] line-clamp-2">{{ product.name }}</text>
                            <text class="text-xs text-[#999999] mt-1">{{ product.skuName }}</text>
                            <view class="flex items-center justify-between mt-2">
                              <text class="text-sm font-semibold text-[#C41E3A]">¥{{ product.price }}</text>
                              <text class="text-xs text-[#999999]">x{{ product.quantity }}</text>
                            </view>
                          </view>
                        </view>
                      ))}
                      {order.products.length > 2 && (
                        <text class="text-xs text-[#999999] mt-3 text-center">
                          共 {{ order.products.length }} 件商品
                        </text>
                      )}
                    </view>
    
                    <!--   -->
                    <view class="px-4 py-3 border-t border-[#E8E3DB] flex items-center justify-between">
                      <view class="text-sm">
                        <text class="text-[#666666]">实付: </text>
                        <text class="text-[#C41E3A] font-semibold">¥{{ order.payAmount }}</text>
                      </view>
                      <view class="flex items-center gap-2" @click={e => e.stopPropagation()}>
                        {order.status === "pending_pay" && (
                          
                            <view class="v0-btn"
                              @click={() => { setCancelOrderId(order.id); setShowCancelModal(true); }}
                              class="px-4 py-1.5 text-sm text-[#666666] border border-[#E8E3DB] rounded-full"
                            >
                              取消订单
                            </view>
                            <view class="v0-btn"
                              @click={() => router.push(`/shop/paying?orderId=${order.id}`)}
                              class="px-4 py-1.5 text-sm text-white bg-[#C41E3A] rounded-full"
                            >
                              去支付
                            </view>
                          
                        )}
                        {order.status === "pending_ship" && order.canCancel && (
                          <view class="v0-btn"
                            @click={() => { setCancelOrderId(order.id); setShowCancelModal(true); }}
                            class="px-4 py-1.5 text-sm text-[#666666] border border-[#E8E3DB] rounded-full"
                          >
                            取消订单
                          </view>
                        )}
                        {order.status === "pending_receive" && (
                          
                            <view class="v0-btn"
                              @click={() => router.push(`/orders/logistics?orderId=${order.id}`)}
                              class="px-4 py-1.5 text-sm text-[#666666] border border-[#E8E3DB] rounded-full"
                            >
                              查看物流
                            </view>
                            {order.canConfirm && (
                              <view class="v0-btn"
                                @click={() => handleConfirmReceive(order.id)}
                                class="px-4 py-1.5 text-sm text-white bg-[#C41E3A] rounded-full"
                              >
                                确认收货
                              </view>
                            )}
                          
                        )}
                        {order.status === "completed" && (
                          
                            {order.canReview && (
                              <view class="v0-btn"
                                @click={() => router.push(`/orders/${order.id}/review`)}
                                class="px-4 py-1.5 text-sm text-[#C41E3A] border border-[#C41E3A] rounded-full"
                              >
                                去评价
                              </view>
                            )}
                            <view class="v0-btn"
                              @click={() => handleBuyAgain(order.id)}
                              class="px-4 py-1.5 text-sm text-white bg-[#C41E3A] rounded-full"
                            >
                              再次购买
                            </view>
                          
                        )}
                        {order.hasAfterSale && (
                          <view class="v0-btn"
                            @click={() => router.push("/shop/my-after-sales")}
                            class="px-4 py-1.5 text-sm text-[#666666] border border-[#E8E3DB] rounded-full"
                          >
                            查看售后
                          </view>
                        )}
                        {!order.hasAfterSale && order.status === "completed" && (
                          <view class="v0-btn"
                            @click={() => router.push(`/shop/after-sale?orderId=${order.id}`)}
                            class="px-4 py-1.5 text-sm text-[#666666] border border-[#E8E3DB] rounded-full"
                          >
                            申请售后
                          </view>
                        )}
                      </view>
                    </view>
                  </view>
                )
              })
            )}
          </view>
    
          <!--   -->
          {showCancelModal && (
            <view class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <view class="bg-white rounded-2xl w-[85%] max-w-sm overflow-hidden">
                <view class="p-4 border-b border-[#E8E3DB]">
                  <text class="text-lg font-semibold text-[#2C2C2C] text-center">取消订单</text>
                </view>
                <view class="p-4">
                  <text class="text-sm text-[#666666] mb-3">请选择取消原因：</text>
                  {["不想要了", "信息填写错误", "重复下单", "其他原因"].map(reason => (
                    <view class="v0-btn"
                      key={{ reason }}
                      @click={() => setCancelReason(reason)}
                      class={`w-full text-left px-4 py-3 rounded-lg mb-2 text-sm transition-colors ${
                        cancelReason === reason
                          ? "bg-[#C41E3A]/10 text-[#C41E3A] border border-[#C41E3A]"
                          : "bg-[#FAF8F5] text-[#2C2C2C]"
                      }`}
                    >
                      {{ reason }}
                    </view>
                  ))}
                </view>
                <view class="p-4 border-t border-[#E8E3DB] flex gap-3">
                  <view class="v0-btn"
                    @click={() => { setShowCancelModal(false); setCancelOrderId(null); setCancelReason(""); }}
                    class="flex-1 py-2.5 text-sm text-[#666666] border border-[#E8E3DB] rounded-full"
                  >
                    暂不取消
                  </view>
                  <view class="v0-btn"
                    @click={{ handleCancelOrder }}
                    :disabled={{ !cancelReason }}
                    class="flex-1 py-2.5 text-sm text-white bg-[#C41E3A] rounded-full disabled:opacity-50"
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
const mockOrders: OrderListItem[] = [
const statusTabs = [
const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {

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