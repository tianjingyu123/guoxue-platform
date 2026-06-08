<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">古籍</text>
      <text class="v0-route">V0: classics/collection/[id]</text>
    </view>
        <view class="min-h-screen bg-background pb-6">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
            <view class="flex items-center justify-between px-4 h-14">
              <view class="v0-btn" 
                @click={() => router.back()}
                class="w-9 h-9 rounded-full bg-card/80 flex items-center justify-center shadow-sm"
                aria-label="返回"
              >
                <ArrowLeft class="w-5 h-5" />
              </view>
              
              <view class="flex items-center gap-2">
                <view class="v0-btn" 
                  class="w-9 h-9 rounded-full bg-card/80 flex items-center justify-center shadow-sm"
                  aria-label="分享"
                >
                  <Share2 class="w-4 h-4" />
                </view>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <view class="v0-btn" class="w-9 h-9 rounded-full bg-card/80 flex items-center justify-center shadow-sm">
                      <MoreVertical class="w-4 h-4" />
                    </view>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Download class="w-4 h-4 mr-2" />
                      下载全部
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class={cn(
            "mx-4 rounded-2xl p-6 bg-gradient-to-br",
            collection.cover,
            "dark:from-amber-900/30 dark:to-amber-800/30"
          )}>
            <Badge variant="secondary" class="mb-3 text-[10px]">
              精选书单
            </Badge>
            <text class="text-xl font-bold mb-2">{{ collection.title }}</text>
            <text class="text-sm text-muted-foreground leading-relaxed mb-4">
              {{ collection.description }}
            </text>
            
            <!--   -->
            <view class="flex items-center gap-4 text-xs text-muted-foreground mb-4">
              <text>{{ collection.curator }}</text>
              <text>·</text>
              <text>{{ collection.bookCount }}本</text>
              <text>·</text>
              <text>{{ (collection.viewCount / 10000).toFixed(1) }}万人看过</text>
            </view>
            
            <!--   -->
            <view class="flex items-center gap-2">
              {collection.tags.map((tag, i) => (
                <Badge key={i} variant="outline" class="text-[10px] bg-white/50 dark:bg-black/20">
                  {{ tag }}
                </Badge>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-4 -mt-4">
            <view class="flex -space-x-2 mb-4">
              {collection.books.slice(0, 5).map((book, i) => (
                <view 
                  key={book.id}
                  class={cn(
                    "w-10 h-14 rounded-sm flex items-center justify-center border-2 border-card shadow-md",
                    "bg-[#f5f0e1]"
                  )}
                  :style=" zIndex: 5 - i }}
                >
                  <text class="writing-vertical-rl text-[7px] font-serif font-bold text-[#4a3f2f]">
                    {{ book.title.slice(0, 2) }}
                  </text>
                </view>
              ))}
              {collection.books.length > 5 && (
                <view class="w-10 h-14 rounded-sm bg-secondary flex items-center justify-center border-2 border-card shadow-md text-xs text-muted-foreground">
                  +{{ collection.books.length - 5 }}
                </view>
              )}
            </view>
            
            <!--   -->
            <view class="flex gap-3">
              <Button 
                class="flex-1 rounded-full"
                @click={() => setIsAddedToShelf(!isAddedToShelf)}
                variant={isAddedToShelf ? "secondary" : "default"}
              >
                {isAddedToShelf ? "已加入书架" : "加入书架"}
              </Button>
              <Link href={`/reader/${collection.books[0]?.id || "1"}`} class="flex-1">
                <Button variant="outline" class="w-full rounded-full">
                  <BookOpen class="w-4 h-4 mr-2" />
                  开始阅读
                </Button>
              </Link>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 pt-2">
            <view class="flex items-center justify-between mb-4">
              <text class="font-medium">书单内容</text>
              <text class="text-xs text-muted-foreground">{{ collection.books.length }}本</text>
            </view>
            
            <view class="space-y-3">
              {collection.books.map((book, i) => (
                <Link key={book.id} href={`/classics/${book.id}`}>
                  <Card class="p-3 flex items-center gap-3 hover:shadow-md transition-shadow">
                    <!--   -->
                    <text class={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0",
                      i < 3 ? "bg-amber-500 text-white" : "bg-secondary text-muted-foreground"
                    )}>
                      {{ i + 1 }}
                    </text>
                    
                    <!--   -->
                    <view class={cn(
                      "w-10 h-14 rounded-sm flex-shrink-0 flex items-center justify-center relative",
                      "bg-[#f5f0e1] border border-[#c9b896]/50 shadow-sm"
                    )}>
                      <view class="absolute left-0 top-0 bottom-0 w-1 bg-[#d4c4a8] rounded-l-sm" />
                      <text class="writing-vertical-rl text-[8px] font-serif font-bold text-[#4a3f2f]">
                        {{ book.title.slice(0, 2) }}
                      </text>
                      {book.hasAI && (
                        <text class="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-purple-500 flex items-center justify-center">
                          <Sparkles class="w-2 h-2 text-white" />
                        </text>
                      )}
                    </view>
                    
                    <!--   -->
                    <view class="flex-1 min-w-0">
                      <view class="flex items-center gap-2 mb-0.5">
                        <text class="font-medium text-sm">{{ book.title }}</text>
                        {book.hasTranslation && (
                          <Badge class="text-[9px] px-1 py-0 h-4 bg-amber-100 text-amber-700 border-0">
                            译文
                          </Badge>
                        )}
                      </view>
                      <text class="text-xs text-muted-foreground">[{{ book.dynasty }}] {{ book.author }}</text>
                      <text class="text-xs text-muted-foreground/70 line-clamp-1 mt-0.5">{{ book.description }}</text>
                    </view>
                    
                    <ChevronRight class="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </Card>
                </Link>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 pt-6">
            <text class="font-medium mb-4">相关书单</text>
            <view class="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
              {Object.values(collectionsData).filter(c => c.id !== collectionId).map(col => (
                <Link key={col.id} href={`/classics/collection/${col.id}`} class="flex-shrink-0">
                  <Card class={cn(
                    "w-48 overflow-hidden",
                    "border-border/60"
                  )}>
                    <view class={cn("h-20 p-3 bg-gradient-to-br", col.cover)}>
                      <text class="font-medium text-sm">{{ col.title }}</text>
                      <text class="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{{ col.description }}</text>
                    </view>
                    <view class="p-2 flex items-center justify-between">
                      <text class="text-[10px] text-muted-foreground">{{ col.bookCount }}本</text>
                      <ChevronRight class="w-3 h-3 text-muted-foreground" />
                    </view>
                  </Card>
                </Link>
              ))}
            </view>
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