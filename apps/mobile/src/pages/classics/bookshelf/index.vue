<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">古籍</text>
      <text class="v0-route">V0: classics/bookshelf</text>
    </view>
        <view class="min-h-screen bg-background pb-6">
          <!--   -->
          <view class="sticky top-0 z-50 bg-background border-b border-border/60">
            <view class="flex items-center justify-between px-4 h-14">
              <view class="flex items-center gap-3">
                <view class="v0-btn" 
                  @click={() => router.back()}
                  class="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary"
                  aria-label="返回"
                >
                  <ArrowLeft class="w-5 h-5" />
                </view>
                <text class="font-medium">我的书房</text>
              </view>
              
              <view class="flex items-center gap-2">
                {isSelectMode ? (
                  
                    <Button 
                      variant="ghost" 
                      size="sm"
                      @click={() => {
                        setIsSelectMode(false)
                        setSelectedIds(new Set())
                      }}
                    >
                      取消
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      @click={{ handleBatchRemove }}
                      :disabled={{ selectedIds.size === 0 }}
                    >
                      移除 ({{ selectedIds.size }})
                    </Button>
                  
                ) : (
                  
                    <Link href="/classics/search">
                      <Button variant="ghost" size="icon" class="w-8 h-8">
                        <Search class="w-4 h-4" />
                      </Button>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" class="w-8 h-8">
                          <MoreVertical class="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem @click={() => setIsSelectMode(true)}>
                          批量管理
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <FolderPlus class="w-4 h-4 mr-2" />
                          新建分组
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  
                )}
              </view>
            </view>
          </view>
    
          <!--   -->
          <Tabs defaultValue="shelf" class="w-full">
            <view class="px-4 pt-3 pb-2 border-b border-border/60">
              <TabsList class="w-full bg-secondary/50 p-0.5 h-9">
                <TabsTrigger value="shelf" class="flex-1 text-xs h-8">
                  书架
                </TabsTrigger>
                <TabsTrigger value="history" class="flex-1 text-xs h-8">
                  浏览历史
                </TabsTrigger>
              </TabsList>
            </view>
    
            <!--   -->
            <TabsContent value="shelf" class="mt-0">
              <!--   -->
              <view class="px-4 py-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
                <view class="v0-btn"
                  @click={() => setActiveGroup(null)}
                  class={cn(
                    "px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors",
                    activeGroup === null 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  全部
                </view>
                
    <view v-for="(group, index) in groupsData" :key="index"> (
                  <view class="v0-btn"
                    key={{ group.id }}
                    @click={() => setActiveGroup(group.id)}
                    class={cn(
                      "px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors flex items-center gap-1",
                      activeGroup === group.id 
                        ? colorClasses[group.color]
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {{ group.name }}
                    <Badge variant="secondary" class="text-[9px] px-1 py-0 h-4 ml-0.5">
                      {{ group.count }}
                    </Badge>
                  </view>
                ))}
                <view class="v0-btn" class="p-1.5 rounded-full bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors">
                  <Plus class="w-4 h-4" />
                </view>
              </view>
    
              <!--   -->
              <view class="px-4 pb-3 flex items-center justify-between">
                <text class="text-xs text-muted-foreground">
                  共 <text class="text-foreground font-medium">{{ filteredBooks.length }}</text> 本
                </text>
                <view class="flex items-center gap-1">
                  <view class="v0-btn" 
                    @click={() => setViewMode("grid")}
                    class={cn("p-1.5 rounded", viewMode === "grid" ? "bg-secondary" : "")}
                    aria-label="网格视图"
                  >
                    <Grid3X3 class="w-4 h-4" />
                  </view>
                  <view class="v0-btn" 
                    @click={() => setViewMode("list")}
                    class={cn("p-1.5 rounded", viewMode === "list" ? "bg-secondary" : "")}
                    aria-label="列表视图"
                  >
                    <List class="w-4 h-4" />
                  </view>
                </view>
              </view>
    
              <!--   -->
              <view class="px-4">
                {filteredBooks.length === 0 ? (
                  <view class="flex flex-col items-center justify-center py-16 text-center">
                    <view class="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                      <BookOpen class="w-8 h-8 text-muted-foreground" />
                    </view>
                    <text class="font-medium mb-1">书架是空的</text>
                    <text class="text-sm text-muted-foreground mb-4">
                      去古籍馆探索感兴趣的古籍吧
                    </text>
                    <Link href="/classics/home">
                      <Button class="rounded-full">
                        探索古籍
                      </Button>
                    </Link>
                  </view>
                ) : viewMode === "grid" ? (
                  <view class="grid grid-cols-3 gap-3">
                    
    <view v-for="(book, index) in filteredBooks" :key="index"> (
                      <view 
                        key={book.id} 
                        class={cn(
                          "relative",
                          isSelectMode && "cursor-pointer",
                          selectedIds.has(book.id) && "ring-2 ring-primary rounded-lg"
                        )}
                        @click={() => isSelectMode && handleToggleSelect(book.id)}
                      >
                        <BookCard
                          id={{ book.id }}
                          title={{ book.title }}
                          author={{ book.author }}
                          dynasty={{ book.dynasty }}
                          progress={{ book.progress }}
                          hasAI={{ book.hasAI }}
                          coverColor={{ book.coverColor }}
                        />
                        {isSelectMode && selectedIds.has(book.id) && (
                          <view class="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <text class="text-[10px] text-white">✓</text>
                          </view>
                        )}
                      </view>
                    ))}
                    <!--   -->
                    <Link href="/classics/home" class="block">
                      <view class="aspect-[3/4.2] rounded-sm border-2 border-dashed border-border/60 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
                        <Plus class="w-6 h-6" />
                        <text class="text-xs">添加</text>
                      </view>
                    </Link>
                  </view>
                ) : (
                  <view class="space-y-3">
                    
    <view v-for="(book, index) in filteredBooks" :key="index"> (
                      <Card 
                        key={book.id}
                        class={cn(
                          "p-3 flex items-center gap-3 transition-all",
                          isSelectMode && "cursor-pointer",
                          selectedIds.has(book.id) && "ring-2 ring-primary"
                        )}
                        @click={() => isSelectMode && handleToggleSelect(book.id)}
                      >
                        <!--   -->
                        <view class={cn(
                          "w-12 h-16 rounded-sm flex-shrink-0 flex items-center justify-center",
                          "bg-[#f5f0e1] border border-[#c9b896]/50 shadow-sm"
                        )}>
                          <view class="absolute left-0 top-0 bottom-0 w-1.5 bg-[#d4c4a8] rounded-l-sm" />
                          <text class="writing-vertical-rl text-[9px] font-serif font-bold text-[#4a3f2f]">
                            {{ book.title.slice(0, 3) }}
                          </text>
                        </view>
                        
                        <!--   -->
                        <view class="flex-1 min-w-0">
                          <Link 
                            href={`/classics/${book.id}`}
                            class="font-medium text-sm hover:text-primary transition-colors"
                            @click={e => isSelectMode && e.preventDefault()}
                          >
                            {{ book.title }}
                          </Link>
                          <text class="text-xs text-muted-foreground">[{{ book.dynasty }}] {{ book.author }}</text>
                          <view class="flex items-center gap-2 mt-1">
                            <view class="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                              <view 
                                class="h-full bg-primary/70 rounded-full"
                                :style=" width: `${{ book.progress }}%` }}
                              />
                            </view>
                            <text class="text-[10px] text-muted-foreground">{{ book.progress }}%</text>
                          </view>
                        </view>
                        
                        <!--   -->
                        {!isSelectMode && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" class="w-8 h-8 flex-shrink-0">
                                <MoreVertical class="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <BookOpen class="w-4 h-4 mr-2" />
                                继续阅读
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit3 class="w-4 h-4 mr-2" />
                                移动分组
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                class="text-destructive"
                                @click={() => handleRemoveFromShelf(book.id)}
                              >
                                <Trash2 class="w-4 h-4 mr-2" />
                                移出书架
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </Card>
                    ))}
                  </view>
                )}
              </view>
            </TabsContent>
    
            <!--   -->
            <TabsContent value="history" class="mt-0 p-4">
              <view class="space-y-3">
                
    <view v-for="(item, index) in readingHistoryData" :key="index"> (
                  <Link key={item.id} href={`/reader/${item.id}`}>
                    <Card class="p-3 flex items-center gap-3 hover:shadow-md transition-shadow">
                      <!--   -->
                      <view class={cn(
                        "w-10 h-14 rounded-sm flex-shrink-0 flex items-center justify-center relative",
                        "bg-[#f5f0e1] border border-[#c9b896]/50 shadow-sm"
                      )}>
                        <view class="absolute left-0 top-0 bottom-0 w-1 bg-[#d4c4a8] rounded-l-sm" />
                        <text class="writing-vertical-rl text-[8px] font-serif font-bold text-[#4a3f2f]">
                          {{ item.title.slice(0, 2) }}
                        </text>
                      </view>
                      
                      <!--   -->
                      <view class="flex-1 min-w-0">
                        <text class="font-medium text-sm">{{ item.title }}</text>
                        <text class="text-xs text-muted-foreground">{{ item.chapter }}</text>
                      </view>
                      
                      <!--   -->
                      <view class="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                        <Clock class="w-3 h-3" />
                        {{ item.readAt }}
                      </view>
                    </Card>
                  </Link>
                ))}
                
                {readingHistoryData.length > 0 && (
                  <Button variant="ghost" class="w-full text-muted-foreground text-xs">
                    清空历史记录
                  </Button>
                )}
              </view>
            </TabsContent>
          </Tabs>
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const bookshelfData = [
const readingHistoryData = [
const groupsData = [
  const colorClasses: Record<string, string> = {

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