<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">电子书</text>
      <text class="v0-route">V0: ebook</text>
    </view>
        <view class="min-h-screen bg-[var(--classics-bg)]">
          <!--   -->
          <view class="sticky top-0 z-50 bg-[var(--classics-bg)]/95 backdrop-blur-sm border-b border-[var(--classics-border)]">
            <view class="flex items-center gap-3 px-4 h-14">
              <Link href="/" class="p-1.5 -ml-1.5 rounded-lg hover:bg-secondary/80 active:scale-95 transition-all">
                <ArrowLeft class="w-5 h-5" />
              </Link>
              
              <!--   -->
              <view class="flex-1 relative">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={{ searchQuery }}
                  @change={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索电子书..."
                  class="pl-9 pr-4 h-9 bg-secondary/50 border-0 rounded-full text-sm"
                />
              </view>
              
              <Button variant="ghost" size="icon" class="flex-shrink-0">
                <SlidersHorizontal class="w-5 h-5" />
              </Button>
            </view>
            
            <!--   -->
            <view class="flex gap-2 px-4 py-2.5 overflow-x-auto scrollbar-hide">
              
    <view v-for="(cat, index) in categories" :key="index"> (
                <view class="v0-btn"
                  key={{ cat.id }}
                  @click={() => setActiveCategory(cat.id)}
                  class={cn(
                    "flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all",
                    activeCategory === cat.id
                      ? "bg-[var(--classics-jing)] text-white"
                      : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
                  )}
                >
                  {{ cat.name }}
                  <text class="ml-1 opacity-70">{{ cat.count }}</text>
                </view>
              ))}
            </view>
            
            <!--   -->
            <view class="flex items-center justify-between px-4 py-2 border-t border-[var(--classics-border)]/50">
              <view class="flex gap-1">
                
    <view v-for="(opt, index) in sortOptions" :key="index"> {
                  const Icon = opt.icon
                  return (
                    <view class="v0-btn"
                      key={{ opt.id }}
                      @click={() => setActiveSort(opt.id)}
                      class={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                        activeSort === opt.id
                          ? "bg-[var(--classics-jing)]/10 text-[var(--classics-jing)]"
                          : "text-muted-foreground hover:bg-secondary/60"
                      )}
                    >
                      <Icon class="w-3.5 h-3.5" />
                      {{ opt.name }}
                    </view>
                  )
                })}
              </view>
              
              <view class="flex gap-1 p-0.5 bg-secondary/50 rounded-lg">
                <view class="v0-btn"
                  @click={() => setViewMode("grid")}
                  class={cn(
                    "p-1.5 rounded-md transition-all",
                    viewMode === "grid" ? "bg-card shadow-sm" : "hover:bg-card/50"
                  )}
                >
                  <Grid3X3 class="w-4 h-4" />
                </view>
                <view class="v0-btn"
                  @click={() => setViewMode("list")}
                  class={cn(
                    "p-1.5 rounded-md transition-all",
                    viewMode === "list" ? "bg-card shadow-sm" : "hover:bg-card/50"
                  )}
                >
                  <List class="w-4 h-4" />
                </view>
              </view>
            </view>
          </view>
          
          <!--   -->
          <view class="px-4 py-4">
            {viewMode === "grid" ? (
              <view class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                
    <view v-for="(book, index) in ebooks" :key="index"> (
                  <EbookCard key={book.id} book={{ book }} />
                ))}
              </view>
            ) : (
              <view class="space-y-3">
                
    <view v-for="(book, index) in ebooks" :key="index"> (
                  <EbookCardHorizontal key={book.id} book={{ book }} />
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
const ebooks = [
const categories = [
const sortOptions = [

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