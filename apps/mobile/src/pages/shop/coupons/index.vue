<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">优惠券</text>
      <text class="v0-route">V0: shop/coupons</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5]">
          <!--   -->
          <view class="sticky top-0 z-10 bg-gradient-to-r from-[#C41E3A] to-[#E85A71] px-4 py-3 flex items-center gap-3">
            <view class="v0-btn" @click={() => router.back()} class="text-white">
              <ChevronLeft class="w-6 h-6" />
            </view>
            <text class="text-lg font-medium text-white">我的优惠券</text>
          </view>
    
          <!--   -->
          <view class="bg-white border-b border-[#E8E3DB] flex">
            
    <view v-for="(tab, index) in tabs" :key="index"> (
              <view class="v0-btn"
                key={{ tab.key }}
                @click={() => setActiveTab(tab.key)}
                class={`flex-1 py-3 text-sm font-medium relative ${
                  activeTab === tab.key ? "text-[#C41E3A]" : "text-[#666666]"
                }`}
              >
                {{ tab.label }}
                {tab.key === "unused" && unusedCount > 0 && (
                  <text class="ml-1 px-1.5 py-0.5 bg-[#C41E3A] text-white text-xs rounded-full">{{ unusedCount }}</text>
                )}
                {activeTab === tab.key && (
                  <view class="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#C41E3A] rounded-full" />
                )}
              </view>
            ))}
          </view>
    
          <!--   -->
          <view class="p-4">
            {loading ? (
              <view class="space-y-4">
                {[1, 2, 3].map(i => (
                  <view key={i} class="bg-white rounded-xl p-4 animate-pulse">
                    <view class="flex gap-4">
                      <view class="w-20 h-20 bg-gray-200 rounded" />
                      <view class="flex-1 space-y-2">
                        <view class="h-4 bg-gray-200 rounded w-2/3" />
                        <view class="h-3 bg-gray-200 rounded w-1/2" />
                        <view class="h-3 bg-gray-200 rounded w-1/3" />
                      </view>
                    </view>
                  </view>
                ))}
              </view>
            ) : activeTab === "center" ? (
              /* 领券中心 */
              <view class="space-y-4">
                <view class="bg-gradient-to-r from-[#C41E3A] to-[#E85A71] rounded-2xl p-4 text-white">
                  <view class="flex items-center gap-2 mb-2">
                    <Gift class="w-5 h-5" />
                    <text class="font-medium">限时领券</text>
                  </view>
                  <text class="text-sm opacity-80">精选优惠券，领取后可在结算时使用</text>
                </view>
    
                
    <view v-for="(coupon, index) in centerCoupons" :key="index"> (
                  <view
                    key={coupon.id}
                    class={`bg-white rounded-xl overflow-hidden shadow-sm ${coupon.isClaimed ? "opacity-60" : ""}`}
                  >
                    <view class="flex">
                      <!--   -->
                      <view class="w-28 bg-gradient-to-br from-[#FFF5F5] to-[#FFE8E8] p-4 flex flex-col items-center justify-center border-r border-dashed border-[#E8E3DB] relative">
                        <view class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#C41E3A] to-[#E85A71]" />
                        <text class="text-2xl font-bold text-[#C41E3A]">{{ getCouponValue(coupon) }}</text>
                        <text class="text-xs text-[#999999] mt-1">满{{ coupon.minAmount }}可用</text>
                      </view>
                      <!--   -->
                      <view class="flex-1 p-4">
                        <view class="flex items-start justify-between">
                          <view>
                            <text class="font-medium text-[#2C2C2C]">{{ coupon.name }}</text>
                            <view class="flex items-center gap-2 mt-2">
                              {coupon.scope.map(s => (
                                <text key={s} class="px-2 py-0.5 bg-[#FFF5F5] text-[#C41E3A] text-xs rounded">
                                  {{ s }}
                                </text>
                              ))}
                            </view>
                            <view class="flex items-center gap-1 mt-2 text-xs text-[#999999]">
                              <Clock class="w-3 h-3" />
                              <text>有效期至 {{ coupon.expireAt }}</text>
                            </view>
                            <view class="mt-1 text-xs text-[#999999]">
                              已领 {{ coupon.claimed }}/{{ coupon.stock }}
                            </view>
                          </view>
                          <view class="v0-btn"
                            @click={() => !coupon.isClaimed && handleClaim(coupon.id)}
                            :disabled={{ coupon.isClaimed || claimingId === coupon.id }}
                            class={`px-4 py-1.5 rounded-full text-sm font-medium ${
                              coupon.isClaimed
                                ? "bg-gray-100 text-[#999999]"
                                : "bg-[#C41E3A] text-white"
                            }`}
                          >
                            {claimingId === coupon.id ? "领取中..." : coupon.isClaimed ? "已领取" : "立即领取"}
                          </view>
                        </view>
                      </view>
                    </view>
                  </view>
                ))}
              </view>
            ) : filteredCoupons.length === 0 ? (
              /* 空状态 */
              <view class="flex flex-col items-center justify-center py-20">
                <Ticket class="w-16 h-16 text-[#E8E3DB] mb-4" />
                <text class="text-[#999999] mb-4">
                  {activeTab === "unused" ? "暂无可用优惠券" : activeTab === "used" ? "暂无已使用优惠券" : "暂无过期优惠券"}
                </text>
                {activeTab === "unused" && (
                  <view class="v0-btn"
                    @click={() => setActiveTab("center")}
                    class="px-6 py-2 bg-[#C41E3A] text-white rounded-full text-sm"
                  >
                    去领券
                  </view>
                )}
              </view>
            ) : (
              /* 优惠券列表 */
              <view class="space-y-4">
                
    <view v-for="(coupon, index) in filteredCoupons" :key="index"> (
                  <view
                    key={coupon.id}
                    class={`bg-white rounded-xl overflow-hidden shadow-sm ${
                      coupon.status !== "unused" ? "opacity-60 grayscale" : ""
                    }`}
                  >
                    <view class="flex">
                      <!--   -->
                      <view class={`w-28 p-4 flex flex-col items-center justify-center border-r border-dashed border-[#E8E3DB] relative ${
                        coupon.status === "unused" 
                          ? "bg-gradient-to-br from-[#FFF5F5] to-[#FFE8E8]" 
                          : "bg-gray-100"
                      }`}>
                        {coupon.status === "unused" && (
                          <view class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#C41E3A] to-[#E85A71]" />
                        )}
                        <text class={`text-2xl font-bold ${coupon.status === "unused" ? "text-[#C41E3A]" : "text-[#999999]"}`}>
                          {{ getCouponValue(coupon) }}
                        </text>
                        <text class="text-xs text-[#999999] mt-1">满{{ coupon.minAmount }}可用</text>
                      </view>
                      <!--   -->
                      <view class="flex-1 p-4">
                        <view class="flex items-start justify-between">
                          <view>
                            <text class="font-medium text-[#2C2C2C]">{{ coupon.name }}</text>
                            <view class="flex items-center gap-2 mt-2">
                              {coupon.scope.map(s => (
                                <text key={s} class={`px-2 py-0.5 text-xs rounded ${
                                  coupon.status === "unused" 
                                    ? "bg-[#FFF5F5] text-[#C41E3A]" 
                                    : "bg-gray-100 text-[#999999]"
                                }`}>
                                  {{ s }}
                                </text>
                              ))}
                            </view>
                            <view class="flex items-center gap-1 mt-2 text-xs text-[#999999]">
                              <Clock class="w-3 h-3" />
                              <text>有效期至 {{ coupon.expireAt }}</text>
                            </view>
                          </view>
                          {coupon.status === "unused" ? (
                            <view class="v0-btn"
                              @click={() => router.push("/shop")}
                              class="flex items-center gap-1 text-[#C41E3A] text-sm"
                            >
                              去使用
                              <ChevronRight class="w-4 h-4" />
                            </view>
                          ) : (
                            <view class="flex items-center gap-1 text-[#999999] text-sm">
                              {coupon.status === "used" ? (
                                
                                  <Check class="w-4 h-4" />
                                  <text>已使用</text>
                                
                              ) : (
                                <text>已过期</text>
                              )}
                            </view>
                          )}
                        </view>
                      </view>
                    </view>
                  </view>
                ))}
              </view>
            )}
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
const mockMyCoupons: Coupon[] = [
const mockCenterCoupons: CouponCenter[] = [
const tabs = [

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