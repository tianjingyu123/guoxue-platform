<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">古籍</text>
      <text class="v0-route">V0: classics/bookmarks</text>
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
                <text class="font-medium">我的书签</text>
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
                      @click={{ handleBatchDelete }}
                      :disabled={{ selectedIds.size === 0 }}
                    >
                      删除 ({{ selectedIds.size }})
                    </Button>
                  
                ) : (
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
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </view>
            </view>
    
            <!--   -->
            <view class="px-4 pb-3 flex items-center gap-3">
              <view class="flex-1 relative">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={{ searchValue }}
                  @change={(e) => setSearchValue(e.target.value)}
                  placeholder="搜索书签内容..."
                  class="pl-9 h-9 bg-secondary border-0 rounded-full text-sm"
                />
              </view>
              <view class="flex bg-secondary rounded-lg p-0.5">
                <view class="v0-btn"
                  @click={() => setViewMode("timeline")}
                  class={cn(
                    "px-3 py-1 text-xs rounded-md transition-colors",
                    viewMode === "timeline" ? "bg-background shadow-sm" : "text-muted-foreground"
                  )}
                >
                  时间线
                </view>
                <view class="v0-btn"
                  @click={() => setViewMode("book")}
                  class={cn(
                    "px-3 py-1 text-xs rounded-md transition-colors",
                    viewMode === "book" ? "bg-background shadow-sm" : "text-muted-foreground"
                  )}
                >
                  按书籍
                </view>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="p-4">
            {filteredBookmarks.length === 0 ? (
              <view class="flex flex-col items-center justify-center py-16 text-center">
                <view class="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <Bookmark class="w-8 h-8 text-muted-foreground" />
                </view>
                <text class="font-medium mb-1">暂无书签</text>
                <text class="text-sm text-muted-foreground mb-4">
                  阅读时长按文字可添加书签
                </text>
                <Link href="/classics/home">
                  <Button variant="outline" class="rounded-full">
                    去阅读
                  </Button>
                </Link>
              </view>
            ) : viewMode === "timeline" ? (
              /* 时间线视图 */
              <view class="space-y-3">
                
    <view v-for="(bm, index) in filteredBookmarks" :key="index"> (
                  <Card 
                    key={bm.id}
                    class={cn(
                      "p-4 border-l-4 transition-all",
                      colorClasses[bm.color] || colorClasses.amber,
                      isSelectMode && "cursor-pointer",
                      selectedIds.has(bm.id) && "ring-2 ring-primary"
                    )}
                    @click={() => isSelectMode && handleToggleSelect(bm.id)}
                  >
                    <view class="flex items-start justify-between gap-3">
                      <view class="flex-1 min-w-0">
                        <!--   -->
                        <view class="flex items-center gap-2 mb-2">
                          <Link 
                            href={`/classics/${bm.bookId}`}
                            class="text-sm font-medium hover:text-primary transition-colors"
                            @click={e => isSelectMode && e.preventDefault()}
                          >
                            《{{ bm.bookTitle }}》
                          </Link>
                          <text class="text-xs text-muted-foreground">
                            {{ bm.chapter }} · 第{{ bm.page }}页
                          </text>
                        </view>
                        
                        <!--   -->
                        <text class="text-sm leading-relaxed mb-2 font-serif">
                          {{ bm.content }}
                        </text>
                        
                        <!--   -->
                        <view class="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock class="w-3 h-3" />
                          {{ bm.createdAt }}
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
                              <Share2 class="w-4 h-4 mr-2" />
                              分享
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <BookOpen class="w-4 h-4 mr-2" />
                              跳转阅读
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              class="text-destructive"
                              @click={() => handleDelete(bm.id)}
                            >
                              <Trash2 class="w-4 h-4 mr-2" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </view>
                  </Card>
                ))}
              </view>
            ) : (
              /* 按书籍分组视图 */
              <view class="space-y-4">
                
    <view v-for="(group, index) in groupedBookmarks" :key="index"> (
                  <view key={group.bookId}>
                    <!--   -->
                    <Link 
                      href={`/classics/${group.bookId}`}
                      class="flex items-center justify-between p-3 bg-secondary/50 rounded-lg mb-2 hover:bg-secondary transition-colors"
                    >
                      <view class="flex items-center gap-3">
                        <view class="w-8 h-11 rounded bg-gradient-to-b from-amber-100 to-amber-50 flex items-center justify-center shadow-sm">
                          <text class="writing-vertical-rl text-[8px] font-serif font-bold text-amber-800">
                            {{ group.bookTitle.slice(0, 2) }}
                          </text>
                        </view>
                        <view>
                          <text class="font-medium text-sm">《{{ group.bookTitle }}》</text>
                          <text class="text-xs text-muted-foreground">[{{ group.dynasty }}] {{ group.bookAuthor }}</text>
                        </view>
                      </view>
                      <view class="flex items-center gap-1 text-muted-foreground">
                        <text class="text-xs">{{ group.count }}个书签</text>
                        <ChevronRight class="w-4 h-4" />
                      </view>
                    </Link>
                    
                    <!--   -->
                    <view class="space-y-2 pl-4 border-l-2 border-border/60 ml-4">
                      {group.items.map(bm => (
                        <Card 
                          key={bm.id}
                          class={cn(
                            "p-3 border-l-2 bg-card/50",
                            colorClasses[bm.color] || colorClasses.amber,
                            isSelectMode && "cursor-pointer",
                            selectedIds.has(bm.id) && "ring-2 ring-primary"
                          )}
                          @click={() => isSelectMode && handleToggleSelect(bm.id)}
                        >
                          <text class="text-xs text-muted-foreground mb-1">
                            {{ bm.chapter }} · 第{{ bm.page }}页
                          </text>
                          <text class="text-sm font-serif line-clamp-2">{{ bm.content }}</text>
                        </Card>
                      ))}
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
const bookmarksData = [
  const groups: Record<string, typeof bookmarksData> = {}
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