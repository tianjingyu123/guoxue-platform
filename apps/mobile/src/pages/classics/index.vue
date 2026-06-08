<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">古籍</text>
      <text class="v0-route">V0: classics</text>
    </view>
        <view class="min-h-screen bg-gradient-to-b from-amber-50/50 to-background dark:from-amber-950/20 dark:to-background pb-20">
          <!--   -->
          <view class="sticky top-0 z-40 bg-gradient-to-r from-amber-800 to-amber-900 text-white">
      <view class="flex items-center gap-3 px-4 h-14">
      <BackButton overlay fallbackPath="/discover" />
              <view class="flex items-center gap-2">
                <Library class="w-5 h-5 text-amber-300" />
                <text class="font-serif text-lg">古籍典藏</text>
              </view>
              <view class="flex-1" />
              <Link href="/search" class="p-2 text-amber-200 hover:text-white">
                <Search class="w-5 h-5" />
              </Link>
            </view>
    
            <!--   -->
            <view class="px-4 pb-3">
              <view class="relative">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
                <input
                  type="text"
                  value={{ searchQuery }}
                  @change={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索古籍、作者"
                  class="w-full h-9 pl-9 pr-4 bg-amber-950/50 border border-amber-700/50 rounded-lg text-sm text-amber-100 placeholder:text-amber-400/60 focus:outline-none focus:border-amber-500"
                />
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-4">
            <view class="grid grid-cols-4 gap-2">
              
    <view v-for="(cat, index) in mainCategories" :key="index"> (
                <view class="v0-btn"
                  key={{ cat.id }}
                  @click={() => setActiveMainCat(activeMainCat === cat.id ? null : cat.id)}
                  class={cn(
                    "py-3 rounded-xl text-center transition-all",
                    activeMainCat === cat.id
                      ? `bg-gradient-to-br ${{ cat.color }} text-white shadow-lg`
                      : "bg-card hover:bg-secondary"
                  )}
                >
                  <text class="text-2xl block mb-1">{{ cat.icon }}</text>
                  <text class="text-xs font-medium">{{ cat.name }}</text>
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 mb-4">
            <view class="flex items-center justify-between mb-2">
              <view class="flex items-center gap-1.5">
                <BookMarked class="w-4 h-4 text-amber-600" />
                <text class="font-semibold text-sm">精选书单</text>
              </view>
              <Link href="/classics/lists" class="text-xs text-muted-foreground flex items-center">更多<ChevronRight class="w-3 h-3" /></Link>
            </view>
            <view class="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              
    <view v-for="(list, index) in bookLists" :key="index"> (
                <Link key={list.id} href={`/classics/list/${list.id}`} class="flex-shrink-0">
                  <Card class="px-4 py-3 flex items-center gap-3 hover:shadow-md transition-shadow">
                    <text class="text-2xl">{{ list.icon }}</text>
                    <view>
                      <text class="text-sm font-medium">{{ list.title }}</text>
                      <text class="text-xs text-muted-foreground">{{ list.count }}本</text>
                    </view>
                  </Card>
                </Link>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="sticky top-14 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
            <view class="flex overflow-x-auto scrollbar-hide px-4 py-2 gap-2">
              
    <view v-for="(cat, index) in subCategories" :key="index"> (
                <view class="v0-btn"
                  key={{ cat.id }}
                  @click={() => setActiveSubCat(cat.id)}
                  class={cn(
                    "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                    activeSubCat === cat.id ? "bg-amber-600 text-white" : "bg-secondary text-muted-foreground"
                  )}
                >
                  {{ cat.name }}
                </view>
              ))}
            </view>
            <view class="flex items-center justify-between px-4 py-2 border-t border-border">
              <view class="flex items-center gap-3">
                <view class="v0-btn" @click={() => setOnlyFree(!onlyFree)} class={cn("text-xs", onlyFree ? "text-amber-600 font-medium" : "text-muted-foreground")}>免费</view>
                <view class="v0-btn" @click={() => setOnlyAI(!onlyAI)} class={cn("text-xs flex items-center gap-0.5", onlyAI ? "text-purple-600 font-medium" : "text-muted-foreground")}>
                  <Sparkles class="w-3 h-3" />AI智读
                </view>
              </view>
              <view class="flex items-center gap-1">
                <view class="v0-btn" @click={() => setViewMode("grid")} class={cn("p-1.5 rounded", viewMode === "grid" ? "bg-secondary" : "")}>
                  <Grid3X3 class="w-4 h-4" />
                </view>
                <view class="v0-btn" @click={() => setViewMode("list")} class={cn("p-1.5 rounded", viewMode === "list" ? "bg-secondary" : "")}>
                  <List class="w-4 h-4" />
                </view>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="p-4">
            {filteredClassics.length === 0 ? (
              <view class="flex flex-col items-center justify-center py-20">
                <BookOpen class="w-16 h-16 text-muted-foreground/20 mb-4" />
                <text class="text-muted-foreground">暂无相关古籍</text>
              </view>
            ) : viewMode === "grid" ? (
              // 书架网格视图 - 参考识典古籍
              <view class="grid grid-cols-3 gap-3">
                
    <view v-for="(classic, index) in filteredClassics" :key="index"> (
                  <Link key={classic.id} href={`/reader/${classic.id}`}>
                    <view class="group">
                      <!--   -->
                      <view class="aspect-[3/4] rounded-lg overflow-hidden relative shadow-md group-hover:shadow-xl transition-shadow mb-2">
                        <view class={cn(
                          "absolute inset-0",
                          classic.cover === "ancient" 
                            ? "bg-gradient-to-b from-amber-100 via-amber-50 to-amber-100 dark:from-amber-900/60 dark:via-amber-800/40 dark:to-amber-900/60"
                            : "bg-gradient-to-b from-stone-200 via-stone-100 to-stone-200 dark:from-stone-800 dark:via-stone-700 dark:to-stone-800"
                        )} />
                        <!--   -->
                        <view class="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-amber-600/30 to-transparent" />
                        <!--   -->
                        <view class="absolute top-2 right-2 flex flex-col gap-1">
                          {classic.hasAI && (
                            <Badge class="bg-purple-500/90 text-[8px] px-1 py-0 border-0"><Sparkles class="w-2 h-2 mr-0.5" />AI</Badge>
                          )}
                          {classic.isFree && (
                            <Badge class="bg-green-500/90 text-[8px] px-1 py-0 border-0">免费</Badge>
                          )}
                        </view>
                        <!--   -->
                        <Badge class="absolute top-2 left-2 bg-amber-600/80 text-[8px] px-1.5 py-0 border-0">{{ classic.dynasty }}</Badge>
                        <!--   -->
                        <view class="absolute inset-0 flex items-center justify-center p-3">
                          <text class="writing-vertical text-lg font-serif font-bold text-amber-900 dark:text-amber-200 tracking-wider">
                            {{ classic.title }}
                          </text>
                        </view>
                        <!--   -->
                        <view class="absolute bottom-2 left-0 right-0 text-center">
                          <text class="text-[10px] text-amber-700/80 dark:text-amber-300/80">{{ classic.author }}</text>
                        </view>
                      </view>
                      <!--   -->
                      <view class="text-center">
                        <text class="text-xs font-medium truncate">{{ classic.title }}</text>
                        <text class="text-[10px] text-muted-foreground">{{ (classic.reads/10000).toFixed(1) }}万人读</text>
                      </view>
                    </view>
                  </Link>
                ))}
              </view>
            ) : (
              // 列表视图
              <view class="space-y-3">
                
    <view v-for="(classic, index) in filteredClassics" :key="index"> (
                  <Link key={classic.id} href={`/reader/${classic.id}`}>
                    <Card class="flex gap-3 p-3 hover:shadow-md transition-shadow">
                      <!--   -->
                      <view class="w-16 h-22 rounded bg-gradient-to-b from-amber-100 to-amber-50 dark:from-amber-900/50 dark:to-amber-800/30 flex-shrink-0 relative overflow-hidden shadow-sm">
                        <view class="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-600/30" />
                        <view class="absolute inset-0 flex items-center justify-center p-1">
                          <text class="writing-vertical text-sm font-serif font-bold text-amber-900 dark:text-amber-200">{{ classic.title }}</text>
                        </view>
                        {classic.hasAI && (
                          <Badge class="absolute top-1 right-1 bg-purple-500/90 text-[7px] px-0.5 py-0 border-0"><Sparkles class="w-2 h-2" /></Badge>
                        )}
                      </view>
                      <!--   -->
                      <view class="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <view>
                          <view class="flex items-center gap-2 mb-1">
                            <text class="font-medium text-sm">{{ classic.title }}</text>
                            <Badge variant="secondary" class="text-[10px] px-1.5 py-0">{{ classic.dynasty }}</Badge>
                            {classic.isFree && <Badge class="bg-green-500 text-[10px] px-1.5 py-0 border-0">免费</Badge>}
                          </view>
                          <text class="text-xs text-muted-foreground">{{ classic.author }} · {{ classic.chapters }}篇</text>
                          <text class="text-xs text-muted-foreground/80 line-clamp-1 mt-1">{{ classic.description }}</text>
                        </view>
                        <view class="flex items-center gap-3 text-xs text-muted-foreground">
                          <text class="flex items-center gap-0.5"><Star class="w-3 h-3 fill-amber-400 text-amber-400" />{{ classic.rating }}</text>
                          <text class="flex items-center gap-0.5"><Eye class="w-3 h-3" />{{ (classic.reads/10000).toFixed(1) }}万</text>
                        </view>
                      </view>
                    </Card>
                  </Link>
                ))}
              </view>
            )}
          </view>
    
          <BottomNav />
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const mainCategories = [
const subCategories = [
const classicsData = [
const bookLists = [
    const matchSubCat = activeSubCat === "all" || classic.subCategory === activeSubCat

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