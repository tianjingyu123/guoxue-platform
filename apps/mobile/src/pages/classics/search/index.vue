<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">搜索</text>
      <text class="v0-route">V0: classics/search</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background border-b border-border/60">
            <view class="flex items-center gap-3 px-4 h-14">
              <view class="v0-btn" 
                @click={() => router.back()}
                class="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"
                aria-label="返回"
              >
                <ArrowLeft class="w-5 h-5" />
              </view>
              
              <!--   -->
              <view class="flex-1 relative">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  ref={{ inputRef }}
                  value={{ searchValue }}
                  @change={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="搜索古籍、作者、内容..."
                  class="pl-9 pr-16 h-10 bg-secondary border-0 rounded-full"
                />
                <!--   -->
                <view class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {searchValue && (
                    <view class="v0-btn" 
                      @click={{ handleClear }}
                      class="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-background transition-colors"
                      aria-label="清除"
                    >
                      <X class="w-4 h-4" />
                    </view>
                  )}
                  <view class="v0-btn" 
                    class="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-background transition-colors"
                    aria-label="语音搜索"
                  >
                    <Mic class="w-4 h-4" />
                  </view>
                </view>
              </view>
              
              <!--   -->
              <Link 
                href="/classics/ai-assistant"
                class="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm flex-shrink-0"
                aria-label="AI助手"
              >
                <Sparkles class="w-4 h-4 text-white" />
              </Link>
            </view>
          </view>
    
          <!--   -->
          <view class="p-4">
            <!--   -->
            {searchState === "initial" && (
              <view class="space-y-6">
                <!--   -->
                {searchHistory.length > 0 && (
                  <view>
                    <view class="flex items-center justify-between mb-3">
                      <view class="flex items-center gap-2">
                        <Clock class="w-4 h-4 text-muted-foreground" />
                        <text class="text-sm font-medium">搜索历史</text>
                      </view>
                      <view class="v0-btn" 
                        @click={{ handleClearHistory }}
                        class="text-xs text-muted-foreground hover:text-foreground"
                      >
                        清空
                      </view>
                    </view>
                    <view class="flex flex-wrap gap-2">
                      
    <view v-for="(keyword, i) in searchHistory" :key="i"> (
                        <view key={i} class="group flex items-center">
                          <view class="v0-btn"
                            @click={() => handleSearch(keyword)}
                            class="px-3 py-1.5 bg-secondary rounded-full text-sm hover:bg-secondary/80 transition-colors"
                          >
                            {{ keyword }}
                          </view>
                          <view class="v0-btn"
                            @click={() => handleDeleteHistory(keyword)}
                            class="w-5 h-5 -ml-1.5 rounded-full flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                            aria-label={`删除${keyword}`}
                          >
                            <X class="w-3 h-3" />
                          </view>
                        </view>
                      ))}
                    </view>
                  </view>
                )}
    
                <!--   -->
                <view>
                  <view class="flex items-center gap-2 mb-3">
                    <TrendingUp class="w-4 h-4 text-primary" />
                    <text class="text-sm font-medium">热门搜索</text>
                  </view>
                  <view class="flex flex-wrap gap-2">
                    
    <view v-for="(item, i) in hotSearchData" :key="i"> (
                      <view class="v0-btn"
                        key={{ i }}
                        @click={() => handleSearch(item.keyword)}
                        class={cn(
                          "px-3 py-1.5 rounded-full text-sm transition-colors",
                          item.isHot 
                            ? "bg-primary/10 text-primary hover:bg-primary/20" 
                            : "bg-secondary hover:bg-secondary/80"
                        )}
                      >
                        {{ item.keyword }}
                        {item.isHot && (
                          <text class="ml-1 text-[10px] text-primary">HOT</text>
                        )}
                      </view>
                    ))}
                  </view>
                </view>
    
                <!--   -->
                <view>
                  <view class="flex items-center justify-between mb-3">
                    <text class="text-sm font-medium">为你推荐</text>
                    <Link href="/classics/home" class="text-xs text-muted-foreground flex items-center">
                      更多<ChevronRight class="w-3 h-3" />
                    </Link>
                  </view>
                  <view class="space-y-3">
                    {searchResultsData.slice(0, 3).map((book, i) => (
                      <BookCardHorizontal
                        key={book.id}
                        {...book}
                        coverColor={["cream", "brown", "blue"][i % 3] as "cream" | "brown" | "blue"}
                      />
                    ))}
                  </view>
                </view>
              </view>
            )}
    
            <!--   -->
            {searchState === "suggesting" && suggestions.length > 0 && (
              <view class="space-y-1">
                
    <view v-for="(suggestion, i) in suggestions" :key="i"> (
                  <view class="v0-btn"
                    key={{ i }}
                    @click={() => handleSearch(suggestion.text)}
                    class="w-full flex items-center gap-3 px-3 py-3 hover:bg-secondary rounded-lg transition-colors text-left"
                  >
                    <Search class="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <text class="flex-1">
                      {suggestion.text.split(searchValue).map((part, pi, arr) => (
                        <text key={pi}>
                          {{ part }}
                          {pi < arr.length - 1 && (
                            <text class="text-primary font-medium">{{ searchValue }}</text>
                          )}
                        </text>
                      ))}
                    </text>
                    <Badge variant="secondary" class="text-[10px]">
                      古籍
                    </Badge>
                  </view>
                ))}
              </view>
            )}
    
            <!--   -->
            {searchState === "results" && (
              <view class="space-y-4">
                <!--   -->
                <view class="flex items-center justify-between">
                  <text class="text-sm text-muted-foreground">
                    共找到 <text class="text-foreground font-medium">{{ results.length }}</text> 部古籍
                  </text>
                  <Button variant="ghost" size="sm" class="h-8 text-xs">
                    <Filter class="w-3 h-3 mr-1" />
                    筛选
                  </Button>
                </view>
                
                <!--   -->
                <view class="space-y-3">
                  
    <view v-for="(book, i) in results" :key="i"> (
                    <BookCardHorizontal
                      key={book.id}
                      {...book}
                      coverColor={["cream", "brown", "blue", "green", "gray"][i % 5] as "cream" | "brown" | "blue" | "green" | "gray"}
                    />
                  ))}
                </view>
              </view>
            )}
    
            <!--   -->
            {searchState === "empty" && (
              <view class="flex flex-col items-center justify-center py-16 text-center">
                <view class="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <Search class="w-8 h-8 text-muted-foreground" />
                </view>
                <text class="font-medium mb-1">未找到相关古籍</text>
                <text class="text-sm text-muted-foreground mb-4">
                  换个关键词试试，或者使用AI助手帮你找
                </text>
                <Link href="/classics/ai-assistant">
                  <Button class="rounded-full">
                    <Sparkles class="w-4 h-4 mr-2" />
                    询问AI助手
                  </Button>
                </Link>
              </view>
            )}
    
            <!--   -->
            {isSearching && (
              <view class="flex items-center justify-center py-16">
                <view class="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
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
const searchHistoryData = [
const hotSearchData = [
const searchResultsData = [
const searchSuggestionsData = [

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