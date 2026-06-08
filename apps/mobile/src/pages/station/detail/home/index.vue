<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">分站管理</text>
      <text class="v0-route">V0: station/[id]/home</text>
    </view>
        <StationProvider station={{ station }}>
          <view class="min-h-screen bg-background">
            <view class="max-w-lg mx-auto relative">
              <!--   -->
              <view class="fixed top-0 left-0 right-0 z-50 max-w-lg mx-auto">
                <StationBrandBar />
                <!--   -->
                <StationHeader themeColor={{ station?.themeColor }} />
              </view>
              
              <!--   -->
              <view class="pt-[100px] pb-20">
                <!--   -->
                {{ station && <StationHeroBanner station={station }} />}
                
                <!--   -->
                <QuickEntryGrid />
                
                <!--   -->
                <StationFeaturedSection />
                
                <!--   -->
                <view class="mt-4">
                  <view class="px-4 mb-3">
                    <text class="text-sm font-medium text-muted-foreground">为你推荐</text>
                  </view>
                  <HomeFeed />
                </view>
              </view>
              
              <FloatingAssistant />
              <BottomNav />
            </view>
          </view>
        </StationProvider>
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