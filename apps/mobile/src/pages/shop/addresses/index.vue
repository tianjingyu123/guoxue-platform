<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">addresses</text>
      <text class="v0-route">V0: shop/addresses</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5]">
          <!--   -->
          <view class="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3 flex items-center justify-between">
            <view class="v0-btn" @click={() => router.back()} class="p-1 -ml-1">
              <ChevronLeft class="w-6 h-6 text-[#2C2C2C]" />
            </view>
            <text class="font-serif text-lg text-[#2C2C2C]">收货地址</text>
            <view class="v0-btn" 
              @click={() => router.push("/shop/addresses/edit")}
              class="p-1 -mr-1 text-[#C41E3A]"
            >
              <Plus class="w-6 h-6" />
            </view>
          </view>
    
          <!--   -->
          <view class="p-4 space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <view key={{ i }} class="bg-white rounded-2xl p-4 animate-pulse">
                  <view class="flex gap-3">
                    <view class="w-10 h-10 bg-gray-200 rounded-full" />
                    <view class="flex-1 space-y-2">
                      <view class="h-4 bg-gray-200 rounded w-1/3" />
                      <view class="h-3 bg-gray-200 rounded w-full" />
                    </view>
                  </view>
                </view>
              ))
            ) : addresses.length === 0 ? (
              <view class="py-20 text-center">
                <view class="w-20 h-20 mx-auto mb-4 rounded-full bg-[#FAF8F5] flex items-center justify-center">
                  <MapPin class="w-10 h-10 text-[#999999]" />
                </view>
                <text class="text-[#999999] mb-4">暂无收货地址</text>
                <view class="v0-btn"
                  @click={() => router.push("/shop/addresses/edit")}
                  class="px-6 py-2 bg-[#C41E3A] text-white rounded-full text-sm"
                >
                  添加地址
                </view>
              </view>
            ) : (
              addresses.map(addr => (
                <view
                  key={{ addr.id }}
                  class="relative overflow-hidden"
                  onTouchStart={(e) => handleTouchStart(e, addr.id)}
                  onTouchMove={(e) => handleTouchMove(e, addr.id)}
                  onTouchEnd={{ handleTouchEnd }}
                >
                  <!--   -->
                  <view
                    class={`absolute right-0 top-0 bottom-0 w-20 bg-red-500 flex items-center justify-center transition-transform duration-200 ${
                      swipedId === addr.id ? "translate-x-0" : "translate-x-full"
                    }`}
                    :style=" borderRadius: "0 16px 16px 0" }}
                  >
                    <view class="v0-btn"
                      @click={() => setDeleteConfirm(addr.id)}
                      class="p-3 text-white"
                    >
                      <Trash2 class="w-6 h-6" />
                    </view>
                  </view>
    
                  <!--   -->
                  <view
                    class={`bg-white rounded-2xl p-4 transition-transform duration-200 ${
                      swipedId === addr.id ? "-translate-x-20" : "translate-x-0"
                    }`}
                    @click={() => router.push(`/shop/addresses/edit?id=${addr.id}`)}
                  >
                    <view class="flex gap-3">
                      <view class={`w-10 h-10 rounded-full flex items-center justify-center ${
                        addr.isDefault ? "bg-[#C41E3A]/10" : "bg-[#FAF8F5]"
                      }`}>
                        <MapPin class={`w-5 h-5 ${addr.isDefault ? "text-[#C41E3A]" : "text-[#999999]"}`} />
                      </view>
                      <view class="flex-1 min-w-0">
                        <view class="flex items-center gap-2 mb-1">
                          <text class="font-medium text-[#2C2C2C]">{{ addr.name }}</text>
                          <text class="text-[#666666] text-sm">{{ addr.phone }}</text>
                          {addr.isDefault && (
                            <text class="px-2 py-0.5 bg-[#C41E3A] text-white text-xs rounded">默认</text>
                          )}
                        </view>
                        <text class="text-sm text-[#666666] line-clamp-2">
                          {{ addr.province }}{{ addr.city }}{{ addr.district }}{{ addr.address }}
                        </text>
                      </view>
                    </view>
    
                    <!--   -->
                    <view class="flex items-center justify-between mt-3 pt-3 border-t border-[#E8E3DB]">
                      <view class="v0-btn"
                        @click={(e) => {
                          e.stopPropagation()
                          if (!addr.isDefault) handleSetDefault(addr.id)
                        }}
                        class={`flex items-center gap-1.5 text-sm ${
                          addr.isDefault ? "text-[#C41E3A]" : "text-[#666666]"
                        }`}
                      >
                        <view class={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          addr.isDefault ? "border-[#C41E3A] bg-[#C41E3A]" : "border-[#CCCCCC]"
                        }`}>
                          {addr.isDefault && <Check class="w-2.5 h-2.5 text-white" />}
                        </view>
                        设为默认
                      </view>
                      <view class="v0-btn"
                        @click={(e) => {
                          e.stopPropagation()
                          router.push(`/shop/addresses/edit?id=${addr.id}`)
                        }}
                        class="text-sm text-[#666666]"
                      >
                        编辑
                      </view>
                    </view>
                  </view>
                </view>
              ))
            )}
          </view>
    
          <!--   -->
          {!loading && addresses.length > 0 && (
            <view class="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E8E3DB]">
              <view class="v0-btn"
                @click={() => router.push("/shop/addresses/edit")}
                class="w-full py-3 bg-[#C41E3A] text-white rounded-full font-medium flex items-center justify-center gap-2"
              >
                <Plus class="w-5 h-5" />
                新增收货地址
              </view>
            </view>
          )}
    
          <!--   -->
          {deleteConfirm && (
            <view class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <view class="bg-white rounded-2xl p-6 mx-8 w-full max-w-sm">
                <text class="text-lg font-medium text-[#2C2C2C] text-center mb-2">删除地址</text>
                <text class="text-[#666666] text-center mb-6">确定要删除这个收货地址吗？</text>
                <view class="flex gap-3">
                  <view class="v0-btn"
                    @click={() => {
                      setDeleteConfirm(null)
                      setSwipedId(null)
                    }}
                    class="flex-1 py-2.5 border border-[#E8E3DB] rounded-full text-[#666666]"
                  >
                    取消
                  </view>
                  <view class="v0-btn"
                    @click={() => handleDelete(deleteConfirm)}
                    class="flex-1 py-2.5 bg-red-500 text-white rounded-full"
                  >
                    删除
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
const mockAddresses: ShippingAddress[] = [

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