<template>
  <view class="page v0-page" data-v0-route="circle">
        <view class="min-h-screen bg-[#FAF8F5] pb-20">
          <AISearchModal isOpen={{ aiSearch.isOpen }} onClose={{ aiSearch.close }} context="圈子" />
    
          <!--   -->
          <view class="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-sm border-b border-[#E8E0D5]/50 safe-area-pt">
            <view class="flex items-center gap-2 px-4 h-14">
              <view class="flex-1 relative">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999]" />
                <input
                  type="text"
                  placeholder="搜索圈子"
                  value={{ searchQuery }}
                  @change={(e) => setSearchQuery(e.target.value)}
                  class="w-full h-9 pl-10 pr-4 rounded-full bg-[#F2EFEA] text-sm text-[#2C2C2C] placeholder:text-[#999999] focus:outline-none focus:ring-2 focus:ring-[#C41E3A]/30"
                />
                {searchQuery && (
                  <view class="v0-btn" @click={() => setSearchQuery("")} class="absolute right-3 top-1/2 -translate-y-1/2">
                    <X class="w-4 h-4 text-[#999999]" />
                  </view>
                )}
              </view>
              <AISearchButton @click={{ aiSearch.open }} />
            </view>
          </view>
          
          <!--   -->
          <view class="bg-[#FAF8F5] border-b border-[#E8E0D5]/50">
            <view class="flex gap-2 overflow-x-auto py-3 px-4 scrollbar-hide">
              <view v-for="cat in circleCategories" :key="cat.id || index">
                <view class="v0-btn"
                  key={cat.id}
                  @click={() => setSelectedCategory(cat.id)}
                  class="v0-class"
                >
                  {{ cat.name }}
                </view>
              ))}
            </view>
          </view>
    
          <view class="px-4 py-4">
            
            <!--   -->
            <!--   -->
            <!--   -->
            <view class="mb-5">
              <view class="flex items-center justify-between mb-3">
                <view class="flex items-center gap-1 bg-[#F2EFEA] rounded-full p-0.5">
                  <view class="v0-btn"
                    @click={() => setMyCircleTab("joined")}
                    class="v0-class"
                  >
                    我加入的
                  </view>
                  <view class="v0-btn"
                    @click={() => setMyCircleTab("created")}
                    class="v0-class"
                  >
                    我创建的
                  </view>
                </view>
                <Link href="/circles/mine" class="text-[12px] text-[#C41E3A] flex items-center font-medium">
                  全部 <ChevronRight class="w-4 h-4" />
                </Link>
              </view>
              
              {myCircles.length > 0 ? (
                <view class="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                  <view v-for="circle in myCircles" :key="circle.id || index">
                    <Link key={circle.id} href={{ `/circle/${circle.id }}`} class="flex-shrink-0 w-[140px]">
                      <Card class="overflow-hidden border-0 rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] bg-white active:scale-[0.98] transition-transform">
                        <!--   -->
                        <view class="relative aspect-[4/3] overflow-hidden">
                          <image src={{ circle.cover }} alt={{ circle.name }} class="w-full h-full object-cover" />
                          <!--   -->
                          {{ circle.unread > 0 && (
                            <view class="absolute top-2 right-2 min-w-[20px] h-[20px] px-1.5 rounded-full bg-[#C41E3A] text-white text-[10px] font-bold flex items-center justify-center shadow-md">
                              {circle.unread > 99 ? "99+" : circle.unread }}
                            </view>
                          )}
                        </view>
                        <!--   -->
                        <view class="p-2.5">
                          <text class="h4" class="text-[13px] font-bold text-[#2C2C2C] line-clamp-1">{{ circle.name }}</text>
                          <text class="text-[10px] text-[#999999] mt-1">{{ circle.members >= 1000 ? `${(circle.members / 1000).toFixed(1) }}k` : circle.members} 成员</text>
                          <text class="text-[10px] text-[#666666] line-clamp-1 mt-1">{{ circle.lastPost }}</text>
                        </view>
                      </Card>
                    </Link>
                  ))}
                </view>
              ) : (
                <view class="py-6 text-center bg-[#F2EFEA] rounded-[12px]">
                  <text class="text-[13px] text-[#666666]">
                    {{ myCircleTab === "created" ? "你还没有创建任何圈子" : "你还没有加入任何圈子" }}
                  </text>
                </view>
              )}
            </view>
    
            <!--   -->
            <!--   -->
            <!--   -->
            <view class="mb-5">
              <Link href="/circles/create">
                <Card class="overflow-hidden border-2 border-[#C41E3A]/20 rounded-[14px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] bg-white relative active:scale-[0.98] transition-transform">
                  <view class="flex items-center gap-4 p-4">
                    <view class="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C41E3A] to-[#E02D4A] flex items-center justify-center shadow-lg shadow-[#C41E3A]/25">
                      <Plus class="w-8 h-8 text-white" strokeWidth={{ 3 }} />
                    </view>
                    <view class="flex-1">
                      <text class="h3" class="text-[17px] font-bold text-[#C41E3A]">创建你的圈子</text>
                      <text class="text-[13px] text-[#666666] mt-0.5">打造专属国学交流社区，聚集志同道合的朋友</text>
                    </view>
                    <view class="w-9 h-9 rounded-full bg-[#C41E3A]/10 flex items-center justify-center">
                      <ChevronRight class="w-5 h-5 text-[#C41E3A]" />
                    </view>
                  </view>
                </Card>
              </Link>
            </view>
    
            <!--   -->
            <!--   -->
            <!--   -->
            <view class="mb-5">
              <view class="flex items-center justify-between mb-3">
                <view class="flex items-center gap-2">
                  <Flame class="w-5 h-5 text-[#C41E3A]" />
                  <text class="h2" class="text-[17px] font-bold text-[#2C2C2C]">热门圈子</text>
                </view>
                <text class="text-[11px] text-[#999999] bg-[#F2EFEA] px-2 py-0.5 rounded-full">精选优质社群</text>
              </view>
              
              <CircleCardList 
                circles={{ displayedHotCircles [] }} 
                joinedIds={{ joinedCircles }}
                onJoin={{ handleJoin }}
                showRank={{ true }}
              />
              
              <!--   -->
              {hotCircles.length > 5 && (
                <view class="v0-btn"
                  @click={() => setHotExpanded(!hotExpanded)}
                  class="w-full mt-3 py-3 flex items-center justify-center gap-1.5 text-[13px] font-medium text-[#C41E3A] bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] active:bg-[#FAF8F5] transition-colors"
                >
                  {{ hotExpanded ? "收起" : `查看更多热门圈子 (${hotCircles.length - 5 }})`}
                  <ChevronDown class="v0-class" />
                </view>
              )}
            </view>
    
            <!--   -->
            <!--   -->
            <!--   -->
            <view>
              <view class="flex items-center gap-2 mb-3">
                <Sparkles class="w-5 h-5 text-[#C9A96E]" />
                <text class="h2" class="text-[17px] font-bold text-[#2C2C2C]">发现更多</text>
              </view>
              
              <CircleCardList 
                circles={{ recommendCircles [] }} 
                joinedIds={{ joinedCircles }}
                onJoin={{ handleJoin }}
                variant="masonry"
              />
            </view>
          </view>
    
          <BottomNav />
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)
const isEmpty = ref(false)

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    // TODO: 集成真实 API - V0 路由: circle
    loading.value = false
  } catch (e: any) {
    error.value = e.message || '加载失败'
    loading.value = false
  }
}

onMounted(() => { fetchData() })
onPullDownRefresh(() => { fetchData().finally(() => uni.stopPullDownRefresh()) })
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}

.v0-page {
  padding: 24rpx;
}

/* 按钮样式 */
.v0-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 32rpx;
  border-radius: 12rpx;
  background: #C41E3A;
  color: #FFFFFF;
  font-size: 28rpx;
  font-weight: 500;
}

/* 列表项 */
.v0-li {
  padding: 24rpx;
  border-bottom: 1px solid #E8E0D5;
}

/* 分隔线 */
.hr {
  height: 1px;
  background: #E8E0D5;
  margin: 24rpx 0;
}
</style>