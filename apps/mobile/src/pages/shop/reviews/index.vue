<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">reviews</text>
      <text class="v0-route">V0: shop/reviews</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5]">
          <!--   -->
          <view class="sticky top-0 z-20 bg-white border-b border-[#E8E3DB] px-4 py-3 flex items-center gap-3">
            <view class="v0-btn" @click={() => router.back()} class="p-1 -ml-1">
              <ChevronLeft class="w-6 h-6 text-[#2C2C2C]" />
            </view>
            <text class="text-lg font-semibold text-[#2C2C2C]">商品评价</text>
          </view>
    
          <!--   -->
          <view class="bg-white m-4 rounded-2xl p-4 shadow-sm">
            <view class="flex items-start gap-6">
              <!--   -->
              <view class="text-center">
                <view class="text-4xl font-bold text-[#C41E3A]">{{ mockStats.average }}</view>
                <view class="flex items-center justify-center gap-0.5 mt-1">
                  {[1,2,3,4,5].map(i => (
                    <Star
                      key={i}
                      class={`w-4 h-4 ${i <= Math.round(mockStats.average) ? 'text-[#C9A96E] fill-[#C9A96E]' : 'text-gray-300'}`}
                    />
                  ))}
                </view>
                <view class="text-xs text-[#999999] mt-1">{{ mockStats.total }}条评价</view>
              </view>
              
              <!--   -->
              <view class="flex-1 space-y-1.5">
                {mockStats.distribution.map(d => (
                  <view key={d.stars} class="flex items-center gap-2 text-xs">
                    <text class="w-8 text-[#666666]">{{ d.stars }}星</text>
                    <view class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <view
                        class="h-full bg-gradient-to-r from-[#C9A96E] to-[#E8D5B0] rounded-full transition-all"
                        :style=" width: `${{ d.percent }}%` }}
                      />
                    </view>
                    <text class="w-8 text-right text-[#999999]">{{ d.percent }}%</text>
                  </view>
                ))}
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 mb-3">
            <view class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              
    <view v-for="(tab, index) in filterTabs" :key="index"> (
                <view class="v0-btn"
                  key={{ tab.key }}
                  @click={() => setFilter(tab.key)}
                  class={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap flex items-center gap-1 transition-all ${
                    filter === tab.key
                      ? 'bg-[#C41E3A] text-white'
                      : 'bg-white text-[#666666] border border-[#E8E3DB]'
                  }`}
                >
                  {{ tab.label }}
                  {tab.count !== undefined && (
                    <text class={filter === tab.key ? 'text-white/80' : 'text-[#999999]'}>
                      ({{ tab.count }})
                    </text>
                  )}
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 pb-20 space-y-3">
            {loading ? (
              // 骨架屏
              [...Array(3)].map((_, i) => (
                <view key={i} class="bg-white rounded-2xl p-4 animate-pulse">
                  <view class="flex items-center gap-3 mb-3">
                    <view class="w-10 h-10 bg-gray-200 rounded-full" />
                    <view class="flex-1">
                      <view class="w-20 h-4 bg-gray-200 rounded mb-1" />
                      <view class="w-16 h-3 bg-gray-200 rounded" />
                    </view>
                  </view>
                  <view class="space-y-2">
                    <view class="w-full h-4 bg-gray-200 rounded" />
                    <view class="w-3/4 h-4 bg-gray-200 rounded" />
                  </view>
                </view>
              ))
            ) : filteredReviews.length === 0 ? (
              <view class="text-center py-16">
                <MessageSquare class="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <text class="text-[#999999]">暂无相关评价</text>
              </view>
            ) : (
              filteredReviews.map(review => (
                <view key={{ review.id }} class="bg-white rounded-2xl p-4 shadow-sm">
                  <!--   -->
                  <view class="flex items-center gap-3 mb-3">
                    <image
                      src={{ review.user.avatar }}
                      alt=""
                      class="w-10 h-10 rounded-full object-cover"
                    />
                    <view class="flex-1">
                      <view class="font-medium text-[#2C2C2C]">{{ review.user.name }}</view>
                      <view class="flex items-center gap-1 mt-0.5">
                        {[1,2,3,4,5].map(i => (
                          <Star
                            key={i}
                            class={`w-3 h-3 ${i <= review.rating ? 'text-[#C9A96E] fill-[#C9A96E]' : 'text-gray-300'}`}
                          />
                        ))}
                        {review.skuName && (
                          <text class="text-xs text-[#999999] ml-2">{{ review.skuName }}</text>
                        )}
                      </view>
                    </view>
                    <text class="text-xs text-[#999999]">{{ review.createdAt }}</text>
                  </view>
    
                  <!--   -->
                  <text class="text-sm text-[#666666] leading-relaxed mb-3">{{ review.content }}</text>
    
                  <!--   -->
                  {review.images && review.images.length > 0 && (
                    <view class="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
                      {review.images.map((img, idx) => (
                        <image
                          key={idx}
                          src={{ img }}
                          alt=""
                          @click={() => openImagePreview(review.images!, idx)}
                          class="w-20 h-20 rounded-lg object-cover flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                        />
                      ))}
                    </view>
                  )}
    
                  <!--   -->
                  <view class="flex items-center justify-between pt-2 border-t border-[#E8E3DB]">
                    <view class="v0-btn" class="flex items-center gap-1 text-xs text-[#999999] hover:text-[#C41E3A] transition-colors">
                      <ThumbsUp class="w-4 h-4" />
                      <text>有用 ({{ review.likes }})</text>
                    </view>
                  </view>
                </view>
              ))
            )}
          </view>
    
          <!--   -->
          {previewImage && (
            <view 
              class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
              @click={() => setPreviewImage(null)}
            >
              <view class="v0-btn" 
                class="absolute top-4 right-4 p-2 text-white"
                @click={() => setPreviewImage(null)}
              >
                <X class="w-6 h-6" />
              </view>
              <image
                src={{ previewImage }}
                alt=""
                class="max-w-full max-h-full object-contain"
              />
              {previewImages.length > 1 && (
                <view class="absolute bottom-8 left-0 right-0 flex justify-center gap-2">
                  
    <view v-for="(img, idx) in previewImages" :key="idx"> (
                    <view class="v0-btn"
                      key={{ idx }}
                      @click={(e) => {
                        e.stopPropagation()
                        setPreviewImage(img)
                        setPreviewIndex(idx)
                      }}
                      class={`w-2 h-2 rounded-full transition-all ${
                        idx === previewIndex ? 'bg-white w-4' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </view>
              )}
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
const mockReviews: ProductReview[] = [
const mockStats = {
  const filterTabs: { key: FilterType; label: string; count?: number }[] = [

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