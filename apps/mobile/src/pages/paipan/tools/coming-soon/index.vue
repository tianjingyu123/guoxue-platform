<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">排盘工具</text>
      <text class="v0-route">V0: paipan/tools/coming-soon</text>
    </view>
        <view class="min-h-screen bg-background flex flex-col">
          <!--   -->
          <view class="flex items-center justify-between px-4 h-12 border-b border-border bg-card shrink-0">
            <view class="v0-btn" @click={() => router.back()} class="p-1 -ml-1">
              <ChevronLeft class="w-6 h-6" />
            </view>
            <text class="text-base font-bold">{{ toolName }}</text>
            <view class="w-6" />
          </view>
    
          <!--   -->
          <view class="flex-1 flex flex-col items-center justify-center p-8">
            <view class="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
              <Clock class="w-12 h-12 text-primary" />
            </view>
            
            <text class="text-2xl font-bold text-foreground mb-3">开发中</text>
            <text class="text-muted-foreground text-center mb-8">
              {{ toolName }}正在紧锣密鼓地开发中<text>
    </text> />敬请期待
            </text>
    
            <view class="flex items-center gap-2 text-sm text-primary bg-primary/10 px-4 py-2 rounded-full">
              <Sparkles class="w-4 h-4" />
              <text>即将上线</text>
            </view>
    
            <view class="v0-btn"
              @click={() => router.back()}
              class="mt-8 px-8 py-3 bg-primary text-white font-medium rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl transition-all"
            >
              返回首页
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