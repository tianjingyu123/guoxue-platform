<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">商城</text>
      <text class="v0-route">V0: mall/category</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
            <view class="flex items-center gap-3 px-4 h-14">
              <BackButton fallbackPath="/mall" />
              <view class="flex-1 relative">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="搜索商品"
                  value={{ searchQuery }}
                  @change={(e) => setSearchQuery(e.target.value)}
                  class="w-full h-9 pl-9 pr-4 rounded-full bg-secondary text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </view>
            </view>
          </view>
    
          <view class="flex">
            <!--   -->
            <view class="w-20 flex-shrink-0 bg-secondary/30 border-r border-border min-h-[calc(100vh-56px)] sticky top-14">
              <view class="py-2">
                
    <view v-for="(category, index) in categories" :key="index"> (
                  <view class="v0-btn"
                    key={{ category.id }}
                    @click={() => setActiveCategory(category.id)}
                    class={cn(
                      "w-full px-2 py-3 text-xs text-center transition-colors relative",
                      activeCategory === category.id
                        ? "text-primary font-medium bg-background"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {activeCategory === category.id && (
                      <view class="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-r" />
                    )}
                    <text class="line-clamp-2">{{ category.name }}</text>
                    <text class="text-[10px] text-muted-foreground/70 mt-0.5 block">
                      {{ category.count }}
                    </text>
                  </view>
                ))}
              </view>
            </view>
    
            <!--   -->
            <view class="flex-1 min-w-0">
              <!--   -->
              <view class="sticky top-14 z-30 bg-background border-b border-border">
                <view class="flex items-center justify-between px-3 h-10">
                  <!--   -->
                  <view class="relative">
                    <view class="v0-btn"
                      @click={() => setShowSortMenu(!showSortMenu)}
                      class="flex items-center gap-1 text-sm text-foreground"
                    >
                      {sortOptions.find(s => s.id === sortBy)?.name}
                      <ChevronDown class={cn(
                        "w-4 h-4 transition-transform",
                        showSortMenu && "rotate-180"
                      )} />
                    </view>
                    
                    {showSortMenu && (
                      
                        <view 
                          class="fixed inset-0 z-40"
                          @click={() => setShowSortMenu(false)}
                        />
                        <view class="absolute top-full left-0 mt-1 w-28 bg-card border border-border rounded-lg shadow-lg z-50 py-1">
                          
    <view v-for="(option, index) in sortOptions" :key="index"> (
                            <view class="v0-btn"
                              key={{ option.id }}
                              @click={() => {
                                setSortBy(option.id)
                                setShowSortMenu(false)
                              }}
                              class={cn(
                                "w-full px-3 py-2 text-left text-sm transition-colors",
                                sortBy === option.id
                                  ? "text-primary bg-primary/5"
                                  : "text-foreground hover:bg-secondary"
                              )}
                            >
                              {{ option.name }}
                            </view>
                          ))}
                        </view>
                      
                    )}
                  </view>
    
                  <!--   -->
                  <view class="v0-btn"
                    @click={() => setShowFilter(true)}
                    class={cn(
                      "flex items-center gap-1 text-sm",
                      (priceRange[0] > 0 || priceRange[1] < 1000 || onlyMemberFree)
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    <SlidersHorizontal class="w-4 h-4" />
                    筛选
                  </view>
                </view>
              </view>
    
              <!--   -->
              {sortedProducts.length > 0 ? (
                <view class="grid grid-cols-2 gap-2 p-2">
                  
    <view v-for="(product, index) in sortedProducts" :key="index"> (
                    <Link key={product.id} href={`/mall/product/${product.id}`}>
                      <Card class="overflow-hidden hover:bg-secondary/30 transition-colors">
                        <view class="aspect-square bg-secondary relative flex items-center justify-center">
                          <text class="text-4xl text-muted-foreground/30">
                            {categories.find(c => c.id === product.category)?.name[0]}
                          </text>
                          {product.isMemberFree && (
                            <Badge class="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0 bg-accent text-accent-foreground border-0">
                              会员免费
                            </Badge>
                          )}
                        </view>
                        <view class="p-2">
                          <text class="text-xs font-medium text-foreground line-clamp-2 min-h-[2.5rem]">
                            {{ product.name }}
                          </text>
                          <view class="flex items-baseline gap-1 mt-1">
                            <text class="text-sm text-primary font-semibold">
                              ¥{{ product.price }}
                            </text>
                            <text class="text-[10px] text-muted-foreground line-through">
                              ¥{{ product.originalPrice }}
                            </text>
                          </view>
                          <text class="text-[10px] text-muted-foreground mt-0.5">
                            已售{product.sales > 1000 ? (product.sales / 1000).toFixed(1) + "k" : product.sales}
                          </text>
                        </view>
                      </Card>
                    </Link>
                  ))}
                </view>
              ) : (
                <view class="flex flex-col items-center justify-center py-20">
                  <view class="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                    <Search class="w-8 h-8 text-muted-foreground" />
                  </view>
                  <text class="text-muted-foreground text-sm">暂无相关商品</text>
                  <view class="v0-btn"
                    @click={() => {
                      setActiveCategory("all")
                      setSearchQuery("")
                      setPriceRange([0, 1000])
                      setOnlyMemberFree(false)
                    }}
                    class="mt-3 text-sm text-primary"
                  >
                    重置筛选条件
                  </view>
                </view>
              )}
            </view>
          </view>
    
          <!--   -->
          {showFilter && (
            
              <view 
                class="fixed inset-0 bg-black/50 z-50"
                @click={() => setShowFilter(false)}
              />
              <view class="fixed bottom-0 left-0 right-0 bg-card rounded-t-2xl z-50 safe-area-pb animate-in slide-in-from-bottom duration-300">
                <view class="flex items-center justify-between px-4 py-3 border-b border-border">
                  <text class="font-semibold text-base text-foreground">筛选</text>
                  <view class="v0-btn" @click={() => setShowFilter(false)}>
                    <X class="w-5 h-5 text-muted-foreground" />
                  </view>
                </view>
                
                <view class="p-4 space-y-6">
                  <!--   -->
                  <view>
                    <text class="text-sm font-medium text-foreground mb-3">价格区间</text>
                    <view class="flex items-center gap-3">
                      <input
                        type="number"
                        placeholder="最低价"
                        value={priceRange[0] || ""}
                        @change={(e) => setPriceRange([Number(e.target.value) || 0, priceRange[1]])}
                        class="flex-1 h-10 px-3 rounded-lg bg-secondary text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <text class="text-muted-foreground">-</text>
                      <input
                        type="number"
                        placeholder="最高价"
                        value={priceRange[1] === 1000 ? "" : priceRange[1]}
                        @change={(e) => setPriceRange([priceRange[0], Number(e.target.value) || 1000])}
                        class="flex-1 h-10 px-3 rounded-lg bg-secondary text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </view>
                    <!--   -->
                    <view class="flex flex-wrap gap-2 mt-3">
                      {[[0, 50], [50, 100], [100, 300], [300, 500], [500, 1000]].map(([min, max]) => (
                        <view class="v0-btn"
                          key={`${min}-${{ max }}`}
                          @click={() => setPriceRange([min, max])}
                          class={cn(
                            "px-3 py-1.5 rounded-full text-xs transition-colors",
                            priceRange[0] === min && priceRange[1] === max
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-foreground hover:bg-secondary/80"
                          )}
                        >
                          ¥{{ min }}-{{ max }}
                        </view>
                      ))}
                    </view>
                  </view>
    
                  <!--   -->
                  <view>
                    <text class="text-sm font-medium text-foreground mb-3">其他</text>
                    <text class="flex items-center gap-3 cursor-pointer">
                      <view 
                        class={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                          onlyMemberFree
                            ? "bg-primary border-primary"
                            : "border-muted-foreground/30"
                        )}
                        @click={() => setOnlyMemberFree(!onlyMemberFree)}
                      >
                        {onlyMemberFree && (
                          <svg class="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={{ 3 }} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </view>
                      <text class="text-sm text-foreground">仅看会员免费</text>
                    </text>
                  </view>
                </view>
    
                <!--   -->
                <view class="flex gap-3 px-4 py-4 border-t border-border">
                  <view class="v0-btn"
                    @click={() => {
                      setPriceRange([0, 1000])
                      setOnlyMemberFree(false)
                    }}
                    class="flex-1 py-3 bg-secondary text-foreground text-sm font-medium rounded-xl hover:bg-secondary/80 transition-colors"
                  >
                    重置
                  </view>
                  <view class="v0-btn"
                    @click={() => setShowFilter(false)}
                    class="flex-1 py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    确定
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
const products = [

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