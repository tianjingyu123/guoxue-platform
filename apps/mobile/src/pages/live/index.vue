<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">直播</text>
      <text class="v0-route">V0: live</text>
    </view>
        <view class="min-h-screen bg-background">
          <!--   -->
          <view class="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
            <view class="max-w-lg mx-auto">
              <!--   -->
              <view class="flex items-center justify-between h-12 px-4">
                <BackButton />
                <text class="font-serif font-bold text-lg text-foreground">直播广场</text>
                <Link href="/search" class="p-2 -mr-2 rounded-full hover:bg-secondary transition-colors">
                  <Search class="w-5 h-5 text-muted-foreground" />
                </Link>
              </view>
    
              <!--   -->
              <view class="flex items-center px-4 h-10 gap-6 border-t border-border/30">
                
    <view v-for="(tab, index) in tabs" :key="index"> (
                  <view class="v0-btn"
                    key={{ tab }}
                    @click={() => setActiveTab(tab)}
                    class={cn(
                      "relative py-2 text-sm transition-all whitespace-nowrap",
                      activeTab === tab
                        ? "text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {{ tab }}
                    {activeTab === tab && (
                      <text class="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-full" />
                    )}
                  </view>
                ))}
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="pt-[88px] pb-8 px-4 max-w-lg mx-auto">
            <!--   -->
            {livesNow.length > 0 && (
              <view class="mb-6">
                <view class="flex items-center gap-2 mb-3">
                  <view class="flex items-center justify-center w-5 h-5 rounded-full bg-[#C41E3A]">
                    <Radio class="w-3 h-3 text-white" />
                  </view>
                  <text class="font-serif font-semibold text-foreground">正在直播</text>
                  <text class="text-xs text-muted-foreground">({{ livesNow.length }})</text>
                </view>
                <!--   -->
                <view class="grid grid-cols-2 gap-2">
                  {{ renderMixedLayout(livesNow) }}
                </view>
              </view>
            )}
    
            <!--   -->
            {livesUpcoming.length > 0 && (
              <view>
                <view class="flex items-center gap-2 mb-3">
                  <text class="font-serif font-semibold text-foreground">直播预告</text>
                  <text class="text-xs text-muted-foreground">({{ livesUpcoming.length }})</text>
                </view>
                <view class="grid grid-cols-2 gap-2">
                  {{ renderMixedLayout(livesUpcoming) }}
                </view>
              </view>
            )}
    
            <!--   -->
            {filteredLives.length === 0 && (
              <view class="flex flex-col items-center justify-center py-20">
                <view class="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <Radio class="w-8 h-8 text-muted-foreground" />
                </view>
                <text class="text-muted-foreground text-sm">暂无相关直播</text>
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
const tabs = ["全部", "知识授课", "电商带货", "关注的"]
const mockLives = [
    const result: React.ReactNode[] = []

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