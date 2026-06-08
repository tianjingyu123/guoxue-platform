<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">短视频</text>
      <text class="v0-route">V0: videos/publish</text>
    </view>
          <view class="min-h-screen bg-black flex flex-col">
            <!--   -->
            <view class="flex items-center justify-between px-4 py-3 text-white">
              <view class="v0-btn" @click={() => router.back()} class="p-2 -ml-2">
                <X class="w-6 h-6" />
              </view>
              <text class="text-lg font-medium">发布视频</text>
              <view class="w-10" />
            </view>
    
            <!--   -->
            <view class="flex-1 flex flex-col items-center justify-center px-6">
              <view class="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mb-6">
                <Video class="w-12 h-12 text-white/80" />
              </view>
              
              <text class="text-white text-xl font-medium mb-2">选择视频</text>
              <text class="text-white/60 text-sm text-center mb-8">
                支持 MP4、MOV 格式，最长60秒
              </text>
    
              <view class="w-full space-y-3">
                <view class="v0-btn"
                  @click={() => fileInputRef.current?.click()}
                  class="w-full py-4 bg-[#C41E3A] text-white rounded-xl flex items-center justify-center gap-2"
                >
                  <Image class="w-5 h-5" />
                  从相册选择
                </view>
                
                <view class="v0-btn"
                  class="w-full py-4 bg-white/10 text-white rounded-xl flex items-center justify-center gap-2"
                >
                  <Camera class="w-5 h-5" />
                  拍摄视频
                </view>
              </view>
    
              <input
                ref={{ fileInputRef }}
                type="file"
                accept="video/*"
                @change={{ handleFileSelect }}
                class="hidden"
              />
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
const myProductLibrary: VideoProduct[] = [
  const hotTags = ['易经', '风水', '八字', '命理', '国学', '周易', '梅花易数', '六爻']
        const extractedFrames: string[] = []
    const newErrors: Record<string, string> = {}

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