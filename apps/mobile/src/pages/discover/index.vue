<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">发现</text>
      <text class="v0-route">V0: discover</text>
    </view>
        <view class="min-h-screen bg-[var(--surface-base)] pb-20">
          <!--   -->
          <view class="sticky top-0 z-30 bg-[var(--surface-base)]">
            <!--   -->
            <view class="px-4 pt-12 pb-3">
              <view class={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-full transition-all",
                searchFocused
                  ? "bg-[var(--surface)] shadow-lg ring-2 ring-[var(--brand)]/20"
                  : "bg-[var(--surface)]/80 shadow-sm"
              )}>
                <Search class="w-4 h-4 text-[var(--text-soft)]" />
                <input
                  type="text"
                  placeholder="搜索商品、课程、智能体..."
                  class="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-soft)]"
                  @focus={() => setSearchFocused(true)}
                  @blur={() => setSearchFocused(false)}
                />
              </view>
    
              <!--   -->
              <view class="flex items-center gap-2 mt-3 overflow-x-auto no-scrollbar">
                <view class="flex items-center gap-1 flex-shrink-0">
                  <Flame class="w-4 h-4 text-[var(--brand)]" />
                  <text class="text-xs text-[var(--text-soft)]">热搜</text>
                </view>
                {["八字入门", "紫微斗数", "风水罗盘", "开运水晶", "六爻占卜"].map((word, i) => (
                  <Link
                    key={{ word }}
                    href={`/search?q=${word}`}
                    class={cn(
                      "flex-shrink-0 px-3 py-1 rounded-full text-xs transition-colors",
                      i === 0
                        ? "bg-[var(--brand)]/10 text-[var(--brand)] font-medium"
                        : "bg-[var(--surface)]/60 text-[var(--text)] hover:bg-[var(--surface)]"
                    )}
                  >
                    {{ word }}
                  </Link>
                ))}
              </view>
            </view>
    
            <!--   -->
            <view class="px-4 pb-4">
              <view class="grid grid-cols-4 gap-x-2 gap-y-3">
                
    <view v-for="(cat, index) in categories" :key="index"> (
                  <Link key={cat.id} href={{ cat.href }} class="flex flex-col items-center gap-1.5">
                    <view class="w-12 h-12 rounded-2xl bg-[var(--brand)]/8 flex items-center justify-center">
                      <cat.icon class="w-6 h-6 text-[var(--brand)]" />
                    </view>
                    <text class="text-xs text-[var(--text-strong)]">{{ cat.label }}</text>
                  </Link>
                ))}
              </view>
            </view>
    
            <!--   -->
            <view class="h-2 bg-[var(--surface-sunken)]" />
          </view>
    
          <!--   -->
          <view class="px-[5px] sm:px-3 py-3">
            <Masonry
              breakpointCols={{ masonryBreakpoints }}
              class="masonry-grid"
              columnClassName="masonry-grid-column"
            >
              {{ feedItems.map(renderFeedCard) }}
            </Masonry>
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
const categories = [
const feedItems: FeedItem[] = [
const masonryBreakpoints = { default: 2, 1024: 2, 640: 2 }

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