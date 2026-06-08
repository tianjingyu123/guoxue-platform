<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">experts</text>
      <text class="v0-route">V0: experts</text>
    </view>
        <view class="min-h-screen bg-background pb-6">
          <!--   -->
          <AISearchModal isOpen={{ aiSearch.isOpen }} onClose={{ aiSearch.close }} context="讲师" />
    
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
      <view class="flex items-center gap-2 px-4 h-14">
      <BackButton fallbackPath="/discover" />
              
              <!--   -->
              <view class="flex-1 relative">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={{ searchQuery }}
                  @change={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索讲师/达人"
                  class="w-full h-9 pl-9 pr-4 bg-secondary rounded-full text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {searchQuery && (
                  <view class="v0-btn" 
                    @click={() => setSearchQuery("")}
                    class="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X class="w-4 h-4 text-muted-foreground" />
                  </view>
                )}
              </view>
              <AISearchButton @click={{ aiSearch.open }} />
            </view>
    
            <!--   -->
            <view class="flex items-center gap-2 px-4 py-2 overflow-x-auto scrollbar-hide">
              
    <view v-for="(cat, index) in categories" :key="index"> (
                <view class="v0-btn"
                  key={{ cat.id }}
                  @click={() => setActiveCategory(cat.id)}
                  class={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors",
                    activeCategory === cat.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  {{ cat.name }}
                </view>
              ))}
            </view>
    
            <!--   -->
            <view class="flex items-center justify-between px-4 py-2 border-t border-border">
              <view class="relative">
                <view class="v0-btn"
                  @click={() => setShowSortMenu(!showSortMenu)}
                  class="flex items-center gap-1 text-sm text-foreground"
                >
                  {sortOptions.find(s => s.id === activeSort)?.name}
                  <ChevronDown class={cn("w-4 h-4 transition-transform", showSortMenu && "rotate-180")} />
                </view>
                
                {showSortMenu && (
                  
                    <view class="fixed inset-0 z-10" @click={() => setShowSortMenu(false)} />
                    <view class="absolute top-full left-0 mt-1 bg-card rounded-lg shadow-lg border border-border overflow-hidden z-20 min-w-32">
                      
    <view v-for="(opt, index) in sortOptions" :key="index"> (
                        <view class="v0-btn"
                          key={{ opt.id }}
                          @click={() => { setActiveSort(opt.id); setShowSortMenu(false) }}
                          class={cn(
                            "w-full px-4 py-2.5 text-sm text-left hover:bg-secondary transition-colors",
                            activeSort === opt.id ? "text-primary bg-primary/5" : "text-foreground"
                          )}
                        >
                          {{ opt.name }}
                        </view>
                      ))}
                    </view>
                  
                )}
              </view>
    
              <view class="v0-btn"
                @click={() => setShowFilter(true)}
                class="flex items-center gap-1 text-sm text-muted-foreground"
              >
                <Filter class="w-4 h-4" />
                筛选
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="p-4 space-y-2">
            {filteredExperts.length > 0 ? (
              filteredExperts.map(expert => (
                <Link key={expert.id} href={`/expert/${expert.id}`}>
                  <Card class="p-3 border-0 rounded-[10px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition-all duration-300 bg-white">
                    <view class="flex gap-3">
                      <!--   -->
                      <view class="relative flex-shrink-0">
                        <Avatar class="w-16 h-16 rounded-[10px]">
                          <AvatarImage src={{ expert.avatar }} alt={{ expert.name }} class="rounded-[10px]" />
                          <AvatarFallback class="bg-[#F5F1EB] text-[#C41E3A] text-lg font-medium rounded-[10px]">
                            {{ expert.name[0] }}
                          </AvatarFallback>
                        </Avatar>
                        {expert.isOnline && (
                          <text class="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                        )}
                      </view>
    
                      <!--   -->
                      <view class="flex-1 min-w-0">
                        <view class="flex items-center gap-2 mb-1">
                          <text class="text-[15px] font-semibold text-[#2C2C2C]">{{ expert.name }}</text>
                          {expert.isVerified && (
                            <Badge class="text-[10px] px-1 py-0 bg-[#C9A96E]/20 text-[#C9A96E] border-0">V</Badge>
                          )}
                          <text class="text-[11px] text-[#666666]">{{ expert.title }}</text>
                        </view>
    
                        <!--   -->
                        <view class="flex flex-wrap gap-1 mb-2">
                          {expert.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} class="text-[10px] px-1.5 py-0 bg-[#F5F1EB] text-[#666666] border-0">
                              {{ tag }}
                            </Badge>
                          ))}
                        </view>
    
                        <!--   -->
                        <text class="text-[11px] text-[#666666] line-clamp-1 mb-2">{{ expert.intro }}</text>
    
                        <!--   -->
                        <view class="flex items-center gap-3 text-[11px]">
                          <text class="flex items-center gap-0.5 text-[#C9A96E]">
                            <Star class="w-3.5 h-3.5 fill-[#C9A96E]" />
                            {{ expert.rating }}
                          </text>
                          <text class="text-[#999999]">{{ expert.reviews }}条评价</text>
                          <text class="text-[#999999]">{{ expert.consults }}次咨询</text>
                        </view>
                      </view>
                    </view>
    
                    <!--   -->
                    <view class="flex items-center justify-between mt-3 pt-3 border-t border-[#F0EDE8]">
                      <view class="flex items-center gap-4 text-[11px]">
                        <text class="text-[#666666]">
                          提问 <text class="text-[#C41E3A] font-bold">{{ expert.askPrice }}币/次</text>
                        </text>
                        <text class="text-[#666666]">
                          连麦 <text class="text-[#C41E3A] font-bold">{{ expert.callPrice }}币/分钟</text>
                        </text>
                      </view>
                      
                      <view class="flex gap-2">
                        <view class="v0-btn" 
                          @click={(e) => { e.preventDefault(); }}
                          class="px-3 py-1.5 text-[11px] font-medium border border-[#C41E3A] text-[#C41E3A] rounded-full hover:bg-[#C41E3A]/10 transition-colors"
                        >
                          <MessageCircle class="w-3 h-3 inline mr-1" />
                          提问
                        </view>
                        <view class="v0-btn" 
                          @click={(e) => { e.preventDefault(); }}
                          class={cn(
                            "px-3 py-1.5 text-[11px] font-medium rounded-full transition-colors",
                            expert.isOnline
                              ? "bg-[#C41E3A] text-white hover:bg-[#A01830]"
                              : "bg-[#F5F1EB] text-[#999999] cursor-not-allowed"
                          )}
                          :disabled={{ !expert.isOnline }}
                        >
                          <Phone class="w-3 h-3 inline mr-1" />
                          {expert.isOnline ? "连麦" : "离线"}
                        </view>
                      </view>
                    </view>
                  </Card>
                </Link>
              ))
            ) : (
              <view class="flex flex-col items-center justify-center py-20">
                <view class="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <Search class="w-8 h-8 text-muted-foreground" />
                </view>
                <text class="text-muted-foreground text-sm">未找到相关讲师</text>
                <text class="text-muted-foreground/70 text-xs mt-1">试试其他关键词或筛选条件</text>
              </view>
            )}
          </view>
    
          <!--   -->
          {showFilter && (
            <view class="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
              <view class="w-full max-w-lg bg-card rounded-t-2xl animate-in slide-in-from-bottom duration-300">
                <view class="flex items-center justify-between p-4 border-b border-border">
                  <text class="font-semibold text-foreground">筛选</text>
                  <view class="v0-btn" @click={() => setShowFilter(false)}>
                    <X class="w-5 h-5 text-muted-foreground" />
                  </view>
                </view>
    
                <view class="p-4 space-y-6">
                  <!--   -->
                  <view>
                    <text class="text-sm font-medium text-foreground mb-3">提问价格（币/次）</text>
                    <view class="flex flex-wrap gap-2">
                      {[[0, 100], [0, 20], [20, 50], [50, 100]].map(([min, max]) => (
                        <view class="v0-btn"
                          key={`${min}-${{ max }}`}
                          @click={() => setPriceRange([min, max])}
                          class={cn(
                            "px-4 py-2 text-sm rounded-lg transition-colors",
                            priceRange[0] === min && priceRange[1] === max
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-foreground hover:bg-secondary/80"
                          )}
                        >
                          {min === 0 && max === 100 ? "不限" : `${{ min }}-${{ max }}币`}
                        </view>
                      ))}
                    </view>
                  </view>
    
                  <!--   -->
                  <view>
                    <text class="text-sm font-medium text-foreground mb-3">在线状态</text>
                    <view class="flex gap-2">
                      <view class="v0-btn"
                        @click={() => setOnlyOnline(false)}
                        class={cn(
                          "px-4 py-2 text-sm rounded-lg transition-colors",
                          !onlyOnline ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                        )}
                      >
                        全部
                      </view>
                      <view class="v0-btn"
                        @click={() => setOnlyOnline(true)}
                        class={cn(
                          "px-4 py-2 text-sm rounded-lg transition-colors",
                          onlyOnline ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                        )}
                      >
                        仅看在线
                      </view>
                    </view>
                  </view>
                </view>
    
                <view class="flex gap-3 p-4 border-t border-border">
                  <view class="v0-btn"
                    @click={() => { setPriceRange([0, 100]); setOnlyOnline(false) }}
                    class="flex-1 py-3 text-sm font-medium text-foreground bg-secondary rounded-xl hover:bg-secondary/80 transition-colors"
                  >
                    重置
                  </view>
                  <view class="v0-btn"
                    @click={() => setShowFilter(false)}
                    class="flex-1 py-3 text-sm font-medium text-primary-foreground bg-primary rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    确定
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
const categories = [
const sortOptions = [
const expertsData = [
        const categoryMap: Record<string, string[]> = {

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