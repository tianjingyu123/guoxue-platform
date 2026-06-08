<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">比赛</text>
      <text class="v0-route">V0: competition/[id]/poster</text>
    </view>
        <view class="min-h-screen bg-gray-900">
          <!--   -->
          <view class="sticky top-0 z-50 bg-transparent">
            <view class="flex items-center justify-between px-4 h-11">
              <view class="v0-btn" @click={() => router.back()} class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <ArrowLeft class="w-5 h-5 text-white" />
              </view>
              <text class="font-medium text-white">专属海报</text>
              <view class="w-8" />
            </view>
          </view>
    
          <!--   -->
          <view class="px-6 py-4">
            <view class="relative bg-gradient-to-br from-primary via-primary to-primary/90 rounded-2xl overflow-hidden shadow-2xl">
              <!--   -->
              <view class="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <view class="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
              <view class="absolute top-1/2 right-0 w-24 h-24 bg-white/5 rounded-full translate-x-1/2" />
              
              <!--   -->
              <Star class="absolute top-8 left-8 w-4 h-4 text-amber-300/50" />
              <Star class="absolute top-16 right-12 w-3 h-3 text-amber-300/30" />
              <Star class="absolute bottom-32 left-12 w-3 h-3 text-amber-300/40" />
              
              <view class="relative p-6 text-white">
                <!--   -->
                <view class="flex items-center justify-between mb-6">
                  <view class="flex items-center gap-2">
                    <Trophy class="w-5 h-5 text-amber-300" />
                    <text class="text-sm font-medium">热卜国学</text>
                  </view>
                  <text class="px-3 py-1 bg-amber-400/20 rounded-full text-xs text-amber-300">
                    {{ posterData.roundName }}晋级
                  </text>
                </view>
                
                <!--   -->
                <text class="text-lg font-bold mb-6 leading-tight">
                  {{ posterData.competitionTitle }}
                </text>
                
                <!--   -->
                <view class="bg-white/10 backdrop-blur-sm rounded-2xl p-5 mb-6">
                  <view class="flex items-center gap-4 mb-4">
                    <view class="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                      <Crown class="w-8 h-8 text-amber-300" />
                    </view>
                    <view>
                      <text class="text-xl font-bold">{{ posterData.participantName }}</text>
                      <text class="text-white/70 text-sm">成功晋级{{ posterData.promotedTo }}</text>
                    </view>
                  </view>
                  
                  <!--   -->
                  <view class="grid grid-cols-3 gap-3 text-center">
                    <view class="bg-white/10 rounded-xl p-3">
                      <text class="text-2xl font-bold text-amber-300">{{ posterData.rank }}</text>
                      <text class="text-xs text-white/70">排名</text>
                    </view>
                    <view class="bg-white/10 rounded-xl p-3">
                      <text class="text-2xl font-bold">{{ posterData.score }}</text>
                      <text class="text-xs text-white/70">得分</text>
                    </view>
                    <view class="bg-white/10 rounded-xl p-3">
                      <text class="text-2xl font-bold text-green-400">{{ beatPercentage }}%</text>
                      <text class="text-xs text-white/70">超越选手</text>
                    </view>
                  </view>
                </view>
                
                <!--   -->
                <text class="text-center text-white/80 text-sm mb-6">
                  国学高手齐聚，实战见真章！
                </text>
                
                <!--   -->
                <view class="flex items-center justify-between pt-4 border-t border-white/20">
                  <view>
                    <text class="text-xs text-white/60">扫码加入比赛</text>
                    <text class="text-sm font-medium">热卜国学平台</text>
                  </view>
                  <view class="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
                    <QrCode class="w-12 h-12 text-gray-800" />
                  </view>
                </view>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="px-6 pb-6 space-y-3">
            <Button class="w-full bg-white text-primary hover:bg-white/90">
              <Download class="w-4 h-4 mr-2" />
              保存到相册
            </Button>
            <Button variant="outline" class="w-full border-white/30 text-white hover:bg-white/10">
              <Share2 class="w-4 h-4 mr-2" />
              分享到微信
            </Button>
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
const posterData = {

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